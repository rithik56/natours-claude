# 0025. ActionState carries the wait time for a rate-limited call

Status: Accepted
Date: 9 Nov 2026
Requirements: S1, B9
Plan review: none

## Context

`plan.md` 4.3 defines the error half of `ActionState` as `{ code, message, fieldErrors? }`. The rate limiter produces more than that: `RateLimitResult` has a `retryAfterSeconds`, and `withApi` already sends it to API callers as a `Retry-After` header. A Server Action has no header to send, and the RATE_LIMITED message in `src/lib/messages.ts` says only "Wait a few minutes and try again", with no figure. A form built on `action()` therefore could not tell the person how long to wait.

Plan 01-12 added the field while building `action()`, and its summary noted that the project rule (every deviation is an ADR) still needed a record, because `docs/` was outside that plan's files.

## Decision

- **`ActionState`'s error gains an optional `retryAfterSeconds?: number`.** The union is otherwise the `plan.md` 4.3 type (`src/server/actions/action-state.ts`).
- **It is set only with RATE_LIMITED.** `action()` takes it from the limiter's result and never reports less than 1 second. No other error code carries it.
- **The message text does not change.** `messages.errors.RATE_LIMITED` stays as it is, and a form that wants to show the wait reads `retryAfterSeconds`. Wording for it belongs in `src/lib/messages.ts`, like all user-facing text, and Phase 2's `copy.md` decides it.
- **It is a superset of the `plan.md` type.** Code written to `plan.md`'s `ActionState` still type-checks, because the new field is optional and `plan.md`'s shape is a subset of this one.

## Consequences

- `docs/contracts.md` shows the union with the added field, and the differences table cites this ADR.
- `withApi` and `action()` now say the same thing about a rate-limited call, one as a header and one in the returned state.
- A Client Component that shows the wait must be tolerant of the field being absent, because every other error omits it.
- The field is an integer number of seconds from the limiter. A Redis-backed limiter in Phase 5 must keep returning a `retryAfterSeconds` in its `RateLimitResult`, or `action()` has nothing to report.
- A test pins this behaviour: `[S1] the second call within the window is RATE_LIMITED with the wait time` in `test/server/actions/action.test.ts`.
