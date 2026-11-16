---
phase: 04-browse-tours
plan: 03
subsystem: infra
tags: [seed, date-roll, mongoose, ci, github-actions, playwright, smoke, adr, tdd]

requires:
  - phase: 04-browse-tours
    provides: "npm run seed loads 13 tours, 35 users, 52 reviews, 58 bookings and 52 photos by fixed _id, with --reset and the APP_ENV guards (plan 04-02)"
provides:
  - "--today=YYYY-MM-DD rolls only the start dates that have passed, by whole years, with the Golden Triangle Friday rule and sorted dates (ADR 0023, ADR 0030)"
  - "checkSeedRules runs after every load and stops the run on the first broken seed/README.md rule, naming it: seed rule failed: <rule>: <detail>"
  - "CI's build job seeds before the build, smoke and bundle steps; the seed secrets are masked step outputs the build never sees"
  - "smoke proves a seeded photo is served from /media as image/jpeg"
  - "The Playwright seed project resets the seed with --today=2026-11-08 before the app project, which runs with APP_NOW=2026-11-08T10:00:00+05:30"
  - "ADR 0030 records the APP_ENV guard, the seed passwords, the date-roll details and the post-checks"

affects: [04-04, 04-05, 04-06, 04-07, 04-08, 04-09, 04-10, 04-11, 04-12, 04-13]

# Actuals (#2632). Same estimateTokens scale: chars/4 over the realised diff of this plan's commits (62,393 characters of diff).
actuals:
  tokens: 15598
  tasks: 3
  commits: 6

# Measured against the start-of-run HEAD recorded by the worktree branch check (#3968).
commits: 6
plan_head_before: a6a6202d53d5843ae0265bd7c565f7d2f81116c1
plan_head_after: 8be49d5

tech-stack:
  added: []
  patterns:
    - "Date roll is pure: YYYY-MM-DD strings in, YYYY-MM-DD strings out, so a date stays a calendar day in IST (B19)"
    - "The post-check reads back only the seed's own documents by fixed _id, so app data in the same database cannot break the seed's rules (ADR 0030)"
    - "Seed secrets reach only the steps that need them as masked step outputs (T-04-08), never through GITHUB_ENV"
    - "Playwright defaults live in test/app/e2e-env.ts; each one can be overridden from the shell"

key-files:
  created:
    - scripts/seed/dates.ts
    - scripts/seed/rules.ts
    - test/scripts/seed-dates.test.ts
    - test/scripts/seed-rules.test.ts
    - test/app/e2e-env.ts
    - test/app/seed-setup.ts
    - docs/adr/0030-seed-guards-passwords-and-date-roll.md
    - .planning/phases/04-browse-tours/deferred-items.md
  modified:
    - scripts/seed.ts
    - scripts/seed/run.ts
    - scripts/smoke.ts
    - .github/workflows/ci.yml
    - playwright.config.ts
    - test/scripts/seed.test.ts
    - README.md
    - docs/adr/0023-seed-rolls-forward-only-passed-start-dates.md
    - docs/adr/README.md
    - docs/contracts.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "An upcoming booking, for the post-check, is a paid booking whose departure is still after today, the same test the roll uses for passed dates. Read literally as 'trip not yet finished', the rule fails on 21 to 25 Nov 2026, when the Meghalaya booking starts on the day the roll moves its departure. Reversible: one comparison in rules.ts."
  - "The post-check reads back the seed's own documents by fixed _id rather than whole collections, so a developer's own app data cannot break the seed. Reversible: one filter in readStoredSeed."
  - "Seed passwords and the session secret reach the steps that need them as masked step outputs, not through GITHUB_ENV, so the build step runs with no secrets. Reversible: change the workflow step wiring."
  - "The guide-name heuristic reports nothing on the unmodified seed, so it is the ninth rule in checkSeedRules as well as a test over the seed files, as the plan allowed."
  - "The seed's 2026-11-08 roll is pinned in the Playwright seed project with --today, and the dev server with APP_NOW. CI seeds with the real date and no --today, because smoke and Lighthouse run next start without APP_NOW."

patterns-established:
  - "Tests that break one seed rule at a time assert the rule is named in the violations, so a fixture can break several rules without the test depending on order"
  - "A rule that the seed data cannot satisfy on some date is written as the date-independent test the data actually supports, and the exception is recorded in the ADR"

