import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// R9, D-10: the JavaScript floor is the gzipped script transfer size of "/" as Lighthouse CI
// measures it against `next start` (the mobile preset), and a page may add 40 KB to it.
//   --record  writes docs/bundle-baseline.json from the reports in .lighthouseci (run locally)
//   --check   compares the reports in .lighthouseci with that file (run in CI)
// Run `npm run lhci:collect` first; the npm scripts bundle:record and bundle:check do.

const ROOT = join(import.meta.dirname, '..');
const BUDGET_DELTA_BYTES = 40_960;
const DEFAULT_ROUTE = '/';

export type Baseline = {
  floorBytes: number;
  budgetDeltaBytes: number;
  route: string;
};

export type BudgetResult = { ok: boolean; limit: number; measured: number };

type Json = Record<string, unknown>;

function isJson(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function field(value: unknown, key: string): unknown {
  return isJson(value) ? value[key] : undefined;
}

/** The transfer size in bytes of the script row of a Lighthouse report's resource summary. */
export function scriptTransferSize(lhr: unknown): number {
  const items = field(
    field(field(field(lhr, 'audits'), 'resource-summary'), 'details'),
    'items',
  );
  if (!Array.isArray(items)) {
    throw new Error('the report has no resource-summary audit with items');
  }
  const row: unknown = items.find(
    (item: unknown) => field(item, 'resourceType') === 'script',
  );
  const size = field(row, 'transferSize');
  if (typeof size !== 'number') {
    throw new Error(
      'the resource summary has no script row with a transferSize',
    );
  }
  return size;
}

/** The middle value, or the mean of the two middle values for an even count. */
export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median needs at least one value');
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const high = sorted[middle] ?? 0;
  if (sorted.length % 2 === 1) return high;
  return Math.round(((sorted[middle - 1] ?? 0) + high) / 2);
}

/** A measured size passes when it is at most the floor plus the allowed delta. */
export function checkBudget(
  measured: number,
  baseline: Pick<Baseline, 'floorBytes' | 'budgetDeltaBytes'>,
): BudgetResult {
  const limit = baseline.floorBytes + baseline.budgetDeltaBytes;
  return { ok: measured <= limit, limit, measured };
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function pathOf(lhr: unknown): string | undefined {
  const url = field(lhr, 'requestedUrl');
  return typeof url === 'string' ? new URL(url).pathname : undefined;
}

function reportsFor(reportsDir: string, route: string): Json[] {
  if (!existsSync(reportsDir)) {
    throw new Error(
      `${reportsDir} does not exist; run npm run lhci:collect first`,
    );
  }
  const reports = readdirSync(reportsDir)
    .filter((name) => /^lhr-.*\.json$/.test(name))
    .sort()
    .map((name) => readJson(join(reportsDir, name)))
    .filter(isJson)
    .filter((lhr) => pathOf(lhr) === route);
  if (reports.length === 0) {
    throw new Error(
      `no Lighthouse reports for ${route} in ${reportsDir}; run npm run lhci:collect first`,
    );
  }
  return reports;
}

function readBaseline(baselinePath: string): Baseline {
  if (!existsSync(baselinePath)) {
    throw new Error(
      `${baselinePath} is missing; record it with npm run bundle:record`,
    );
  }
  const raw = readJson(baselinePath);
  const floorBytes = field(raw, 'floorBytes');
  const budgetDeltaBytes = field(raw, 'budgetDeltaBytes');
  const route = field(raw, 'route');
  if (
    typeof floorBytes !== 'number' ||
    !Number.isInteger(floorBytes) ||
    floorBytes <= 0 ||
    typeof budgetDeltaBytes !== 'number' ||
    typeof route !== 'string'
  ) {
    throw new Error(
      `${baselinePath} has no valid floorBytes, budgetDeltaBytes and route`,
    );
  }
  return { floorBytes, budgetDeltaBytes, route };
}

function chromeVersion(lhr: unknown): string {
  const agent = field(field(lhr, 'environment'), 'hostUserAgent');
  const match =
    typeof agent === 'string' ? /Chrome\/([\d.]+)/.exec(agent) : null;
  if (!match?.[1])
    throw new Error('the report does not name the Chrome version');
  return match[1];
}

function textField(lhr: unknown, ...path: string[]): string {
  let value: unknown = lhr;
  for (const key of path) value = field(value, key);
  if (typeof value !== 'string') {
    throw new Error(`the report has no ${path.join('.')}`);
  }
  return value;
}

function installedNextVersion(): string {
  const manifest = readJson(join(ROOT, 'node_modules/next/package.json'));
  return textField(manifest, 'version');
}

/** JSON.stringify with short number lists on one line, which is how Prettier keeps them. */
function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(
    /\[\s+([\d,\s]+?)\s+\]/g,
    (_match, inner: string) => `[${inner.split(/\s*,\s*/).join(', ')}]`,
  );
}

type Paths = { reportsDir: string; baselinePath: string };

function record({ reportsDir, baselinePath }: Paths): string {
  const reports = reportsFor(reportsDir, DEFAULT_ROUTE);
  const runBytes = reports.map(scriptTransferSize).sort((a, b) => a - b);
  const first = reports[0];
  const baseline = {
    floorBytes: median(runBytes),
    budgetDeltaBytes: BUDGET_DELTA_BYTES,
    route: DEFAULT_ROUTE,
    measuredAt: new Date().toISOString(),
    preset: textField(first, 'configSettings', 'formFactor'),
    lighthouse: textField(first, 'lighthouseVersion'),
    chrome: chromeVersion(first),
    next: installedNextVersion(),
    runs: reports.length,
    statistic: 'median',
    runBytes,
    command: 'npm run bundle:record',
  };
  writeFileSync(baselinePath, `${formatJson(baseline)}\n`);
  return `bundle: recorded a floor of ${String(baseline.floorBytes)} bytes (median of ${runBytes.join(', ')}) in ${baselinePath}`;
}

function check({ reportsDir, baselinePath }: Paths): {
  ok: boolean;
  message: string;
} {
  const baseline = readBaseline(baselinePath);
  const reports = reportsFor(reportsDir, baseline.route);
  const measured = median(reports.map(scriptTransferSize));
  const result = checkBudget(measured, baseline);
  const summary = `${String(measured)} bytes of script for ${baseline.route} against a limit of ${String(result.limit)} (floor ${String(baseline.floorBytes)} plus ${String(baseline.budgetDeltaBytes)})`;
  return result.ok
    ? { ok: true, message: `bundle: ok, ${summary}` }
    : { ok: false, message: `bundle: over budget, ${summary}` };
}

function option(args: string[], name: string, fallback: string): string {
  const index = args.indexOf(name);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
}

function main(args: string[]): void {
  const paths: Paths = {
    reportsDir: option(args, '--reports-dir', join(ROOT, '.lighthouseci')),
    baselinePath: option(
      args,
      '--baseline',
      join(ROOT, 'docs/bundle-baseline.json'),
    ),
  };
  try {
    if (args.includes('--record')) {
      process.stdout.write(`${record(paths)}\n`);
    } else if (args.includes('--check')) {
      const { ok, message } = check(paths);
      process.stdout.write(`${message}\n`);
      if (!ok) process.exitCode = 1;
    } else {
      throw new Error('pass --record or --check');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`bundle: failed: ${message}\n`);
    process.exitCode = 1;
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main(process.argv.slice(2));
}
