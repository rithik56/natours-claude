# Shared contracts

These are the contracts every later phase builds against, as they exist in the code at the end of Phase 1. `plan.md` section 4 is where they started. Where the code differs from it, this file says so and cites the ADR (see `docs/adr/README.md`). `plan.md` itself is never edited (ADR 0003).

Only the parts that everything shares are written here (ADR 0005). Each feature phase adds its own service signatures and email-template props when it builds them. Section 10 names the phase for each.

Every TypeScript block below is copied from the file named in its first line. Function bodies are left out and written as `;` or as a comment. A script compared each block with its source file when this was written (the plan 01-14 summary reports the count). A signature in this file that disagrees with the code is a bug in this file: fix it in the same change that moves the code.

## 1. Conventions

- **Layering** follows `plan.md` section 3.2. Pages, Server Actions and Route Handlers go through services to the models. Business rules live in services only (B13). `withApi` and `action()` hold none.
- **`server-only`.** Every file under `src/server/` starts with `import 'server-only';` (R6, enforced by `npm run check:conventions`). Files under `src/lib/` are plain modules that either side may import.
- **Models are private to their module** (ADR 0009). Only a module's own `service.ts` and `dto.ts` import its `model.ts`. `test/**` and `scripts/**` may import models, so factories and the Phase 4 seed can build documents.
- **Zod only through `src/server/validation.ts`** (ADR 0009). `src/server/config-schema.ts` is the one other file that imports it. Every schema imports `z` from `@/server/validation`, so the error map that keeps Zod's English away from users is always installed (DES-12).
- **`next/cache` only in `src/server/adapters/real-cache.ts`** (ADR 0009, ADR 0016).
- **`process.env` only through `getConfig()`.** The exceptions are `next.config.ts`, `src/proxy.ts` and the `NEXT_RUNTIME` check in `src/instrumentation.ts` (ADR 0010).
- **User-facing wording** comes only from `src/lib/messages.ts` (DES-12). Zod schemas and `AppError` take their text from it.
- **The DTO rule** (S3, R6, ADR 0013). Data leaves the server only through the mappers in a module's `dto.ts`. A DTO carries ids as strings, instants as ISO strings and calendar days as India Standard Time day strings (`YYYY-MM-DD`). It never carries a password, a token, a reset field or `active`. The rule covers every exit: API responses, props for Client Components, `ActionState.data`, error bodies and log lines.
- **Prices and dates.** A price is whole rupees (B20), formatted only through `formatPrice` and converted for Stripe only through `rupeesToPaise`. A date is an IST calendar day (B19), formatted only through `formatDate`. Distances are kilometres, through `formatDistance`. All date logic reads the one `now()` clock.
- **Commits** follow Conventional Commits and cite the requirement IDs and the GSD plan: `type(scope): summary [IDs] (NN-NN)`, for example `feat(session): pin HS256 and reject stale tokens [S14, B14] (01-09)`. A commit that adds a dependency gives a one-line reason for each new package in its body (ADR 0002, Q8, Q11).

### Where the code differs from plan.md section 4

| plan.md says | The code does | Why |
| --- | --- | --- |
| `getSession` returns `{ userId, role, iat }` | Returns `{ userId, iat }`. The token carries no role. | ADR 0015 |
| `requireRole(...roles)` | `requireRole(roles: readonly Role[], options?)`. No role hierarchy. | ADR 0015 |
| `getCurrentUser()` | `getCurrentUser(cookieSource?)`, a database read on every call | ADR 0015 |
| `withApi(handler, { auth?, roles?, ... })` and `action(schema, handler, { auth?, roles?, ... })` | Both take a required `access: Access`. A missing value is a type error and is refused at runtime with 403 FORBIDDEN. | ADR 0017 |
| `ActionState` error has `code`, `message`, `fieldErrors?` | Also an optional `retryAfterSeconds`, set only for RATE_LIMITED. It is a superset, so code written to `plan.md` still type-checks. | ADR 0025 |
| One `toPublicUser` | `toPublicUser` has no email and `toSelf` has one | ADR 0013 |
| Tour has `priceDiscount` | The field does not exist. One price per tour. | ADR 0014 |
| `mailer.enqueue(template, { to, firstName, url, ...vars })` | `EmailQueue.enqueue(job)` takes exactly `{ template, to, firstName, url }`. Sending is a separate `Mailer.send`. | ADR 0016 |
| Adapters in `queue/`, `storage/`, `stripe/` and `mailer/` folders; a `src/server/cache.ts` | All adapters, the cache included, are in `src/server/adapters/`. ADR 0012 still says `src/server/cache.ts`; the file is `src/server/adapters/cache.ts`. | ADR 0016 |
| Config errors are Zod errors | `parseConfig` throws `ConfigError` | ADR 0010 |
| A placeholder page for every route | Only `/`, `/healthz` and `/readyz` exist | ADR 0006 |
| `docs/contracts.md` holds all of section 4 | Only the shared parts, written per phase | ADR 0005 |
| Test helpers `createUser({ role?, active? })`, `createTour(overrides?)` | Factories copy real seed records and take an options object (section 9) | ADR 0024 |
| A `src/components/ui/` contract (section 4.6) | Not written yet. Phase 3 adds it. | ADR 0005 |

## 2. REST format and errors

### 2.1 The envelope (plan.md 4.1)

```ts
// src/server/api/responses.ts
/** The plan.md 4.1 envelope for a failure. `details` is present only for field errors. */
export type ErrorBody = {
  status: 'fail' | 'error';
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
    requestId: string;
  };
};

export type ListMeta = { page: number; limit: number; total: number };

export function ok(data: unknown, init?: ResponseInit): Response;

export function created(data: unknown): Response;

export function list(data: unknown[], meta: ListMeta): Response;

export function noContent(): Response;

export function errorBody(error: AppError, requestId: string): ErrorBody;

export function errorResponse(
  error: AppError,
  requestId: string,
  headers?: HeadersInit,
): Response;
```

- `ok` answers 200 with `{ status: 'success', data }`. `created` answers 201 with the same shape. `list` answers 200 with `{ status: 'success', data, meta }`. `noContent` answers 204 with no body.
- `status` is `fail` for a status below 500 and `error` for 500 and above. `details` is left out unless the error has them. A body never carries a stack or a cause (SEC-11).
- `list` puts the array itself in `data`. The `plan.md` 4.1 example nests it under a key such as `tours`. No ADR settles which one the catalogue API uses: Phase 4 decides when the first list route exists, and records it here.