requirements-completed: [D10, D2]

coverage:
  - id: D1
    description: "--today rolls only the start dates that have passed, by whole years, with the Golden Triangle Friday rule and ascending dates; 2026-11-08 moves nothing and the earliest departure is Meghalaya on 21 Nov 2026"
    requirement: D10
    verification:
      - kind: unit
        ref: "test/scripts/seed-dates.test.ts#[D10] with today 2026-11-08 no seed start date moves, and the earliest is Meghalaya on 21 Nov 2026"
        status: pass
      - kind: unit
        ref: "test/scripts/seed-dates.test.ts#[D10] with today 2027-12-01 the Golden Triangle 28 Nov 2026 departure becomes 27 Nov 2028, because day 4 would be a Friday"
        status: pass
      - kind: integration
        ref: "test/scripts/seed.test.ts#[D10] with --today 2027-12-01 stores only the passed Golden Triangle dates rolled, ascending, with the Friday rule applied"
        status: pass
      - kind: other
        ref: "npm run seed -- --reset --today=2026-11-08 and npm run seed -- --today=2027-12-01 against a scratch MongoDB database: both exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "A booking's startDate and createdAt and a review's createdAt never move when the seed rolls (ADR 0023)"
    requirement: D10
    verification:
      - kind: integration
        ref: "test/scripts/seed.test.ts#[D10] bookings and reviews never move: each startDate and createdAt equals the seed value after a roll"
        status: pass
    human_judgment: false
  - id: D3
    description: "After every load the seed checks the seed/README.md rules and stops on the first broken one, naming it"
    requirement: D10
    verification:
      - kind: unit
        ref: "test/scripts/seed-rules.test.ts#[D10] the unmodified seed passes every seed/README.md rule on 2026-11-08"
        status: pass
      - kind: unit
        ref: "test/scripts/seed-rules.test.ts#[D10] golden-triangle-friday: a Golden Triangle departure whose day 4 is a Friday is reported"
        status: pass
      - kind: integration
        ref: "test/scripts/seed-rules.test.ts#[D10] runSeed throws \"seed rule failed: <rule>: <detail>\" when a rule is broken"
        status: pass
      - kind: other
        ref: "npm run seed (real date, no --today) against the scratch database exits 0 with 13 tours, 35 users, 52 reviews, 58 bookings, 52 photos"
        status: pass
    human_judgment: false
  - id: D4
    description: "CI seeds the database before the build, smoke and bundle steps; the seed passwords and session secret are masked and never reach the build step"
    requirement: D10
    verification: []
    human_judgment: true
    rationale: "The workflow was parsed locally and its step order and env were checked, but the GitHub Actions run itself was not executed from this worktree. A reviewer should confirm the first CI run seeds and passes."
  - id: D5
    description: "smoke proves a seeded photo is served from /media as image/jpeg, and fails when the photo is not stored"
    requirement: D2
    verification:
      - kind: other
        ref: "npm run smoke against the built app and the seeded scratch storage: smoke: ok"
        status: pass
      - kind: other
        ref: "npm run smoke against an empty storage directory: exit 1, naming GET /media/tours/valley-of-flowers-trek-cover.jpg answered 404"
        status: pass
    human_judgment: false
  - id: D6
    description: "The Playwright seed project resets the seed with --today=2026-11-08 before the app project, which runs with APP_NOW pinned, and every existing app spec still passes (QA-20, QA-21)"
    requirement: D10
    verification:
      - kind: e2e
        ref: "npx playwright test --project=app: 135 passed, with the seed project run first"
        status: pass
    human_judgment: false
  - id: D7
    description: "ADR 0030, the ADR 0023 status, the ADR index, the README seed section and the contracts row record the guards, passwords, roll and post-checks"
    requirement: D10
    verification: []
    human_judgment: true
    rationale: "The wording of the ADR and the README is for a human reader to judge; no test checks prose."

duration: approximately 27 min (the worktree checkout at 17:04 IST to the last code commit at 17:31 IST; the start time was not recorded at plan start)
completed: 2026-11-16
status: complete
---

# Phase 04 Plan 03: Seed date roll, README rule checks, CI and Playwright seeding Summary

