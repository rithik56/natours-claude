---
phase: 01-foundation-and-contracts
plan: 09
subsystem: auth
tags: [jose, jwt, session, cookies, safe-redirect, test-helpers, adr]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plan 01-07 findActiveById, toSelf and createUser; plan 01-05 AppError, clock and messages; plan 01-04 getConfig"
provides:
  - "src/server/session.ts: signSession, getSession, sessionCookieOptions, sessionCookie, expiredSessionCookie, getCurrentUser, requireUser, requireRole"
  - "src/server/redirects.ts: safeNext"
  - "next/headers mock in test/setup.ts backed by test/helpers/request-context.ts, and mockSession(user | null)"
  - "ADR 0015: sessions read the user every request, with the same-second rule for password changes"
affects: [01-10, 01-11, 01-12, 01-14, 01-15]

actuals:
  tokens: 19000
  tasks: 2
  commits: 4
plan_head_before: 2039fed959792d89104eef3771cfd1f26615715c
plan_head_after: 0587d869ab2286e683fc0e7f5baae8c2526c92b8

tech-stack:
  added: [jose@6.2.15]
  patterns:
    - "The JWT names the user only; the role, active flag and password-change check come from a database read in getCurrentUser"
    - "Cookie helpers return cookie objects; Server Actions and Route Handlers set them"
    - "Tests act as a seed user through mockSession, which signs a real cookie into the mocked next/headers store"

key-files:
  created:
    - src/server/session.ts
    - src/server/redirects.ts
    - test/server/session.test.ts
    - test/server/redirects.test.ts
    - test/server/current-user.test.ts
    - test/helpers/request-context.ts
    - test/helpers/mock-session.ts
    - docs/adr/0015-sessions-read-the-user-every-request.md
  modified:
    - test/setup.ts
    - package.json
    - package-lock.json

key-decisions:
  - "A token is refused when iat < floor(passwordChangedAt / 1000); the same second is accepted (SEC-18, ADR 0015)"
  - "getCurrentUser passes SERVICE_UNAVAILABLE on instead of returning null, so an outage never looks like a logged-out visitor"
  - "getSession also type-checks sub (string) and iat (number) after jwtVerify, on top of requiredClaims"

patterns-established:
  - "Negative session tests pair every rejected token with an accepted control from the same helper, so they fail while the implementation is a stub"
  - "A test about a token predating a password change must keep the token inside its 7-day life, or it passes for the wrong reason"

requirements-completed: [S14, S3, R6]

coverage:
  - id: D1
    description: "Tokens are HS256 with only sub, iat and exp, last 604800 seconds (equal to the cookie maxAge), and getSession returns null for HS512, alg none, another secret, an edited payload, a missing exp, sub or iat, malformed input and a token older than 7 days; it never throws"
    requirement: S14
    verification:
      - kind: unit
        ref: "test/server/session.test.ts (16 [S14] tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "getCurrentUser re-reads the user and role on every call; a role claim inside the token is ignored; deactivated, deleted and malformed-subject users give null; the result has exactly id, name, email, role and photo"
    requirement: S14
    verification:
      - kind: unit
        ref: "test/server/current-user.test.ts (getCurrentUser describe: [S14], [S6], [S3] tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A token issued in the same second as passwordChangedAt is accepted (even with the change at .999), one issued a second earlier or days earlier is rejected, one issued after is accepted"
    requirement: S14
    verification:
      - kind: unit
        ref: "test/server/current-user.test.ts (5 SEC-18 tests, fake Date timers)"
        status: pass
    human_judgment: false
  - id: D4
    description: "requireUser throws UNAUTHENTICATED or redirects to /login?next= with a safe path; requireRole throws FORBIDDEN with no role hierarchy and UNAUTHENTICATED with no session"
    requirement: S6
    verification:
      - kind: unit
        ref: "test/server/current-user.test.ts (requireUser and requireRole describes)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Cookie options are httpOnly, lax, path /, maxAge 604800 and secure in staging and production; the logout cookie reuses them with maxAge 0"
    requirement: S9
    verification:
      - kind: unit
        ref: "test/server/session.test.ts (5 [S9] tests)"
        status: pass
    human_judgment: false
  - id: D6
    description: "safeNext keeps one-slash same-site paths and returns / for protocol-relative, backslash, absolute, javascript:, control-character, empty, non-string and over-long input"
    requirement: S22
    verification:
      - kind: unit
        ref: "test/server/redirects.test.ts (22 [S22] cases)"
        status: pass
    human_judgment: false

