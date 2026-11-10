---
phase: 01-foundation-and-contracts
plan: 07
subsystem: database
tags: [mongoose, bcryptjs, dto, user-model, test-helpers]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plan 01-05 AppError, messages, validation (z), clock; plan 01-01 connectDb and the in-memory test database"
provides:
  - "connectDb that rejects with SERVICE_UNAVAILABLE (driver error as cause) and never caches a failure; disconnectDb; isDbUnavailableError"
  - "registerModel (hot-reload safe) and withUpdateValidators in src/server/schema-helpers.ts"
  - "ROLES and Role in src/server/roles.ts"
  - "User model: bcrypt hash and passwordChangedAt written only in the pre-save hook; update queries touching either are rejected; select: false on password, reset fields and active"
  - "toPublicUser (no email) and toSelf DTO mappers; findActiveById lean read for the session"
  - "Test helpers: useTestDatabase, clearDatabase, seed readers, TEST_PASSWORD and createUser (seed people only)"
  - "ADR 0013: user DTO split and the DTO rule extended to action state, errors and logs"
affects: [01-08, 01-09, 01-10, 01-11, 01-12, 01-14, 01-15]

actuals:
  tokens: 10200
  tasks: 3
  commits: 6
plan_head_before: 68360896250a24b44d7dce1cbe09304d550bb24e
plan_head_after: b4e248beee90bb52eacfc359d91f0a5f8b965d30

tech-stack:
  added: [bcryptjs@3.0.3]
  patterns:
    - "Models register through registerModel and wear withUpdateValidators"
    - "Mappers list their keys explicitly and return fresh plain objects with null for absent optionals"
    - "Tests build users only from seed/data/users.json through createUser"

key-files:
  created:
    - src/server/schema-helpers.ts
    - src/server/roles.ts
    - src/server/modules/users/model.ts
    - src/server/modules/users/dto.ts
    - src/server/modules/users/service.ts
    - test/helpers/db.ts
    - test/helpers/seed.ts
    - test/helpers/factories.ts
    - test/server/db.test.ts
    - test/server/modules/users/model.test.ts
    - test/server/modules/users/dto.test.ts
    - test/server/modules/users/service.test.ts
    - docs/adr/0013-user-dto-split-and-dto-rule.md
  modified:
    - src/server/db.ts
    - package.json
    - package-lock.json

key-decisions:
  - "passwordChangedAt is stamped with now() from the one clock, not new Date(), so a pinned APP_NOW applies to it too"
  - "findActiveById checks the id shape before connecting, so a malformed id gives null even while MongoDB is down"
  - "The update-query guard also throws for password or passwordChangedAt under any $operator and inside aggregation-pipeline updates"
  - "ADR 0013 keeps the name toPublicUser (plan.md) instead of the review's toPublicProfile"

patterns-established:
  - "Call useTestDatabase() once per test file, inside a describe (a top-level use* call trips react-hooks/rules-of-hooks)"
  - "getConfig caches its first read, so tests that need another MONGODB_URI use vi.stubEnv, vi.resetModules and a dynamic import"
  - "Assert hidden fields on both hydrated docs (toObject keys) and lean records"

requirements-completed: [B10, B17, B14, B5, S3, R6, Q7, Q9]