### 2.2 Error codes (plan.md 4.2)

```ts
// src/server/errors.ts
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'TOKEN_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'RATE_LIMITED',
  'INTERNAL',
  'SERVICE_UNAVAILABLE',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  TOKEN_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503,
};

export type ErrorDetail = { path: string; message: string };

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: ErrorDetail[] | undefined;

  constructor(
    code: ErrorCode,
    message: string = messages.errors[code],
    details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = details;
  }
}

export function isAppError(value: unknown): value is AppError;
```

Services throw `new AppError(code, message?, details?)`. The status comes from the code. The default message comes from `messages.errors[code]`. Never put driver or Mongoose text in an `AppError` message.

### 2.3 Error mapping (ADR 0017)

```ts
// src/server/error-mapper.ts
export function toAppError(err: unknown): AppError;
```

`toAppError` checks in this order. It copies no driver message, key value, rejected value or stack (B9, SEC-11). The original error rides along as a non-enumerable `cause`, for the logs only.

| Thrown value | Becomes |
| --- | --- |
| An `AppError` | itself |
| A `ZodError` | 400 VALIDATION_ERROR, `details` from `issuesToDetails` |
| MongoDB unreachable (`isDbUnavailableError`) | 503 SERVICE_UNAVAILABLE |
| jose `JWTExpired` | 401 TOKEN_EXPIRED |
| any other jose error | 401 UNAUTHENTICATED |
| Mongoose `CastError` (a malformed id) | 400 VALIDATION_ERROR, one detail naming the path |
| Mongoose `ValidationError` | 400 VALIDATION_ERROR, one detail per path |
| Duplicate key (code 11000) | 409 CONFLICT, one detail naming the field from `keyPattern` |
| Stripe signature error (`type` is `StripeSignatureVerificationError`) | 400 VALIDATION_ERROR |
| Anything else | 500 INTERNAL, generic message |

Services throw NOT_FOUND for a well-formed id that matches nothing. A malformed id is 400, not 404.

## 3. Server helpers

### 3.1 Roles and access

```ts
// src/server/roles.ts
export const ROLES = ['user', 'guide', 'lead-guide', 'admin'] as const;

export type Role = (typeof ROLES)[number];
```

```ts
// src/server/access.ts
export type Access = 'public' | 'auth' | 'owner' | { roles: readonly Role[] };

export async function resolveAccess(
  access: Access | undefined,
  cookieSource?: CookieReader,
): Promise<SelfUser | null>;
```

- `public`: anyone. The session is not read and `resolveAccess` returns `null`.
- `auth`: any signed-in user.
- `owner`: a signed-in user. The service then checks the record is theirs. It is its own value so the Phase 6 access matrix can classify routes.
- `{ roles }`: a signed-in user holding one of the listed roles, exactly. An admin is refused unless `admin` is listed. `{ roles: [] }` admits nobody.
- `undefined` or any other value is refused with FORBIDDEN (SEC-15). The pipeline fails closed.
- No user gives UNAUTHENTICATED. A database outage gives SERVICE_UNAVAILABLE, never a logged-out visitor.

### 3.2 Session (ADR 0015)

```ts
// src/server/session.ts
export const SESSION_COOKIE = 'natours_session';

export const SESSION_MAX_AGE_SECONDS = 604800;

export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export function sessionCookieOptions();

export async function signSession(userId: string): Promise<string>;

export async function getSession(
  cookieSource?: CookieReader,
): Promise<{ userId: string; iat: number } | null>;

export function sessionCookie(token: string);

export function expiredSessionCookie();

export const getCurrentUser = cache(
  async (cookieSource?: CookieReader): Promise<SelfUser | null> =>
    // ... (body elided)

export async function requireUser(options?: {
  next?: string;
}): Promise<SelfUser>;

export async function requireRole(
  roles: readonly Role[],
  options?: { next?: string },
): Promise<SelfUser>;
```

The token and the cookie:

- **Token.** An HS256 JWT with only `sub` (the User `_id`), `iat` and `exp`. It is signed and verified with `SESSION_SECRET`, at least 32 characters. Verification pins `algorithms: ['HS256']` and requires `exp`, `iat` and `sub`. Another algorithm, `alg: none`, another secret and a missing `exp` all give no session. `getSession` never throws.
- **Lifetime.** Seven days, `SESSION_MAX_AGE_SECONDS`. The token's `exp` and the cookie's `maxAge` use the same value.
- **Cookie options** (`sessionCookieOptions()`): `httpOnly: true`, `secure` in staging and production, `sameSite: 'lax'`, `path: '/'`, `maxAge: SESSION_MAX_AGE_SECONDS`. `sessionCookie(token)` returns `{ name, value, ...options }`. `expiredSessionCookie()` is the same with an empty value and `maxAge: 0`, so the browser removes the same cookie. Only a Server Action or a Route Handler may set a cookie, so these helpers return objects and the caller sets them.
- **`getCurrentUser`** is wrapped in React `cache()`, so it reads once per request inside React Server rendering. It calls `findActiveById` on every call and builds the user from that record. The role in the database is the role. It returns `null` for no session, an invalid token, an unknown or deactivated user, or a token issued before the user's last password change. That comparison is in whole seconds: `iat < Math.floor(passwordChangedAt / 1000)` is refused (SEC-18). It throws `AppError('SERVICE_UNAVAILABLE')` when the database is unreachable.
- **`requireUser`** returns the user. With no user it redirects to `/login?next=...` when `next` is given, using a path that passed `safeNext`, and otherwise throws `AppError('UNAUTHENTICATED')`. `redirect()` works by throwing, so never catch it (B18).
- **`requireRole`** adds the role check and throws `AppError('FORBIDDEN')` when the role is not listed.
- **Route Handlers** pass `request.cookies` to `getCurrentUser` and `getSession`. Pages and actions pass nothing and the cookie comes from `cookies()`. `requireUser` and `requireRole` take no cookie source, so a Route Handler uses `withApi` with an `access` value instead (ADR 0017).

### 3.3 Safe redirects

```ts
// src/server/redirects.ts
export function safeNext(next: unknown): string;
```

Returns `next` only when it is a same-site path: one leading slash, no backslash, no control character, at most 2048 characters, and it still resolves to the same origin. Anything else gives `/` (S22).

### 3.4 withApi

