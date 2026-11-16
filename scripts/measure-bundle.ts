import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

// R9, D-10 as amended (ADR 0018, ADR 0034): every route in docs/bundle-baseline.json has its own
// JavaScript budget. The eager budget is the gzipped script transfer size that Lighthouse CI
// measures against `next start` (the mobile preset): the route's floor plus its delta. A route with
// a lazy allowance also has the gzipped size of the production chunks that carry its lazy marker
// checked against that allowance. Each marked chunk Lighthouse loaded is taken out of the eager
// bytes first, so it is budgeted once, under the lazy allowance (ADR 0034).
//   --record [--route <path>]  re-measures one route's floor from the reports in .lighthouseci and
//                              rewrites only that route's entry (default route "/")
//   --check                    checks every route's eager script and lazy allowance (run in CI)
// Run `npm run lhci:collect` first; the npm scripts bundle:record and bundle:check do.

const ROOT = join(import.meta.dirname, '..');
const BUDGET_DELTA_BYTES = 40_960;
const DEFAULT_ROUTE = '/';

export type RouteBaseline = {
  route: string;
  floorBytes: number;
  budgetDeltaBytes: number;
  lazyAllowanceBytes?: number;
  lazyMarker?: string;
};

export type Baseline = { routes: RouteBaseline[] };

export type BudgetResult = { ok: boolean; limit: number; measured: number };

type Json = Record<string, unknown>;
type ScriptRequest = { url: string; transferSize: number };
type Paths = { reportsDir: string; baselinePath: string; staticDir: string };
type Line = { ok: boolean; message: string };

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
  baseline: Pick<RouteBaseline, 'floorBytes' | 'budgetDeltaBytes'>,
): BudgetResult {
  const limit = baseline.floorBytes + baseline.budgetDeltaBytes;
  return { ok: measured <= limit, limit, measured };
}

/**
 * The summed gzipped size of every .js and .css file under staticDir whose bytes contain the
 * marker. Leaflet's own JavaScript and CSS carry the marker, so this is the map's lazy cost.
 */
export function lazyChunkBytes(staticDir: string, marker: string): number {
  if (!existsSync(staticDir)) {
    throw new Error(`${staticDir} does not exist; run npm run build first`);
  }
  let total = 0;
  const names = readdirSync(staticDir, { recursive: true, encoding: 'utf8' });
  for (const name of names) {
    if (!/\.(js|css)$/.test(name)) continue;
    const bytes = readFileSync(join(staticDir, name));
    if (bytes.includes(marker)) total += gzipSync(bytes).length;
  }
  return total;
}

const STATIC_PREFIX = '/_next/static/';

/** The Script requests of a report's network-requests audit, with their transfer sizes. */
function scriptRequests(lhr: unknown): ScriptRequest[] {
  const items = field(
    field(field(lhr, 'audits'), 'network-requests'),
    'details',
  );
  const list = field(items, 'items');
  if (!Array.isArray(list)) {
    throw new Error('the report has no network-requests audit with items');
  }
  return list.flatMap((item: unknown) => {
    if (field(item, 'resourceType') !== 'Script') return [];
    const url = field(item, 'url');
    const transferSize = field(item, 'transferSize');
    if (typeof url !== 'string' || typeof transferSize !== 'number') {
      throw new Error('a script request in the report has no url or size');
    }
    return [{ url, transferSize }];
  });
}

/** The file under staticDir that a /_next/static URL is served from, if it exists. */
function staticFileOf(url: string, staticDir: string): string | undefined {
  const { pathname } = new URL(url);
  if (!pathname.startsWith(STATIC_PREFIX)) return undefined;
  const file = join(staticDir, pathname.slice(STATIC_PREFIX.length));
  return existsSync(file) ? file : undefined;
}

/**
 * The eager script bytes of one Lighthouse run. A route with a lazy marker has its marked script
 * requests taken out: each one is a chunk the lazy allowance already counts, so it is budgeted once,
 * there (ADR 0034). Every other route is measured exactly as the resource summary has it.
 */
