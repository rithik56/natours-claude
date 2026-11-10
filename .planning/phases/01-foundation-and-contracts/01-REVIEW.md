---
phase: 01-foundation-and-contracts
reviewed: 2026-11-09T00:00:00Z
depth: quick
files_reviewed: 61
files_reviewed_list:
  - .env.example
  - .github/dependabot.yml
  - .github/workflows/ci.yml
  - docker-compose.yml
  - eslint.config.mjs
  - knip.json
  - lighthouserc.cjs
  - next.config.ts
  - scripts/check-client-boundaries.ts
  - scripts/check-conventions.ts
  - scripts/check-env.ts
  - scripts/ci-mongo.ts
  - scripts/measure-bundle.ts
  - scripts/smoke.ts
  - src/app/healthz/route.ts
  - src/app/layout.tsx
  - src/app/page.tsx
  - src/app/readyz/route.ts
  - src/instrumentation.ts
  - src/lib/format.ts
  - src/lib/ist.ts
  - src/lib/messages.ts
  - src/proxy.ts
  - src/server/access.ts
  - src/server/actions/action-state.ts
  - src/server/actions/action.ts
  - src/server/adapters/cache.ts
  - src/server/adapters/mailer.ts
  - src/server/adapters/queue.ts
  - src/server/adapters/rate-limit.ts
  - src/server/adapters/real-cache.ts
  - src/server/adapters/storage.ts
  - src/server/adapters/stripe.ts
  - src/server/api/origin.ts
  - src/server/api/parse-query.ts
  - src/server/api/responses.ts
  - src/server/api/with-api.ts
  - src/server/clock.ts
  - src/server/config-schema.ts
  - src/server/config-startup.ts
  - src/server/config.ts
  - src/server/db.ts
  - src/server/deps.ts
  - src/server/error-mapper.ts
  - src/server/errors.ts
  - src/server/logger.ts
  - src/server/modules/bookings/dto.ts
  - src/server/modules/bookings/model.ts
  - src/server/modules/reviews/dto.ts
  - src/server/modules/reviews/model.ts
  - src/server/modules/tours/dto.ts
  - src/server/modules/tours/model.ts
  - src/server/modules/tours/slug.ts
  - src/server/modules/users/dto.ts
  - src/server/modules/users/model.ts
  - src/server/modules/users/service.ts
  - src/server/redirects.ts
  - src/server/roles.ts
  - src/server/schema-helpers.ts
  - src/server/session.ts
  - src/server/validation.ts
findings:
  critical: 0
  warning: 9
  info: 4
  total: 13
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-11-09
**Depth:** quick (every listed file was read in full; depth `quick` was requested, so necessity was not assessed)
**Files Reviewed:** 61
**Status:** issues_found

## Summary

No confirmed auth bypass, injection, secret leak or unsafe redirect was found. The parts that matter most hold up on a line-by-line read:

- Session verification pins HS256 and requires `exp`, `iat` and `sub`.
- Role and active state are re-read from the database on every request.
- `safeNext` rejects `//`, backslashes, control characters and cross-origin results.
- `toAppError` never copies driver messages into a response.
- The logger redacts the password and token keys listed in `SECRET_KEYS`.
- `formDataToInput` and `searchParamsToRecord` are safe against `__proto__` keys.

The weaknesses are all robustness or latent defects. The most relevant ones are:

- There is no request body size cap in `withApi`.
- A null review author crashes the DTO mapper.
- bcrypt silently truncates passwords at 72 bytes, while the model validates 72 characters.
- The password write guard only covers three query hooks.
- Security timestamps and JWT `iat` use different clocks.
- The CI jobs have no timeout.

Nothing in this review rests on a decision recorded as deliberate (SEC-26, ADR 0015, ADR 0026, ADR 0018, the `Vary: Origin` behaviour). Confidence is stated on each finding. Where a claim depends on library behaviour I did not run, it is labelled unconfirmed.

## Critical Issues

None.

## Warnings

### WR-01: `withApi` reads an unbounded JSON body, and `PAYLOAD_TOO_LARGE` is never produced