**`--today` rolls only the start dates that have passed (with the Golden Triangle Friday rule), every seed run checks the seed/README.md rules and stops on the first broken one, and CI, smoke and the Playwright app project run on seeded data pinned to 8 Nov 2026**

## Status

**Complete.** All three tasks ran to their verify commands and done criteria. Task 2 was the TDD task and followed RED then GREEN. No checkpoint was reached and no auth gate was hit. The MongoDB precondition for Task 1 and Task 3 was met (127.0.0.1:27017 accepted a connection).

## Performance

- **Duration:** approximately 27 min (not measured; the start time was not recorded at plan start)
- **Tasks:** 3 of 3 complete
- **Commits:** 6 (3 task groups; Task 2 has a RED and a GREEN commit; Task 3 has code, docs and a format commit)

## Accomplishments

- `npm run seed -- --today=YYYY-MM-DD` rolls only the passed start dates by whole years, with the Golden Triangle Friday rule and ascending dates. A 29 February that lands in a non-leap year becomes 28 February. Bookings and reviews never move.
- `checkSeedRules` checks nine rules after every load: the upcoming departure, past-trip reviews, one review per traveller, the Golden Triangle Friday, upcoming booking dates, stored ratings, the 13/35/52/58/52 counts, stored credits and guide names. A broken rule stops the run with `seed rule failed: <rule>: <detail>`.
- `--today` is validated with an error that names the flag. Without it the seed uses today in IST from the one clock, so `APP_NOW` pins it too.
- CI's build job generates the session secret and both seed passwords as masked step outputs, seeds after MongoDB starts and before the build, and passes the secrets only to the steps that need them. The build step has no env.
- `smoke` checks that `/media/tours/valley-of-flowers-trek-cover.jpg` answers 200 `image/jpeg` on the good-environment start.
- `playwright.config.ts` has a `seed` project that resets the seed with `--reset --today=2026-11-08`. The `app` project depends on it, and the dev server runs with `APP_NOW=2026-11-08T10:00:00+05:30`. Test-only defaults live in `test/app/e2e-env.ts`.
- ADR 0030 is written, ADR 0023 points to it, the ADR index lists it, and the README has a Seed data section and updated Testing notes. `docs/contracts.md` section 10 lists the seed contract.

## Task Commits

Each task was committed atomically, in the order the TDD flow requires for Task 2.

1. **Task 1: `--today` rolls only passed start dates** - `8e66a4c` (feat)
2. **Task 2 RED: failing tests for the README rule checks** - `60b6805` (test)
3. **Task 2 GREEN: check the README rules after every load** - `c0c4dde` (feat)
4. **Formatting and knip cleanup for the seed modules and tests** - `bed1cad` (style)
5. **Task 3 code: seed in CI and the Playwright app project, check /media in smoke** - `07168cd` (ci)
6. **Task 3 docs: ADR 0030, the README seed section and the contracts row** - `8be49d5` (docs)

**Plan metadata:** the commit that carries this file, `.planning/phases/04-browse-tours/deferred-items.md` and the D10 change in `.planning/REQUIREMENTS.md`.

## Verification

Run from the worktree after the last code change:

- `npx vitest run`: 65 files and 829 tests pass.
- `npx tsc --noEmit`: exit 0.
- `npm run lint` (`eslint . --max-warnings=0`): exit 0.
- `npm run format:check`, `npm run check:env`, `npm run check:conventions`, `npm run check:client`: all pass.
- `npm run knip`: fails only on `TourPhotoCredit` in `src/server/modules/tours/dto.ts`, which was already in the tree at a6a6202. It is logged in `deferred-items.md`.
- Real seed runs against a scratch database (`natours-seedcheck`) and a scratch `STORAGE_DIR`: `--reset --today=2026-11-08`, `--today=2027-12-01`, `--today=2026-11-21`, `--today=2027-06-12` and the CI-equivalent run with the real date all exit 0 with `13 tours, 35 users, 52 reviews, 58 bookings, 52 photos`.
- `npx playwright test --project=app` against the scratch database: 135 passed, with the seed project run first and printing the seed counts.
- `npm run build`: exit 0. `npm run smoke` against the seeded storage: `smoke: ok`. Against an empty storage directory it exits 1 and names the 404 for the seeded photo.
- The CI workflow was parsed locally: the build job runs MongoDB, secrets, seed, build, smoke, budget, upload in that order, and the build step has no `env`. The GitHub Actions run was not executed.
- Not run: `npm run bundle:check` (Lighthouse). The plan's verify steps did not include it.