coverage:
  - id: D1
    description: "With MongoDB unreachable, connectDb rejects with SERVICE_UNAVAILABLE (503) inside the selection timeout, concurrent callers all reject, and the next call retries"
    requirement: B10
    verification:
      - kind: unit
        ref: "test/server/db.test.ts (3 [B10] unreachable tests, 5 isDbUnavailableError tests) and test/app/readyz-unavailable.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Ten concurrent connectDb calls make one connect call; registerModel and the User model survive a repeated import"
    requirement: B17
    verification:
      - kind: unit
        ref: "test/server/db.test.ts#[B17] and test/server/modules/users/model.test.ts#[B17] importing the model again"
        status: pass
    human_judgment: false
  - id: D3
    description: "passwordChangedAt has one writer, the model hook: unset on create, untouched by unrelated saves, set on password change; update queries setting password or passwordChangedAt are rejected; passwords are stored as bcrypt hashes"
    requirement: B14
    verification:
      - kind: unit
        ref: "test/server/modules/users/model.test.ts (4 [B14] tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Validators run on update queries, and password, reset fields and active are not returned unless selected"
    requirement: S3
    verification:
      - kind: unit
        ref: "test/server/modules/users/model.test.ts (QA-04 tests, 3 [S3] tests) and test/server/db.test.ts#withUpdateValidators"
        status: pass
    human_judgment: false
  - id: D5
    description: "toPublicUser returns exactly id, name, photo, role and toSelf adds email; outputs are plain, JSON-stable, have string ids and null photos; mappers share no state"
    requirement: R6
    verification:
      - kind: unit
        ref: "test/server/modules/users/dto.test.ts (4 [S3] and 3 [R6] tests)"
        status: pass
    human_judgment: false
  - id: D6
    description: "findActiveById returns the active user with passwordChangedAt and no password, null for deactivated, unknown or malformed ids, and SERVICE_UNAVAILABLE when MongoDB is down; it carries TSDoc with parameters, return and errors"
    requirement: Q9
    verification:
      - kind: unit
        ref: "test/server/modules/users/service.test.ts (6 tests plus the unreachable-database test)"
        status: pass
    human_judgment: false
  - id: D7
    description: "createUser and the fixtures draw only on the 35 people in seed/data/users.json; no invented names or emails"
    requirement: Q7
    verification:
      - kind: unit
        ref: "test/server/modules/users/model.test.ts#createUser draws only on the seed people (D-08)"
        status: pass
    human_judgment: true
    rationale: "The test proves factory users match the seed file. Whether other fixture strings look invented (for example the storage key in the DTO photo test) is a judgment."

duration: about 50min
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 07: Data layer foundation Summary

**A MongoDB connection that answers 503 within the timeout and recovers, a hot-reload-safe User model whose hook is the only writer of `passwordChangedAt`, split user DTOs, `findActiveById` for the session, and a seed-only `createUser` factory.**

## Performance

- **Duration:** about 50 min (start time was not recorded, so this is an estimate)
- **Completed:** 2026-11-09
- **Tasks:** 3 (each RED then GREEN)
- **Files modified:** 16 (13 created, 3 modified; package-lock.json counted once)

## Accomplishments

- `connectDb()` wraps a failed attempt as `AppError('SERVICE_UNAVAILABLE')` with the driver error as `cause`, clears the cache only if it still holds that attempt, and the next call connects again. `isDbUnavailableError` and `disconnectDb` are new.
- The User model hashes in one `pre('save')` hook (cost 4 under `APP_ENV=test`, 12 otherwise) and stamps `passwordChangedAt` there for non-new documents. A query hook refuses updates that set `password` or `passwordChangedAt`, directly, under any `$` operator or in a pipeline.
- `toPublicUser` and `toSelf` are key-exact and pure. `findActiveById` is a lean query filtered on `active: { $ne: false }` that returns `passwordChangedAt` and omits password, reset fields, `active` and `__v`.
- `createUser` picks real seed people by role or email, and throws for anyone else.

## Task Commits

1. **Task 1: connection and model helpers** - RED `5b12137` (test), GREEN `d29a026` (feat)
2. **Task 2: User model, seed readers, factory** - RED `7c5389e` (test, includes the bcryptjs install), GREEN `4ec5734` (feat)
3. **Task 3: DTOs, findActiveById, ADR 0013** - RED `f355119` (test), GREEN `b4e248b` (feat)

**Plan metadata:** the docs commit that follows this file.

## TDD Gate Compliance

All three tasks have a `test(01-07)` commit followed by a `feat(01-07)` commit. No refactor commits.