```ts
// src/server/api/with-api.ts
type OptionalSchema = z.ZodType | undefined;

type Output<S> = S extends z.ZodType ? z.output<S> : undefined;

export type ApiOptions<
  P extends OptionalSchema = undefined,
  Q extends OptionalSchema = undefined,
  B extends OptionalSchema = undefined,
> = {
  /** Required. A route that declares nothing is refused with 403 (SEC-15). */
  access: Access;
  params?: P;
  query?: Q;
  body?: B;
  rateLimit?: {
    rule: RateLimitRule;
    key: (input: { request: NextRequest; body: Output<B> }) => string;
  };
};

export type ApiContext<
  P extends OptionalSchema = undefined,
  Q extends OptionalSchema = undefined,
  B extends OptionalSchema = undefined,
> = {
  request: NextRequest;
  params: Output<P>;
  query: Output<Q>;
  body: Output<B>;
  user: SelfUser | null;
  requestId: string;
  log: Logger;
};

type RouteContext = { params: Promise<Record<string, string | string[]>> };

export function withApi<
  P extends OptionalSchema = undefined,
  Q extends OptionalSchema = undefined,
  B extends OptionalSchema = undefined,
>(
  handler: (context: ApiContext<P, Q, B>) => Promise<Response> | Response,
  options: ApiOptions<P, Q, B>,
): (request: NextRequest, context: RouteContext) => Promise<Response>;
```

The pipeline order is fixed (ADR 0017):

1. **Request ID** (D7). An incoming `x-request-id` is reused only when it is a UUID. Otherwise `crypto.randomUUID()` mints one. The ID is on every response, every error body and every log line of the request.
2. **Origin check on writes** (S9). A POST, PUT, PATCH or DELETE is refused with 403 unless its Origin equals the origin of `APP_URL` or an entry of `CORS_ORIGINS`, compared exactly. A request with no Origin header is accepted (SEC-26). A GET is never origin-checked.
3. **Access** (S1) through `resolveAccess(access, request.cookies)`.
4. **Params, query, then body.** Query validation is strict: unknown keys fail with 400. A body schema needs `Content-Type: application/json`, otherwise 415. Malformed JSON is 400. Bodies are JSON only until Phase 4 adds multipart, and there is no body size limit yet.
5. **Rate limit**, through the adapter in `getDeps()`. A refused call is 429 RATE_LIMITED with a `Retry-After` header of at least 1 second.
6. **The handler.**

Access comes before validation and rate limiting, so an anonymous caller learns nothing about the body schema and cannot use another caller's allowance. Any throw becomes the 2.1 envelope. A 4xx is logged as a warning and a 5xx as an error, both with the request ID and never with cookies, bodies or query strings. A thrown `redirect()`, `notFound()` or other Next control-flow error is rethrown first with `unstable_rethrow`.

Every response also carries the CORS headers for its own request. Only an origin listed in `CORS_ORIGINS` gets any (S10).

```ts
// src/server/api/origin.ts
export function isAllowedOrigin(origin: string | null): boolean;

export function corsHeaders(origin: string | null): Record<string, string>;

export function handlePreflight(request: NextRequest): Response;
```

`corsHeaders` returns `Access-Control-Allow-Origin` (the origin, never `*`) and `Vary: Origin` for an allowlisted origin, and nothing for any other. Credentials are never allowed. A route file that serves cross-origin callers exports `handlePreflight` as `OPTIONS`. It answers 204, and names the methods, headers and `Access-Control-Max-Age` only for an allowlisted origin. A shared cache in front of such a route should vary on Origin.

`/healthz` and `/readyz` are `withApi` routes with `access: 'public'`. `/healthz` answers `{ status: 'ok' }` and never touches the database. `/readyz` answers 200 `{ status: 'ready', checks: { mongo: 'up' } }` or 503 `{ status: 'not-ready', checks: { mongo: 'down' } }`. Both send `cache-control: no-store`. Phase 5 adds Redis to `/readyz`.

### 3.5 action()

```ts
// src/server/actions/action-state.ts
export type ActionState<T = void> =
  | { ok: true; data?: T; message?: string }
  | {
      ok: false;
      error: {
        code: ErrorCode;
        message: string;
        fieldErrors?: Record<string, string>;
        retryAfterSeconds?: number;
      };
    };

export type ActionResult<T> = { data?: T; message?: string };
```

The union above is the `plan.md` 4.3 `ActionState` plus the optional `retryAfterSeconds` (ADR 0025). The `plan.md` union is:

```ts
// plan.md 4.3, for comparison. Not code in this repository.
type ActionState<T = void> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: { code: ErrorCode; message: string; fieldErrors?: Record<string, string> } };
```

```ts
// src/server/actions/action.ts
type ActionContext = {
  user: SelfUser | null;
  requestId: string;
  log: Logger;
};

type ActionOptions<S extends z.ZodType> = {
  /** Required. An action that declares nothing is refused as FORBIDDEN (SEC-15). */
  access: Access;
  rateLimit?: { rule: RateLimitRule; key: (input: z.infer<S>) => string };
};

export function action<S extends z.ZodType, T = void>(
  schema: S,
  handler: (
    input: z.infer<S>,
    context: ActionContext,
  ) => Promise<ActionResult<T> | void>,
  options: ActionOptions<S>,
): (previous: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;
```

The result has the `useActionState` shape `(previous, formData) => state`. The pipeline is: request ID, access, FormData parsed with Zod, rate limit, the handler, then a plain-data check on `data`.

- **Request ID.** From the `x-request-id` header that `proxy.ts` sets, reused only when it is a UUID.
- **Access.** `resolveAccess(access)` with no cookie source, so the session comes from `cookies()`.
- **Form input.** The FormData becomes a null-prototype object, so a field named `__proto__` is an ordinary key that a strict schema refuses. Next's `$ACTION*` fields are dropped. A field sent once is a string and a field sent more than once is an array, so a form with one checkbox needs `z.preprocess` to wrap it. Use `z.strictObject`.
- **Validation failure.** Returns `{ ok: false, error: { code: 'VALIDATION_ERROR', message, fieldErrors } }`. `fieldErrors` has the first message per top-level field. A root issue, such as an unknown key, leaves `fieldErrors` empty.
- **Plain data (R6).** `data` must be primitives, arrays and objects whose prototype is `Object.prototype` or `null`. A document, `ObjectId`, `Date`, `Map`, function, class instance, bigint or cycle makes `action()` throw an ordinary error, naming only the path.
- **Errors.** `redirect()`, `notFound()` and other control-flow errors pass through untouched (B18). Every other `AppError` except INTERNAL, including SERVICE_UNAVAILABLE, comes back as `{ ok: false, error }`, with `fieldErrors` taken from the error's `details` by the first path segment. INTERNAL is logged with the request ID and rethrown, so it reaches `error.tsx`.
- **Rate limit.** A refused call returns RATE_LIMITED with `retryAfterSeconds` (at least 1).
- **Origin.** `action()` does no origin check. Next compares the Origin and host for Server Actions itself, and `serverActions.allowedOrigins` stays unset (S9).