## Files Created/Modified

- `scripts/seed/dates.ts` - `addYears`, `rollStartDate`, `rollStartDates`, `weekdayOf` and the Golden Triangle slug
- `scripts/seed/rules.ts` - `checkSeedRules` with the nine rules and `EXPECTED_COUNTS`
- `scripts/seed/run.ts` - applies the roll before each tour save, reads back the seed's documents by fixed `_id`, runs the rules, and returns counts from the read-back
- `scripts/seed.ts` - `--today` validation with a flag-naming error; `today` defaults to the clock's IST day
- `scripts/smoke.ts` - the seeded-photo check and the header note that the database must be seeded
- `.github/workflows/ci.yml` - secrets step, seed step before the build, `SESSION_SECRET` from step outputs for smoke and the budget check
- `playwright.config.ts` - `seed` project, `app` depends on it, env from `e2e-env.ts`
- `test/app/e2e-env.ts`, `test/app/seed-setup.ts` - created
- `test/scripts/seed-dates.test.ts`, `test/scripts/seed-rules.test.ts` - created; `test/scripts/seed.test.ts` - roll and untouched-records tests
- `docs/adr/0030-seed-guards-passwords-and-date-roll.md` - created; `docs/adr/0023-...md` status line, `docs/adr/README.md` row, `docs/contracts.md` section 10 row
- `README.md` - Seed data section, the `seed` script row, the smoke prerequisite and the app-specs notes
- `.planning/phases/04-browse-tours/deferred-items.md` - created (knip finding)
- `.planning/REQUIREMENTS.md` - D10 marked complete

## Decisions Made

- An upcoming booking, for the post-check, is a paid booking whose departure is still after today, the same test the roll uses for passed dates. Read literally as "trip not yet finished", the rule would fail on 21 to 25 Nov 2026, when the Meghalaya booking starts on the day the roll moves its departure. ADR 0030 records this.
- The post-check reads back only the seed's own documents, by their fixed `_id`s. A developer's app data in the same database cannot break the seed.
- Seed passwords and the session secret reach the steps that need them as masked step outputs, not through `$GITHUB_ENV`. The build step therefore runs with no secrets, which keeps the ARC-07 proof meaningful.
- The guide-name heuristic is the ninth rule, because it reports nothing on the unmodified seed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fresh worktree had no node_modules and no next-env.d.ts**
- **Found during:** Task 1, first typecheck
- **Issue:** `tsc` could not resolve the `.jpg` imports in `src/app/styleguide/sections/tour-row-section.tsx`, and `npm run seed` needed installed packages.
- **Fix:** `npm ci` from the committed lockfile, and `next-env.d.ts` copied from the main checkout. Both are gitignored and not committed.
- **Verification:** `npx tsc --noEmit` exits 0.
- **Committed in:** none (environment only)

**2. [Rule 1 - Bug] The upcoming-booking rule, read literally, fails on the roll day**
- **Found during:** Task 2, checking the rules against real seed data at candidate dates
- **Issue:** a "trip not yet finished" definition of upcoming makes rule 5 fail on 21 to 25 Nov 2026. The Meghalaya booking starts on 21 Nov 2026, the roll moves that departure to 2027, and the booking then points at no start date.
- **Fix:** an upcoming booking is a paid booking whose departure is after today, the same test the roll uses for passed dates. ADR 0030 records it.
- **Files modified:** `scripts/seed/rules.ts`, `docs/adr/0030-seed-guards-passwords-and-date-roll.md`
- **Verification:** `npm run seed -- --today=2026-11-21` and `--today=2027-06-12` exit 0 against the scratch database.
- **Committed in:** `c0c4dde`, `8be49d5`

**3. [Rule 2 - Missing Critical] The rule check read whole collections**
- **Found during:** Task 2, implementing the read-back
- **Issue:** the plan's read-back of the four whole collections would make the seed fail whenever a developer's own app data sits in the same database.
- **Fix:** the read-back selects the seed's documents by their fixed `_id`s, and `counts` checks what the seed stored.
- **Files modified:** `scripts/seed/run.ts`
- **Committed in:** `c0c4dde`

