---
phase: 01-foundation-and-contracts
plan: 15
subsystem: infra
tags: [ci, github-actions, mongodb, lighthouse, hygiene, traceability]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plans 01-01 to 01-14: the whole Phase 1 codebase, the CI workflow, the JavaScript budget and the README that this plan verifies"
provides:
  - "A local gate that passes from a clean clone and in the working repository, in CI order"
  - "A green GitHub Actions run (checks and build jobs) on the phase branch, which meets Phase 1 success criterion 4 on GitHub"
  - "scripts/ci-mongo.ts and the ci:mongo script: MongoDB served from the test binary for the CI build job (ADR 0026)"
  - "next.config.ts agentRules: false, so next dev stops writing an untracked AGENTS.md"
  - "README, ADR 0026, ADR 0018 and ADR 0001 corrected to say what has and has not been verified on a runner"
affects: [phase-2, phase-8]

actuals:
  tokens: 2350
  tasks: 3
  commits: 6
plan_head_before: 783b71833a42b31413cfba5c51c6eb19aeb10477
plan_head_after: 2e59c339ee40fa05b745a9f69d565cf87df05683

tech-stack:
  added: []
  patterns:
    - "CI starts MongoDB from the same downloaded test binary and version that the tests use, through a background script, instead of a service container"

key-files:
  created:
    - scripts/ci-mongo.ts
    - test/scripts/ci-mongo.test.ts
    - docs/adr/0026-ci-build-job-uses-the-test-mongod-binary.md
  modified:
    - .github/workflows/ci.yml
    - next.config.ts
    - test/next-config.test.ts
    - package.json
    - README.md
    - docs/adr/README.md
    - docs/adr/0018-javascript-budget-measured-with-lighthouse-ci.md
    - docs/adr/0001-versions.md

key-decisions:
  - "Push the phase branch only, not main (the user's decision; main is protected)"
  - "Keep the basic-ftp override at 6.2.6 (the user's decision; ADR 0018)"
  - "The CI build job starts MongoDB from the test binary instead of a mongo:8.0 service container (ADR 0026)"

requirements-completed: [Q1, Q2, Q6, Q8, Q11, S18, D9]

coverage:
  - id: D1
    description: "A fresh clone of the phase branch installs with npm ci and passes typecheck and the test suite"
    requirement: Q11
    verification:
      - kind: other
        ref: "git clone, npm ci, npm run typecheck, TZ=UTC npm test in the clone: 43 files, 588 tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every quality gate passes locally in CI order, and the repository hygiene and traceability rules hold"
    requirement: S18
    verification:
      - kind: other
        ref: "the plan's second and third verify commands (gates in CI order; tracked-file, requirement-tag, Conventional Commit, plan.md and seed/ checks)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The GitHub Actions run for the phase branch HEAD finishes with conclusion success in both jobs"
    requirement: Q2
    verification:
      - kind: other
        ref: "https://github.com/rithik56/natours-claude/actions/runs/42655320866 (commit cf7ae39, 9 Nov 2026)"
        status: pass
    human_judgment: false
  - id: D4
    description: "next dev writes no AGENTS.md"
    requirement: D9
    verification:
      - kind: unit
        ref: "test/next-config.test.ts"
        status: pass
    human_judgment: false

duration: not measured
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 15: Close the phase, local gate and green CI Summary

**Phase 1 passes every gate from a clean clone and locally, and GitHub Actions run 42655320866 on the phase branch ended in success in both jobs after the build job was moved off the mongo:8.0 service container.**

## Performance

- **Duration:** not measured. The plan ran across several dispatches, with user decisions in between. Commits run from 21:11 IST to 21:57 IST on 9 Nov 2026 and later, and the docs commits above came after the green run.
- **Completed:** 2026-11-09
- **Tasks:** 3 (Task 2 and Task 3 as adapted below)
- **Files:** 3 created, 8 modified (outside `.planning/`)

## Accomplishments