### 3.6 parseQuery

```ts
// src/server/api/parse-query.ts
export function searchParamsToRecord(
  searchParams: SearchParamsInput,
): Record<string, string | string[]>;

export function parseQuery<S extends z.ZodObject>(
  schema: S,
  searchParams: SearchParamsInput,
): z.infer<S>;
```

`parseQuery` is for pages. A field that fails its schema falls back to its default, or is left out when optional, and unknown keys are dropped. It throws VALIDATION_ERROR only when a field with no default is required and invalid. `withApi` validates the query strictly instead, through `searchParamsToRecord`, which keeps a `__proto__` key as plain data. `SearchParamsInput` is `URLSearchParams | Record<string, string | string[] | undefined>`.

## 4. Formatting and IST dates

```ts
// src/lib/format.ts
export function formatPrice(rupees: number): string;

export function rupeesToPaise(rupees: number): number;

export function formatDate(value: Date | string): string;

export function formatDistance(km: number): string;
```

- `formatPrice` and `rupeesToPaise` throw `RangeError` unless the amount is a whole number of rupees of at least 1. A fractional amount is never rounded, and 0 is refused: a free item would need its own wording.
- `formatDate` takes a `Date`, a `YYYY-MM-DD` IST day or an ISO instant. It always uses `Asia/Kolkata` and always shows the year. It builds the text from `formatToParts` and writes September as `Sep` where ICU writes `Sept` (D-01). It throws `RangeError` on an invalid date.
- `formatDistance` takes a finite number of kilometres of 0 or more.

```ts
// src/lib/ist.ts
export type IstDay = string;

export function toIstDay(date: Date): IstDay;

export function fromIstDay(day: IstDay): Date;

export function addIstDays(day: IstDay, days: number): IstDay;

export function isIstMidnight(date: Date): boolean;

export function isBookable(startDate: Date, now: Date): boolean;

export function tripStatus(
  startDate: Date,
  durationDays: number,
  now: Date,
): 'upcoming' | 'past';

export function istMonthBounds(month: string): { start: Date; end: Date };
```

- `toIstDay` is the IST calendar day an instant falls on, whatever zone the process runs in. `fromIstDay` is 00:00 IST on a day and throws `RangeError` unless it is a real day. IST has no daylight saving, so `addIstDays` adds whole 24-hour days.
- **`isBookable`** (D-03). A start date is bookable while its IST day is strictly after today's IST day. It can be booked until the day before departure.
- **`tripStatus`** (D-04). A trip is `upcoming` until its last day, start plus duration minus 1 (IST days), has passed, and `past` after that. `durationDays` must be a whole number of at least 1.
- **`istMonthBounds`** takes `YYYY-MM` and returns the half-open range `[start, end)` of that IST month. Filters and the monthly plan use it, not UTC (QA-10).
- Helpers never read the clock. Callers pass `now()`.

```ts
// src/server/clock.ts
export function now(): Date;
```

`now()` is the one clock. `APP_NOW` pins it in development, test and ci. A pinned value with no offset is read as India Standard Time, not the server's zone.

Worked examples, each pinned by a test:

| Call | Result | Test |
| --- | --- | --- |
| `formatPrice(124999)` | `₹1,24,999` | `test/lib/format.test.ts` |
| `formatDate('2027-09-04')` | `4 Sep 2027` | `test/lib/format.test.ts` |
| `isBookable(fromIstDay('2026-11-21'), new Date('2026-11-20T23:59:59+05:30'))` | `true`: on 20 Nov 2026 the 21 Nov departure can be booked | `test/lib/ist.test.ts` |
| `isBookable(fromIstDay('2026-11-21'), new Date('2026-11-21T00:00:00+05:30'))` | `false`: on 21 Nov it cannot | `test/lib/ist.test.ts` |
| `tripStatus(fromIstDay('2026-11-21'), 5, new Date('2026-11-25T23:59:59+05:30'))` | `'upcoming'`: the last day is 25 Nov | `test/lib/ist.test.ts` |
| `tripStatus(fromIstDay('2026-11-21'), 5, new Date('2026-11-26T00:00:00+05:30'))` | `'past'` | `test/lib/ist.test.ts` |

## 5. Adapters

Each outside thing sits behind an interface (`plan.md` 3.2, rule 9). Services never import the real client. They call `getDeps()`.

```ts
// src/server/adapters/mailer.ts
export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export type FakeMailer = Mailer & { sent: MailMessage[]; reset(): void };

export function createFakeMailer(): FakeMailer;
```

```ts
// src/server/adapters/queue.ts
export type EmailTemplate = 'Welcome' | 'PasswordReset' | 'BookingConfirmed';

export type EmailJob = {
  template: EmailTemplate;
  to: string;
  firstName: string;
  url: string;
};

export interface EmailQueue {
  enqueue(job: EmailJob): Promise<void>;
}

export type FakeEmailQueue = EmailQueue & { jobs: EmailJob[]; reset(): void };

export function createFakeEmailQueue(): FakeEmailQueue;
```

An email job carries exactly `template`, `to`, `firstName` and `url`, so a whole user document can never be queued (S3). The fake rejects a job with any other key, or a missing one, and stores a copy. The extra props that a `BookingConfirmed` email needs are decided in Phase 6 by its own ADR (SEC-09).

```ts
// src/server/adapters/storage.ts
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  urlFor(key: string): string;
}

export type StoredFile = { body: Buffer; contentType: string };

export type FakeStorage = Storage & {
  files: Map<string, StoredFile>;
  reset(): void;
};

export function createFakeStorage(): FakeStorage;
```

A stored value, such as a tour's `imageCover` or a user's `photo`, is a storage key, never a URL. The fake's `urlFor(key)` is `${appOrigin}/storage/${encodeURIComponent(key)}`. Phase 4 decides the real media route (ARC-15).

