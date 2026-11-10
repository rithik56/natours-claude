---
phase: 01-foundation-and-contracts
plan: 12
subsystem: api
tags: [server-actions, action-state, default-deny-access, unstable-rethrow, field-errors, plain-data, example-tests, b13]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plan 01-11 resolveAccess, toAppError and withApi; plan 01-09 getCurrentUser, requireUser and mockSession; plan 01-10 getDeps and the fake rate limiter; plan 01-05 messages, issuesToFieldErrors and loggers; plans 01-07/01-08 users module and factories"
provides:
  - "src/server/actions/action-state.ts: ActionState and ActionResult types"
  - "src/server/actions/action.ts: action(schema, handler, { access, rateLimit? }) returning the useActionState shape (prev, formData) => Promise<ActionState>"
  - "test/examples/server-action.test.ts, page-data.test.ts, shared-service.test.ts: the three example tests later phases copy (Q6, Q7, B13)"
affects: [01-14, 01-15, phase-3, phase-5, phase-6]

actuals:
  tokens: 12100
  tasks: 2
  commits: 3
plan_head_before: aa326b95d92cafb8e4af1e3aa5107cfb1df05a07
plan_head_after: 3830af9bce71f6d98fc7fc7d7ffb9f371bed358b

tech-stack:
  added: []
  patterns:
    - "Every Server Action is action(schema, handler, { access, rateLimit? }); a missing access declaration returns FORBIDDEN and the handler never runs"
    - "Fixed pipeline: request ID from x-request-id (UUID only), resolveAccess, FormData parse with Zod, rate limit, handler, plain-data check on data; any throw goes through unstable_rethrow first, then toAppError"
    - "Expected errors become ActionState; INTERNAL is logged with the request ID and rethrown to error.tsx"
    - "Fixtures for a feature that does not exist yet are defined inside the example test file"

key-files:
  created:
    - src/server/actions/action-state.ts
    - src/server/actions/action.ts
    - test/server/actions/action.test.ts
    - test/examples/server-action.test.ts
    - test/examples/page-data.test.ts
    - test/examples/shared-service.test.ts
  modified: []

key-decisions:
  - "action() calls resolveAccess with no cookie source, so the session comes from the ambient cookies() store, and puts access before form parsing and the rate limit, as withApi does"
  - "The FormData is turned into a null-prototype object, so a field named __proto__ is an ordinary key a strict schema refuses and cannot change the parsed input's prototype"
  - "A field sent once is a string and a field sent more than once is an array; forms with one checkbox must preprocess to an array in their schema"
  - "ActionState error gains an optional retryAfterSeconds, set only for RATE_LIMITED, so a form can show the wait time (deviation from the plan.md 4.3 type)"
  - "Validation failures return fieldErrors from issuesToFieldErrors (root issues such as unknown keys leave fieldErrors empty); thrown AppErrors with details map to fieldErrors by first segment of the path"
  - "Plain data means primitives, arrays and objects whose prototype is Object.prototype or null, checked recursively with a cycle guard; only the path of the offender goes into the error, never a value"

patterns-established:
  - "Tests that read log lines mock @/server/logger with vi.hoisted storage and a pino destination (copied from with-api.test.ts)"
  - "A test settles a promise into { status, value | reason } and asserts on plain strings, so a failing assertion prints on one line"

requirements-completed: [B18, S1, B9, B13, Q6, Q7, R6]

coverage:
  - id: D1
    description: "redirect() and notFound() thrown in a handler reach the caller with their digests and are not logged as failures"
    requirement: B18
    verification:
      - kind: unit
        ref: "test/server/actions/action.test.ts#[B18] a redirect() inside the handler reaches the caller with its NEXT_REDIRECT digest"
        status: pass
    human_judgment: false
  - id: D2
    description: "An action with no access declaration, an unknown one, or a role list that omits the caller's role is refused; anonymous gets UNAUTHENTICATED; a database outage is SERVICE_UNAVAILABLE"
    requirement: S1
    verification:
      - kind: unit
        ref: "test/server/actions/action.test.ts#default-deny access (S1)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Invalid FormData gives field errors from messages.ts, $ACTION fields are stripped, expected errors become ActionState and unexpected ones are logged and rethrown"
    requirement: B9
    verification:
      - kind: unit
        ref: "test/server/actions/action.test.ts#form validation and field errors (B9)"
        status: pass
      - kind: unit
        ref: "test/server/actions/action.test.ts#expected and unexpected errors (B9)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Documents, ObjectIds, Dates, Maps, functions, class instances, bigints and cycles in data are refused"
    requirement: R6
    verification:
      - kind: unit
        ref: "test/server/actions/action.test.ts#plain data only (R6)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Example tests for a Server Action, a page data function and one service behind both a Route Handler and an action"
    requirement: B13
    verification:
      - kind: unit
        ref: "test/examples/shared-service.test.ts#[B13] both return identical DTOs for the same seed user"
        status: pass
      - kind: unit
        ref: "test/examples/server-action.test.ts and test/examples/page-data.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "Business rules live only in services; withApi and action() hold no business logic"
    requirement: B13
    verification: []
    human_judgment: true
    rationale: "A backstop statement in the plan; code review checks that later actions stay thin"

