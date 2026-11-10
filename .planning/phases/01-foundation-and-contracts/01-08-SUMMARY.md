---
phase: 01-foundation-and-contracts
plan: 08
subsystem: database
tags: [mongoose, tour, review, booking, dto, slug, test-factories, adr]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plan 01-07 registerModel, withUpdateValidators, toPublicUser, useTestDatabase, seed readers and createUser; plan 01-05 IST helpers and messages"
provides:
  - "Tour model: whole-rupee price, IST-midnight start dates, GeoJSON locations, photo credits, slug that follows the name on save and findOneAndUpdate, the four plan.md 1.3 indexes, no discount field"
  - "slugify: hand-rolled lowercase ASCII slug that reproduces all 13 seed slugs"
  - "toTourSummary and toTourDetail (guides through toPublicUser, unpopulated guides throw)"
  - "Review model with the unique (tour, user) index, integer rating 1 to 5, review 1 to 1000 characters, and toReview"
  - "Booking model with inr-only currency, paid or refunded status, IST-midnight start date, sparse unique stripeSessionId, and toBooking"
  - "createTour, createReview and createBooking factories that copy real seed records"
  - "ADR 0014: one price per tour (D-05)"
affects: [01-09, 01-10, 01-11, 01-12, 01-14, 01-15]

actuals:
  tokens: 12600
  tasks: 3
  commits: 6
plan_head_before: ba5535f0398a4e97d54e647a4842a55956fc0274
plan_head_after: c7a0520850ef2c002615ec0bf422b4f558633421

tech-stack:
  added: []
  patterns:
    - "Every model registers through registerModel and wears withUpdateValidators; none has a find hook"
    - "DTO mappers list their keys, return IST day strings for dates and ISO strings for timestamps, copy arrays in document order"
    - "A DTO that needs a populated reference checks for it and throws instead of returning an id"
    - "Factories copy seed records and let tests override only numbers, dates, enums and ids"

key-files:
  created:
    - src/server/modules/tours/model.ts
    - src/server/modules/tours/slug.ts
    - src/server/modules/tours/dto.ts
    - src/server/modules/reviews/model.ts
    - src/server/modules/reviews/dto.ts
    - src/server/modules/bookings/model.ts
    - src/server/modules/bookings/dto.ts
    - test/server/modules/tours/model.test.ts
    - test/server/modules/tours/dto.test.ts
    - test/server/modules/reviews/model.test.ts
    - test/server/modules/bookings/model.test.ts
    - docs/adr/0014-one-price-per-tour.md
  modified:
    - test/helpers/factories.ts

key-decisions:
  - "The Tour discount field is dropped (D-05); ADR 0014 records the deviation from plan.md 1.3 and the questions a future discount must answer (QA-05)"
  - "startLocation is required on a tour, so toTourSummary never meets a tour without a start point"
  - "Slug is set in pre('validate') when the name is modified or the slug is empty, and in pre('findOneAndUpdate') when the update sets name directly or under $set"
  - "toTourDetail and toReview require populated references and throw otherwise, rather than returning an id the caller might mistake for a record"
  - "Seed tour extras (startLocation, locations, photoCredits) are typed inside factories.ts by widening seedTours(), so test/helpers/seed.ts stays untouched"

patterns-established:
  - "Models declare nested GeoJSON and credit sub-schemas with _id: false and keep exported types to the model and its DTO"
  - "A test needing a copy of a saved document without some keys uses a small copyWithout helper rather than unused destructured variables (lint rejects those)"

requirements-completed: [B5, B19, B20, S3, R6, Q7]