```ts
// src/server/adapters/stripe.ts
export type CheckoutSessionParams = {
  amountPaise: number;
  currency: 'inr';
  productName: string;
  imageUrls: string[];
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: { userId: string; tourId: string; startDate: IstDay };
};

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: unknown };
};

export interface StripeClient {
  createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<{ id: string; url: string }>;
  constructEvent(rawBody: string, signature: string | null): StripeEvent;
}

export class StripeSignatureError extends Error {
  readonly type = 'StripeSignatureVerificationError';

  constructor(message = 'The webhook signature does not match the body') {
    super(message);
    this.name = 'StripeSignatureError';
  }
}

export type FakeStripe = StripeClient & {
  sessions: CheckoutSessionParams[];
  signatureFor(rawBody: string): string;
  reset(): void;
};

export function createFakeStripe(): FakeStripe;
```

The fake records sessions, accepts only whole paise in `inr`, and `constructEvent` throws `StripeSignatureError` unless the signature equals `signatureFor(rawBody)`, an HMAC of the body under a fixed fake key. The `type` string is believed to match the real SDK. Phase 6 confirms it against the SDK.

```ts
// src/server/adapters/rate-limit.ts
export type RateLimitRule = {
  name: string;
  points: number;
  durationSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export interface RateLimiter {
  consume(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}

export type FakeRateLimiter = RateLimiter & { reset(): void };

export function createFakeRateLimiter(): FakeRateLimiter;
```

The fake is a fixed window per rule name and key, timed by `now()`. With `APP_NOW` pinned the window never advances, so leave `APP_NOW` unset when working on a limited route in development.

```ts
// src/server/adapters/cache.ts
export interface Cache {
  cached<A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    keyParts: string[],
    tags: string[],
  ): (...args: A) => Promise<R>;
  invalidate(...tags: string[]): Promise<void>;
}

export type FakeCache = Cache & { invalidated: string[]; reset(): void };

export function createFakeCache(): FakeCache;
```

```ts
// src/server/adapters/real-cache.ts
export function createNextCache(): Cache;
```

`createNextCache` wraps `unstable_cache(fn, keyParts, { tags })` and calls `revalidateTag(tag, { expire: 0 })` (ADR 0012). It is the only file that imports `next/cache`. Coverage excludes it, because `unstable_cache` throws outside a Next request. The fake calls the function every time and records the invalidated tags. Phase 4 settles the cache keys and tag names when the first cached service arrives (ARC-02, ARC-03). Every cached read needs explicit tags, and every write that changes cached data must call `invalidate` with the same tags.

```ts
// src/server/deps.ts
export type Deps = {
  mailer: Mailer;
  emailQueue: EmailQueue;
  storage: Storage;
  stripe: StripeClient;
  rateLimiter: RateLimiter;
  cache: Cache;
};

export function getDeps(): Deps;
```

`getDeps()` builds its result once per process, chosen by `APP_ENV` and never by `NODE_ENV` (ADR 0016):

| `APP_ENV` | mailer, queue, storage, Stripe, rate limiter | cache |
| --- | --- | --- |
| `test` | fakes | the fake cache |
| `development`, `ci` | fakes | `createNextCache()` |
| `staging`, `production` | reading one throws `No real <name> adapter is configured yet (ADR 0016); <phase> adds it` | `createNextCache()` |

The throwing getters name the phase that adds each real adapter: mailer, queue and rate limiter in Phase 5, Stripe in Phase 6, storage in Phase 4 or 8. The error is a plain `Error`, so `withApi` answers with the generic INTERNAL response and the message stays in the logs. A phase that adds a real adapter replaces its getter in the same change. There is no fallback path from production to a fake.

## 6. Data model

All four models are built in Phase 1. Money is whole rupees (B20). Every date field is 00:00 IST on its day (B19) and checked with `isIstMidnight`. Every model is registered through `registerModel` (B17) and runs validators on updates through `withUpdateValidators` (QA-04).

```ts
// src/server/schema-helpers.ts
export function registerModel<T>(name: string, schema: Schema<T>): Model<T>;

export function withUpdateValidators<T>(schema: Schema<T>): Schema<T>;
```

```ts
// src/server/modules/users/model.ts
export interface UserFields {
  name: string;
  email: string;
  /** A storage key, not a URL. */
  photo?: string;
  role: Role;
  /** A bcrypt hash once saved. Never selected by default. */
  password: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDoc = HydratedDocument<UserFields>;

export type UserRecord = Omit<
  UserFields,
  'password' | 'passwordResetToken' | 'passwordResetExpires' | 'active'
> & { _id: Types.ObjectId };
```

| Field | Rule |
| --- | --- |
| `name` | required, trimmed, 1 to 50 characters |
| `email` | required, unique, lower-cased, trimmed, a valid email |
| `photo` | optional storage key |
| `role` | one of `ROLES`, default `user` |
| `password` | required, 8 to 72 characters of plain text before hashing, `select: false` |
| `passwordChangedAt` | set only by the model hook |
| `passwordResetToken`, `passwordResetExpires` | `select: false` |
| `active` | default `true`, `select: false` |

- **Hooks.** A `pre('save')` hook hashes the password with bcrypt, at cost 4 under `APP_ENV=test` and 12 otherwise, and sets `passwordChangedAt` when an existing document's password changes. It is the only writer of `passwordChangedAt` (B14). A query hook refuses `findOneAndUpdate`, `updateOne` and `updateMany` that set `password` or `passwordChangedAt`, directly or under any `$` operator. Password writes belong in `save()`.
- **Not guarded.** `replaceOne`, `findOneAndReplace`, `insertMany` and `bulkWrite` skip Mongoose update validators and the user hook. Services use `create`, `save` or the three guarded update methods.
- **Index.** `email` unique.

```ts
// src/server/modules/users/service.ts
export async function findActiveById(id: string): Promise<UserRecord | null>;
```

`findActiveById` returns the user without password, reset fields or `active`, but with `passwordChangedAt`. It returns `null` for a malformed, unknown or deactivated id and throws SERVICE_UNAVAILABLE when the database is unreachable. The result is a lean record for server code, mapped before it leaves the server.