export function eagerScriptBytes(
  lhr: unknown,
  staticDir: string,
  lazyMarker?: string,
): number {
  const total = scriptTransferSize(lhr);
  if (lazyMarker === undefined) return total;
  if (!existsSync(staticDir)) {
    throw new Error(`${staticDir} does not exist; run npm run build first`);
  }
  let lazy = 0;
  for (const request of scriptRequests(lhr)) {
    const file = staticFileOf(request.url, staticDir);
    if (file !== undefined && readFileSync(file).includes(lazyMarker)) {
      lazy += request.transferSize;
    }
  }
  return total - lazy;
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

/** The raw route entries of the baseline file, kept as read so --record leaves others alone. */
function readRoutes(baselinePath: string): Json[] {
  const routes = field(readJson(baselinePath), 'routes');
  if (!Array.isArray(routes) || !routes.every(isJson)) {
    throw new Error(`${baselinePath} has no routes array`);
  }
  return routes;
}

function routeBaseline(entry: Json, baselinePath: string): RouteBaseline {
  const route = field(entry, 'route');
  const floorBytes = field(entry, 'floorBytes');
  const budgetDeltaBytes = field(entry, 'budgetDeltaBytes');
  if (
    typeof route !== 'string' ||
    typeof floorBytes !== 'number' ||
    !Number.isInteger(floorBytes) ||
    floorBytes <= 0 ||
    typeof budgetDeltaBytes !== 'number'
  ) {
    throw new Error(
      `${baselinePath} has an entry without a valid route, floorBytes and budgetDeltaBytes`,
    );
  }
  const lazyAllowanceBytes = field(entry, 'lazyAllowanceBytes');
  if (lazyAllowanceBytes === undefined) {
    return { route, floorBytes, budgetDeltaBytes };
  }
  const lazyMarker = field(entry, 'lazyMarker');
  if (
    typeof lazyAllowanceBytes !== 'number' ||
    typeof lazyMarker !== 'string' ||
    lazyMarker === ''
  ) {
    throw new Error(
      `${baselinePath}: ${route} needs a numeric lazyAllowanceBytes and a non-empty lazyMarker`,
    );
  }
  return {
    route,
    floorBytes,
    budgetDeltaBytes,
    lazyAllowanceBytes,
    lazyMarker,
  };
}

function readBaseline(baselinePath: string): Baseline {
  if (!existsSync(baselinePath)) {
    throw new Error(
      `${baselinePath} is missing; record it with npm run bundle:record`,
    );
  }
  return {
    routes: readRoutes(baselinePath).map((entry) =>
      routeBaseline(entry, baselinePath),
    ),
  };
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

function record(paths: Paths, route: string): string {
  const entries = existsSync(paths.baselinePath)
    ? readRoutes(paths.baselinePath)
    : [];
  const existing = entries.find((entry) => field(entry, 'route') === route);
  // The floor is measured the way --check measures it, so a lazy route's floor leaves out its chunk.
  const lazyMarker = existing
    ? routeBaseline(existing, paths.baselinePath).lazyMarker
    : undefined;
  const reports = reportsFor(paths.reportsDir, route);
  const runBytes = reports
    .map((lhr) => eagerScriptBytes(lhr, paths.staticDir, lazyMarker))
    .sort((a, b) => a - b);
  const first = reports[0];
  const measured: Json = {
    floorBytes: median(runBytes),
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
  const merged: Json = {
    ...(existing ?? { budgetDeltaBytes: BUDGET_DELTA_BYTES, route }),
    ...measured,
  };
  const routes = existing
    ? entries.map((entry) => (entry === existing ? merged : entry))
    : [...entries, merged];
  writeFileSync(paths.baselinePath, `${formatJson({ routes })}\n`);
  return `bundle: recorded a floor of ${String(merged.floorBytes)} bytes for ${route} (median of ${runBytes.join(', ')}) in ${paths.baselinePath}`;
}

function checkRoute(entry: RouteBaseline, paths: Paths): Line[] {
  const reports = reportsFor(paths.reportsDir, entry.route);
  const measured = median(
    reports.map((lhr) =>
      eagerScriptBytes(lhr, paths.staticDir, entry.lazyMarker),
    ),
  );
  const eager = checkBudget(measured, entry);
  const taken =
    entry.lazyMarker === undefined
      ? ''
      : ', with the lazy chunk bytes taken out';
  const lines: Line[] = [
    {
      ok: eager.ok,
      message: `bundle: ${eager.ok ? 'ok' : 'over budget'}, ${String(measured)} bytes of script for ${entry.route}${taken} against a limit of ${String(eager.limit)} (floor ${String(entry.floorBytes)} plus ${String(entry.budgetDeltaBytes)})`,
    },
  ];
  if (
    entry.lazyAllowanceBytes !== undefined &&
    entry.lazyMarker !== undefined
  ) {
    const lazy = lazyChunkBytes(paths.staticDir, entry.lazyMarker);
    const ok = lazy <= entry.lazyAllowanceBytes;
    lines.push({
      ok,
      message: `bundle: ${ok ? 'ok' : 'over budget'}, ${String(lazy)} bytes of lazy script and style marked "${entry.lazyMarker}" for ${entry.route} against an allowance of ${String(entry.lazyAllowanceBytes)}`,
    });
  }
  return lines;
}

function check(paths: Paths): { ok: boolean; messages: string[] } {
  const baseline = readBaseline(paths.baselinePath);
  const lines = baseline.routes.flatMap((entry) => checkRoute(entry, paths));
  return {
    ok: lines.every((line) => line.ok),
    messages: lines.map((line) => line.message),
  };
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
    staticDir: option(args, '--static-dir', join(ROOT, '.next/static')),
  };
  try {
    if (args.includes('--record')) {
      const route = option(args, '--route', DEFAULT_ROUTE);
      if (!route.startsWith('/')) {
        throw new Error(`--route must be a path starting with /, got ${route}`);
      }
      process.stdout.write(`${record(paths, route)}\n`);
    } else if (args.includes('--check')) {
      const { ok, messages } = check(paths);
      for (const message of messages) process.stdout.write(`${message}\n`);
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
