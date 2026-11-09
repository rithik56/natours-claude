// R9, D-10: Lighthouse CI measures the gzipped script transfer size of "/" against `next start`.
// The budget is the recorded floor plus 40 KB, read from docs/bundle-baseline.json.
// There is no upload section, so results stay local and in CI artifacts, never public storage.
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const PORT = 3300;
const BASELINE = join(__dirname, 'docs/bundle-baseline.json');

function budgetFor(baselinePath) {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  return {
    matchingUrlPattern: `^http://localhost:${PORT}${baseline.route}$`,
    assertions: {
      'resource-summary:script:size': [
        'error',
        {
          maxNumericValue: baseline.floorBytes + baseline.budgetDeltaBytes,
          aggregationMethod: 'median',
        },
      ],
    },
  };
}

module.exports = {
  ci: {
    collect: {
      url: [`http://localhost:${PORT}/`],
      numberOfRuns: 3,
      startServerCommand: `node_modules/.bin/next start -p ${PORT}`,
      startServerReadyPattern: 'Ready',
      settings: { chromeFlags: '--no-sandbox --headless=new' },
    },
    assert: {
      assertMatrix: existsSync(BASELINE) ? [budgetFor(BASELINE)] : [],
    },
  },
};