```ts
// src/server/modules/tours/model.ts
interface PhotoCredit {
  file: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

interface TourPoint {
  type: 'Point';
  coordinates: number[];
}

interface TourLocation extends TourPoint {
  description: string;
  day: number;
}

interface StartLocation extends TourPoint {
  address: string;
  description: string;
}

export interface TourFields {
  name: string;
  slug: string;
  duration: number;
  maxGroupSize: number;
  difficulty: 'easy' | 'medium' | 'difficult';
  ratingsAverage: number;
  ratingsQuantity: number;
  price: number;
  summary: string;
  description?: string;
  /** A storage key, not a URL. */
  imageCover: string;
  images: string[];
  photoCredits: PhotoCredit[];
  /** Each is 00:00 IST on its day (B19). */
  startDates: Date[];
  startLocation: StartLocation;
  locations: TourLocation[];
  guides: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type TourDoc = HydratedDocument<TourFields>;
```

| Field | Rule |
| --- | --- |
| `name` | required, unique, trimmed, 10 to 40 characters |
| `slug` | unique, set from `name` |
| `duration`, `maxGroupSize` | required whole numbers of at least 1. `duration` is not unique (B5). |
| `difficulty` | required, `easy`, `medium` or `difficult` |
| `ratingsAverage` | default 4.5, 1 to 5, rounded to one decimal place |
| `ratingsQuantity` | default 0, a whole number of at least 0 |
| `price` | required whole rupees, at least 1. There is no `priceDiscount` (ADR 0014). |
| `summary` | required, trimmed |
| `description` | optional, trimmed |
| `imageCover` | required storage key |
| `images` | storage keys, at most 3 |
| `photoCredits` | every field of each credit is required (U27) |
| `startDates` | each 00:00 IST |
| `startLocation` | required. A GeoJSON point (longitude first, within range) with a required `address` and `description`. |
| `locations` | each a point with a required `description` and a whole `day` of at least 1 |
| `guides` | user ids |

- **Indexes.** `{ price: 1, ratingsAverage: -1 }`, `{ startLocation: '2dsphere' }`, `{ startDates: 1 }`, plus the unique `name` and `slug`.
- **Hooks.** A `pre('validate')` hook sets `slug` on create and regenerates it when `name` changes. A `pre('findOneAndUpdate')` hook regenerates it when the update carries `name`. An update through `updateOne` or `updateMany` that renames a tour leaves the slug stale, so renames use `findOneAndUpdate` or `save()`.

```ts
// src/server/modules/reviews/model.ts
export interface ReviewFields {
  review: string;
  rating: number;
  tour: Types.ObjectId;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDoc = HydratedDocument<ReviewFields>;
```

`review` is required, trimmed, 1 to 1000 characters. `rating` is a required whole number from 1 to 5. `tour` and `user` are required references. The unique index `{ tour: 1, user: 1 }` gives one review per traveller per tour. There are no hooks: recalculating the tour's rating is the Phase 6 service's job (B6).

```ts
// src/server/modules/bookings/model.ts
export interface BookingFields {
  tour: Types.ObjectId;
  user: Types.ObjectId;
  /** A snapshot of the tour's price at checkout, in whole rupees (B20). */
  price: number;
  currency: 'inr';
  /** 00:00 IST on the departure day (B19). */
  startDate: Date;
  /** Stripe's id for the paid session. Absent for bookings that did not come through checkout. */
  stripeSessionId?: string;
  status: 'paid' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

export type BookingDoc = HydratedDocument<BookingFields>;
```

`price` is a required whole number of at least 1. `currency` is `inr`. `startDate` is required and 00:00 IST. `status` defaults to `paid`. Indexes: `{ user: 1 }`, `{ tour: 1 }` and a unique sparse `stripeSessionId`. There are no hooks.

### 6.1 DTO types and mappers

```ts
// src/server/modules/users/dto.ts
export type PublicUser = {
  id: string;
  name: string;
  photo: string | null;
  role: Role;
};

export type SelfUser = PublicUser & { email: string };

type PublicSource = Pick<UserRecord, '_id' | 'name' | 'photo' | 'role'>;

type SelfSource = PublicSource & Pick<UserRecord, 'email'>;

export function toPublicUser(user: PublicSource): PublicUser;

export function toSelf(user: SelfSource): SelfUser;
```

`toPublicUser` has no email and serves guides, review authors and every public response (SEC-10). `toSelf` serves the current user and `/me`. Neither includes `password`, `passwordChangedAt`, reset fields or `active`. There is no admin mapper yet: whether admins see `active` and `createdAt` is a Phase 5 decision (ADR 0013). Mappers are pure and return a fresh plain object. `photo` is `null` when absent.

```ts
// src/server/modules/tours/dto.ts
type SummarySource = Pick<
  TourFields,
  | 'name'
  | 'slug'
  | 'duration'
  | 'maxGroupSize'
  | 'difficulty'
  | 'price'
  | 'ratingsAverage'
  | 'ratingsQuantity'
  | 'summary'
  | 'imageCover'
  | 'startDates'
> & {
  _id: { toString(): string };
  startLocation: Pick<
    TourFields['startLocation'],
    'coordinates' | 'address' | 'description'
  >;
};

type DetailSource = SummarySource &
  Pick<TourFields, 'description' | 'images' | 'photoCredits'> & {
    locations: Array<
      Pick<
        TourFields['locations'][number],
        'day' | 'description' | 'coordinates'
      >
    >;
    guides: Array<GuideSource | { toString(): string }>;
  };

export type TourSummary = {
  id: string;
  name: string;
  slug: string;
  duration: number;
  maxGroupSize: number;
  difficulty: TourFields['difficulty'];
  price: number;
  ratingsAverage: number;
  ratingsQuantity: number;
  summary: string;
  imageCover: string;
  startDates: IstDay[];
  startLocation: {
    coordinates: number[];
    address: string;
    description: string;
  };
};

export type TourDetail = TourSummary & {
  description: string | null;
  images: string[];
  locations: Array<{ day: number; description: string; coordinates: number[] }>;
  guides: PublicUser[];
  photoCredits: TourFields['photoCredits'];
};

export function toTourSummary(tour: SummarySource): TourSummary;

export function toTourDetail(tour: DetailSource): TourDetail;
```

`toTourDetail` throws unless the service has populated `guides`. A service populates only what it needs (B12). Every array keeps the document's order (R6).

```ts
// src/server/modules/reviews/dto.ts
export type ReviewDto = {
  id: string;
  review: string;
  rating: number;
  tourId: string;
  author: PublicUser;
  /** An ISO timestamp. */
  createdAt: string;
};

export function toReview(review: ReviewSource): ReviewDto;
```

`toReview` throws unless the service has populated `user`. The author goes through `toPublicUser`.