**4. [Rule 2 - Security] Secrets were not written to GITHUB_ENV**
- **Found during:** Task 3, wiring CI
- **Issue:** the plan writes the seed passwords and session secret to `$GITHUB_ENV`, which exposes them to the build step.
- **Fix:** each value is masked with `::add-mask::` and passed as a step output, so only the seed, smoke and budget steps receive it. T-04-08's mitigation (masked, never stored) is kept.
- **Files modified:** `.github/workflows/ci.yml`
- **Committed in:** `07168cd`

**Total deviations:** 4 (1 Rule 1, 2 Rule 2, 1 Rule 3). **Impact on plan:** the outcome is as planned. Deviation 2 changes one definition, and ADR 0030 records it. Deviation 4 changes where secrets are stored, not what is stored.

### Process notes (not deviations)

- **TDD RED scaffold:** the RED commit includes `scripts/seed/rules.ts` with `checkSeedRules` returning `[]`, so the failing tests fail on their assertions and not on an import. RED had 10 failing and 2 passing tests (the unmodified-seed baseline and the independent guide-name check).
- **Commit format:** commits follow the project's CLAUDE.md format, `type(seed): ... [D10] (04-03)`, not `test(04-03):`. The GSD RED-commit regex therefore does not match these commits, as plan 04-02 also noted. The verifier should read the commit subjects.
- **Attribution:** every commit carries the `Co-Authored-By` line from the attribution reminder. Plan 04-02 missed it on its task commits.

## Issues Encountered

- The worktree shell refused compound commands with `cd` or `git` in an unusual form. Each command was split into plain steps run from the worktree root.
- The sandbox refused writing the plan commit ledger inside the git directory, as it did for plan 04-02. The ledger value is recorded in the frontmatter (`plan_head_before`) and in the scratchpad. `commits` is measured from that base.
- Playwright's default `MONGODB_URI` is the developer's `natours` database, and the seed project resets it. The verification ran with `MONGODB_URI=mongodb://127.0.0.1:27017/natours-seedcheck` set in the shell (the plan's defaults allow that), so the developer database was not touched.
- `npm run knip` already fails at a6a6202 on `TourPhotoCredit`, so the CI checks job would fail on it too. It is logged in `deferred-items.md`, not fixed here, because the file is outside this plan.
- The open WINDOWS.md entry for the `--today` stub that plan 04-02 recorded is now resolved by Task 1. WINDOWS.md was not edited here; the orchestrator should close that entry.

## Known Stubs

None. The `--today` stub from plan 04-02 is wired in this plan.

## Threat Flags

None new. The Playwright seed setup runs `npm run seed` as a child process with the e2e environment. It opens no new endpoint and no new trust boundary. The `tsx` install-script note from plan 04-02 is unchanged.

## User Setup Required

Developers who run the Playwright app specs need a development MongoDB at `MONGODB_URI` (the default is `mongodb://127.0.0.1:27017/natours`), which the seed project resets. CI needs nothing beyond its existing MongoDB start. Seed passwords stay in `.env.local` or the CI step outputs and are never committed.

## Next Phase Readiness

- Plan 04-13 also declares D2, so D2 stays blocked until it has a SUMMARY. This plan's D2 coverage is recorded in the `coverage` block above.
- The `--today` roll, the rule checks, the CI seed and the Playwright seed project are in place for later Phase 4 plans. Later plans can rely on the seed passing its rules at `--today=2026-11-08`.
- The Lighthouse budget (`npm run bundle:check`) was not run here. It runs on the real date in CI, against the seeded storage.

## Self-Check

Checked against the worktree before this file was written:

- Created files exist: `scripts/seed/dates.ts`, `scripts/seed/rules.ts`, `test/scripts/seed-dates.test.ts`, `test/scripts/seed-rules.test.ts`, `test/app/e2e-env.ts`, `test/app/seed-setup.ts`, `docs/adr/0030-seed-guards-passwords-and-date-roll.md`, and `.planning/phases/04-browse-tours/deferred-items.md`.
- All six task commits are on this branch, in order, from `8e66a4c` to `8be49d5`, on top of the base `a6a6202`.
- `npx vitest run`: 65 files and 829 tests pass. `npx tsc --noEmit`: exit 0. `npm run lint`: exit 0. The Playwright app project: 135 passed.

## Self-Check: PASSED

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16*
