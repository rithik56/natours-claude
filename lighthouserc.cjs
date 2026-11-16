// R9, D-10 (ADR 0018, ADR 0034): Lighthouse CI measures the gzipped script transfer size of every
// route in docs/bundle-baseline.json against `next start`, and asserts each one against its own
// budget (the route's floor plus 40 KB). The lazy map allowance is checked by scripts/measure-bundle.ts.
// There is no upload section, so results stay local and in CI artifacts, never public storage.
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const PORT = 3300;
const BASELINE = join(__dirname, 'docs/bundle-baseline.json');

function routesFrom(baselinePath) {
  if (!existsSync(baselinePath)) return [];
  return JSON.parse(readFileSync(baselinePath, 'utf8')).routes;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function budgetFor(route) {
  return {
    matchingUrlPattern: `^http://localhost:${PORT}${escapeRegExp(route.route)}$`,
    assertions: {
      'resource-summary:script:size': [
        'error',
        {
          maxNumericValue: route.floorBytes + route.budgetDeltaBytes,
          aggregationMethod: 'median',
        },
      ],
    },
  };
}

const routes = routesFrom(BASELINE);

module.exports = {
  ci: {
    collect: {
      url:
        routes.length > 0
          ? routes.map((route) => `http://localhost:${PORT}${route.route}`)
          : [`http://localhost:${PORT}/`],
      numberOfRuns: 3,
      startServerCommand: `node_modules/.bin/next start -p ${PORT}`,
      startServerReadyPattern: 'Ready',
      settings: { chromeFlags: '--no-sandbox --headless=new' },
    },
    assert: {
      assertMatrix: routes.map(budgetFor),
    },
  },
};