```ts
// src/server/modules/bookings/dto.ts
export type BookingDto = {
  id: string;
  tourId: string;
  startDate: IstDay;
  /** Whole rupees. */
  price: number;
  currency: BookingFields['currency'];
  status: BookingFields['status'];
  /** An ISO timestamp. */
  createdAt: string;
};

export function toBooking(booking: BookingSource): BookingDto;
```

Phase 6 extends `toBooking` with the tour summary for My tours.

## 7. Configuration

`getConfig()` reads and validates the environment on first use and caches the result. It is lazy, so `next build` needs no environment (ADR 0010). Never call it at module scope.

```ts
// src/server/config.ts
export type Config = AppConfig & {
  appOrigin: string;
  corsOrigins: string[];
  isProductionLike: boolean;
};

export function getConfig(): Config;
```

```ts
// src/server/config-schema.ts
export type AppConfig = z.infer<typeof configSchema>;

export const configKeys: readonly string[] = Object.keys(
  configSchema.def.shape,
);

export type ConfigIssue = { key: string; message: string };

export class ConfigError extends Error {
  readonly issues: ConfigIssue[];

  constructor(issues: ConfigIssue[]) {
    super(
      `Invalid configuration: ${issues.map((issue) => issue.key).join(', ')}`,
    );
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

export function parseConfig(
  env: Record<string, string | undefined>,
): AppConfig;
```

```ts
// src/server/config-startup.ts
export function loadConfigOrExit(): void;
```

`src/instrumentation.ts` calls `loadConfigOrExit()` from `register()` when the Node.js runtime starts. On a bad configuration it writes `Invalid configuration:` and one `  - KEY: message` line per bad key to stderr and exits with code 1. A throw from `register()` would not stop `next start`. Messages name keys and fixed text only, never a received value. Empty strings count as missing. Keys appear in schema order.

| Key | Rule | Default |
| --- | --- | --- |
| `APP_ENV` | required: `development`, `test`, `ci`, `staging` or `production`. Separate from `NODE_ENV`. | none |
| `APP_URL` | required origin (scheme, host, optional port, no path). `https` in staging and production. The only source of the public origin (SEC-12). | none |
| `MONGODB_URI` | required, a connection string with the `mongodb` or the `mongodb+srv` scheme | none |
| `DB_SERVER_SELECTION_TIMEOUT_MS` | whole number, 100 to 30000 | 5000 |
| `SESSION_SECRET` | required, at least 32 characters | none |
| `CORS_ORIGINS` | comma-separated origins, each with no path. Also pass the Origin check on writes. | empty, which allows none |
| `LOG_LEVEL` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent` | `info` |
| `APP_NOW` | optional ISO date or date and time. A value with no offset is IST. Refused in staging and production. | unset |

The derived fields are `appOrigin` (the origin of `APP_URL`), `corsOrigins` (the parsed list) and `isProductionLike` (`APP_ENV` is `staging` or `production`). Later phases add their keys to `config-schema.ts` and `.env.example` together, and `npm run check:env` fails if they forget one.

**Exceptions to "only `config.ts` reads `process.env`"** (ADR 0010): `next.config.ts`, `src/proxy.ts`, and the `NEXT_RUNTIME` check in `src/instrumentation.ts`. `src/proxy.ts` also imports nothing from `src/server/`.

## 8. Supporting server modules

```ts
// src/server/db.ts
export function isDbUnavailableError(error: unknown): boolean;

export function connectDb(): Promise<typeof mongoose>;

export async function disconnectDb(): Promise<void>;

export async function pingDb(): Promise<boolean>;
```

`connectDb` connects once per process and shares the promise across hot reloads (B17). When MongoDB is unreachable it rejects with SERVICE_UNAVAILABLE within `DB_SERVER_SELECTION_TIMEOUT_MS` (B10) and the driver error is the `cause`. A rejected attempt is not cached, so the next call tries again (QA-19). `pingDb` never throws.

```ts
// src/server/validation.ts
export { z };

export function issuesToDetails(error: z.ZodError): ErrorDetail[];

export function issuesToFieldErrors(error: z.ZodError): Record<string, string>;
```

```ts
// src/server/logger.ts
export function createLogger(
  options: { level?: string; destination?: DestinationStream } = {},
): Logger;

export function getLogger(): Logger;

export function requestLogger(
  requestId: string,
  base: Logger = getLogger(),
): Logger;

export function redactUrl(url: string): string;
```

Logs are structured JSON (pino). `requestLogger(requestId)` puts the request ID on every line (D7). Passwords, tokens, cookies, authorization and `stripe-signature` values are redacted (SEC-11). Pass a URL through `redactUrl` before logging it, because pino's `redact` covers object fields and not URL strings.

`src/proxy.ts` sets a fresh `x-request-id` and the nonce Content-Security-Policy on page and action requests. It replaces any request ID the client sent. Routes under `/api`, `/webhooks`, `/healthz` and `/readyz` bypass it, so `withApi` mints its own ID. The CSP is in ADR 0011. The static security headers are set in `next.config.ts`.

## 9. Test helpers (plan.md 4.5, amended per QA-17)

Test helpers live in `test/helpers/` (ADR 0024). They use real seed content only (D-08), so a test never invents a name, an email or tour text.

```ts
// test/helpers/factories.ts
export const TEST_PASSWORD = 'Test-only-passphrase-2026';

type CreateUserOptions = {
  role?: Role;
  active?: boolean;
  /** Selects that seed person. Must be one of the emails in seed/data/users.json. */
  email?: string;
  password?: string;
  /** Written through the raw collection, so tests can build stale-token cases (SEC-18). */
  passwordChangedAt?: Date;
};

export async function createUser(
  options: CreateUserOptions = {},
): Promise<{ user: UserDoc; password: string }>;

type CreateTourOptions = {
  /** Selects that seed tour. Without it, the next seed tour not yet in this database. */
  slug?: string;
  /** Only numbers, dates and the enum may change. Text always comes from the seed. */
  overrides?: Partial<{
    price: number;
    duration: number;
    maxGroupSize: number;
    difficulty: 'easy' | 'medium' | 'difficult';
    startDates: Date[];
    ratingsAverage: number;
    ratingsQuantity: number;
  }>;
  /** Also creates the tour's seed guides, so populate('guides') finds them. */
  withGuides?: boolean;
};

export async function createTour(
  options: CreateTourOptions = {},
): Promise<TourDoc>;

type CreateReviewOptions = {
  user: UserDoc;
  tour: TourDoc;
  rating?: number;
  review?: string;
};

