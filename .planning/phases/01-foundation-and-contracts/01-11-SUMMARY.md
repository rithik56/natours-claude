---
phase: 01-foundation-and-contracts
plan: 11
subsystem: api
tags: [route-handlers, withapi, access-control, csrf-origin-check, cors, error-mapping, request-id, call-route, adr]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plan 01-09 getCurrentUser and the session cookie; plan 01-10 getDeps and the fake rate limiter; plan 01-05 AppError, messages, validation and logger; plan 01-04 getConfig"
provides:
  - "src/server/error-mapper.ts: toAppError(err) for any thrown value"
  - "src/server/api/responses.ts: ok, created, list, noContent, errorBody, errorResponse (plan.md 4.1 envelope)"
  - "src/server/api/parse-query.ts: parseQuery (lenient, for pages) and searchParamsToRecord (strict input for routes)"
  - "src/server/access.ts: the Access type and resolveAccess, shared with action() in plan 01-12"
  - "src/server/api/origin.ts: isAllowedOrigin, corsHeaders, handlePreflight"
  - "src/server/api/with-api.ts: withApi with required access, ApiOptions and ApiContext"
  - "/healthz and /readyz as public withApi routes; test/helpers/call-route.ts callRoute"
  - "ADR 0017: required access and one error mapping for every route"
affects: [01-12, 01-14, 01-15, phase-4, phase-5, phase-6]

actuals:
  tokens: 23600
  tasks: 3
  commits: 6
plan_head_before: f6d306194b95aba7e33f9cf5d9b793076847b13c
plan_head_after: d7fb719d5460425b3e5d14cf1ad93fac08724ac2

tech-stack:
  added: []
  patterns:
    - "Every Route Handler is withApi(handler, { access, params?, query?, body?, rateLimit? }); a missing access declaration answers 403 and the handler never runs"
    - "Fixed pipeline: request ID, Origin check on writes, access, params, query, body, rate limit, handler; any throw goes through unstable_rethrow, toAppError, a log line with the request ID and errorResponse"
    - "Route tests call the handler through callRoute and read what the app logged through a mocked logger sink"

key-files:
  created:
    - src/server/error-mapper.ts
    - src/server/access.ts
    - src/server/api/responses.ts
    - src/server/api/parse-query.ts
    - src/server/api/origin.ts
    - src/server/api/with-api.ts
    - src/app/healthz/route.ts
    - test/helpers/call-route.ts
    - test/server/error-mapper.test.ts
    - test/server/api/responses.test.ts
    - test/server/api/parse-query.test.ts
    - test/server/api/origin.test.ts
    - test/server/api/with-api.test.ts
    - test/server/api/with-api-db-down.test.ts
    - test/app/healthz.test.ts
    - docs/adr/0017-required-access-and-error-mapping.md
  modified:
    - src/app/readyz/route.ts
    - test/app/readyz.test.ts
    - test/app/readyz-unavailable.test.ts

key-decisions:
  - "resolveAccess calls getCurrentUser(request.cookies) itself and applies the requireUser and requireRole checks, because those two take no cookie source and session.ts was outside this plan's files"
  - "Malformed JSON gives VALIDATION_ERROR whose message is messages.validation.invalidJson, with no details"
  - "The original error is kept as a non-enumerable cause on the mapped AppError, so JSON.stringify of it can never leak driver text"
  - "Vary: Origin is sent only together with Access-Control-Allow-Origin, as the plan says"

patterns-established:
  - "A test that needs CORS_ORIGINS calls vi.stubEnv at module top, before the first getConfig() call, and never combines it with vi.resetModules in a path that also uses mockSession"
  - "A logged-lines test mocks @/server/logger with vi.hoisted storage and a pino destination that parses each line"

requirements-completed: [S1, S9, S10, B9, B10, D7, Q6]

