---
phase: 01-foundation-and-contracts
plan: 10
subsystem: infra
tags: [adapters, fakes, stripe, rate-limit, cache, deps, test-isolation, adr]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plan 01-04 getConfig() with APP_ENV and appOrigin; plan 01-05 now() clock; plan 01-09 next/headers mock in test/setup.ts"
provides:
  - "Interfaces and fakes for Mailer, EmailQueue, Storage, StripeClient and RateLimiter in src/server/adapters/"
  - "Cache interface, fake cache and createNextCache (unstable_cache plus revalidateTag with expire 0) in real-cache.ts"
  - "getDeps() in src/server/deps.ts: fakes in development, test and ci; throwing getters for the five uncovered adapters in staging and production"
  - "fakes and resetFakes in test/helpers/fakes.ts, with resetFakes run before each test from test/setup.ts"
  - "ADR 0016: adapters selected by APP_ENV"
affects: [01-11, 01-12, 01-14, 01-15, phase-4, phase-5, phase-6]

actuals:
  tokens: 9500
  tasks: 3
  commits: 6
plan_head_before: 245f68b9fcadd2816a2a1c944452c995937540ce
plan_head_after: 082fe041f0c75e964546c739f3ee8100e41ef79e

tech-stack:
  added: []
  patterns:
    - "Every outside service is an interface plus an in-memory fake with a sent/jobs/files/sessions/invalidated array and reset()"
    - "getDeps() chooses by validated APP_ENV; staging and production expose throwing getters instead of fakes"
    - "Tests read what the app sent through fakes.*, and setup.ts empties them before every test"

key-files:
  created:
    - src/server/adapters/mailer.ts
    - src/server/adapters/queue.ts
    - src/server/adapters/storage.ts
    - src/server/adapters/stripe.ts
    - src/server/adapters/rate-limit.ts
    - src/server/adapters/cache.ts
    - src/server/adapters/real-cache.ts
    - src/server/deps.ts
    - test/helpers/fakes.ts
    - test/server/adapters/fakes.test.ts
    - test/server/adapters/rate-limit.test.ts
    - test/server/adapters/cache.test.ts
    - test/server/deps.test.ts
    - docs/adr/0016-adapters-selected-by-app-env.md
  modified:
    - test/setup.ts

key-decisions:
  - "The staging and production refusal is a plain Error from a getter, so withApi turns it into the generic INTERNAL response and the message stays in logs"
  - "The fake rate limiter reads now() from the clock, not Date.now(), per the Phase 1 clock rule; fake timers still move it because APP_NOW is unset in tests"
  - "The cache is the fake only under APP_ENV test; development, ci, staging and production get the Next tagged cache"

patterns-established:
  - "Fake Stripe identifiers are cs_fake_NNNN and evt_fake_NNNN, and the signing key is a fixed non-secret string"
  - "Tests for another APP_ENV stub it, call vi.resetModules() and import getDeps again"

requirements-completed: [Q7, S3]

coverage:
  - id: D1
    description: "Email jobs hold exactly template, to, firstName and url; the fake queue rejects an extra or missing key and records nothing"
    requirement: S3
    verification:
      - kind: unit
        ref: "test/server/adapters/fakes.test.ts (fake email queue, 5 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Fake Stripe records sessions, refuses non-whole-paise amounts and non-inr currency, and constructEvent throws StripeSignatureVerificationError unless the signature is the HMAC of the exact body"
    requirement: Q7
    verification:
      - kind: unit
        ref: "test/server/adapters/fakes.test.ts (fake Stripe, 9 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Fake rate limiter allows points requests per rule and key, then refuses with a positive retryAfterSeconds that counts down, and resets when the window passes"
    requirement: Q7
    verification:
      - kind: unit
        ref: "test/server/adapters/rate-limit.test.ts (7 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Under APP_ENV test getDeps returns the same fakes that fakes.* returns and every fake is empty at the start of each test; staging and production refuse mailer, queue, rate-limit, Stripe and storage with a named error and never serve the fake cache"
    requirement: Q7
    verification:
      - kind: unit
        ref: "test/server/deps.test.ts (21 tests)"
        status: pass
    human_judgment: false
  - id: D5
    description: "createNextCache wraps unstable_cache and revalidateTag with expire 0 and is the only importer of next/cache; it compiles in the production build but has no unit test"
    requirement: Q7
    verification:
      - kind: other
        ref: "npm run build; grep -rln next/cache src lists only real-cache.ts"
        status: pass
    human_judgment: false

duration: about 15 min
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 10: Adapters, fakes and getDeps Summary

**Interfaces with in-memory fakes for mail, the email queue, storage, Stripe and rate limiting, a Next tagged-cache wrapper, and `getDeps()` that serves fakes only in development, test and ci while staging and production throw a named error, with every fake reset before each test.**

## Performance

- **Duration:** about 15 min (start estimated from the commit-ledger time of 14:20Z)
- **Completed:** 2026-11-09T14:26Z
- **Tasks:** 3 (each RED then GREEN)
- **Files modified:** 15 (14 created, `test/setup.ts` changed)

## Accomplishments

- Seven adapter files in `src/server/adapters/`. No SDK is imported; the only non-project imports are `server-only`, `node:crypto` and `next/cache` (in `real-cache.ts` alone).
- `getDeps()` is memoised per process. In staging and production the mailer, queue, rate limiter, Stripe and storage are getters that throw `No real <name> adapter is configured yet (ADR 0016); <phase> adds it`.
- `test/setup.ts` calls `resetFakes()` before each test. All 31 files and 395 tests pass with it, so the 01-09 `next/headers` mock and the new reset coexist.

## Task Commits