**File:** `src/server/api/with-api.ts:67-81` (also 156-170)
**Confidence:** High that no limit exists. Memory impact depends on the host.
**Issue:** `readBody` calls `request.json()` with no size check. Route Handlers do not cap request bodies the way Server Actions do. The error code `PAYLOAD_TOO_LARGE` (413) is defined in `errors.ts` and `messages.ts` but nothing in `src/` raises it (grep confirms). The pipeline order also makes it worse:

- The body is parsed and Zod-validated before the rate limiter runs, so a client that is not yet limited can make the server buffer and parse arbitrarily large JSON.
- Requests rejected by validation never consume a rate-limit point.

Scenario: an unauthenticated client POSTs a few hundred MB of JSON to a `public` route that declares `body`. The process buffers and parses it, and the rate limiter never sees the request.
**Fix:** Check `Content-Length` and the streamed size in `readBody`, and raise the existing code.
```ts
const MAX_BODY_BYTES = 100 * 1024;
const declared = Number(request.headers.get('content-length') ?? '0');
if (declared > MAX_BODY_BYTES) throw new AppError('PAYLOAD_TOO_LARGE');
const text = await request.text();
if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new AppError('PAYLOAD_TOO_LARGE');
raw = JSON.parse(text); // inside the existing try/catch
```
Consider letting a route override the limit through `ApiOptions`, so Phase 4 uploads are not capped at 100 KB. For `rateLimit`, consider an optional pre-parse key for routes that can key on IP or cookie alone.

### WR-02: `toReview` throws a `TypeError` instead of the intended error when the author is `null`

**File:** `src/server/modules/reviews/dto.ts:24-28, 36` (same pattern in `src/server/modules/tours/dto.ts:93-97`)
**Confidence:** Medium. It depends on Mongoose returning `null` for an unmatched single-path populate, which is documented behaviour.
**Issue:** `isAuthorRecord` does `typeof user === 'object' && 'name' in user`. `typeof null === 'object'`, so for `null` the `in` operator throws "Cannot use 'in' operator to search for 'name' in null". The types do not admit `null`, but a populated `user` is `null` when the referenced user document is missing (deleted, or filtered by a populate `match`). The result is an uncaught `TypeError` that maps to INTERNAL 500, not the descriptive "needs the review author to be populated" error. One orphaned review would make the whole tour reviews list fail.
**Fix:**
```ts
function isAuthorRecord(user: unknown): user is AuthorSource {
  return typeof user === 'object' && user !== null && 'name' in user && 'role' in user;
}
```
The same `!== null` guard is needed in `isGuideRecord`. Decide whether Phase 6 should skip or anonymise a review whose author is gone, rather than throw.

### WR-03: Password `maxlength: 72` counts characters, but bcrypt truncates at 72 bytes

**File:** `src/server/modules/users/model.ts:67-73` (hash at 84-89)
**Confidence:** High. `bcryptjs` 3.0.3 silently truncates, and `node_modules/bcryptjs/index.js` ships a `truncates()` helper for exactly this.
**Issue:** The schema validates 8 to 72 UTF-16 code units, then `bcrypt.hash` is called with the string as is. A password with multi-byte characters (for example Devanagari at 3 bytes per character, which is plausible for this product) is silently cut at 72 bytes. A 40-character Devanagari password is effectively its first 24 characters. Two passwords that differ only after byte 72 verify as equal. The comment on line 82-83 says the hash is "never measured", which is right, but the byte length of the plain password is also never measured.
**Fix:** Measure bytes at validation time.
```ts
maxlength: [72, validation.tooLong(72)],
validate: { validator: (v: string) => Buffer.byteLength(v, 'utf8') <= 72, message: validation.tooLong(72) },
```
The same check must be in whatever Zod schema the login, register and change-password forms use. Alternatively, pre-hash with SHA-256 and base64 before bcrypt, and record the choice in an ADR.

### WR-04: The "password is written only by `save()`" guard has gaps

**File:** `src/server/modules/users/model.ts:84-108`
**Confidence:** Medium. The mechanism is documented Mongoose behaviour that I did not run here.
**Issue:** Hashing lives in `pre('save')`. The write guard is registered only for `findOneAndUpdate`, `updateOne` and `updateMany`. These paths bypass both:

- `User.insertMany([...])` runs no `save` middleware, so a plain-text password is stored unhashed. `eslint.config.mjs` lines 78-79 say the Phase 4 seed "builds documents directly".
- `replaceOne`, `findOneAndReplace` and `bulkWrite` are unguarded, so they can write `password` or `passwordChangedAt`.
- `setsProtectedField` inspects only update keys, so `$rename` into `password` is also not detected.

