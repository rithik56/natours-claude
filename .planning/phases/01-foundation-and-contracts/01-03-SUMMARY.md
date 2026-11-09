---
phase: 01-foundation-and-contracts
plan: 03
subsystem: infra
tags: [eslint, prettier, stylelint, knip, github-actions, dependabot]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plan 01-01 Next.js app, Vitest harness and lockfile"
provides:
  - "ESLint flat config with the Q2 rules, S21 react/no-danger error and the model, zod and next/cache import limits"
  - "Prettier, stylelint and knip configured and passing, with no knip ignore list"
  - "R2 client-boundary check and Q3/Q5/R6 conventions check as Node-native scripts with tests"
  - "CI workflow (checks and build jobs) and Dependabot for npm and GitHub Actions"
  - "ADR 0009 recording the lint and format deviations"
affects: [01-04, 01-05, 01-06, 01-13, 01-15]

actuals:
  tokens: 8200
  tasks: 3
  commits: 6
plan_head_before: e00df1e548e318cf394e106aebf5ccaf0325f4d3
plan_head_after: b8deb70e20389392e9ba50ea5df1eb0952ec7e85

tech-stack:
  added: [eslint-plugin-security 4.2.1, stylelint 18.0.0, stylelint-config-standard 41.0.0, prettier 3.9.10, knip 6.44.2]
  patterns:
    - "Every CI step is an npm script a developer also runs locally"
    - "Check scripts export pure functions for tests and run their CLI only when executed directly"
    - "Probe sources in tests are single-line strings joined with newlines, so check:conventions never reads them as code"

key-files:
  created:
    - .prettierrc.json
    - .prettierignore
    - stylelint.config.mjs
    - knip.json
    - scripts/check-client-boundaries.ts
    - scripts/check-conventions.ts
    - test/tooling/eslint-rules.test.ts
    - test/scripts/check-client-boundaries.test.ts
    - test/scripts/check-conventions.test.ts
    - .github/workflows/ci.yml
    - .github/dependabot.yml
    - docs/adr/0009-lint-and-format-rule-adjustments.md
  modified:
    - eslint.config.mjs
    - package.json
    - package-lock.json
    - vitest.config.ts (renamed to vitest.config.mts)
    - src/server/config-schema.ts
    - docker-compose.yml
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/readyz/route.ts
    - test/app/readyz.test.ts
    - test/app/readyz-unavailable.test.ts
    - tsconfig.json

key-decisions:
  - "package.json gets \"type\": \"module\" so Node runs the TypeScript scripts as ES modules without a warning; vitest.config.ts also renamed to .mts"
  - "security/detect-object-injection off (plan), and security/detect-non-literal-fs-filename off for scripts/** and test/** only (added); both in ADR 0009"
  - "server-only is aliased in Vitest to the package's own empty.js, so test/empty.ts is deleted instead of added to a knip ignore list"
  - "CI audit gate is --audit-level=high; the moderate minimatch advisory through eslint-config-next does not fail it"

patterns-established:
  - "Regexes that safe-regex flags are split into small patterns or helper functions rather than suppressed"

requirements-completed: [Q2, Q3, Q4, Q5, Q11, R1, R2, S18, S21]

coverage:
  - id: D1
    description: "ESLint reports react/no-danger, no-console, cross-module model imports, zod and next/cache outside their files as errors, and nothing for variable-key access"
    requirement: S21
    verification:
      - kind: unit
        ref: "test/tooling/eslint-rules.test.ts#[S21] react/no-danger is an error, even with an empty string"
        status: pass
      - kind: unit
        ref: "test/tooling/eslint-rules.test.ts#[Q4] importing another module model from src is restricted"
        status: pass
    human_judgment: false
  - id: D2
    description: "Client-boundary check enforces the next-line // client: reason, a non-empty reason, directive placement and no server imports; zero client files pass"
    requirement: R2
    verification:
      - kind: unit
        ref: "test/scripts/check-client-boundaries.test.ts#[R2] fails when a blank line separates the directive and the comment"
        status: pass
      - kind: other
        ref: "npm run check:client prints Checked 0 client files and exits 0; a temporary src file with a bare directive exits 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "Conventions check fails kebab-case, bare TODO, commented-out code, Action naming and server-only first-import violations"
    requirement: Q5
    verification:
      - kind: unit
        ref: "test/scripts/check-conventions.test.ts#[Q5] rejects a TODO without an issue link"
        status: pass
      - kind: other
        ref: "npm run check:conventions passes on the repository; a temporary BadFile.tsx with a bare TODO is reported"
        status: pass
    human_judgment: false
  - id: D4
    description: "CI workflow runs every quality gate and a no-env build; Dependabot checks npm and github-actions weekly"
    requirement: S18
    verification:
      - kind: other
        ref: "Ruby YAML parse of both files, grep for each command, and the same commands run in a fresh clone with npm ci"
        status: pass
      - kind: other
        ref: "First GitHub Actions run on Linux"
        status: unknown
    human_judgment: true
    rationale: "GitHub Actions cannot run here; the workflow is only proven by the first push"

duration: 25min
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 03: Lint, format and CI gates Summary

**ESLint security and import rules, Prettier, stylelint, knip, two Node-native check scripts (R2 client boundary; Q3/Q5/R6 conventions) and a GitHub Actions workflow that runs all of them plus audit, coverage and a no-env build.**

## Performance

- **Duration:** about 25 min
- **Completed:** 2026-11-09
- **Tasks:** 3 of 3
- **Files modified:** 25 across the six task commits

## Accomplishments

