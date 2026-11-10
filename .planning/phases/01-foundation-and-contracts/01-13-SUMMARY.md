---
phase: 01-foundation-and-contracts
plan: 13
subsystem: infra
tags: [lighthouse-ci, bundle-budget, r9, ci, next-start, gzip]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plan 01-04 and 01-06 smoke test and CI build job with the documented env; plan 01-03 lint, knip and convention checks that also cover scripts/ and *.cjs; plan 01-12 final Phase 1 home page"
provides:
  - "docs/bundle-baseline.json: the shared R9 floor of 138,107 bytes of gzipped script for / with its provenance"
  - "lighthouserc.cjs: LHCI collect (3 runs, next start on port 3300) and an assertMatrix built from the baseline file, floor plus 40,960, median"
  - "scripts/measure-bundle.ts: scriptTransferSize, median, checkBudget and the --record and --check CLIs"
  - "npm scripts lhci:collect, bundle:record, bundle:check; CI build job step and lighthouse-results artifact"
  - "docs/adr/0018: Lighthouse CI as the R9 measurement (amends R9's per-route wording)"
affects: [phase-2, phase-3, phase-4, phase-7, every phase that adds a page]

actuals:
  tokens: 6600
  tasks: 2
  commits: 3
plan_head_before: 161c188416dda1563f67ceff12707e669d99f10e
plan_head_after: b8ce217e610f7db50e9a48dfb4c58ca0460eef94

tech-stack:
  added: ["@lhci/cli 0.16.0 (exact, dev)", "overrides: basic-ftp 6.2.6"]
  patterns:
    - "The floor is recorded locally with npm run bundle:record and committed; CI only checks"
    - "A check that finds no reports or no baseline fails; it never passes on no data"
    - "The budget in lighthouserc.cjs is computed from docs/bundle-baseline.json, so a later phase adds a URL pattern against the same floor"

key-files:
  created:
    - lighthouserc.cjs
    - scripts/measure-bundle.ts
    - test/scripts/measure-bundle.test.ts
    - docs/bundle-baseline.json
    - docs/adr/0018-javascript-budget-measured-with-lighthouse-ci.md
  modified:
    - package.json
    - package-lock.json
    - eslint.config.mjs
    - .github/workflows/ci.yml

key-decisions:
  - "Floor is the median of 3 mobile-preset runs against next start on /; 138,107 bytes transferred, 457,070 bytes raw, so gzip is in effect (RESEARCH A4 confirmed)"
  - "Check uses lhci assert (resource-summary:script:size, median) and then measure-bundle --check, so both the tool and the script agree"
  - "package.json overrides basic-ftp to 6.2.6 because @lhci/cli's proxy-agent chain brought a high-severity advisory that would fail the CI npm audit step (ADR 0018)"
  - "include-hidden-files: true on the artifact upload, because upload-artifact skips dot folders by default"

patterns-established:
  - "A TDD RED commit may carry a throwaway stub whose exports answer wrongly, so tests fail on assertions rather than on a missing import"
  - "JSON a script writes is run through formatJson so Prettier accepts it with no rewrite"

requirements-completed: [R9]

coverage:
  - id: D1
    description: "The script transfer size, median and budget boundary: exactly floor plus 40,960 passes and one byte more fails; median is order independent; a report without the audit throws"
    requirement: R9
    verification:
      - kind: unit
        ref: "test/scripts/measure-bundle.test.ts#scriptTransferSize, median and checkBudget"
        status: pass
    human_judgment: false
  - id: D2
    description: "--check fails with a clear message with no reports, no reports for the route or no baseline; --record writes the median of three runs in any order with its provenance"
    requirement: R9
    verification:
      - kind: unit
        ref: "test/scripts/measure-bundle.test.ts#measure-bundle CLI"
        status: pass
    human_judgment: false
  - id: D3
    description: "Baseline measured from a real Lighthouse CI run, and bundle:check passes against it locally; the Lighthouse assertion fails when the limit is set one byte under the figure"
    requirement: R9
    verification:
      - kind: integration
        ref: "npm run bundle:check on the built app (exit 0, 138107 against a limit of 179067)"
        status: pass
      - kind: integration
        ref: "lhci assert with a scratch config of 138106: exit 1, found 138107"
        status: pass
    human_judgment: false
  - id: D4
    description: "CI build job runs bundle:check after the smoke test and uploads .lighthouseci as lighthouse-results; no public upload"
    requirement: R9
    verification:
      - kind: other
        ref: "ci.yml parses with Ruby YAML; step order checked by listing the build job's steps"
        status: pass
      - kind: other
        ref: "Not run: GitHub Actions cannot run here, so Chrome discovery and the artifact upload on a runner are unverified"
        status: unrun
    human_judgment: true
    rationale: "The first push to GitHub is the first run of these two steps"

duration: 9min
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 13: JavaScript budget with Lighthouse CI Summary