coverage:
  - id: D1
    description: "A route built without an access declaration, or with an unknown one, answers 403 and never runs the handler; roles match exactly (an admin is refused on a list without admin, an empty list admits nobody); access is checked before validation and the rate limit; the session is read from request.cookies, not the ambient store"
    requirement: S1
    verification:
      - kind: unit
        ref: "test/server/api/with-api.test.ts (16 [S1] tests)"
        status: pass
      - kind: mutation
        ref: "removing the access call, the final FORBIDDEN throw and the role check each failed 16, 3 and 3 [S1] tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "A POST, PUT, PATCH or DELETE from a foreign, lookalike, null or empty Origin gets 403 before access and validation; a missing Origin and the app origin pass; a GET is never refused"
    requirement: S9
    verification:
      - kind: unit
        ref: "test/server/api/with-api.test.ts (7 [S9] tests); test/server/api/origin.test.ts (2 [S9] tests)"
        status: pass
      - kind: mutation
        ref: "removing the Origin check failed 7 tests; startsWith instead of equality failed 2"
        status: pass
    human_judgment: false
  - id: D3
    description: "Access-Control-Allow-Origin with Vary: Origin goes only to CORS_ORIGINS entries, never as *, never with credentials, computed per request; handlePreflight answers 204 with methods, headers and max age only to an allowlisted origin"
    requirement: S10
    verification:
      - kind: unit
        ref: "test/server/api/origin.test.ts (6 [S10] tests); test/server/api/with-api.test.ts (6 [S10] tests)"
        status: pass
      - kind: mutation
        ref: "a wildcard Allow-Origin failed 7 tests"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every thrown value becomes a plan.md 4.1 envelope with the request ID: Zod, CastError, duplicate key, Mongoose ValidationError, jose, Stripe signature and database outage map to their codes, and anything else is a generic INTERNAL that leaks no stack, message or connection detail"
    requirement: B9
    verification:
      - kind: unit
        ref: "test/server/error-mapper.test.ts (11 tests with real Mongoose and jose errors); test/server/api/responses.test.ts; test/server/api/with-api.test.ts (errors and validation describes)"
        status: pass
      - kind: mutation
        ref: "copying the thrown message into INTERNAL failed 2 tests"
        status: pass
    human_judgment: false
  - id: D5
    description: "With MongoDB unreachable, two concurrent calls to an auth route and /readyz answer 503 within the selection timeout, and /healthz still answers 200 without touching the database"
    requirement: B10
    verification:
      - kind: unit
        ref: "test/server/api/with-api-db-down.test.ts; test/app/readyz-unavailable.test.ts; test/app/healthz.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "A request ID is minted, or an incoming UUID reused, and appears in the response header, the error body and every log line of that request; a non-UUID value is replaced; concurrent requests log only their own IDs; no cookie, body or query string is logged"
    requirement: D7
    verification:
      - kind: unit
        ref: "test/server/api/with-api.test.ts (request ID and logging describe)"
        status: pass
      - kind: mutation
        ref: "reusing any incoming ID failed the replacement test; dropping unstable_rethrow failed the redirect test"
        status: pass
    human_judgment: false
  - id: D7
    description: "/healthz and /readyz are public withApi routes; the built app answers both with x-request-id and the static security headers, and npm run smoke is green"
    requirement: Q6
    verification:
      - kind: other
        ref: "npm run smoke printed smoke: ok on the built app; curl of /healthz and /readyz on a built server on port 3211"
        status: pass
    human_judgment: false

duration: about 11 min by the commit ledger (14:43Z to 14:54Z)
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 11: Route Handler pipeline Summary

**`withApi` runs every Route Handler through a fixed pipeline with a required access declaration that fails closed, an Origin check on writes, CORS only for CORS_ORIGINS, strict Zod validation, an optional rate limit and one error mapper, and `/healthz` and `/readyz` now use it.**

## Performance

- **Duration:** about 11 min (start recorded at 14:43:30Z, finish 14:54:44Z)
- **Completed:** 2026-11-09
- **Tasks:** 3 (each RED then GREEN)
- **Files modified:** 19 (16 created, 3 modified)

## Accomplishments

- `toAppError` maps in the order the plan fixes: AppError as is, Zod, database outage, jose, then CastError, Mongoose ValidationError, 11000 and the Stripe signature error, and everything else to INTERNAL. It copies no driver message, key value or rejected value.
- `withApi(handler, { access, ... })` is the only way to write a Route Handler. A missing, undefined or unknown `access` answers 403, even for a signed-in admin, and the handler never runs.
- `resolveAccess` reads the user only through `getCurrentUser(request.cookies)`. A database outage during that read gives 503, not a logged-out 401.
- Writes with a foreign, lookalike (another port, scheme or longer host), `null` or empty Origin get 403 before access and validation. A missing Origin passes, and a GET is never checked.
- CORS headers are computed per request for CORS_ORIGINS entries only. `handlePreflight` is ready to be exported as `OPTIONS` by later route files.
- `/healthz` answers exactly `{ "status": "ok" }` and never touches the database. `/readyz` keeps its 200 and 503 bodies and now carries `x-request-id`.
- Next 16.4.5 docs (`route.md`, `unstable_rethrow.md`) were checked: `params` is a Promise and `request.cookies` and `request.nextUrl` exist as the plan assumed. No difference from the plan.