export async function createReview(
  options: CreateReviewOptions,
): Promise<ReviewDoc>;

type CreateBookingOptions = {
  user: UserDoc;
  tour: TourDoc;
  /** Defaults to the tour's first start date. */
  startDate?: Date;
  status?: 'paid' | 'refunded';
  /** Whole rupees. Defaults to the tour's price. */
  price?: number;
  stripeSessionId?: string;
};

export async function createBooking(
  options: CreateBookingOptions,
): Promise<BookingDoc>;
```

- **`createUser`** copies a real seed person with the seed `_id` and `@example.com` email. Without `email` it picks the next seed person of the requested role (default `user`) not yet in the database, and it throws when every such person exists. Every factory user has `TEST_PASSWORD`. Under `APP_ENV=test` the bcrypt cost is 4.
- **`createTour`** copies a real seed tour with its seed `_id`, turns the seed `YYYY-MM-DD` start dates into 00:00 IST instants and applies only the numeric, date and enum overrides.
- **`createReview`** defaults the text and rating to the first seed review for that tour, which may not be the seed reviewer's.
- **`createBooking`** defaults to the tour's first start date, which for a seed tour is a future date. A test for a past trip must pass `startDate`.

```ts
// test/helpers/call-route.ts
type RouteContext = { params: Promise<Record<string, string | string[]>> };

type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<Response> | Response;

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

type RouteModule = Partial<Record<Method, RouteHandler>>;

type CallOptions = {
  method?: Method;
  /** Path with an optional query string, such as `/api/v1/tours?page=2`. */
  path: string;
  params?: Record<string, string | string[]>;
  /** An object is sent as JSON, a string as a raw body and FormData as multipart. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Defaults to APP_URL's origin on writes. `null` sends no Origin header. */
  origin?: string | null;
  /** Sent as x-forwarded-for. */
  ip?: string;
  /** Sends the session cookie of this user. */
  as?: { _id: unknown } | { id: string };
};

type CallResult = { status: number; headers: Headers; body: unknown };

export async function callRoute(
  routeModule: RouteModule,
  options: CallOptions,
): Promise<CallResult>;
```

`callRoute` builds a `NextRequest`, passes `params` as a Promise, calls the exported handler and returns the status, headers and parsed body. A handler that throws, such as one that redirects, makes `callRoute` reject. A test that needs `CORS_ORIGINS` calls `vi.stubEnv('CORS_ORIGINS', ...)` at module top, before the first `getConfig()` call.

```ts
// test/helpers/mock-session.ts
export async function mockSession(
  user: { _id: unknown } | { id: string } | null,
): Promise<void>;
```

`mockSession(user)` puts a real signed session cookie in the mocked `next/headers` store, so a page data function or Server Action runs as that user. `null` removes it. The store is cleared before each test. `vi.resetModules()` makes a second instance of the store, so do not combine it with `mockSession` in one test.

```ts
// test/helpers/fakes.ts
export const fakes = {
  get mailer(): FakeMailer {
    // ...
  },
  // emailQueue: FakeEmailQueue, storage: FakeStorage, stripe: FakeStripe,
  // rateLimit: FakeRateLimiter and cache: FakeCache follow the same pattern.
};

export function resetFakes(): void;
```

`fakes` returns what the app sent to the outside world during this test: `fakes.mailer.sent`, `fakes.emailQueue.jobs`, `fakes.storage.files`, `fakes.stripe.sessions`, `fakes.rateLimit` and `fakes.cache.invalidated`. Reading one throws if the adapter is not a fake. `test/setup.ts` runs `resetFakes()` before every test.

```ts
// test/helpers/db.ts
export async function clearDatabase(): Promise<void>;

export function useTestDatabase(): void;
```

`useTestDatabase()` connects to the test file's in-memory database, builds the indexes for every registered model (QA-18) and empties the collections after each test. Call it once per test file.

```ts
// test/helpers/seed.ts
export function seedUsers(): SeedUser[];

export function seedTours(): SeedTour[];

export function seedReviews(): SeedReview[];

export function seedBookings(): SeedBooking[];
```

**Rules for tests** (Q6, Q7, D-08):

- Seed content only. No invented names, emails or tour text.
- **Fake timers only.** An expiry test moves time with Vitest's fake timers, never a real wait, and does not stall the database driver. `APP_NOW` pins the app clock where a test needs one.
- **A database per file.** `test/setup.ts` gives every test file its own database name on one in-memory MongoDB, so files run in parallel. `vitest.config.mts` sets `TZ=UTC`, so an IST test is meaningful on any machine.
- A test that needs another `APP_ENV` stubs the variable, calls `vi.resetModules()` and imports `getDeps` again.
- Tests are tagged with the requirement they prove, for example `it('[S14] ...')` (ADR 0007).
- Every test starts with empty fakes. `server-only` is aliased to its empty module under Vitest.

Three example tests show the patterns to copy: `test/examples/server-action.test.ts`, `test/examples/page-data.test.ts` and `test/examples/shared-service.test.ts`. The Route Handler pattern is `test/app/healthz.test.ts` and `test/app/readyz.test.ts`.

## 10. Added by later phases

Each is written into this file by the phase that builds it (ADR 0005).

| Contract | Phase |
| --- | --- |
| `toursService.list(query)` returning `{ items, total }`, cached with a tag (R5); `toursService.getBySlug(slug)`; `toursService.getById(id)` | 4 |
| `reviewsService.listForTour(tourId, page)`, cached with a tag | 4 |
| `bookingsService.hasPaidBooking(userId, tourId)`, which the booking panel needs for "already booked", never cached | 4 |
| `images.normalize(file, preset)`, and the real storage adapter | 4 (storage may wait for 8, ADR 0016) |
| The cache keys and tag names, and the shape of a list response in `data` (section 2.1) | 4 |
| `Welcome` and `PasswordReset` email-template props, the mailer's SMTP implementation, the Redis rate limiter and the BullMQ queue | 5 |
| `toAdminUser`, or a record of why there is none (ADR 0013) | 5 |
| `BookingConfirmed` email-template props, which need the tour, date and price beyond `{ to, firstName, url }` (SEC-09, ADR 0016) | 6 |
| `bookingsService.listMine(userId)` with tour summaries, `reviewsService.canReview(userId, tourId)` (and whether it needs a finished trip, D-04), the real Stripe client, and the access matrix of every route | 6 |
| `src/components/ui/` and `src/components/features/` prop contracts (plan.md 4.6) | 3 |
