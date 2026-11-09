# 0015. Sessions read the user on every request

Status: Accepted
Date: 9 Nov 2026
Requirements: S14, S9, S6, S3, R6
Plan review: SEC-02, SEC-15, SEC-18

## Context

`plan.md` 4.3 has `getSession` return `{ userId, role, iat }` and gives `getCurrentUser` no rule for when the database is read. A token that carries the role has three problems:

- A demoted admin, or a deactivated user, keeps their old powers until the token expires, up to seven days (SEC-02).
- A token signed before a password change stays valid unless something compares it with the change (SEC-18).
- The token is the one input an attacker controls. Anything it says about a user's role is a claim, not a fact.

PROJECT.md Key Decision 11 and S14 (amended) settle the direction: the JWT carries no role, and the role comes from the database.

## Decision

- **Token.** An HS256 JWT whose payload has only `sub` (the User `_id`), `iat` and `exp`. It is verified with `algorithms: ['HS256']` pinned and `requiredClaims: ['exp', 'iat', 'sub']`. A token signed with another HMAC algorithm, an unsigned `alg: none` token, a token signed with another secret, and a token without `exp` all give no session. The secret is `SESSION_SECRET`, at least 32 characters, read through `getConfig()`.
- **Lifetime.** Seven days, 604800 seconds. The token's `exp` and the cookie's `maxAge` use the same constant.
- **Cookie.** `httpOnly`, `sameSite: 'lax'`, `path: '/'`, and `secure` in staging and production (`isProductionLike`). Logging out sets the same options with an empty value and `maxAge: 0`, so the browser removes the same cookie. The helpers return cookie objects; Server Actions and Route Handlers set them, because Next.js allows cookie writes only there.
- **Role from the database.** `getCurrentUser` calls `findActiveById` on every call and builds the result from that record. Roles in a token are never read. `requireUser` and `requireRole` always go through `getCurrentUser`, and `requireRole` takes an explicit list with no hierarchy: an admin is refused unless `admin` is listed.
- **Password changes (SEC-18).** A token is refused when `iat < Math.floor(passwordChangedAt / 1000)`. `iat` is whole seconds and `passwordChangedAt` is a millisecond timestamp, so the change is cut down to its second before comparing. A token issued in the same second as the change is accepted, because a user who changes their password is logged in again in that same flow, and that new token may share the second. A token issued one second earlier is refused. The cost is a window of under one second in which a token issued before the change, in the same second, survives. A smaller window would need the token to carry milliseconds, which the JWT `iat` claim does not. The session layer uses the one clock (`now()`): `signSession` writes `iat` and `exp` from it and `getSession` checks expiry against it, so `iat` and `passwordChangedAt` are always compared on the same clock, including when `APP_NOW` pins it (plan 01 review, WR-08).
- **Outages.** If the database is unreachable, `getCurrentUser` passes the `SERVICE_UNAVAILABLE` error on. A visitor is never treated as logged out because of an outage.
- **Signatures.** These differ from `plan.md` 4.3:
  - `getSession(cookieSource?): Promise<{ userId: string; iat: number } | null>`, with no role.
  - `getCurrentUser(cookieSource?): Promise<SelfUser | null>`, wrapped in React `cache()`. Outside React Server rendering `cache()` does not deduplicate, which is why tests can prove the read on every call.
  - `requireRole(roles: readonly Role[], options?)` takes an array instead of rest parameters, so it can also take the `next` option.
  - `requireUser({ next })` redirects to `/login?next=...` using a path that passed `safeNext` (S22); without `next` it throws `AppError('UNAUTHENTICATED')`.

## Consequences

- Every request that needs a user costs one indexed read on `_id`. Pages that call `getCurrentUser` several times in one render pay once, through `cache()`.
- A role change, a deactivation or a deletion takes effect on the next request.
- `withApi` (plan 01-11) and `action()` (plan 01-12) must resolve the user only through `getCurrentUser`, never from the token.
- The password-change rule depends on the User model's hook being the only writer of `passwordChangedAt`, which plan 01-07 enforces.
- A later refresh-token design must revisit this decision.