## Task Commits

1. **Task 1: error mapper, response envelope, parseQuery** - RED `a5eaba0` (test), GREEN `b467b56` (feat)
2. **Task 2: withApi, access, origin and CORS** - RED `fca5602` (test), GREEN `aa94900` (feat)
3. **Task 3: healthz and readyz on withApi, callRoute tests, ADR 0017** - RED `ade84ba` (test), GREEN `d7fb719` (feat)

**Plan metadata:** the docs commit that follows this file.

## Negative-path proof

Each mutation was applied to the committed GREEN code, the intended tests were seen failing, and the file was restored with `git checkout -- <file>`.

| Mutation | Tests that failed |
| --- | --- |
| Origin check removed (`with-api.ts`) | 4 foreign-origin write tests (POST, PUT, PATCH, DELETE), lookalike origins, origin-before-access, and the request ID on the refusal (7) |
| Origin compared with `startsWith` (`origin.ts`) | `origin.test.ts` near misses; `with-api.test.ts` lookalike origins (2) |
| Access call replaced by `'public'` | 15 of the 16 [S1] tests plus the CORS-on-error test (16) |
| Final `throw FORBIDDEN` in `resolveAccess` replaced by `return null` | no options, missing declaration, unknown access value (3) |
| Role check removed | lead-guide refused, admin refused on other roles, empty list (3) |
| Allow-Origin always `*` | 7 [S10] tests |
| `unstable_rethrow` removed | redirect is rethrown (1) |
| Any incoming request ID reused | non-UUID ID is replaced (1) |
| INTERNAL copies the thrown message | leak-nothing test and the missing-adapter test (2) |
| `callRoute` Origin default removed | the Origin default test (1) |

## TDD Gate Compliance

`test(01-11)` precedes `feat(01-11)` for all three tasks. No refactor commits. Each GREEN commit passed `format:check`.

- **Task 1 RED:** `check tdd-red-evidence` returned `RED_EVIDENCE_OK` for `toAppError > [B9] maps a real duplicate-key error to CONFLICT naming the field and not the value`. Semantic assessment: the target ran and failed on `expect(mapped.code).toBe('CONFLICT')` (received INTERNAL); the precondition `code === 11000` passed, so it was a real driver error. 24 of 27 tests failed. The first attempt was `INVALID_RED / no_target_test_failure` only because `targetTest` was not the qualified `file > suite > test` name that the tap-flat reporter emits. Throwaway stubs: `error-mapper.ts` (always INTERNAL), `responses.ts` (empty 200s) and `parse-query.ts` (returns `{}`).
- **Task 2 RED:** `RED_EVIDENCE_OK` for `[S9] a POST from a foreign origin is refused with 403 before the handler runs` (200 where 403 was wanted) and for `[S1] a role list refuses a lead-guide with 403 and admits an admin`. Semantic assessment: both ran and failed on the planned status assertion. 57 of 70 tests failed; the 13 that passed are positive controls and cases a fail-open stub cannot fail (the app origin passes, a missing Origin passes). Throwaway stubs: `access.ts` (returns null), `origin.ts` (allows every origin, sends no CORS headers) and `with-api.ts` (runs the handler with nothing checked). `test/helpers/call-route.ts` was written in final form in this RED commit as test support.
- **Task 3 RED:** `RED_EVIDENCE_OK` for `[D7] /readyz goes through the pipeline and carries a request ID` (false where true was wanted). 3 of 17 tests failed. The healthz status test was not used as the target because its `toEqual` diff is multi-line. Throwaway stub: `src/app/healthz/route.ts` answers `{ status: 'down' }`. The `callRoute` tests in `healthz.test.ts` pass on arrival because the helper was committed with Task 2's RED; one mutation shows they are not vacuous.

## Decisions Made