- **Task 1, local gate.** A clean clone of the phase branch passed `npm ci`, `npm run typecheck` and `TZ=UTC npm test` (43 files, 588 tests). In the working repository, every gate exited 0 in CI order: typecheck, lint, lint:css, format:check, check:client, check:conventions, check:env, knip, `npm audit --audit-level=high` (a moderate `minimatch` advisory only), test:coverage, build, smoke, and bundle:check at 138107 bytes against a limit of 179067. The plan's third verify command exited 0: `.env.example` is tracked and no other `.env*`; no tracked build output; all 17 requirement IDs (S1, S3, S9, S10, S11, S14, S18, S21, B5, B9, B10, B13, B14, B17, B18, B19, B20) have a tagged test; every commit subject since `6aaff4f` is a Conventional Commit; `plan.md` and `seed/` are unchanged; the four user files (`.claude/settings.json`, `.planning/PROJECT.md`, `.planning/config.json`, `.planning/state.json`) appear in no commit.
- **Task 2, push decision, as adapted.** The plan assumed the Phase 1 commits were on `main`. They were on `gsd/phase-01-foundation-and-contracts`, created at the user's request because `main` is protected (86 commits ahead of `origin/main` then, 9 of them earlier planning commits; local `main` held none of the code). The user decided: "Push the phase branch only". The user also decided to keep the `basic-ftp` override at 6.2.6 (ADR 0018). The plan's Task 3 criterion `git rev-list --count origin/main..main` printing 0 does not apply, and `main` on GitHub was never changed.
- **Task 3, push and CI, as adapted.** The first push was rejected because the `gh` token lacked the `workflow` scope, which a branch that adds `.github/workflows/ci.yml` needs. The user pushed the branch themselves (to `028ff19`) and later granted the scope; the orchestrator pushed `028ff19..cf7ae39` to the same branch with no force.
  - **First run** (id 42652817012, commit `028ff19`): the `checks` job passed every step on ubuntu-latest, including `Test with coverage` with the pinned test `mongod` 8.0.34, so that binary is confirmed on Linux. The `build` job failed at "Initialize containers": the `mongo:8.0` service container went unhealthy and MongoDB logged `MongoDB cannot start: Linux kernel versions 6.19 and newer has a known incompatibility with this version of MongoDB (SERVER-121912)`. SERVER-121912 is titled "Upgrade tcmalloc to include rseq bug fix", Closed, resolution "Gone away", no fix version.
  - **Fix attempt 1 of the plan's 2** (the user chose the in-memory `mongod` option): `5b665f0` (RED test), `ffd21bb` (`scripts/ci-mongo.ts`, npm script `ci:mongo`), `cf7ae39` (the `build` job starts the script instead of a service container; ADR 0026; README).
  - **Second run** ([42655320866](https://github.com/rithik56/natours-claude/actions/runs/42655320866), commit `cf7ae39`): conclusion success, and the `build` and `checks` jobs both succeeded. In the `build` job every step passed: "Start MongoDB from the test binary" (connected after 2 tries, readiness line printed), Build, "Generate a session secret for the smoke run" (so the `$GITHUB_ENV` hand-off works), "Smoke test the built app" (`smoke: ok`), "Check the JavaScript budget" (`bundle: ok, 138229 bytes of script for / against a limit of 179067 (floor 138107 plus 40960)`, 3 Lighthouse runs, so Chrome works on the runner and the Linux figure is 122 bytes above the Mac floor), and "Upload Lighthouse results". Phase 1 success criterion 4 is met on GitHub, on the phase branch.
- **Docs corrected after the green run** (`2dcd0ff`, `2e59c33`): see Deviations 5.

## Task Commits

1. **Task 1: local gate, hygiene and traceability** - no commit of its own; verification only. Its one fix is `028ff19` (Deviation 1).
2. **Task 2: push decision** - no commit (a user decision).
3. **Task 3: push and CI** - fix commits `5b665f0`, `ffd21bb`, `cf7ae39` (Deviation 3), then docs commits `2dcd0ff` and `2e59c33` (Deviation 5).

All commits of this plan, from `git log --oneline 783b718..HEAD`:

- `028ff19` fix(config): stop next dev writing AGENTS.md [D9] (01-15)
- `5b665f0` test(ci): parse the CI MongoDB port and host [Q2, S18] (01-15)
- `ffd21bb` feat(ci): add a script that serves MongoDB from the test binary [Q2, S18] (01-15)
- `cf7ae39` fix(ci): start MongoDB from the test binary in the build job [Q2, S18] (01-15)
- `2dcd0ff` docs(readme): record the green GitHub Actions run [Q2, S18] (01-15)
- `2e59c33` docs(adr): record the green run in ADRs 0026, 0018 and 0001 [Q2, S18] (01-15)

**Plan metadata:** the docs commit that adds this file.

## Files Created/Modified

- `scripts/ci-mongo.ts` - starts a `MongoMemoryServer` on 127.0.0.1 from the pinned test binary; stops it on SIGINT and SIGTERM
- `test/scripts/ci-mongo.test.ts` - unit test for `parseMongoOptions`
- `.github/workflows/ci.yml` - `build` job has no `services:` block and starts `npm run ci:mongo` in the background
- `package.json` - adds the `ci:mongo` script (no dependencies added)
- `next.config.ts`, `test/next-config.test.ts` - `agentRules: false`, with a test
- `docs/adr/0026-ci-build-job-uses-the-test-mongod-binary.md`, `docs/adr/README.md` - the decision, its index row, and (in `2e59c33`) an Outcome section
- `README.md` - the script note and the verified / not verified lists
- `docs/adr/0018-javascript-budget-measured-with-lighthouse-ci.md`, `docs/adr/0001-versions.md` - one sentence each

## Decisions Made

- Push the phase branch only, not `main` (the user's decision, given that `main` is protected).
- Keep the `basic-ftp` override at 6.2.6 (the user's decision).
- Replace the `mongo:8.0` service container with a `mongod` started from the test binary, because the container cannot start on the runner kernel and no fixed image tag is documented (ADR 0026).

## Deviations from Plan

**1. [Orchestrator request] `next dev` no longer writes AGENTS.md**
- **Found during:** Task 1 (flagged by plan 01-14 as an open issue).
- **Fix:** `agentRules: false` in `next.config.ts`, with a test. In a throwaway clone, `next dev` with `CLAUDECODE=1` wrote no `AGENTS.md` with the setting and wrote one without it.
- **Not confirmed:** behaviour in a plain terminal with no agent detected, and through `npm run dev`.
- **Committed in:** `028ff19`

**2. [Plan assumption wrong] The push target was the phase branch, not `main`**
- The plan said `git push origin main` and that Phase 1 commits were on `main`. They were on `gsd/phase-01-foundation-and-contracts`. The user chose to push that branch only. The Task 3 check `git rev-list --count origin/main..main` = 0 and the `gh run list --branch main` verify command do not apply. The run was found by commit and branch instead.

**3. [Rule 1 - Bug] The CI `build` job could not start its MongoDB service container**
- **Found during:** Task 3 (first run).
- **Issue:** `mongo:8.0` is incompatible with the runner's Linux kernel (SERVER-121912), so "Initialize containers" failed and no step of the `build` job ran.
- **Fix:** attempt 1 of 2, as described above. The `checks` job and the other steps are untouched.
- **Files modified:** `.github/workflows/ci.yml`, `package.json`, `scripts/ci-mongo.ts`, `test/scripts/ci-mongo.test.ts`
- **Committed in:** `5b665f0`, `ffd21bb`, `cf7ae39`
- **Consequence:** CI no longer exercises the `mongo:8.0` image or `docker-compose.yml`. Local development still uses the compose file.

**4. [Rule 2 - Decision record] ADR 0026 added**
- A change of CI design needs an ADR (Q8). `ci.yml` is also not in this plan's `files_modified` (which is empty), so the whole of Deviation 3 is outside the plan as written. It was done with the user's choice of the in-memory `mongod` option.

**5. [Rule 2 - Docs made accurate] Statements about CI being unverified**
- Once run 42655320866 passed, these sentences were corrected, minimally (`2dcd0ff`, `2e59c33`):
  - `README.md`, "Quality gates": the "has not yet passed" bullet is replaced by a paragraph with the run URL, the date and what ran; the unverified list is now the `mongo:8.0` service container on a runner, branch protection and the pull request flow, and `npm run dev` agent detection, plus the existing `basic-ftp` bullet.
  - `docs/adr/0026-...md`: the existing text is kept and a dated "Outcome" section is added.
  - `docs/adr/0018-...md`, last bullet of Consequences: Chrome on a runner is now recorded as run, with the 138,229 byte figure.
  - `docs/adr/0001-versions.md`: the two sentences saying the 8.0.34 test binary was unconfirmed on Linux now record that it was confirmed on 9 Nov 2026 by the `checks` job of run 42652817012.
  - `docs/adr/0016-...md` and `docs/contracts.md` had no such sentences and were not changed. No ADR decision was rewritten.

**Total deviations:** 5. **Impact:** the code changes are confined to `next.config.ts`, the `build` job and a new script. No packages were added and `plan.md` and `seed/` are unchanged.

## Auth gates

The first push was rejected because the `gh` token lacked the `workflow` scope. The user pushed the branch and later granted the scope. Not a bug.

## Issues Encountered

- GitHub's `mongo:8.0` service container could not start on the runner (SERVER-121912). Resolved by Deviation 3.
- The CI `build` job's MongoDB, the `$GITHUB_ENV` hand-off and Chrome for Lighthouse were all unconfirmed before the second run, and are now confirmed for a `push` run.

## Verification

Final gate suite on `2e59c33` (docs-only changes since `cf7ae39`), each its own command, all exit 0: `typecheck`, `lint`, `lint:css`, `format:check` (Prettier skips Markdown, ADR 0009), `check:client`, `check:conventions`, `check:env`, `knip`, `test:coverage` (44 files, 598 tests) and `build`. `git diff --check` on the changed docs: clean. The earlier Task 1 gate also covered `npm audit`, smoke and bundle:check. The GitHub Actions results above were observed by the orchestrator from real run output; I did not re-query GitHub.

## Threat Flags

None new. T-01-55 (no env file or build output tracked) and T-01-56 (user files never committed) were checked by the Task 1 third verify command. T-01-SC: no packages were added. The push went to the phase branch, and the user authorised it.

## Open items (not verified)

- The `mongo:8.0` service-container path on a runner. ADR 0026 records that it was replaced, not fixed.
- Branch protection and the pull request flow: nothing has been merged to `main`.
- `npm run dev` agent detection beyond the checks in Deviation 1.
- A GitHub run triggered by a pull request: only a `push` run has been seen.

## Known Stubs

None.

## Next Phase Readiness

Phase 1 is ready for verification. Phase 2 builds on a green CI. Before merging to `main`, a pull request run should be watched once, since only a `push` run has been seen.

## Self-Check: PASSED

Checked after the last commit `2e59c33`:

- All files exist: `scripts/ci-mongo.ts`, `test/scripts/ci-mongo.test.ts`, `.github/workflows/ci.yml`, `next.config.ts`, `test/next-config.test.ts`, `package.json`, `README.md`, `docs/adr/0026-ci-build-job-uses-the-test-mongod-binary.md`, `docs/adr/README.md`, `docs/adr/0018-javascript-budget-measured-with-lighthouse-ci.md` and `docs/adr/0001-versions.md`.
- The six commits `028ff19`, `5b665f0`, `ffd21bb`, `cf7ae39`, `2dcd0ff` and `2e59c33` are ancestors of HEAD on `gsd/phase-01-foundation-and-contracts`.
- `git rev-list --count 783b718..HEAD` measured 6 at the time of writing.