duration: about 1h 20min
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 09: Session layer Summary

**An HS256-pinned, role-free 7-day session JWT, shared cookie options, `getCurrentUser` that re-reads user and role from the database on every call and refuses tokens older than a password change, `requireUser` and `requireRole`, `safeNext`, and a `mockSession` helper.**

## Performance

- **Duration:** about 1h 20min (includes a pause for a usage limit; start time was not recorded)
- **Completed:** 2026-11-09
- **Tasks:** 2 (each RED then GREEN)
- **Files modified:** 11 (8 created, 3 modified)

## Accomplishments

- `signSession(id)` yields a token whose payload keys are exactly `sub`, `iat`, `exp`, with `exp - iat = 604800`. `getSession` verifies with `algorithms: ['HS256']` and `requiredClaims`, and returns `{ userId, iat }` or null.
- `getCurrentUser` is `cache()`-wrapped, calls `findActiveById` each time, compares `iat` with the second of `passwordChangedAt`, and returns `toSelf(record)`.
- `requireUser({ next })` redirects to `/login?next=` followed by the encoded `safeNext` path; `requireRole` takes an explicit array.
- `test/setup.ts` mocks `next/headers` for every test file; `mockSession(user)` sets a real signed cookie.
- Next 16.4.5 docs (`cookies.md`, `redirect.md`) were checked: cookie writes are only legal in Server Functions and Route Handlers, `redirect` works while rendering, and it throws a digest error. This matches the plan; no difference.

## Task Commits

1. **Task 1: tokens, cookie options, safeNext** - RED `9410784` (test, includes the jose 6.2.15 install), GREEN `6f789f9` (feat)
2. **Task 2: getCurrentUser, requireUser, requireRole, mockSession, ADR 0015** - RED `dc07f8c` (test), GREEN `0587d86` (feat)

**Plan metadata:** the docs commit that follows this file.

## Negative-path proof

Each rejection test was run against the real implementation with one line removed (uncommitted mutation, then restored), and failed for the intended reason:

| Mutation | Test that failed |
| --- | --- |
| drop `algorithms: ['HS256']` | HS512 token rejected |
| drop `requiredClaims` | token with no expiry rejected |
| `secure: false` always | secure in staging and production (2 tests) |
| expiry `8d` | 7-day life and the 6d23h/7d1s boundary (2 tests) |
| drop the `passwordChangedAt` comparison | one second before the change; long before the change |
| `<=` instead of `<` | same-second accepted (2 tests) and the boundary test |
| compare in milliseconds | same-second accepted (2 tests) and the boundary test |
| pass the raw `next` to `redirect` | unsafe next not carried to the login page |
| admin always passes `requireRole` | no role hierarchy (admin refused) |

alg none, wrong secret, edited payload, a role claim in the token, a deactivated user, a deleted user and an expired token are tested on the real implementation. The alg none, wrong-secret and role-claim cases cannot be shown failing by deleting a line: jose rejects them regardless of the options, and the code never reads a role claim. Their tests pair the rejected token with an accepted control, so they fail while `getSession`/`getCurrentUser` is a stub (the RED run).

## TDD Gate Compliance

`test(01-09)` precedes `feat(01-09)` for both tasks. No refactor commits.

