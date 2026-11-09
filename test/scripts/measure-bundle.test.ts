import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checkBudget,
  median,
  scriptTransferSize,
} from '../../scripts/measure-bundle.ts';

const SCRIPT = join(import.meta.dirname, '../../scripts/measure-bundle.ts');
const FLOOR = 150_000;
const DELTA = 40_960;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.8078.80 Safari/537.36';

function report(url: string, scriptBytes: number) {
  return {
    lighthouseVersion: '13.6.0',
    requestedUrl: url,
    configSettings: { formFactor: 'mobile' },
    environment: { hostUserAgent: USER_AGENT },
    audits: {
      'resource-summary': {
        details: {
          items: [
            { resourceType: 'total', transferSize: scriptBytes + 9_000 },
            { resourceType: 'document', transferSize: 4_000 },
            { resourceType: 'script', transferSize: scriptBytes },
            { resourceType: 'stylesheet', transferSize: 5_000 },
          ],
        },
      },
    },
  };
}

describe('scriptTransferSize', () => {
  it('[R9] returns the transfer size of the script row only', () => {
    expect(scriptTransferSize(report('http://localhost:3300/', 123_456))).toBe(
      123_456,
    );
  });

  it('[R9] throws when the report has no resource-summary audit', () => {
    expect(() => scriptTransferSize({ audits: {} })).toThrow(
      /resource-summary/,
    );
  });

  it('[R9] throws when the resource summary has no script row', () => {
    const lhr = {
      audits: {
        'resource-summary': {
          details: { items: [{ resourceType: 'document', transferSize: 1 }] },
        },
      },
    };
    expect(() => scriptTransferSize(lhr)).toThrow(/script/);
  });
});

describe('median', () => {
  it('[R9] is 20 for 30, 10, 20 and for 10, 20, 30', () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 20, 30])).toBe(20);
  });

  it('[R9] is the mean of the two middle values for an even count', () => {
    expect(median([40, 10, 30, 20])).toBe(25);
  });

  it('[R9] throws for no values', () => {
    expect(() => median([])).toThrow();
  });
});

describe('checkBudget', () => {
  const baseline = { floorBytes: FLOOR, budgetDeltaBytes: DELTA };

  it('[R9] passes at exactly the floor plus 40,960 bytes', () => {
    const result = checkBudget(FLOOR + DELTA, baseline);
    expect(result.ok).toBe(true);
    expect(result.limit).toBe(FLOOR + DELTA);
  });

  it('[R9] fails one byte over the limit and reports the limit', () => {
    const result = checkBudget(FLOOR + DELTA + 1, baseline);
    expect(result.ok).toBe(false);
    expect(result.limit).toBe(FLOOR + DELTA);
    expect(result.measured).toBe(FLOOR + DELTA + 1);
  });
});

describe('measure-bundle CLI', () => {
  let dir = '';
  let reportsDir = '';
  let baselinePath = '';

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'measure-bundle-'));
    reportsDir = join(dir, '.lighthouseci');
    baselinePath = join(dir, 'bundle-baseline.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function run(mode: '--check' | '--record') {
    const result = spawnSync(
      process.execPath,
      [SCRIPT, mode, '--reports-dir', reportsDir, '--baseline', baselinePath],
      { encoding: 'utf8' },
    );
    return {
      status: result.status,
      output: `${result.stdout}${result.stderr}`,
    };
  }

  function writeReports(path: string, sizes: number[]) {
    mkdirSync(reportsDir, { recursive: true });
    sizes.forEach((size, index) => {
      const file = join(reportsDir, `lhr-${String(index)}.json`);
      writeFileSync(file, JSON.stringify(report(path, size)));
    });
  }

  function writeBaseline() {
    const baseline = {
      floorBytes: FLOOR,
      budgetDeltaBytes: DELTA,
      route: '/',
    };
    writeFileSync(baselinePath, JSON.stringify(baseline));
  }

  it('[R9] --check fails and names the reports when the folder is empty', () => {
    mkdirSync(reportsDir);
    writeBaseline();
    const result = run('--check');
    expect(result.status).toBe(1);
    expect(result.output.includes('.lighthouseci')).toBe(true);
  });

  it('[R9] --check fails when the reports folder does not exist', () => {
    writeBaseline();
    expect(run('--check').status).toBe(1);
  });

  it('[R9] --check fails and names the baseline when it is missing', () => {
    writeReports('http://localhost:3300/', [FLOOR, FLOOR, FLOOR]);
    const result = run('--check');
    expect(result.status).toBe(1);
    expect(result.output.includes('bundle-baseline.json')).toBe(true);
  });

  it('[R9] --check ignores reports for other routes, so no data fails', () => {
    writeBaseline();
    writeReports('http://localhost:3300/tours', [FLOOR, FLOOR, FLOOR]);
    expect(run('--check').status).toBe(1);
  });

  it('[R9] --check passes at the limit and fails one byte over', () => {
    writeBaseline();
    writeReports('http://localhost:3300/', [FLOOR + DELTA, 1, FLOOR + DELTA]);
    expect(run('--check').status).toBe(0);
    writeReports('http://localhost:3300/', [
      FLOOR + DELTA + 1,
      1,
      FLOOR + DELTA + 1,
    ]);
    const over = run('--check');
    expect(over.status).toBe(1);
    expect(over.output.includes(String(FLOOR + DELTA))).toBe(true);
  });

  it('[R9] --record writes the median of three runs in any order', () => {
    for (const sizes of [
      [300, 100, 200],
      [100, 200, 300],
      [200, 300, 100],
    ]) {
      writeReports('http://localhost:3300/', sizes);
      expect(run('--record').status).toBe(0);
      const raw = readFileSync(baselinePath, 'utf8');
      const written = JSON.parse(raw) as Record<string, unknown>;
      expect(written.floorBytes).toBe(200);
      expect(raw.endsWith('}\n')).toBe(true);
    }
  });

  it('[R9] --record keeps the provenance next to the figure', () => {
    writeReports('http://localhost:3300/', [310, 100, 200]);
    expect(run('--record').status).toBe(0);
    const written = JSON.parse(readFileSync(baselinePath, 'utf8')) as Record<
      string,
      unknown
    >;
    expect(written.budgetDeltaBytes).toBe(DELTA);
    expect(written.route).toBe('/');
    expect(written.preset).toBe('mobile');
    expect(written.lighthouse).toBe('13.6.0');
    expect(written.chrome).toBe('156.0.8078.80');
    expect(written.runs).toBe(3);
    expect(written.statistic).toBe('median');
    expect(written.runBytes).toEqual([100, 200, 310]);
    expect(typeof written.measuredAt).toBe('string');
    expect(typeof written.next).toBe('string');
  });

  it('[R9] --record writes nothing when there are no reports', () => {
    mkdirSync(reportsDir);
    expect(run('--record').status).toBe(1);
    expect(existsSync(baselinePath)).toBe(false);
  });
});