duration: 12min
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 12: action() and example tests Summary

**Server Action helper action() with default-deny access, Zod field errors from messages.ts, redirect and notFound pass-through, plain-data refusal and a rate limit, plus the Server Action, page data and shared-service example tests.**

## Performance

- **Duration:** about 12 min
- **Completed:** 2026-11-09
- **Tasks:** 2
- **Files:** 6 created, 0 modified

## Accomplishments
- `action()` follows the withApi pipeline for Server Actions: request ID, `resolveAccess`, FormData parse, rate limit, handler, plain-data check. It returns `(prev, formData) => Promise<ActionState>`, the `useActionState` shape.
- `redirect()` and `notFound()` reach the caller untouched; expected errors (any AppError except INTERNAL) come back as `ActionState`, a CONFLICT on `email` as `fieldErrors.email`; unexpected errors are logged with the request ID and rethrown to `error.tsx`.
- 53 action tests, 17 of them `[S1]` and 6 `[B18]`, prove the negatives; 13 example tests cover the three patterns later phases copy. Coverage of `action.ts` is 98.8% of lines.

## Task Commits

1. **Task 1: action() with default deny, field errors and pass-through**
   - `8e38bc0` (test, RED)
   - `4b1830a` (feat, GREEN)
2. **Task 2: example tests for a Server Action, a page data function and one service behind both entry points** - `3830af9` (test)

**Plan metadata:** the docs commit that adds this file.

## TDD Gate Compliance

- **RED (Task 1), `8e38bc0`:** the test file plus a throwaway stub `action()` that accepts everything and returns `{ ok: true }`, so every test fails on its own assertion instead of an import error. `action-state.ts` is the final version. The whole-file TAP report is not parseable (`invalid_record`, "Non-TAP data in report") because 3 tests print multi-line objects in their failure messages. As the plan allows, the target test `[B18] a redirect() inside the handler reaches the caller with its NEXT_REDIRECT digest` was re-run alone with `-t`; `gsd-tools check tdd-red-evidence` returned `RED_EVIDENCE_OK` (`target_test_failed`). Semantic assessment: the target ran and failed on `expected 'resolved' to be 'rejected'`, the planned assertion; the full run was 51 failed, 2 passed (the two passes assert that plain data and an empty return are accepted, which the stub does too).
- **GREEN, `4b1830a`:** 53 of 53 pass; typecheck, lint, format:check and check:conventions exit 0 on that commit.
- **REFACTOR:** none.
- **Task 2 is test-only.** `action()` already existed, so the examples pass on first run and there is no RED to record. To show they can fail, three mutations were run and restored: `toPublicUser` leaking `email` (3 fail), `action()` without the access check (3 fail), the page fixture without `notFound()` (1 fails).

## Mutations run on Task 1 (each restored from a saved copy, working tree back to the committed file)

| Mutation | Tests that failed |
|----------|-------------------|
| access check removed | 13 `[S1]` tests |
| undefined access treated as `public` | 3 `[S1]` tests (no options, missing declaration, unknown value) |
| `unstable_rethrow` removed | 2 `[B18]` tests (a redirect or notFound is logged as a failure) |
| plain-data check removed | 10 `[R6]` tests |
| `$ACTION` fields not stripped | 1 `[B9]` test |
| INTERNAL returned as ActionState instead of rethrown | 1 `[B9]` test, plus 9 `[R6]` tests that rely on the rethrow |
| rate limit removed | 2 rate-limit tests |

Note on the `unstable_rethrow` mutation: without it a redirect error is mapped to INTERNAL and rethrown as it is, so it still reaches the caller. What fails is the "not logged as a failure" assertion, which is therefore what protects B18 against someone changing the INTERNAL path later.

## Files Created
- `src/server/actions/action-state.ts` - `ActionState` and `ActionResult`
- `src/server/actions/action.ts` - `action()`
- `test/server/actions/action.test.ts` - access, redirect and notFound, validation, error mapping, request ID, plain data, rate limit
- `test/examples/server-action.test.ts`, `page-data.test.ts`, `shared-service.test.ts` - example patterns using real seed people through `createUser`, `mockSession` and `callRoute`