- Rules that matter now fail with an error: `react/no-danger` (S21), `no-console`, importing another module's model, `zod` and `next/cache` outside their allowed files. Nine ESLint probe tests and 29 script tests prove them.
- `npm run lint` (max-warnings 0), `lint:css`, `format:check`, `check:client`, `check:conventions`, `knip`, `typecheck`, `test:coverage` and `build` all pass. The same sequence passed in a fresh clone after `npm ci`.
- `ci.yml` has a `checks` job and a `build` job with no `env:` block. Dependabot covers npm and github-actions weekly.

## Task Commits

1. **Task 1 RED:** `4be4200` (test) - nine ESLint probes, five failing on the old config
2. **Task 1 GREEN:** `4455b74` (feat) - config, installs, scripts; then `3a80a58` (chore) - knip findings, vitest `.mts` and the one-off Prettier pass
3. **Task 2 RED:** `39304ad` (test) - stub scripts and 29 tests, 16 failing on assertions
4. **Task 2 GREEN:** `0a219b3` (feat) - both checks, `"type": "module"`, scripts override
5. **Task 3:** `b8deb70` (ci) - workflow, Dependabot, ADR 0009

**Plan metadata:** added in the final docs commit.

## Files Created/Modified

See the frontmatter lists. The reformatted plan 01-01 files, `docker-compose.yml` and `tsconfig.json` changed only by `npm run format`.

## Decisions Made

- **Module type (open item from 01-01):** the Vite warning was fixed by renaming `vitest.config.ts` to `.mts`. Running the scripts then showed Node's `MODULE_TYPELESS_PACKAGE_JSON` warning, so `"type": "module"` was added as well. `npm test`, `npm run build`, `npm run typecheck` and `npm run lint` pass with it. The `.mts` rename is now redundant but harmless; it is left in place.
- **Audit gate:** CI uses `--audit-level=high`. The local run reports 8 moderate advisories and exits 0.
- **knip, `configSchema`:** the export had no importer, so it is no longer exported. Plan 01-04 can export it again if its config check imports it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] knip reported `test/empty.ts` unused**
- **Found during:** Task 1
- **Issue:** the Vitest alias points at the file by path, which knip cannot see; the plan forbids an ignore list.
- **Fix:** alias `server-only` to `node_modules/server-only/empty.js` (the package's own empty module) and delete `test/empty.ts`.
- **Files modified:** `vitest.config.mts`, `test/empty.ts` (deleted)
- **Committed in:** `4455b74` (deletion, staged early) and `3a80a58` (alias)

**2. [Rule 3 - Blocking] knip reported `configSchema` as an unused export**
- **Fix:** removed `export`. **Committed in:** `3a80a58`

**3. [Rule 1 - Bug] Unsafe regex warnings and fs-filename warnings broke `--max-warnings=0` in the new scripts**
- **Fix:** replaced nested-quantifier regexes with small patterns and helpers; turned off `security/detect-non-literal-fs-filename` for `scripts/**` and `test/**` only (ADR 0009).
- **Committed in:** `0a219b3`

**4. [Rule 3 - Blocking] Node warned about a typeless package.json when running the scripts**
- **Fix:** `"type": "module"` in `package.json`. **Committed in:** `0a219b3`

**5. Out-of-list files staged.** `npm run format` (which the plan orders) reformatted `docker-compose.yml`, `tsconfig.json`, three `src/` files, one `src/server` file and two tests from plan 01-01. They were committed in `3a80a58` because `format:check` fails otherwise. `.gsd/` was added to `.prettierignore` because the orchestrator's sentinel files there failed `format:check`.

**6. Commit-message slips (not amendable).** The `39304ad` body says 17 tests fail; the correct number is 16. `4455b74` also carries the staged deletion of `test/empty.ts` and the rename to `vitest.config.mts`, so that one commit is not green on its own; `3a80a58` completes it.

**Total deviations:** 6 (4 Rule 3, 1 Rule 1, 1 scope note). **Impact:** no scope added beyond what keeps the plan's own gates green.

## TDD Gate Compliance

RED then GREEN for both tasks. Task 1 RED: `npx vitest run test/tooling/eslint-rules.test.ts --reporter=tap` gave 5 of 9 failing on assertions ("expected [] to have a length of 1"); `check tdd-red-evidence` returned `RED_EVIDENCE_OK`. Semantic assessment: the target test ran and failed because the old config had no such rule, not because of a load error. Task 2 RED: stubs returned no violations, 16 of 29 tests failed on assertions, `RED_EVIDENCE_OK`. The GREEN commits are `feat(lint)` and `feat(checks)`; the project's commit format puts the plan number last, so the gate's `feat(1-3):` grep will not match them. Order is test then feat for both tasks.

## Issues Encountered

- `ugrep` as `grep` was handled with `/usr/bin/grep -e`/`--` in checks.
- `npm install` warned that `fsevents` and `mongodb-memory-server` have install scripts not covered by `allowScripts`. Nothing was changed; the test mongod still downloads and runs.

## What could not be run

- **GitHub Actions itself.** The workflow was YAML-parsed with Ruby, grepped for each command, and its commands were run in a fresh local clone after `npm ci` (all passed). It has not run on a GitHub runner.
- **Linux.** Everything ran on macOS arm64. The pinned test mongod (8.0.34) is therefore still unconfirmed on Linux; the first `npm run test:coverage` step in CI is what will confirm it.
- **Dependabot.** The file is parsed but nothing validated it against GitHub.

## User Setup Required

None. Push the branch and check that the first CI run is green (success criterion 4 for Phase 1 depends on it).

## Next Phase Readiness

Plans 01-04 onward can add their steps to `ci.yml`. `npm run check:conventions` already covers `scripts/` and `test/`, so new files there must be kebab-case and have no bare TODO. Any new file under `src/server/` must start with `import 'server-only';`.

## Self-Check: PASSED

All created files and the six task commits were found.