- **Task 1 RED:** `check tdd-red-evidence` returned `RED_EVIDENCE_OK` for `[S9] is secure when APP_ENV is production` (expected true, got false from the stub). The first candidate (`returns the user id and issue time`) was `INVALID_RED / invalid_record` because its assertion message prints a multi-line object, so the target was re-run alone with a plain boolean assertion, which tdd.md allows. Semantic assessment: the target ran and failed on the planned assertion. Of 43 tests, 21 failed; the rest are stub-compatible regression guards. Throwaway stubs: `session.ts` (cookie options with wrong values, `signSession` returning `''`, `getSession` returning null) and `redirects.ts` (always `/`).
- **Task 2 RED:** `RED_EVIDENCE_OK` for `[S14] reads the role from the database on every call` (undefined where `'user'` was expected). Semantic assessment: target executed and failed on the planned assertion; 28 of 29 tests failed. Throwaway stubs: `getCurrentUser` returning null, `requireUser`/`requireRole` rejecting with a plain `Error`. `request-context.ts`, `mock-session.ts` and the `test/setup.ts` mock were written in final form in the RED commit as test support. Full suite in RED: only the new file failed (316 others passed).

## Decisions Made

See `key-decisions` and ADR 0015. The same-second rule (equality accepted) is the plan's; the ADR records its cost, a window under one second.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A SEC-18 test passed for the wrong reason**
- **Found during:** Task 2 mutation check, after the GREEN code was written
- **Issue:** "rejects a token issued long before the password change" signed the token on 1 Nov and changed the password on 8 Nov, exactly 7 days later, so the token was expired and the test passed even with the `passwordChangedAt` check removed.
- **Fix:** the token is issued on 5 Nov. The mutation now fails this test.
- **Files modified:** test/server/current-user.test.ts
- **Committed in:** `0587d86` (the GREEN commit; the RED commit holds the earlier date)

**2. [Rule 2 - Missing critical] `getCurrentUser` passes database outages on**
- A test pins that `SERVICE_UNAVAILABLE` from `findActiveById` is not turned into a logged-out result. The plan did not say; ADR 0015 records it.

**3. [Rule 2 - Extra checks] `getSession` also checks the types of `sub` and `iat`** after `jwtVerify`, so a token with a non-string subject cannot reach the database lookup.

### Contract deviations from plan.md (recorded in ADR 0015)

- `getSession` returns `{ userId, iat }` with no role (plan.md 4.3 has a role).
- `requireRole(roles[], options?)` takes an array, not rest parameters.

**Total deviations:** 1 bug, 2 additions, 2 contract changes covered by the plan itself. No scope creep.

## Issues Encountered

- The first run was interrupted mid-Task 2 by a usage limit. On resuming, all uncommitted files were re-read and found complete; typecheck, lint, prettier and the full suite were re-run (only the 28 new RED tests failed) and the RED evidence was recomputed before committing.
- The `.gsd-tmp/` folder used for RED records was removed before the final commits and never staged.

## Known Stubs

None. All throwaway RED stubs were replaced at GREEN.

## Threat Flags

None. T-01-31 to T-01-35 are covered by the tests above; T-01-SC by the exact-version jose install. `getSession` swallows every error into null, which includes a missing `SESSION_SECRET`; that is validated at startup (plan 01-04), so it cannot happen in a running app.

## User Setup Required

None.

## Next Phase Readiness

- Plans 01-11 and 01-12 should resolve the user only through `getCurrentUser()`; Route Handlers pass `request.cookies`. Cookie setting after login/logout uses `sessionCookie(token)` and `expiredSessionCookie()` in a Server Action or Route Handler.
- Tests call `await mockSession(user)` (a `createUser()` result works) or `mockSession(null)`; the store resets before each test. `vi.resetModules()` creates a second instance of the store, so do not combine it with `mockSession` in one test.
- `redirect()` is thrown inside `requireUser({ next })`; `action()` must `unstable_rethrow` it.
- S9's origin-check half is plan 01-11, so S9 stays open in REQUIREMENTS.md.
- Live checks against a running Next server (a real cookie round trip) were not run here; behaviour is covered by unit tests and `npm run build`.

## Self-Check: PASSED

Gate suite all exit 0 on the last GREEN commit `0587d86`: typecheck, lint, lint:css, format:check, check:client, check:conventions, check:env, knip, test:coverage (344 tests passed; `session.ts` 97% lines), build. GitHub Actions cannot run here, so no CI step ran on a runner. The four task commits are ancestors of HEAD and the created files exist.

---
*Phase: 01-foundation-and-contracts*
*Completed: 2026-11-09*