## Decisions Made
See `key-decisions`. What Next 16.4.5's own docs say about Server Action origins (`node_modules/next/dist/docs/01-app/02-guides/data-security.md` and `.../05-config/01-next-config-js/serverActions.md`): Server Actions use POST only; Next compares the `Origin` header's host with `x-forwarded-host` or `host` and aborts on a mismatch; `serverActions.allowedOrigins` adds extra hosts and stays unset (S9); a request with no `Origin` header at all is let through with a warning, not rejected. `action()` therefore does no origin check. `unstable_rethrow` is documented for `notFound()`, `redirect()` and `permanentRedirect()`, and for the request-time APIs when a segment is forced static.

## Deviations from Plan

**1. [Rule 2 - Missing critical] `retryAfterSeconds` added to the ActionState error**
- **Found during:** Task 1, from the dispatch instruction that a rate-limited call be refused with the wait time
- **Issue:** the plan.md 4.3 `ActionState` has only `code`, `message` and `fieldErrors`, and `messages.ts` (outside this plan's files) holds only "wait a few minutes", so a form could not say how long to wait. `withApi` already sends the wait as `Retry-After`.
- **Fix:** `error.retryAfterSeconds?: number`, set only for RATE_LIMITED from the limiter's result (at least 1). The type stays a superset of plan.md's, so no caller breaks.
- **Files modified:** `src/server/actions/action-state.ts`, `src/server/actions/action.ts`
- **Verification:** `[S1] the second call within the window is RATE_LIMITED with the wait time`
- **Committed in:** `8e38bc0`, `4b1830a`
- **Needs an ADR:** the project rule says every deviation is an ADR, but `docs/` was outside this plan's files, so none was written. The orchestrator should add one (for example ADR 0018) or fold it into plan 01-15's documentation.

**2. [Rule 3 - Blocking] RED needs a stub `action()`**
- A test importing a missing module is INVALID_RED, so the RED commit carries a no-op `action()` stub and the final `action-state.ts`. The stub was replaced in the GREEN commit.

---

**Total deviations:** 2 (1 Rule 2, 1 Rule 3)
**Impact on plan:** no scope change; one additive field on a type and a documented RED stub.

## Issues Encountered
- `tsc` rejected a `10n` bigint literal in a test (target below ES2020); the test uses `BigInt(10)`.
- The 53-test TAP report was not parseable (see TDD Gate Compliance); handled with a single-test re-run.

## Known Stubs
None. The fixtures in `test/examples/` are test-only by design and use real seed people.

## Facts for later plans
- `issuesToFieldErrors` (01-05) tests `key in fields` on a plain object, so a schema field named `constructor` or `toString` would be skipped. No form has such a field; `action()`'s own detail mapping uses `Object.hasOwn`. Left alone, out of scope.
- A form field sent once reaches the schema as a string, so a multi-select or checkbox group with one box ticked needs `z.preprocess` to wrap it in an array.
- Uncovered lines in `action.ts` are the empty-path and duplicate-field branches of the detail mapping and the `cause ?? error` fallback in the INTERNAL log call; coverage is 98.8% of lines for the file.
- Only `/healthz` and `/readyz` Route Handlers exist (`find src/app -name route.ts`), so knip reports no dead file or export.
- Pages in later phases must not wrap `notFound()` in their own try/catch (B18 flagged assumption); code review checks that.

## Verification

Locally ran and exited 0 on the final tree: `typecheck`, `lint`, `lint:css`, `format:check`, `check:client`, `check:conventions`, `check:env`, `knip`, `test:coverage` (42 files, 571 tests) and `build`. GitHub Actions did not run here. `npm run smoke` was not run (no compose MongoDB needed by this plan).

Acceptance criteria re-run: `action.ts` contains `unstable_rethrow(`, `resolveAccess(`, `$ACTION` and `x-request-id`; `action-state.ts` contains `fieldErrors?: Record<string, string>`; `[B18]` appears 6 times and `[S1]` 17 times in `action.test.ts`; the example files contain the required calls and `%2Fme`; `find src/app -name route.ts` lists only `healthz` and `readyz`.

## Next Phase Readiness
Plan 01-14 and the later phases can build every site form on `action()` and copy the three example tests. The deviation in `retryAfterSeconds` needs an ADR from the orchestrator.

## Self-Check: PASSED

Checked after the last commit `3830af9`: the 6 created files (`src/server/actions/action-state.ts`, `src/server/actions/action.ts`, `test/server/actions/action.test.ts`, `test/examples/server-action.test.ts`, `test/examples/page-data.test.ts`, `test/examples/shared-service.test.ts`) exist on disk, and the three task commits (`8e38bc0`, `4b1830a`, `3830af9`) are ancestors of HEAD on `gsd/phase-01-foundation-and-contracts`. `git rev-list --count aa326b9..HEAD` measured 3 commits.