`passwordChangedAt` is what invalidates old sessions (SEC-18), so a bypass here weakens the session guarantee as well as storage.
**Fix:** Register the guard for the missing operations, and hash in an `insertMany` pre-hook (or reject `password` there).
```ts
schema.pre(['findOneAndUpdate','updateOne','updateMany','replaceOne','findOneAndReplace'], guard);
schema.pre('insertMany', async function (next, docs) { /* hash docs[i].password or throw */ });
```
Also add a test that the seed path stores a bcrypt hash.

### WR-05: Tour slug can go stale, be empty, or collide as a misleading CONFLICT

**File:** `src/server/modules/tours/model.ts:223-247` and `src/server/modules/tours/slug.ts:8-15`
**Confidence:** Medium. These are code-path facts. There are no callers yet, so it is latent.
**Issue:**
- The slug is regenerated on `save` (via the `validate` hook) and on `findOneAndUpdate`. A rename through `updateOne`, `updateMany` or `replaceOne` does not touch the slug, so the URL no longer matches the name.
- `slugify` returns `''` when the name has no ASCII letters or digits (for example a name that is only punctuation, or Devanagari, which NFKD does not transliterate). Name `minlength: 10` allows this. One tour could then be saved with `slug: ''`, which is unique-indexed, and the next such tour would fail.
- Two different names such as "Kashmir Great Lakes" and "Kashmir, Great Lakes" produce one slug. The unique-name check passes and the unique-slug check fails. `toAppError` then reports CONFLICT with `path: 'slug'`, a field the admin never typed.

**Fix:** Add `updateOne` and `updateMany` to the slug hook. Fail validation when `slugify(name) === ''`. Consider mapping a slug conflict back to the `name` field.

### WR-06: `isDbUnavailableError` misses common driver outage errors, so they surface as 500

**File:** `src/server/db.ts:10-14, 21-29`
**Confidence:** Medium. It matches the driver's class names as I know them, but I did not run a live outage.
**Issue:** The check is an exact match on `error.name` for three names. Related driver errors have their own names and are not matched: `MongoNetworkTimeoutError` (subclass of `MongoNetworkError`, with its own `name` getter), `MongoPoolClearedError`, `MongoTopologyClosedError` and `MongoNotConnectedError`. A mid-request socket timeout or a pool reset during a failover therefore maps to INTERNAL 500 and, for actions, is rethrown to `error.tsx`. It does not become the SERVICE_UNAVAILABLE 503 that B10 and `getCurrentUser`'s contract promise ("an outage is not treated as a logged-out visitor").
**Fix:** Match by class or by prefix.
```ts
import { MongoNetworkError, MongoServerSelectionError, MongoTopologyClosedError, MongoNotConnectedError } from 'mongodb';
// or: error.name.startsWith('MongoNetwork') || error.name.startsWith('MongoPool') || ...
```

### WR-07: CI jobs have no `timeout-minutes`

**File:** `.github/workflows/ci.yml:15, 45`
**Confidence:** High.
**Issue:** Neither `checks` nor `build` sets `timeout-minutes`. The `build` job starts a background `mongod`, runs `next start` under `smoke.ts` and drives headless Chrome through Lighthouse. A hung step runs to the default 360 minutes and burns free-tier minutes. `smoke.ts` has its own 30-second limits, but `lhci`, `npm ci` and `bundle:check` do not.
**Fix:** Add `timeout-minutes: 15` to `checks` and `timeout-minutes: 20` to `build`, or whatever the recorded green run supports with margin.

### WR-08: The password-change cut-off uses the pinned clock, but the JWT `iat` uses the wall clock