**R9 as a shared floor: `/` sends 138,107 bytes of gzipped script (median of three mobile-preset Lighthouse 13.6.0 runs on `next start`), CI fails any page over floor plus 40,960 bytes, and `scripts/measure-bundle.ts` records and checks it.**

## Performance

- **Duration:** about 9 min
- **Tasks:** 2 (Task 1 as RED then GREEN)
- **Files:** 5 created, 4 modified

## The measurement

- Command: `APP_ENV=ci APP_URL=http://localhost:3300 MONGODB_URI=... SESSION_SECRET=... npm run bundle:record` after `npm run build`. Lighthouse CI starts `next start -p 3300`, runs Lighthouse 3 times on `http://localhost:3300/` and stops the server.
- Environment: Lighthouse 13.6.0, Google Chrome 156.0.8078.80 (the report's user agent shows the reduced `156.0.0.0`, which is what the baseline holds), mobile preset, headless, Next 16.4.5, macOS. Date 9 Nov 2026.
- Result: **floorBytes 138,107** (the median), budget limit 179,067. Five script files: 72,459, 50,339, 6,579, 4,557 and 4,173 bytes transferred.
- **A4 check (gzip is in effect):** the same five files are 457,070 bytes raw (the report's `resourceSize`), so the transfer is about 30 per cent of the raw size. The whole `.next/static/chunks` folder holds 569,664 bytes of JavaScript raw (174,257 gzipped by my own gzip, for comparison); the page loads only five of those files. The floor is much smaller than the raw chunks.
- **Variation between runs: none.** Three recordings and checks took nine Lighthouse runs and every one gave 138,107 bytes. The figure is the compressed size of fixed files, so it does not depend on timing or load. I have not tested a machine other than this Mac. The floor would change on a rebuild only if the JavaScript changed (chunk contents, hashing or compression settings), or if Next or Chrome changed what is requested.
- **What happens if a later run differs by noise:** the check is `measured <= floor + 40,960` with the median of three, with no margin. A run that is a few bytes higher than the floor still passes, because the 40,960 bytes of headroom sit above the floor. Only a median above 179,067 bytes fails. The floor itself moves only when someone runs `bundle:record` again and commits the new file, and ADR 0018 requires a note for that.
- Boundary proved against the real tool: a scratch `lhci assert` config with a limit of 138,106 exits 1 with "found 138107"; the real config at 179,067 exits 0.

## Accomplishments

- `scripts/measure-bundle.ts` with `scriptTransferSize`, `median`, `checkBudget` and two CLI modes, 16 tests in `test/scripts/measure-bundle.test.ts`, every title tagged `[R9]`.
- `lighthouserc.cjs` with no `upload` section; the budget is read from the baseline file; with no baseline the matrix is empty and `measure-bundle --check` is the one that refuses.
- CI: `npm run bundle:check` after `npm run smoke` with the same env and port 3300, then an `if: always()` upload of `.lighthouseci/` as `lighthouse-results`.
- ADR 0018.

## Task Commits

1. **Task 1 RED** `05bc07d` test(perf): failing tests for the R9 bundle floor script
2. **Task 1 GREEN** `7697af3` feat(perf): record the R9 JavaScript floor with Lighthouse CI
3. **Task 2** `b8ce217` ci(perf): enforce the JavaScript budget in CI; ADR 0018

## TDD record

- **RED:** `test/scripts/measure-bundle.test.ts` against a **throwaway stub** `scripts/measure-bundle.ts` whose three exports answer wrongly (-1, -1 and `ok: false`) and which has no CLI. Without a stub the file would fail on its import, which is `INVALID_RED`. The full run failed 16 of 16 on assertions. The target test `[R9] passes at exactly the floor plus 40,960 bytes` was re-run alone with the TAP reporter (`vitest run ... -t ... --reporter=tap`); the failing message was `expected false to be true`, with no apostrophe or object in it. `gsd-tools check tdd-red-evidence` returned `RED_EVIDENCE_OK` (`target_test_failed`). Semantic assessment: the target ran and failed on `expect(result.ok).toBe(true)` because the stub reports `ok: false`; the planned boundary behaviour was absent, and it was not an import, syntax or fixture fault.
- **GREEN:** the full implementation; 16 of 16 pass. All gates passed before the commit, including `format:check` (see Deviations for the one formatting fix that needed).
- **REFACTOR:** none.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] `basic-ftp` override so the CI audit step still passes**
- **Found during:** Task 1, after `npm install -D @lhci/cli@0.16.0`
- **Issue:** `@lhci/cli` pulls in `proxy-agent`, then `get-uri`, then `basic-ftp` 5.3.1, which has a high-severity advisory (GHSA-c475-qrg2-pj4r, affects up to 6.2.0). CI runs `npm audit --audit-level=high`, which passed before this plan and would fail after it. The lockfile at the plan's base had no high advisories (checked with a scratch copy).
- **Fix:** `"overrides": { "basic-ftp": "6.2.6" }` in `package.json`. This is the same package at its patched release, not a new package; `get-uri` still loads and Lighthouse CI never makes an FTP request. `npm audit --audit-level=high` exits 0 again (eight moderate findings in `minimatch` were already there). Recorded in ADR 0018. The override can go when `get-uri` depends on a patched release.
- **Files modified:** package.json, package-lock.json
- **Commit:** 7697af3

**2. [Rule 3 - Blocking] ESLint failed on `lighthouserc.cjs`**
- **Found during:** Task 1 lint run
- **Issue:** `react/no-danger` sat in a config object with no `files`, so it applied to `*.cjs` files that the react plugin is not registered for ("could not find plugin react"). The plan's "let ESLint treat `*.cjs` as CommonJS" also needed `no-require-imports` and the fs rule off for that file.
- **Fix:** `react/no-danger` moved into a block for `**/*.{js,jsx,mjs,ts,mts,tsx}` (verified it still fires on a `dangerouslySetInnerHTML` probe, which I deleted); a `**/*.cjs` block sets `sourceType: 'commonjs'` and switches off `@typescript-eslint/no-require-imports` and `security/detect-non-literal-fs-filename`.
- **Files modified:** eslint.config.mjs
- **Commit:** 7697af3

**3. [Rule 1 - Bug] The recorded baseline failed `format:check`**
- **Found during:** Task 1 gates
- **Issue:** `JSON.stringify(..., null, 2)` puts each number of `runBytes` on its own line, and Prettier keeps short arrays on one line, so the committed file would have failed CI.
- **Fix:** `formatJson` in the script collapses number lists; the baseline was recorded again with the fixed script (same 138,107 bytes) before committing.
- **Commit:** 7697af3

**4. [Rule 2 - Missing critical] `include-hidden-files: true` on the artifact upload**
- `actions/upload-artifact` v4 and later leave out files in folders that start with a dot, so `.lighthouseci/` would upload nothing. Also `if-no-files-found: ignore`, so a run that failed before collecting does not add a second error. **Commit:** b8ce217

### Other differences from the plan text

- The baseline has extra provenance fields beyond the plan's list: `chrome`, `runs`, `statistic`, `runBytes` and `command` (the user asked for the measurement to be recorded with the figure).
- `knip.json` needed no change: knip passed with `lighthouserc.cjs` and the new script as they are, and the plan says to add it only if knip reports it.
- The `@lhci/cli` install was saved at the exact version (`--save-exact`); the commit body gives the one-line reason (Q11). Nothing else was installed.

## Issues Encountered

None beyond the deviations. Process hygiene: after every Lighthouse run and the final one I checked `lsof -i :3300` and `pgrep -fl "next start|lhci|next-server"`; nothing was left running. I touched no Chrome window of the user's.

## CI steps I could not run

GitHub Actions cannot run here. I ran locally, in the CI order: build, then `npm run bundle:check` with the smoke env on port 3300 (exit 0). I did **not** run: the workflow on GitHub, `npm run smoke` itself in this plan (unchanged, ran in earlier plans), `npm ci` from the new lockfile, or the artifact upload. Chrome on a runner: GitHub's ubuntu images ship Google Chrome and `chrome-launcher` finds it, but I could not confirm it, so the first push is the first proof. Locally LHCI found Chrome by itself with no `CHROME_PATH`. If a runner cannot launch Chrome, the flag to adjust is the one RESEARCH A8 names (`--no-sandbox`, already set).

## Known Stubs

None. The RED stub was replaced in `7697af3`.

## Threat Flags

None. T-01-51 (no upload target), T-01-52 (CI only checks) and T-01-SC (exact approved version) are as planned.

## Facts for later plans

- A page joins the budget by adding its URL to `collect.url` and one entry to `assertMatrix` in `lighthouserc.cjs`; `scripts/measure-bundle.ts` records and checks only `/` today (it reads the route from the baseline), so a second route needs a small change there.
- `npm run bundle:check` needs a fresh `npm run build`, MongoDB for no route in Phase 1 but the config env (`APP_ENV=ci`, `APP_URL=http://localhost:3300`, `MONGODB_URI`, `SESSION_SECRET`), and port 3300 free.
- Any change to the root layout's JavaScript can move the figure; if the figure moves legitimately, re-record with `npm run bundle:record` and add a row to ADR 0018's table.

## Self-Check: PASSED

Checked after writing: each created file exists (lighthouserc.cjs, scripts/measure-bundle.ts, test/scripts/measure-bundle.test.ts, docs/bundle-baseline.json, docs/adr/0018-javascript-budget-measured-with-lighthouse-ci.md) and each commit (05bc07d, 7697af3, b8ce217) is an ancestor of HEAD.