coverage:
  - id: D1
    description: "All 13 seed tours save through the Tour model; equal durations coexist; duplicate name or slug fails with 11000"
    requirement: B5
    verification:
      - kind: unit
        ref: "test/server/modules/tours/model.test.ts#[B5] saves all 13 seed tours and the duplicate-key tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "slugify folds names to lowercase ASCII with single hyphens and matches every seed slug; the slug regenerates on save and findOneAndUpdate (direct and $set)"
    requirement: B5
    verification:
      - kind: unit
        ref: "test/server/modules/tours/model.test.ts (slugify and QA-04 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Tour and Booking price accept 1 and reject 0, -1 and 18999.5; the schema has no discount field; update queries run validators"
    requirement: B20
    verification:
      - kind: unit
        ref: "test/server/modules/tours/model.test.ts#[B20] and test/server/modules/bookings/model.test.ts#[B20]"
        status: pass
    human_judgment: false
  - id: D4
    description: "Tour and Booking start dates must be 00:00 IST; 2027-07-10T00:00:00Z and 2026-08-01T00:00:00Z are rejected, fromIstDay values accepted"
    requirement: B19
    verification:
      - kind: unit
        ref: "test/server/modules/tours/model.test.ts#[B19] and test/server/modules/bookings/model.test.ts#[B19]"
        status: pass
    human_judgment: false
  - id: D5
    description: "Review: one per user per tour (11000), integer rating 1 to 5, text 1 to 1000 characters; Booking: inr only, paid or refunded only, duplicate stripeSessionId fails while absent ones coexist"
    requirement: B5
    verification:
      - kind: unit
        ref: "test/server/modules/reviews/model.test.ts and test/server/modules/bookings/model.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "toTourSummary, toTourDetail, toReview and toBooking return key-exact plain objects with string ids, IST day strings and ISO timestamps; guides and authors go through toPublicUser with no email; array order is preserved"
    requirement: S3
    verification:
      - kind: unit
        ref: "test/server/modules/tours/dto.test.ts, reviews model.test.ts#toReview, bookings model.test.ts#toBooking"
        status: pass
    human_judgment: false
  - id: D7
    description: "createTour, createReview and createBooking copy real seed tours, review texts and valid start dates"
    requirement: Q7
    verification:
      - kind: unit
        ref: "test/server/modules/reviews/model.test.ts#createReview and bookings model.test.ts#createBooking"
        status: pass
    human_judgment: true
    rationale: "Tests prove the copied text equals the seed file. Whether other fixture strings (a Stripe session id, a fourth image name, a renamed tour used in rename tests) look invented is a judgment."

duration: about 20min
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 08: Tour, Review and Booking models Summary

**Tour, Review and Booking models with whole-rupee prices, IST-midnight dates, an index-enforced one-review-per-traveller rule, a name-following slug, key-exact DTOs and seed-copying factories, plus ADR 0014 dropping the tour discount.**

## Performance

- **Duration:** about 20 min (start time was not recorded, so this is an estimate)
- **Completed:** 2026-11-09
- **Tasks:** 3 (each RED then GREEN)
- **Files modified:** 13 (12 created, 1 modified)

## Accomplishments

- The Tour model accepts all 13 real tours unchanged except for start dates converted with `fromIstDay`. Slugs come from `slugify(name)` and match every seed slug. Renaming through `save()` or `findOneAndUpdate` regenerates the slug.
- Prices are integers of at least 1 on Tour and Booking; start dates on both are checked with `isIstMidnight`; `currency` is the literal `inr`; there is no discount field anywhere under `src/`.
- Review has the `{ tour: 1, user: 1 }` unique index; Booking has a unique sparse `stripeSessionId` index that Phase 6's idempotent webhook can rely on (S17).
- `toTourSummary`, `toTourDetail`, `toReview` and `toBooking` list their keys explicitly. Guides and review authors go through `toPublicUser`.
- `createTour` (with optional seed guides), `createReview` and `createBooking` build only from `seed/data/`.

## Task Commits

1. **Task 1: Tour model, slugify, tour DTOs, createTour** - RED `f137310` (test), GREEN `0f1a93c` (feat)
2. **Task 2: Review model, toReview, createReview** - RED `769f567` (test), GREEN `da5c83c` (feat)
3. **Task 3: Booking model, toBooking, createBooking, ADR 0014** - RED `e463066` (test), GREEN `c7a0520` (feat)

**Plan metadata:** the docs commit that follows this file.

## TDD Gate Compliance

All three tasks have a `test(01-08)` commit followed by a `feat(01-08)` commit. No refactor commits.

- **Task 1 RED:** target `rounds ratingsAverage to one decimal` (expected 4.7, actual 4.67); 26 of 31 tests failed on assertions. `check tdd-red-evidence` returned RED_EVIDENCE_OK when the target was run alone with `-t` and the tap-flat reporter. Throwaway stubs: a `Tour` model with `strict: false` and no rules, `slugify` returning its input, and DTOs that spread their input. `createTour` was written in final form in the RED commit because it is test support.
- **Task 2 RED:** target `[B5] saves a seed review with createdAt and updatedAt` (createdAt expected a Date, got undefined), RED_EVIDENCE_OK. Throwaway stubs: a `strict: false` Review model and a spreading DTO. `createReview` was final in the RED commit.
- **Task 3 RED:** target `adds createdAt and updatedAt` (expected a Date, got undefined), RED_EVIDENCE_OK. Throwaway stubs: a `strict: false` Booking model and a spreading DTO. `createBooking` was final in the RED commit.
- Some tests passed in RED because the stubs kept the behaviour (for example the seed-booking price consistency check and the second-tour-for-the-same-user review test); they are regression guards, not RED targets.
- Each GREEN commit passed the full gate suite (typecheck, lint, lint:css, format:check, check:client, check:conventions, check:env, knip, test:coverage, build) before it was made.