See `key-decisions` and ADR 0017.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `resolveAccess` cannot go through `requireUser` and `requireRole`**
- **Found during:** Task 2, reading `session.ts`
- **Issue:** the plan's key link says `resolveAccess` calls `requireUser` and `requireRole` with the cookie source passed to `getCurrentUser`, but both take no cookie source. Used as they are, a Route Handler would read the ambient `cookies()` store, not `request.cookies`.
- **Fix:** `resolveAccess` calls `getCurrentUser(cookieSource)` and applies the same checks (UNAUTHENTICATED without a user, FORBIDDEN when the role is not listed). `session.ts` stays untouched, as it is outside this plan's files. A test pins that a `mockSession` cookie in the ambient store does not authorise a request.
- **Files modified:** src/server/access.ts
- **Committed in:** `aa94900`

**2. [Rule 3 - Blocking] `readyz-unavailable.test.ts` called `GET()` with no request**
- **Issue:** `withApi` needs a `NextRequest`. The file is not in the plan's `files_modified`, but it fails the moment `/readyz` moves onto `withApi`.
- **Fix:** it now calls the route through `callRoute` and also checks the cache header and `x-request-id`. Behaviour asserted is unchanged.
- **Files modified:** test/app/readyz-unavailable.test.ts
- **Committed in:** `ade84ba`

**3. [Rule 2 - Missing critical] A strict-query helper for `withApi`**
- `parse-query.ts` also exports `searchParamsToRecord`, built with `Object.fromEntries` over a Map so a `__proto__` key stays plain data. `withApi` uses it for strict query validation and `parseQuery` uses the same normaliser. A test pins that `__proto__` and `constructor` are treated as unknown keys.

### Ordering differences

- `callRoute` is committed in Task 2's RED commit, not Task 3, because the Task 2 tests need it. Its own behaviour tests live in `test/app/healthz.test.ts` (a `callRoute` describe), not in a new file, to keep to the plan's file list.
- `next.config.ts` is unchanged: `npm run build` bundles pino without `serverExternalPackages`.

**Total deviations:** 2 blocking fixes, 1 addition, 2 ordering notes. No architectural change (no Rule 4).

## Issues Encountered

- The first RED evidence attempt for Task 1 was rejected for a naming reason only (see Task 1 RED above).
- `test/server/api/with-api-db-down.test.ts` prints the two Mongo server-selection log lines to the test output. They are the intended error-level lines with the request ID, not a failure.

## Known Stubs

None. The throwaway RED stubs were replaced at GREEN.

## Threat Flags

None beyond the plan. `/healthz` is the planned new route and returns only `{ status: 'ok' }`. T-01-40 to T-01-45 are covered by the tests above; T-01-46 (rate limiting) is accepted as planned; T-01-SC holds, as no package was installed.

## User Setup Required

None.

## Next Phase Readiness

- Plan 01-12's `action()` should take the same `Access` type and call `resolveAccess` with no cookie source, so it reads `next/headers`. It must `unstable_rethrow` first and map errors with `toAppError`, as `withApi` does.
- Route tests: `callRoute(routeModule, { method, path, params, body, headers, origin, ip, as })` returns `{ status, headers, body }`. A write defaults its Origin to APP_URL; `origin: null` omits it. A test that needs CORS_ORIGINS must call `vi.stubEnv('CORS_ORIGINS', ...)` at module top, before the first `getConfig()` call. To read log lines, copy the `vi.mock('@/server/logger', ...)` block in `with-api.test.ts`.
- A route that serves cross-origin callers exports `OPTIONS = handlePreflight`. `Vary: Origin` is sent only with an allowed origin, so a shared cache in front of such a route should be told to vary on Origin.
- Rate-limited routes answer INTERNAL in staging and production until Phase 5 adds the real limiter (ADR 0016).
- No request body size limit exists yet; Phase 4's upload work must set one before any route accepts multipart.
- No new config key, so `.env.example` is unchanged.
- GitHub Actions cannot run here. Locally ran and exited 0: `typecheck`, `lint`, `lint:css`, `format:check`, `check:client`, `check:conventions`, `check:env`, `knip`, `test:coverage` (505 tests) and `build`, plus `npm run smoke` against the compose MongoDB (`smoke: ok`).

## Self-Check: PASSED

Checked after the last GREEN commit `d7fb719`: all 16 created and 3 modified files listed under key-files exist on disk, and the six task commits (`a5eaba0`, `b467b56`, `fca5602`, `aa94900`, `ade84ba`, `d7fb719`) are ancestors of HEAD on `gsd/phase-01-foundation-and-contracts`. The gate suite exited 0 on that tree: typecheck, lint, lint:css, format:check, check:client, check:conventions, check:env, knip, test:coverage (505 tests) and build; `npm run smoke` printed `smoke: ok`. GitHub Actions did not run here.
