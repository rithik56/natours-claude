# Phase 1: Foundation and contracts - Pattern Map

**Mapped:** 2026-11-08
**Files analyzed:** about 70 new files (grouped below)
**Analogs found:** 0 code analogs / all files. The repository is greenfield and has no application code.

## Greenfield statement

`git ls-files` shows only: `plan.md`, `CLAUDE.md`, `.claude/*`, `.planning/*`, `seed/CREDITS.md`, `seed/README.md`, `seed/data/{users,tours,reviews,bookings}.json` (plus photos). There is no `src/`, `test/` or `scripts/`. Nothing here may be cited as a code analog. Phase 1 creates the patterns that every later phase copies.

For each file the "authoritative source" below is what the executor follows instead. All paths named are git-tracked. `node_modules/next/dist/docs/` is not tracked, but it exists after install and is the version-matched reference.

Sources, by short name:
- **plan** = `/Users/rithikagarwal/Desktop/natours-claude/plan.md`
- **RES** = `01-RESEARCH.md` (Pattern N = "Pattern N" section; Pitfall N likewise)
- **CTX** = `01-CONTEXT.md` (D-01 to D-12)
- **seed** = `seed/data/*.json` and `seed/README.md`

## File Classification

| New file | Role | Data flow | Analog | Authoritative source |
|---|---|---|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts`, `.nvmrc`, `.npmrc`, `.gitignore`, `.env.example` | config | n/a | none | RES Pitfalls 3, 4, 5; Standard Stack; CTX D-06, D-11 |
| `eslint.config.mjs`, `stylelint.config.mjs`, `.prettierrc.json`, `knip.json`, `vitest.config.ts`, `lighthouserc.json` | config | n/a | none | RES Pitfalls 7, 8, 9; Code Examples (Vitest, LHCI) |
| `docker-compose.yml` | config | n/a | none | CTX D-12; RES Pattern 9 (`mongo:8.0`, named volume, 127.0.0.1) |
| `src/app/layout.tsx`, `src/app/page.tsx` | component (Server) | request-response | none | CTX D-09; RES Pitfall 1 (`await connection()`) |
| `src/app/healthz/route.ts`, `src/app/readyz/route.ts` | route | request-response | none | RES Architecture diagram; CTX B10 note; plan 3.3 |
| `src/proxy.ts` | middleware | request-response | none | RES Pattern 6; plan 3.4 |
| `src/instrumentation.ts`, `src/server/config-startup.ts` | config | startup | none | RES Pattern 1; Pitfall 2 |
| `src/server/config-schema.ts`, `config.ts`, `clock.ts` | config / utility | transform | none | RES Pattern 1; A11 key names; CTX Config |
| `src/server/logger.ts` | utility | event-driven | none | RES Pattern 5, Security (pino `redact`) |
| `src/server/errors.ts` | utility | transform | none | plan 4.2; RES Pattern 5 |
| `src/lib/messages.ts`, `format.ts`, `ist.ts` | utility | transform | none | CTX D-01 to D-04; RES Pattern 8; plan 4.4 |
| `src/server/db.ts` | service | CRUD | none | RES Pattern 2 |
| `src/server/modules/{users,tours,reviews,bookings}/model.ts` | model | CRUD | none | plan 1.3 minus `priceDiscount`; RES Pattern 9; seed shapes |
| `src/server/modules/*/dto.ts` | utility (mapper) | transform | none | plan 1.3 last para; CTX Mappers; RES Security V8 |
| `src/server/modules/users/service.ts` | service | CRUD | none | plan 4.4 `findActiveById`; RES Plan slicing |
| `src/server/session.ts`, `redirects.ts` | service / utility | request-response | none | RES Pattern 3; plan 4.3 |
| `src/server/api/{with-api,responses,parse-query,origin,error-mapper}.ts` | middleware / utility | request-response | none | RES Patterns 4, 5, Pitfall 11; plan 4.1 to 4.3 |
| `src/server/actions/{action,action-state}.ts` | middleware | request-response | none | RES Pattern 4; plan 4.3 |
| `src/server/cache.ts`, `deps.ts` | utility / provider | request-response | none | RES Pattern 7; Open Question 2 |
| `src/server/adapters/{mailer,storage,stripe,queue,rate-limit}` (interface + fake) | service | event-driven / file-I/O | none | plan 3.2 rule 9, 4.4, 4.5 |
| `test/setup.ts`, `global-setup.ts`, `empty.ts` | test config | n/a | none | RES Code Examples (Vitest); Pitfall 6 |
| `test/helpers/{factories,call-route,mock-session,db}.ts` | test | CRUD / request-response | none | plan 4.5; CTX D-08; RES Pitfall 12; seed |
| `test/**/*.test.ts` (format, ist, session, withApi, action, models, readyz) | test | mixed | none | RES Patterns 3, 4, 8, 9 (verified spike results) |
| `scripts/check-env.ts`, `check-client-boundaries.ts`, `check-conventions.ts`, `measure-bundle.ts` | utility (script) | batch | none | RES Pitfalls 3, 9; Code Examples (LHCI); CTX Config |
| `.github/workflows/ci.yml`, `.github/dependabot.yml` | config (CI) | batch | none | RES "Conventional commit + CI step list"; Pitfall 13 |
| `docs/contracts.md`, `docs/adr/NNNN-*.md`, `docs/bundle-baseline.json`, `README.md`, `CLAUDE.md` rewrite | docs | n/a | none | CTX D-07, Claude's Discretion; plan 4 |

## Pattern Assignments

Because there are no analogs, each entry points to the exact source to copy and the repository facts that constrain it.

### Models (`src/server/modules/*/model.ts`)

**Source:** plan 1.3 (lines 118-190) and RES Pattern 9.
- Registration: `(mongoose.models.User as Model<UserDoc> | undefined) ?? model<UserDoc>('User', schema)` (B17). All schemas use `{ timestamps: true }`.
- Async pre hooks with no `next` (Mongoose 9). User: hash on `isModified('password')`, set `passwordChangedAt` only when `!this.isNew` (B14). Tour: slug regenerated when `name` is modified, using a hand-rolled 6-line function (no `slugify`).
- `select: false` on `password`, `passwordResetToken`, `passwordResetExpires`, `active`.
- Drop `priceDiscount` (D-05). `price` is an integer > 0. `startDates` are validated as IST midnight via `toIstDay`/`fromIstDay` round-trip.
- Indexes: Tour `{price:1, ratingsAverage:-1}`, `{slug:1}` unique, `{startLocation:'2dsphere'}`, `{startDates:1}`. Review unique `{tour:1, user:1}`. Booking `{user:1}`, `{tour:1}`, `stripeSessionId` unique sparse, `currency` literal `'inr'`, `status` enum `paid|refunded`. No `pre(/^find/)` hooks (B12).
- Services must load, assign and `save()` so validators run. Use `runValidators: true` on any update (QA-04).

**Seed shapes the models must accept** (verified by reading `seed/data/*.json`):
- Users: `{ _id, name, email (@example.com), role, active }`. There is no `password` in the file (it comes from `SEED_USER_PASSWORD`, per `seed/README.md`). Roles seen: `admin`, `lead-guide`, `guide`.
- Tours: `{ _id, name, slug, duration, maxGroupSize, difficulty, price, summary, description, imageCover, images[3], startDates: ["2027-07-10", ...] (IST day strings), startLocation { type:'Point', coordinates:[lng,lat], address, description }, locations [{type, coordinates, description, day}] }`, and the guides and photo credits fields per plan 1.3. There is no `priceDiscount`.
- Reviews: `{ _id, review, rating, tour, user, createdAt: "2026-08-09T20:15:00+05:30" }`.
- Bookings: `{ _id, tour, user, price, currency:'inr', startDate: "2026-08-01" (IST day string), status:'paid', createdAt }`. Convert day strings with `fromIstDay`.

### `src/lib/format.ts` and `src/lib/ist.ts` (utility, transform)

**Source:** RES Pattern 8 and CTX D-01 to D-04.
```ts
// formatPrice: plan 4.4 line 533
new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(124999) // "₹1,24,999"
// formatDate: Intl.DateTimeFormat('en-IN', { day:'numeric', month:'short', year:'numeric', timeZone:'Asia/Kolkata' })
//   use formatToParts and replace month part 'Sept' with 'Sep' (D-01). Always show the year (D-02).
```
Helpers take an explicit `now: Date` argument. They never read the clock, and they never use `getDate()`.
- `toIstDay(date)` returns `'YYYY-MM-DD'` from Asia/Kolkata parts. `fromIstDay('2027-03-12')` returns `2027-03-11T18:30:00.000Z`.
- `isBookable(start, now)` is `toIstDay(start) > toIstDay(now)` (D-03).
- `tripStatus(start, duration, now)` is `'upcoming'` while the last day `start + duration - 1` is `>=` today in IST (D-04).
- `istMonthBounds('2027-01')` returns a half-open range.

Test expectations: "4 Sep 2027", "21 Nov 2026", "1 Jan 2027" (from `2026-12-31T18:30:00Z`), `₹1,24,999`. Run with `TZ=UTC` (Vitest `test.env`). Use dates from seed: Ladakh 4 Sep 2027, Spiti 18 Sep 2027.

### `src/server/session.ts` (service, request-response)

**Source:** RES Pattern 3 (spike-verified).
- `jwtVerify(token, secret, { algorithms: ['HS256'], requiredClaims: ['exp','iat','sub'] })`.
- Signing: `SignJWT({}).setSubject(id).setIssuedAt().setExpirationTime('7d')`. The payload has no role.
- Reject when `iat < Math.floor(passwordChangedAt.getTime()/1000)`. Equality passes (SEC-18).
- Contract: `getSession(): Promise<{ userId: string; iat: number } | null>`. This deviates from plan 4.3 line 496, which includes `role`, so it needs an ADR.
- Cookie options constant shared by set and delete: `{ httpOnly:true, secure:isProd, sameSite:'lax', path:'/', maxAge:7*24*60*60 }`.
- `getCurrentUser()` is wrapped in React `cache()`, re-reads user and role from the DB, and returns null if inactive or the token is stale.
- `safeNext`: accept only paths starting with a single `/`. Reject `//`, `/\` and schemes. Fall back to `/`.

### `src/server/api/with-api.ts` and `src/server/actions/action.ts` (middleware, request-response)

**Source:** RES Patterns 4 and 5; plan 4.1 to 4.3 (lines 459-509).
```ts
export type Access = 'public' | 'auth' | 'owner' | { roles: readonly Role[] };
withApi(handler, { access, body?, query?, params?, rateLimit? })   // access required; undefined at runtime -> FORBIDDEN
action(schema, handler, { access, rateLimit? })                    // returns (prev, formData) => Promise<ActionState<T>>
```
- `ActionState` is verbatim from plan 4.3 lines 506-509.
- `action()` catch order: `unstable_rethrow(err)` first (B18), then map `AppError`/`ZodError` to `ActionState`, then rethrow anything unexpected.
- `withApi`: `await connectDb()` before touching any model. Mint `x-request-id` if `proxy.ts` skipped the route. Check the origin on POST/PUT/PATCH/DELETE against the `APP_URL` origin plus `CORS_ORIGINS`, and allow a missing `Origin`. Answer `OPTIONS`. Never send `Allow-Credentials`.
- Error-mapper table: RES Pattern 5. Error codes and statuses are copied from plan 4.2 lines 475-488. The envelope is `{status:'fail'|'error', error:{code,message,details?,requestId}}`. Never return Mongo or Mongoose `message`, `keyValue` or rejected values (SEC-11).
- `AppError(code, message, details?)`: the status comes from the code.

### `src/server/db.ts` (service, CRUD)

**Source:** RES Pattern 2. Use a `globalThis.__natoursMongo` promise cache, `bufferCommands:false`, and `serverSelectionTimeoutMS` from config (default 5000). Clear the cache on rejection. Map `MongooseServerSelectionError`, `MongoServerSelectionError`, `MongoNetworkError` and the "before initial connection" `MongooseError` to `SERVICE_UNAVAILABLE`. `/readyz` pings Mongo and returns 200 or 503.

### `src/proxy.ts`, `next.config.ts`, `src/instrumentation.ts`

**Source:** RES Patterns 1 and 6, Pitfalls 1 and 2.
- `proxy.ts`: set `x-request-id` (always overwrite), `x-nonce` and `Content-Security-Policy` on both the request headers (`NextResponse.next({ request: { headers } })`) and the response. Use the CSP string and the explicit matcher at RES lines 436-453. `'unsafe-eval'` is dev only. It reads `process.env` directly (ARC-26 exception).
- `next.config.ts`: `headers()` for HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Frame-Options: DENY`. Leave `cacheComponents` off. Do not set `serverActions.allowedOrigins`.
- `instrumentation.ts` (copy from RES lines 367-373):
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { loadConfigOrExit } = await import('./server/config-startup');
  loadConfigOrExit();
}
```
`loadConfigOrExit` writes to `process.stderr` (not `console`), names the failing keys, never prints values, then calls `process.exit(1)`.
- `layout.tsx` must be `async` and call `await connection()` from `next/server`, with no `next/font/google` and no CSS import.

### Fakes and `deps.ts` (adapters)

**Source:** plan 3.2 rule 9, 4.4 and 4.5; RES Pattern 7, Open Question 2, A13.
- Each adapter is a plain TypeScript interface plus a fake, with no SDK.
- Fakes expose `fakes.mailer.sent`, `fakes.storage.files`, `fakes.stripe.sessions`, `fakes.cache.invalidated`, and `fakes.rateLimit.reset()`.
- `deps.ts` returns fakes for `development|test|ci` and throws a clear `INTERNAL` configuration error for staging and production.
- The cache adapter wraps `unstable_cache(fn, keyParts, { tags })` and `revalidateTag(tag, { expire: 0 })`. The fake calls `fn` directly.
- knip is strict, so every export must be exercised by a test.

### Test kit (`test/helpers/*`) (test, CRUD / request-response)

**Source:** plan 4.5 (lines 540-545), CTX D-08, RES Pitfall 12.
- `createUser({role?, active?})` picks a real person from `seed/data/users.json` by role. `createTour(overrides?)` copies a seed tour. `createBooking({user, tour, startDate?})` defaults to a start date taken from that tour's `startDates`. Nothing is invented.
- `callRoute(module, {method, path, params?, body?, as?})`: builds a `NextRequest`, passes `params` as a Promise, defaults `Origin` to `APP_URL`, and sets the session cookie.
- `mockSession(user | null)` mocks `next/headers` cookies.
- `vi.useFakeTimers({ toFake: ['Date'] })` only. One mongod in `globalSetup` with a unique DB name per test file. `server-only` is aliased to `test/empty.ts`. `MONGOMS_VERSION` is pinned to 8.0.x.
- bcrypt cost is 4 under test.

### CI, scripts, docs

- `ci.yml` step order: `npm ci`, typecheck, `eslint --max-warnings=0`, `stylelint --allow-empty-input`, prettier check, check-client, check-env, `npm audit --audit-level=high`, knip, `test:coverage`, build with empty env, LHCI collect/assert/baseline check. Use `actions/checkout@v7`, `actions/setup-node@v7` with `node-version-file: .nvmrc`.
- `docs/bundle-baseline.json` shape: `{ floorBytes, budgetDeltaBytes: 40960, measuredAt, route:'/', lighthouse, next }` (RES lines 604-606).
- `docs/contracts.md` is written from the code, using exact signatures from plan 4.1 to 4.5 amended by the ADRs.
- `CLAUDE.md` rewrite: build on the current uncommitted file. Keep the seed-content and Indian-conventions bullets word for word. Remove §11.1, §12 and "lead" wording.
- ADRs live at `docs/adr/NNNN-kebab-title.md`, from 0001. Cover: versions (0001), plus D-05, D-06, D-07, D-09, D-10, session no-role, CSP `style-src-attr`, disabling `security/detect-object-injection` (A5), and each PROJECT.md Key Decision.
- Commit style: `feat(session): pin HS256 and reject stale tokens [S14, B14] (01-03)`.

## Shared Patterns

These are conventions Phase 1 establishes. The source is the spec, not code.

### Layering and server-only
**Source:** plan 3.2. Only services import models. Every file under `src/server/` starts with `import 'server-only'`. Exceptions: `config-schema.ts` and anything a script imports. Only `config.ts` reads `process.env`, apart from `next.config.ts` and `proxy.ts`.
**Apply to:** all `src/server/**`.

### Default deny
**Source:** RES Pattern 4. A required `access` option, refused at runtime if missing.
**Apply to:** `withApi` and `action()`, and later every route and action.

### Error handling
**Source:** plan 4.1 and 4.2 plus the RES Pattern 5 table. Services throw `AppError`. Only the mappers shape the output, and they never leak internals.
**Apply to:** all services, handlers and actions.

### DTOs
**Source:** plan 1.3 line 190 and CTX Mappers. `toPublicUser` has no email, and a separate self mapper includes it. Return plain objects with string IDs and ISO dates. Never include password, token or `active`. This also applies to action state, error payloads and log fields (pino `redact`).
**Apply to:** all `dto.ts` files and anything crossing to the browser.

### Content and locale rule
**Source:** root `CLAUDE.md`. Real seed content only, including test fixtures. Prices go through `formatPrice` and dates through `formatDate`. Tests assert on the formatter output, never on hard-coded month strings. Copy is Indian English. User-facing wording comes only from `src/lib/messages.ts` (no Zod default message may reach a user).
**Apply to:** every file, test and fixture.

### Tests
**Source:** RES Pitfall 12 and plan 5 line 557. Tag regression tests with requirement IDs, for example `it('[S14] ...')`. Fake `Date` only. Reset fakes between tests.

## No Analog Found

Every file in the classification table has no code analog. Each is covered by the authoritative source listed against it. Nothing needs invention beyond RES. Two items are explicitly hand-rolled by decision: the slug function and the `Sept` to `Sep` patch.

## Planner notes (conflicts noticed while mapping)

- plan 4.3 `getSession` returns a `role`, but CTX S14 says the JWT carries no role. Use the RES Pattern 3 contract and record an ADR.
- `create-next-app` must be run with `--no-cache-components` (RES Pitfall 4). The scaffold `.gitignore` hides `.env.example` (Pitfall 3).
- Keep the stack minimal for knip. Do not install `tsx`, `jsdom` or Testing Library in Phase 1 (RES lines 217-218).
- The tracked-source gate: all cited paths (`plan.md`, `seed/data/*.json`, `seed/README.md`, `.planning/...`) are tracked in git. No gitignored mirror paths are cited.

## Metadata

**Analog search scope:** whole repository via `git ls-files`
**Files scanned:** all tracked files (about 10 non-image files)
**Pattern extraction date:** 2026-11-08