1. **Task 1: mailer, email queue, storage, Stripe fakes** - RED `b02d884` (test), GREEN `7c9bce2` (feat)
2. **Task 2: rate-limit and tagged-cache adapters** - RED `d906912` (test), GREEN `ebcacd8` (feat)
3. **Task 3: getDeps, fakes helper, reset, ADR 0016** - RED `da11042` (test), GREEN `082fe04` (feat)

**Plan metadata:** the docs commit that follows this file.

## Files Created/Modified

- `src/server/adapters/{mailer,queue,storage,stripe,rate-limit,cache}.ts` - the interfaces and fakes
- `src/server/adapters/real-cache.ts` - `createNextCache()`, excluded from coverage
- `src/server/deps.ts` - `getDeps()` and `Deps`
- `test/helpers/fakes.ts` - typed accessors and `resetFakes()`
- `test/setup.ts` - `beforeEach(resetFakes)` added beside the 01-09 mock
- `test/server/adapters/*.test.ts`, `test/server/deps.test.ts` - the tests
- `docs/adr/0016-adapters-selected-by-app-env.md` - the decision record

## Decisions Made

See `key-decisions` and ADR 0016. The refusal uses a plain `Error`, as the plan says, because an `AppError` message could reach a response. The fake rate limiter follows the dispatch rule to read `now()`; the plan text said `Date.now()`, and both behave the same under fake timers. ADR 0016 notes that a pinned `APP_NOW` freezes the fake window in development.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] knip reported six exported types with no importer**
- **Found during:** Task 3 gate run
- **Issue:** `MailMessage`, `EmailTemplate`, `RateLimitRule`, `RateLimitResult`, `StoredFile` and `StripeEvent` are in the plan's symbol list but no code used them yet, so `npm run knip` failed.
- **Fix:** kept the exports and made the tests use them (typed fixtures, plus one test that enqueues every `EmailTemplate`). The exports will be used by later phases.
- **Files modified:** test/server/adapters/fakes.test.ts, test/server/adapters/rate-limit.test.ts
- **Verification:** `npm run knip` exit 0; committed in `082fe04`.

**2. [Rule 1 - Bug] A lint warning in the first deps test draft**
- **Found during:** Task 3 RED
- **Issue:** `new RegExp(...)` from a variable tripped `security/detect-non-literal-regexp`, and the gate allows no warnings.
- **Fix:** the test checks the exact message string with `toThrow(string)` instead.
- **Files modified:** test/server/deps.test.ts
- **Committed in:** `da11042`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug). No scope change.

## Issues Encountered

None beyond the above.

## TDD Gate Compliance

`test(01-10)` precedes `feat(01-10)` for all three tasks. No refactor commits. The stubs in each RED commit were throwaway and are listed below.

- **Task 1 RED:** `check tdd-red-evidence` returned `RED_EVIDENCE_OK` for `[B9] constructEvent throws StripeSignatureVerificationError for a wrong signature` (a boolean `instanceof` assertion, false because the stub did not throw). The first candidate, the `[S3]` extra-key test, was `INVALID_RED / invalid_record` because its failure message is a multi-line report ("Non-TAP data in report"); the Stripe test was used instead. Semantic assessment: the target ran and failed on the planned assertion. 16 of 19 tests failed. Throwaway stubs: all four adapter files, with fakes that record nothing and return empty values.
- **Task 2 RED:** `RED_EVIDENCE_OK` for `[S15] refuses the eleventh attempt and says how long to wait` (allowed was true from the stub). The cache test `[Q7] invalidate records every tag in order` was `INVALID_RED` because `toEqual` prints a multi-line diff, so it was re-run from a temporary copy with a plain boolean assertion (deleted afterwards), which returned `RED_EVIDENCE_OK`. 7 of 10 tests failed. Throwaway stubs: `rate-limit.ts` (always allowed) and `cache.ts` (`invalidate` no-op).
- **Task 3 RED:** `RED_EVIDENCE_OK` for `[Q7] using mailer throws an error naming the missing adapter` under production (the stub returned a fake). 15 of 21 tests failed, including the cross-test reset check (`part 2` tests saw the earlier test's job and used-up rate limit). The reset pair cannot be run alone with `-t`, since part 2 passes without part 1, so those two were judged from the full-file run. Throwaway stub: `getDeps` always returning fakes. `test/helpers/fakes.ts` was written in final form in the RED commit as test support; `test/setup.ts` was left for GREEN so the stub did not affect other tests.

Each GREEN commit passed `format:check` on its own.

## Negative-path proof

Mutations run against the committed code, then restored with `git checkout -- <file>`:

| Mutation | Test that failed |
| --- | --- |
| remove the queue key check | `[S3]` extra key and missing key |
| `>` instead of `>=` for points | eleventh attempt refused; retryAfter countdown |
| skip the signature comparison | wrong signature; signature of another body |
| accept any currency | `[S17]` non-inr refused |

## Known Stubs

None. The five production-like getters that throw are deliberate and documented in ADR 0016; the phases that replace them are named in each error.

## Threat Flags

None. No new network endpoint, auth path or schema; the mitigations T-01-36 to T-01-38 are covered by the tests above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01-11 (`withApi`, webhook mapping) can import `getDeps()` and `StripeSignatureError`; a thrown "No real ... adapter" error is a plain `Error` and maps to `INTERNAL`.
- Phase 4 settles cache keys and tags; Phase 5 adds the mailer, queue and Redis limiter; Phase 6 confirms the `StripeSignatureVerificationError` type string against the SDK and decides the `BookingConfirmed` payload (SEC-09).
- No new config key, so `.env.example` is unchanged.

---
*Phase: 01-foundation-and-contracts*
*Completed: 2026-11-09*