## Files Created/Modified

See `key-files`. Notable: `src/server/modules/tours/model.ts` (schema, two slug hooks, three indexes), `test/helpers/factories.ts` (three new factories).

## Decisions Made

See `key-decisions`. ADR 0014 is the only new record under `docs/adr/`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] `startLocation` is required**
- **Found during:** Task 1 design
- **Issue:** plan.md 1.3 and the plan's field list do not say `startLocation` is required, but `toTourSummary` returns it and the 2dsphere index and map depend on it.
- **Fix:** the field is required on the Tour schema. All 13 seed tours have one.
- **Files modified:** src/server/modules/tours/model.ts
- **Committed in:** `0f1a93c`

**2. [Rule 3 - Blocking] knip and ESLint shaped the Tour code**
- **Found during:** Task 1 gate run
- **Issue:** four exported helper interfaces (`PhotoCredit`, `TourPoint`, `TourLocation`, `StartLocation`) were unused outside the model, which knip rejects, and test destructuring with `_unusedId` names raised `no-unused-vars` warnings under `--max-warnings=0`.
- **Fix:** the four interfaces are no longer exported; the tests use a `copyWithout` helper.
- **Files modified:** src/server/modules/tours/model.ts, test/server/modules/tours/model.test.ts
- **Committed in:** `0f1a93c`

**3. [Rule 1 - Bug] A comment in `reviews/dto.ts` contained the word `email`**
- **Found during:** Task 2 acceptance check (the DTO file must not contain `email`)
- **Fix:** the comment was reworded.
- **Committed in:** `da5c83c`

**4. [Rule 3 - Blocking] `test/helpers/seed.ts` is not in this plan's file list**
- **Issue:** the seed reader's `SeedTour` type lacks `startLocation`, `locations` and `photoCredits`, which `createTour` copies.
- **Fix:** `factories.ts` widens `seedTours()` with a local type instead of editing `seed.ts`.
- **Committed in:** `f137310`

---

**Total deviations:** 4 auto-fixed (1 missing critical, 2 blocking, 1 bug). No scope creep and no new packages.

## Issues Encountered

- Mongoose's schema generics rejected shared option objects whose tuples had widened to arrays (`required: [true, message]`). Using `satisfies SchemaTypeOptions<string>`, a `[boolean, string]` cast on the point fields and `'Point' as const` fixed the types without any `any`.
- The RED classifier needs the qualified `file > suite > test` name with the `tap-flat` reporter and a run limited by `-t`.

## Known Stubs

None. The throwaway RED stubs were all replaced in their GREEN commits.

## Threat Flags

None. T-01-27 (price validators on create and update, literal `inr`), T-01-28 (DTOs through `toPublicUser`, key-exact tests), T-01-29 (unique sparse `stripeSessionId`) and T-01-30 (unique `(tour, user)`) are covered by tests above. No packages were installed (T-01-SC).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The update-query guard from 01-07 applies only to the User model. `replaceOne`, `findOneAndReplace`, `insertMany` and `bulkWrite` skip Mongoose update validators, so Tour, Review and Booking writes in later services should use `create`, `save` or the three guarded update methods.
- Tour `findOneAndUpdate` regenerates the slug only when the update carries `name`. Services that rename through `updateOne` or `updateMany` would leave the slug stale; Phase 5 admin editing should use `findOneAndUpdate` or `save()`.
- `toTourDetail` and `toReview` throw unless the service populates `guides` or `user` first (B12: services populate only what they need).
- `createTour` copies the next seed tour not yet in the database, `createReview` takes the first seed review text for that tour (not the matching reviewer), and `createBooking` defaults to the tour's first start date, which for seed tours is a future date. Phase 6 tests for past trips must pass `startDate`.
- Live `/readyz` and CI workflow steps were not run here; the ten local gate commands and the in-memory MongoDB suite (272 tests) did.

## Self-Check: PASSED

Gate suite all exit 0 on the last GREEN commit: typecheck, lint, lint:css, format:check, check:client, check:conventions, check:env, knip, test:coverage (24 files, 272 tests), build. All six task commits are ancestors of HEAD and the created files exist.

---
*Phase: 01-foundation-and-contracts*
*Completed: 2026-11-09*