- **Task 1 RED:** target `[B10] is true for MongoNetworkError`, expected `true`, actual `false`; 11 of 13 tests failed on assertions. `check tdd-red-evidence` returned RED_EVIDENCE_OK when the target was re-run alone with `-t` (the full run's TAP was malformed by apostrophes in other failure messages, `INVALID_RED / invalid_record`, which tdd.md allows re-running around). Semantic assessment: the target executed and failed on the planned assertion for the intended reason. Throwaway stubs: `disconnectDb` no-op, `isDbUnavailableError` returning false, and `registerModel` calling `model()` without the existing-model check.
- **Task 2 RED:** target `changing the password sets passwordChangedAt` (expected a Date, got undefined), RED_EVIDENCE_OK when run alone; the first two candidate targets hit the same apostrophe or quote problem. Throwaway stub: a `User` model with plain string fields and no hooks or select rules. `roles.ts`, the seed readers and the factory were written in final form in the RED commit because they are test support.
- **Task 3 RED:** target `a user without a photo maps to photo null` (expected null, actual undefined), RED_EVIDENCE_OK. Throwaway stubs: mappers returning their input, `findActiveById` returning null.
- Some tests already passed in RED because they pin behaviour the stub kept (for example the registration test and "saving without a password change leaves `passwordChangedAt` unchanged"); they are regression guards, not RED targets.

## Files Created/Modified

See `key-files`. Notable: `src/server/modules/users/model.ts` (schema, two hooks), `src/server/db.ts` (hardened), `test/helpers/factories.ts` (seed-only users).

## Decisions Made

See `key-decisions`. The plan wrote `new Date()` for `passwordChangedAt`; `now()` is the project's one clock (plan 01-05) and behaves the same unless `APP_NOW` is pinned.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] knip and react-hooks lint shaped the test files**
- **Found during:** Tasks 1 and 2 gate runs
- **Issue:** `test/helpers/db.ts` was unused until a test imported it (knip failed on the GREEN commit), `clearDatabase` was an unused export, `UserRecord` was an unused exported type, and `useTestDatabase()` at file top level failed `react-hooks/rules-of-hooks`.
- **Fix:** `db.test.ts` now uses `useTestDatabase` and `clearDatabase` for its model-helper cases; `model.test.ts` uses `UserRecord` in a lean-read test and wraps the file in one `describe`. These test edits landed in the GREEN commits.
- **Files modified:** test/server/db.test.ts, test/server/modules/users/model.test.ts
- **Committed in:** `d29a026`, `4ec5734`

**2. [Rule 1 - Bug] `useTestDatabase()` twice in one file fails**
- **Found during:** Task 2 RED
- **Issue:** a second describe with its own `useTestDatabase()` reconnected after the first teardown and `model.init()` raised `MongoNotConnectedError`.
- **Fix:** use it once per file; the helper's TSDoc says so. Not investigated further.
- **Committed in:** `7c5389e`

**3. [Rule 2 - Missing critical] `findActiveById` maps a dropped connection to SERVICE_UNAVAILABLE**
- **Issue:** the plan's TSDoc promises SERVICE_UNAVAILABLE when the database is unreachable, but a query after a successful connect would surface a raw driver error.
- **Fix:** the query is wrapped; `isDbUnavailableError` errors become `AppError('SERVICE_UNAVAILABLE')` with the cause kept. Covered by tests.
- **Committed in:** `b4e248b`

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 bug, 1 missing critical). No scope creep. No `@types/bcryptjs` was needed, since bcryptjs 3.0.3 ships its own types.

## Issues Encountered

- Several Vitest failure messages contain apostrophes, which made the TAP report malformed for the RED classifier; re-running the single target with `-t` gave clean evidence.
- Passing a throwaway classifier record requires a path inside the project; `.gsd-tmp/` was used and removed each time, nothing from it was staged.

## Known Stubs

None. The throwaway RED stubs were all replaced in their GREEN commits.

## Threat Flags

None. No new endpoints, auth paths or trust-boundary schema changes beyond the plan's threat model (T-01-23 to T-01-26 are mitigated by the tests above; T-01-SC by the exact-version bcryptjs install).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01-09 (session) can call `findActiveById`; it returns `passwordChangedAt` for the `iat` comparison. Note `passwordChangedAt` uses `now()`, so session code should compare against the same clock or accept that a pinned `APP_NOW` also pins it.
- Models other than User must import `registerModel` and `withUpdateValidators`; only a module's own service and dto may import its model (lint rule), tests are exempt.
- Update-query guard covers findOneAndUpdate, updateOne and updateMany only. `replaceOne`, `findOneAndReplace`, `save`-bypassing `insertMany` and `bulkWrite` are not guarded; password writes belong in `save()`.
- Live `/readyz` against a real MongoDB container, and CI steps, were not run here; `npm run build` and the full unit suite ran locally.

## Self-Check: PASSED

Gate suite all exit 0 on the last GREEN commit: typecheck, lint, lint:css, format:check, check:client, check:conventions, check:env, knip, test:coverage (218 tests passed), build. All six task commits are ancestors of HEAD and the created files exist.

---
*Phase: 01-foundation-and-contracts*
*Completed: 2026-11-09*