**File:** `src/server/modules/users/model.ts:88` against `src/server/session.ts:49-56, 120-125`
**Confidence:** High on the mismatch. Impact is limited to environments that set `APP_NOW`, which the config schema permits only in development, test and ci.
**Issue:** `passwordChangedAt = now()` reads `APP_NOW`, but `signSession` calls jose's `setIssuedAt()`, which reads the real clock. `getCurrentUser` compares the two. If `APP_NOW` is pinned later than the real time, which is likely for a pinned demo or test date, every token issued after a password change or reset has `iat` earlier than `passwordChangedAt` and is rejected. The user then cannot log in again after changing the password, until the real clock passes the pinned time. If it is pinned earlier, a token issued before the change is still accepted. A Playwright password-reset flow under a pinned `APP_NOW` would fail or falsely pass.
**Fix:** Use the real clock for security timestamps: `this.passwordChangedAt = new Date()`. `APP_NOW` is for business date logic. Or have `signSession` use `now()` consistently for `iat` and `exp`, and verify the effect on `jwtVerify`'s `exp` check.

### WR-09: `getSession` swallows every error, including Next control-flow and configuration errors

**File:** `src/server/session.ts:70-84`
**Confidence:** Low to medium. It is latent today because the root layout calls `connection()`.
**Issue:** The `try` wraps `await cookies()` and `secretKey()` as well as `jwtVerify`, and the `catch {}` returns `null` for anything. Two consequences:
- Next's own signals thrown by `cookies()` (the dynamic-usage and prerender bailout errors) must be re-thrown with `unstable_rethrow`. Swallowing them turns "this route used cookies in a static or cached scope" into "the visitor is logged out". `action.ts` and `with-api.ts` already call `unstable_rethrow`, so this is inconsistent.
- A `ConfigError` from `getConfig()` (for example a missing `SESSION_SECRET`) is also swallowed, so a misconfigured server answers every request as anonymous, not with an error. `loadConfigOrExit` covers `next start`, but not a runtime where `register()` did not run.

**Fix:** Narrow the `try` to the token verification, and keep `cookies()` and `secretKey()` outside it, or call `unstable_rethrow(error)` first in the catch. Let `ConfigError` propagate.

## Info

### IN-01: The proxy matcher's exclusions have no path boundary

**File:** `src/proxy.ts:47-53`
**Confidence:** High that the regex matches by prefix. Impact is latent, since no such routes exist yet.
**Issue:** `(?!api|webhooks|healthz|readyz|...)` excludes any path that merely starts with those strings. A future page such as `/apiary`, `/api-docs` or `/webhooks-guide` gets no nonce CSP at all, and its `x-request-id` and `x-nonce` request headers are never set.
**Fix:** Anchor the names: `'/((?!(?:api|webhooks|healthz|readyz)(?:/|$)|_next/static|_next/image|favicon\\.ico).*)'`.

### IN-02: `PublicUser` exposes `role` for every review author

**File:** `src/server/modules/users/dto.ts:6-11, 20-27`, used by `reviews/dto.ts:44`
**Confidence:** Low. This may be intended, as guides show a role badge. I could not confirm it against `plan.md`.
**Issue:** `toPublicUser` includes `role`, and `toReview` uses it for review authors. A public reviews endpoint then discloses which reviewers are `admin` or `lead-guide`, which is not needed to render a review.
**Fix:** If only guides need a role label, add `toPublicAuthor` without `role` for reviews.

### IN-03: `issuesToFieldErrors` uses `in`, while the action path uses `Object.hasOwn`

**File:** `src/server/validation.ts:74-75`, against `src/server/actions/action.ts:63`
**Confidence:** Low. It is only reachable with a schema that has dynamic or record keys.
**Issue:** `key in fields` is true for inherited names such as `constructor` and `toString`, so an issue on a field with that name is dropped. A key `__proto__` is lost differently. `detailsToFieldErrors` already uses `Object.hasOwn`.
**Fix:** Use `Object.hasOwn(fields, key)`, or build `fields` with `Object.create(null)`.

### IN-04: The `ratingsAverage` setter also rewrites query filters

**File:** `src/server/modules/tours/model.ts:169-175`
**Confidence:** Low to medium. This is Mongoose's documented behaviour of applying setters when casting query values, and I did not run it.
**Issue:** `set: v => Math.round(v * 10) / 10` runs when a filter such as `{ ratingsAverage: { $gte: 4.25 } }` is cast, so the filter silently becomes `>= 4.3`. A rating filter in the Phase 3 and 4 API could then exclude tours that match what the caller asked for.
**Fix:** Round in the rating recalculation service instead of a schema setter, or test `minRating=4.25` against the real query.

---

_Reviewed: 2026-11-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
