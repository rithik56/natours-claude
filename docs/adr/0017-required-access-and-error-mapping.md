# 0017. Required access and one error mapping for every route

Status: Accepted
Date: 9 Nov 2026
Requirements: S1, S9, S10, B9, B10, D7, Q6
Plan review: SEC-15, SEC-26, SEC-11, ARC-18; RESEARCH Open Question 1

## Context

`plan.md` 4.3 gives `withApi` optional `auth` and `roles` settings. A route that forgets both is then open to the internet, and the mistake looks the same as a deliberate public route. Four other questions needed an answer before any route exists:

- Which Origins may make a write, and which may read the response across sites?
- Which request IDs can the server trust, when `/api`, `/webhooks`, `/healthz` and `/readyz` bypass `src/proxy.ts` and so get no proxy ID?
- How are thrown values turned into the 4.1 error envelope without leaking driver text, key values or stacks?
- What does a malformed id do: 400 or 404?

## Decision

- **`access` is required.** `withApi` and, later, `action()` take `access: 'public' | 'auth' | 'owner' | { roles: Role[] }` (the `Access` type in `src/server/access.ts`) instead of the optional `auth` and `roles` of `plan.md` 4.3. TypeScript rejects a missing value, and `resolveAccess` also refuses it at runtime with 403 FORBIDDEN, so a route built from JavaScript or a cast still fails closed (SEC-15). Roles match exactly, with no hierarchy, and `{ roles: [] }` admits nobody. `owner` means "signed in; the service checks the record is theirs" and exists so the Phase 6 access matrix can classify routes.
- **The user comes only from `getCurrentUser(request.cookies)`.** `requireUser` and `requireRole` take no cookie source, so `resolveAccess` calls `getCurrentUser` itself and applies the same two checks. A database outage passes through as 503; it is never treated as a logged-out visitor.
- **The pipeline order is fixed:** request ID, Origin check on writes, access, params, query, body, rate limit, handler. Access comes before validation and rate limiting, so an anonymous caller learns nothing about the body schema and cannot use up another caller's allowance.
- **Origin rule (S9, SEC-26).** A POST, PUT, PATCH or DELETE is refused with 403 unless its Origin equals APP_URL's origin or an entry of CORS_ORIGINS, compared exactly. A request with no Origin header is accepted, because scripts and curl send none and a browser always sends one on a cross-site write. A GET is never origin-checked, and nothing may change state on a GET. The Stripe webhook in Phase 6 is not wrapped this way: it is authenticated by its signature.
- **CORS (S10).** `Access-Control-Allow-Origin` with `Vary: Origin` goes only to an Origin listed in CORS_ORIGINS, as that origin and never as `*`. `Access-Control-Allow-Credentials` is never sent. The headers are worked out per request. Route files that serve cross-origin callers export `handlePreflight` as `OPTIONS`; it answers 204 and names the methods and headers only for an allowlisted origin.
- **Request IDs (D7, ARC-18).** `withApi` reuses an incoming `x-request-id` only when it is a UUID and otherwise mints one with `crypto.randomUUID()`, so a header cannot forge or flood a log line. The ID is on every response, in every error body and on every log line of the request. The proxy still replaces the ID for page requests.
- **Error mapping (B9).** `toAppError` maps an `AppError` as it is, then Zod, an unreachable database, jose, Mongoose `CastError`, Mongoose `ValidationError`, duplicate key (11000) and the Stripe signature error, and everything else to a generic INTERNAL. It copies no driver message, key value, rejected value or stack (SEC-11); the original rides along as a non-enumerable `cause` for the logs. 4xx is logged as a warning and 5xx as an error, both with the request ID, and never with cookies, bodies or query strings. A thrown `redirect()` and the other Next control-flow errors are rethrown first with `unstable_rethrow`.
- **Malformed ids.** A `CastError` gives 400 VALIDATION_ERROR naming the path. Services throw NOT_FOUND for a well-formed id that matches nothing (RESEARCH Open Question 1).
- **Duplicate keys.** Code 11000 gives 409 CONFLICT with a detail naming only the field, taken from `keyPattern`.
- **Bodies are JSON only** until Phase 4 adds multipart. A body schema with any other content type gives 415, and malformed JSON gives 400 with the invalid-JSON message.
- **Query on pages versus routes.** `parseQuery` is for pages and falls back to defaults for bad fields. `withApi` validates the query strictly and answers 400.

## Consequences

- Every later Route Handler is a `withApi` call that must say who may call it. A route with no declaration is a 403 in tests and in production.
- A Phase 6 test can find every route by glob and check its declared access against the matrix.
- `serverExternalPackages` for pino was not needed: `npm run build` bundles the logger as it is.
- Rate limiting is wired to the adapter. Only the fake exists until Phase 5, so staging and production answer 500 on a rate-limited route (ADR 0016).
- A request body is not size-limited here; Phase 4's upload work sets the limits.
