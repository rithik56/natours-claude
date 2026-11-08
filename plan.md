# Natours v2: Build Plan for a Claude Code Agent Team

Put this file at the root of an empty repository. Then start Claude Code with agent teams enabled and give the lead the kickoff prompt in [§14](#14-kickoff-prompt-for-the-lead).

Natours is a tour-booking web app. Version 1 (`rithik56/natours`) was built with Express, Pug and MongoDB. It worked, but a code review found security holes, crash bugs and deployment problems.

This plan rebuilds it from scratch as a **full-stack Next.js application** with a **full visual redesign** and **new content: tours across India, priced in rupees**:
- Pages are **rendered on the server wherever possible**.
- Code runs in the browser only where a feature needs it (§7).
- The seed content (tours, guides, users, reviews, bookings and freely licensed photos) is already in `seed/` (see `seed/README.md`).

Every v1 mistake is listed as a numbered requirement, so the team builds the fix in from the start and proves it with a test.

---

## 0. How to use this file

**Requirement IDs.** Every rule has an ID. Tests, commits and review findings refer to these IDs.

| Prefix | Meaning | Section |
|---|---|---|
| `S` | Security | §5 |
| `B` | Correctness (bugs v1 had, plus Next.js pitfalls) | §6 |
| `R` | Rendering: server first, client only where needed | §7 |
| `D` | Deployment and architecture | §8 |
| `U` | Design, UI and UX | §9 |
| `Q` | Code quality | §10 |
| `P0-…`, `PD-…`, `P1-…` to `P3-…` | Tasks | §12 |

**Who reads what.**
- The lead reads the whole file.
- Teammates read §1 to §10, plus their own brief in §11.3.
- Everyone reads §7 (rendering), because it decides where each piece of code runs.
- The `designer` and `web` teammates read §9 especially closely.

**Enabling agent teams.** Agent teams is an experimental Claude Code feature. At the time of writing you turn it on by setting `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, either in your shell or in the `env` block of `.claude/settings.json`. Check the Claude Code docs for the current setup.

**Cost.** Each teammate is a full Claude session, so seven teammates cost several times one session. To make it cheaper:
- Let `web` do the `designer` job too. Design then happens first and pages after, instead of in parallel.
- Let the lead do the `reviewer` job.

**Versions.** This plan targets **Next.js 16** (App Router) on **Node.js 24 LTS**, the current versions at the time of writing.
- In Phase 0 the lead checks the current stable versions and the Next.js docs, and records the versions used in `docs/adr/0001-versions.md`.
- Next.js APIs this plan relies on that have changed between versions:
  - The request-interception file is `proxy.ts` in Next.js 16. It was `middleware.ts` in earlier versions.
  - `params`, `searchParams`, `cookies()` and `headers()` are async.
  - The tagged data cache API.

**Seed content is ready.** `seed/` holds everything the app starts with:
- 13 tours across India, with itineraries, real coordinates and start dates in each region's season.
- 35 users of Indian origin (an admin, guides and travellers), 52 reviews in English and 58 bookings.
- 52 freely licensed photos from Wikimedia Commons, with author, licence and source for each.

Nothing from v1 is reused: no code, no CSS, no data and no photos.

**Prerequisites before Phase 3.** You need these accounts. Earlier phases use fakes, so they aren't needed until then.
- Stripe (test mode keys)
- MongoDB Atlas
- An SMTP provider
- An S3-compatible bucket (AWS S3 or Cloudflare R2)
- Render (or any host that runs Docker containers)

**Network notes.**
- `mongodb-memory-server` downloads a MongoDB binary the first time it runs, so the machine running the tests needs to reach `fastdl.mongodb.org`.
- `next/font/google` downloads the fonts during `next build`, so builds need to reach Google Fonts. Pages then serve the fonts from our own domain.
- Playwright needs a Chromium browser installed.

**Your role as the human.** You approve the design direction at the **design gate** (PD-2), and you see the final screenshots at the Phase 2 gate. The lead handles everything else.

---

## 1. Product scope

### 1.1 Roles

`user` (default), `guide`, `lead-guide`, `admin`.

### 1.2 Features

**Must have (v2.0)**

1. Browse tours:
   - Overview page with filters (difficulty, length, start month, price) and sorting.
   - Tour page with a route map and day-by-day itinerary, guides, reviews and a booking panel.
2. Accounts:
   - Sign up, log in, log out.
   - Forgot and reset password by email.
   - Change password.
3. Account page:
   - Update name, email and photo (with a preview before upload).
   - Deactivate the account, after confirming.
4. Bookings:
   - Pick a start date and book through Stripe Checkout, in Indian rupees (INR) only.
   - A confirmation state when the user comes back from Stripe.
   - "My tours" page with upcoming and past bookings.
5. Reviews:
   - Only a user with a paid booking for a tour can review it.
   - One review per user per tour.
   - The review form appears on the tour page for eligible users.
   - Authors can edit and delete their own reviews.
6. A public REST API (`/api/v1`):
   - Tours with filtering, sorting, choosing fields and pagination.
   - The `top-5-cheap` alias, stats and the monthly plan.
   - Geo queries: tours within a distance, and distances from a point.
   - Admin endpoints for tours, users, reviews and bookings.
7. Emails in the new design: welcome, password reset, booking confirmation.
8. A full visual redesign with a design system, light and dark themes, WCAG 2.2 AA accessibility and performance budgets (§9).
9. Search-friendly pages: titles, descriptions and social preview images for every page, plus a sitemap and `robots.txt` (R10).
10. Photo credits: every photo's author and licence are shown on its tour page and on a `/credits` page (U27). The seed photos' licences require this.
11. Indian conventions throughout: prices in ₹ with Indian digit grouping (₹1,24,999), dates in India Standard Time, distances in kilometres, Indian English (B19, B20, U20).

**Stretch (v2.1, only after the Phase 2 gate passes)**
- Email verification on signup.
- Seat limits per start date (`maxGroupSize`).
- Refresh tokens.
- Admin dashboard UI.

### 1.3 Data model

These Mongoose models (TypeScript) are a shared contract. The lead writes them in Phase 0. All schemas use `{ timestamps: true }`. Models are registered with `mongoose.models.X ?? model('X', schema)`, so hot reload in development doesn't redefine them (B17).

**User**

| Field | Rules |
|---|---|
| `name` | required, trimmed, 1–50 chars |
| `email` | required, unique, lowercase, valid email |
| `photo` | optional storage key. Users without a photo get an initials avatar (U4); seed users have no photos. |
| `role` | enum from §1.1, default `user` |
| `password` | 8–72 chars (bcrypt ignores bytes past 72), `select: false` |
| `passwordChangedAt` | Date |
| `passwordResetToken` | sha256 hash of the token, `select: false` |
| `passwordResetExpires` | Date, `select: false` |
| `active` | default `true`, `select: false` |

`passwordConfirm` is **not** a schema field. Zod checks it in the input schema.

**Tour**

| Field | Rules |
|---|---|
| `name` | required, unique, trimmed, 10–40 chars |
| `slug` | unique index, set on save |
| `duration` | required, ≥ 1 (**not unique**) |
| `maxGroupSize` | required, ≥ 1 |
| `difficulty` | enum `easy`, `medium`, `difficult` |
| `ratingsAverage` | 1–5, default 4.5, rounded to 1 decimal by a setter |
| `ratingsQuantity` | default 0 |
| `price` | required, whole rupees (integer), > 0 (B20) |
| `priceDiscount` | whole rupees, less than `price` |
| `summary` | required |
| `description` | |
| `imageCover` | required; storage key |
| `images` | `[String]` of storage keys, at most 3 |
| `photoCredits` | `[{ file, title, author, license, licenseUrl, sourceUrl }]`, one per photo; required for every photo that isn't the company's own (U27) |
| `startDates` | `[Date]`, each the start of a calendar day in India Standard Time (B19) |
| `startLocation` | GeoJSON Point |
| `locations` | `[GeoJSON Point + description + day]`; this is the itinerary the route map draws |
| `guides` | `[ref User]` |

Indexes: `{ price: 1, ratingsAverage: -1 }`, `{ slug: 1 }` unique, `{ startLocation: '2dsphere' }`, `{ startDates: 1 }`.

**Review**

| Field | Rules |
|---|---|
| `review` | 1–1000 chars |
| `rating` | integer 1–5 |
| `tour` | ref Tour |
| `user` | ref User |

Unique index on `{ tour: 1, user: 1 }`.

**Booking**

| Field | Rules |
|---|---|
| `tour` | ref Tour |
| `user` | ref User |
| `price` | snapshot of the price at checkout, in whole rupees |
| `currency` | always `inr` |
| `startDate` | required; a calendar day in IST (B19). At checkout it must be one of the tour's future `startDates` (B8); past bookings keep their past dates. |
| `stripeSessionId` | unique, sparse |
| `status` | enum `paid`, `refunded` |

Indexes on `{ user: 1 }` and `{ tour: 1 }`.

There are **no `pre(/^find/)` populate hooks**. Each service populates only what it needs (B12).

**Data sent to the browser.** Documents never go to the browser directly. They go through the mapper functions in each module's `dto.ts` (`toPublicUser`, `toTourSummary`, `toTourDetail`, `toReview`, `toBooking`). These return plain objects with string IDs and ISO date strings, and they never include password, token or `active` fields (S3, R6).

### 1.4 REST API (Route Handlers)

The API is served by Route Handlers under `src/app/api/v1/`, wrapped in `withApi` (§4.3). The site's own pages **don't** call this API. They call services directly (R3). The API exists for admin tools, external clients and tests.

Access levels:
- **public**: anyone.
- **auth**: any logged-in, active user.
- **roles**: only the roles listed.
- **owner**: only the user who owns the record.

**Auth: `/api/v1/auth`**

| Method and path | Access | Notes |
|---|---|---|
| `POST /signup` | public | Body: `name`, `email`, `password`, `passwordConfirm`. Returns 201 with user and sets cookie. Queues the welcome email. |
| `POST /login` | public | Body: `email`, `password`. Returns 200 with user and sets cookie. |
| `POST /logout` | public | Clears the cookie. |
| `POST /forgot-password` | public | Body: `email`. Always returns 200 with the same message (S13). |
| `PATCH /reset-password/[token]` | public | Body: `password`, `passwordConfirm`. Returns 200 and sets cookie. |
| `PATCH /password` | auth | Body: `currentPassword`, `password`, `passwordConfirm`. Sets a new cookie. |

**Users: `/api/v1/users`**

| Method and path | Access | Notes |
|---|---|---|
| `GET /me` | auth | |
| `PATCH /me` | auth | JSON or multipart. Allowed fields: `name`, `email`, `photo` (file). |
| `DELETE /me` | auth | Deactivates the account, clears the cookie, returns 204. |
| `GET /` | admin | Paginated. |
| `GET /[id]` | admin | |
| `PATCH /[id]` | admin | Only `name`, `email`, `role`, `active` (S4). |
| `DELETE /[id]` | admin | Deactivates the account. |

**Tours: `/api/v1/tours`**

| Method and path | Access | Notes |
|---|---|---|
| `GET /` | public | Query rules below. |
| `GET /top-5-cheap` | public | Alias that goes through the same query builder (B2). |
| `GET /stats` | public | |
| `GET /monthly-plan/[year]` | guide, lead-guide, admin | |
| `GET /within/[distance]/center/[latlng]/unit/[unit]` | public | `unit` is `mi` or `km` (B3). |
| `GET /distances/[latlng]/unit/[unit]` | public | |
| `GET /[id]` | public | Populates guides (name, photo, role). |
| `POST /` | admin, lead-guide | JSON. |
| `PATCH /[id]` | admin, lead-guide | JSON only. |
| `PUT /[id]/images` | admin, lead-guide | Multipart: `imageCover` (optional) and `images` (up to 3, optional) (B4). |
| `DELETE /[id]` | admin, lead-guide | Returns 409 if the tour has bookings. Otherwise deletes its reviews too. |

Query rules for `GET /tours` (the overview page uses the same query builder):
- Filter fields: `difficulty`, `price`, `duration`, `ratingsAverage`, `maxGroupSize`.
- Filter operators: `gte`, `gt`, `lte`, `lt`.
- `month=YYYY-MM`: tours with at least one start date in that month.
- Sort: comma-separated fields from an allowlist.
- `fields`: comma-separated fields from an allowlist.
- `page` ≥ 1. `limit` from 1 to 100, default 20.

**Reviews**

| Method and path | Access | Notes |
|---|---|---|
| `GET /api/v1/tours/[tourId]/reviews` | public | Paginated. |
| `POST /api/v1/tours/[tourId]/reviews` | role `user` with a paid booking for the tour | Body: `review`, `rating`. `tour` and `user` come from the URL and session, never from the body (S4). |
| `GET /api/v1/reviews` | admin | |
| `GET /api/v1/reviews/[id]` | public | |
| `PATCH /api/v1/reviews/[id]` | owner | Body: `review`, `rating`. |
| `DELETE /api/v1/reviews/[id]` | owner or admin | |

**Bookings**

| Method and path | Access | Notes |
|---|---|---|
| `POST /api/v1/bookings/checkout-session` | auth | Body: `tourId`, `startDate` (required; must be one of the tour's future start dates). Returns `{ url }`. |
| `GET /api/v1/bookings/mine` | auth | The caller's bookings, with `startDate` and the tour's `name`, `slug` and `imageCover`. |
| `GET /api/v1/bookings` | admin, lead-guide | |
| `GET /api/v1/bookings/[id]` | admin, lead-guide | |
| `POST /api/v1/bookings` | admin | Manual booking. |
| `PATCH /api/v1/bookings/[id]` | admin | |
| `DELETE /api/v1/bookings/[id]` | admin | |
| `POST /webhooks/stripe` | Stripe signature | Reads the raw body with `await request.text()` (S17, B7). |

**Operations**

| Method and path | Access | Returns |
|---|---|---|
| `GET /healthz` | public | `{ status: 'ok' }` only (S2). |
| `GET /readyz` | public | 200 when Mongo and Redis are reachable, 503 when not (D6). |

### 1.5 Pages

How each page renders is set in §7.2.

| Path | Page |
|---|---|
| `/` | Tour overview, with filters and sort in the URL (U10) |
| `/tour/[slug]` | Tour page (U11) |
| `/login`, `/signup`, `/forgot-password` | Forms. Redirect to `/` if already logged in. |
| `/reset-password/[token]` | Reset form. This is the link sent in the email (S13). |
| `/me` | Account page (U15). Requires login; otherwise redirect to `/login?next=/me`. |
| `/me/deactivate` | Confirmation step for deactivating the account. It works without JavaScript; with JavaScript it opens as a dialog. |
| `/my-tours` | Upcoming and past bookings (U13). `?booking=success` shows the confirmation state (U12). Requires login. |
| `/credits` | Every photo on the site with its author, licence and source (U27) |
| `/styleguide` | Every component in every state (U5). **Development and test only; `notFound()` in production.** |
| `not-found.tsx`, `error.tsx`, `global-error.tsx` | Error pages in the new design (U18) |
| `sitemap.ts`, `robots.ts` | Generated from the tour list (R10) |

### 1.6 Server Actions (how the site's own pages change data)

Forms on the site call **Server Actions**, not the REST API. Each action:
- is built with the `action()` helper (§4.3);
- checks the input with Zod and checks auth and ownership itself;
- calls the same service as the matching Route Handler.

| Action | Module | Used on | Access | Rate limited |
|---|---|---|---|---|
| `signupAction` | auth | `/signup` | public | yes |
| `loginAction` | auth | `/login` | public | yes |
| `logoutAction` | auth | header | auth | no |
| `forgotPasswordAction` | auth | `/forgot-password` | public | yes |
| `resetPasswordAction` | auth | `/reset-password/[token]` | public | yes |
| `changePasswordAction` | auth | `/me` | auth | yes |
| `updateMeAction` | users | `/me` (details and photo) | auth | no |
| `deactivateMeAction` | users | `/me/deactivate` | auth | no |
| `startCheckoutAction` | bookings | tour page booking panel | auth | no |
| `createReviewAction` | reviews | tour page | role `user`, paid booking | no |
| `updateReviewAction` | reviews | tour page | owner | no |
| `deleteReviewAction` | reviews | tour page | owner or admin | no |

---

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (`strict`) everywhere | Types act as the contract between teammates working in parallel. |
| Runtime | Node.js 24 LTS | v1 declared `>=10` but needed 18+. |
| Framework | Next.js 16, App Router, React 19 | Server Components render on the server by default. Server Actions handle forms. Route Handlers serve the REST API. The Node.js runtime is used everywhere, never the Edge runtime. |
| Database | MongoDB with Mongoose (latest major), with the connection cached on `globalThis` | |
| Validation | Zod for every input (forms, API bodies, query strings, route params) and for config | |
| Auth | Our own session: a JWT (HS256, signed with `jose`) in an httpOnly cookie; passwords hashed with `bcryptjs` at cost 12 | `bcryptjs` is pure JavaScript, so no native build steps in Docker. |
| Styling | Plain CSS: global token, reset and base files, plus CSS Modules per component, using cascade layers and linted by stylelint. No CSS framework. | Keeps the look distinctive and the CSP simple. v1 had a single 1,300-line file. |
| Fonts | `next/font/google` (Anek Latin and Anek Devanagari, unless the design gate changes them) | Downloaded at build time and served from our own domain. Devanagari support keeps Hindi possible later. |
| Locale | `en-IN` everywhere: Indian English, ₹ with Indian digit grouping, dates in India Standard Time (`Asia/Kolkata`), distances in kilometres. All formatting goes through `src/lib/format.ts` (§4.4). | B19, B20 |
| Images | `next/image` for every image. Uploads are checked and re-encoded with sharp, then stored in object storage. | `next/image` produces resized WebP and AVIF versions on demand. |
| Maps | Leaflet, loaded only in the browser and only on the tour page. The tile source is decided in Phase 0 (D14). | |
| Payments | Stripe Checkout and webhooks, INR only | |
| Background jobs | BullMQ on Redis, in a separate worker process (`src/worker/`) | v1 used the legacy `bull` and ran it inside the web process. |
| Email | React Email templates, rendered by the worker and sent with nodemailer over SMTP; Mailpit for local development | |
| Rate limiting | `rate-limiter-flexible` with Redis | |
| Logging | pino, with a request ID on every line | |
| Tests | Vitest for unit and integration tests, plus Testing Library for client components; mongodb-memory-server; Playwright for end-to-end, accessibility (`@axe-core/playwright`) and screenshot tests; Lighthouse CI (`@lhci/cli`) | |
| Lint and format | ESLint flat config (`eslint-config-next`, `typescript-eslint`, `eslint-plugin-security`), stylelint, Prettier | |
| CI | GitHub Actions | |
| Deployment | Docker images (`output: 'standalone'`) on Render: web service, background worker, managed Redis. MongoDB Atlas and S3 or R2. | The worker must be a long-running process (D1). |

The lead installs every dependency in Phase 0, so teammates rarely need to touch `package.json`.

---

## 3. Architecture

### 3.1 Runtime view

```
Browser ──► Next.js web server ──► MongoDB
             │  Server Components (pages)    ─┐
             │  Server Actions (site forms)   ├─► services ─► models
             │  Route Handlers (/api/v1)     ─┘
             │  proxy.ts (request ID, CSP nonce, early redirects only)
             │   ▲
             │   └── Stripe webhook (/webhooks/stripe)
             ├──► Redis  (rate limits, BullMQ queue)
             └──► Object storage (images; next/image resizes them)

worker (BullMQ) ◄── Redis
      └──► SMTP (React Email templates)
```

### 3.2 Layering rules

1. **Three ways in, one way down.** Pages (Server Components), Server Actions and Route Handlers all call **services**. Services hold the business logic and all database access. Nothing else imports a model.
2. **Server code stays on the server.** Every file under `src/server/` starts with `import 'server-only'`, so the build fails if client code imports it.
3. **Input is validated at the edge.**
   - Route Handlers use `withApi` with Zod schemas.
   - Server Actions use `action()` with Zod schemas.
   - Pages parse `params` and `searchParams` with Zod (`parseQuery`).
   - Services receive typed, validated input.
4. **Auth is checked where the data is**: in `withApi`, `action()` and page code, through `requireUser()` and `requireRole()`. `proxy.ts` only does early redirects for pages behind a login. It is never the only check (S23).
5. **Data sent to the browser is mapped first.** Anything a Server Component passes to a Client Component, and anything a Route Handler returns, goes through a `dto.ts` mapper (R6).
6. **Module boundaries.** A module exposes only its `service.ts`, `actions.ts`, `dto.ts` and `schemas.ts`. Other modules use those; they never import another module's model.
7. **Models stay thin.** They hold the schema, indexes and two hooks: password hashing and slug generation. All other side effects, such as recalculating ratings or clearing cached data, happen in services, where they are explicit and awaited (B6).
8. **Config.** Only `src/server/config.ts` reads `process.env`, and `instrumentation.ts` validates it at startup (D4). Browser code reads no secrets. Only `NEXT_PUBLIC_*` values reach the browser, and none of them is secret (S18).
9. **Adapters for the outside world.** Storage, mailer, queue, Stripe and the rate-limit store are adapters with a real and a fake implementation. `src/server/deps.ts` picks between them by environment, so tests get fakes.

### 3.3 Folder layout

```
src/
  app/
    layout.tsx               root layout: fonts, global CSS, header and footer
    not-found.tsx  error.tsx  global-error.tsx
    sitemap.ts  robots.ts
    (site)/
      page.tsx               overview
      loading.tsx
      tour/[slug]/page.tsx  tour/[slug]/loading.tsx
      my-tours/page.tsx
      me/page.tsx  me/deactivate/page.tsx
    (auth)/
      login/page.tsx  signup/page.tsx  forgot-password/page.tsx  reset-password/[token]/page.tsx
    styleguide/page.tsx      development and test only
    api/v1/…/route.ts        REST API (§1.4)
    webhooks/stripe/route.ts
    healthz/route.ts  readyz/route.ts
  proxy.ts                   request ID, CSP nonce, early login redirects (Next.js 16; middleware.ts before 16)
  instrumentation.ts         validates config at startup
  server/                    'server-only'
    config.ts  deps.ts  db.ts  logger.ts  errors.ts  session.ts  rate-limit.ts  redirects.ts
    api/                     withApi, response helpers, parseQuery
    actions/                 action() helper and ActionState types
    queue/  storage/  stripe/  mailer/   (real and fake adapters)
    images.ts                upload checks and re-encoding with sharp
    modules/
      auth/      service.ts schemas.ts actions.ts
      users/     model.ts service.ts schemas.ts dto.ts actions.ts
      tours/     model.ts service.ts schemas.ts dto.ts query-builder.ts cache.ts
      reviews/   model.ts service.ts schemas.ts dto.ts actions.ts
      bookings/  model.ts service.ts schemas.ts dto.ts actions.ts webhook.ts
  lib/
    format.ts                formatPrice, formatDate, formatDistance (safe on server and client)
  components/
    ui/                      design-system components, each with a .module.css file (designer)
    features/                page-level components: tour row, booking panel, review form, route map (web)
  styles/                    tokens.css, reset.css, base.css, fonts.ts (designer)
  emails/                    React Email templates (designer)
  worker/index.ts            BullMQ email worker
scripts/seed.ts  scripts/check-client-boundaries.ts  scripts/check-bundle.ts
seed/                        tours, users, reviews, bookings and photos (see seed/README.md)
test/
  setup.ts                   mongodb-memory-server, fakes, next/headers mock
  helpers/                   factories, callRoute(), mockSession()
  integration/<module>/*.test.ts
  components/*.test.tsx      client component tests
  security/access-matrix.test.ts
  regression/v1.test.ts      one test per S and B ID
  e2e/  a11y/  visual/       Playwright
docs/
  contracts.md  adr/  openapi/  design/
next.config.ts  Dockerfile  docker-compose.yml  render.yaml  .env.example  lighthouserc.json
.github/workflows/ci.yml
```

### 3.4 Request pipeline

1. **`proxy.ts`** runs on every page request. It:
   - sets an `x-request-id` header;
   - creates a CSP nonce and sets the `Content-Security-Policy` header (S11);
   - redirects to `/login?next=…` when a protected page is requested with no session cookie. This is only a convenience; the real check comes later (S23).
2. **`next.config.ts`** sets the other security headers on every response, static files included: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `X-Frame-Options`. It also sets `images.remotePatterns` for the storage host, `serverActions.bodySizeLimit` (S16) and `output: 'standalone'`.
3. **Pages** call `getCurrentUser()` and services. **Server Actions** go through `action()`. **Route Handlers** go through `withApi()`. All three check auth themselves.

---

## 4. Contracts (the lead writes these in Phase 0, in `docs/contracts.md`)

Only the lead changes a contract. Every change gets an ADR, and the lead tells the affected teammates.

### 4.1 REST response format

```jsonc
// success, one item
{ "status": "success", "data": { "tour": { } } }

// success, a list
{ "status": "success", "data": { "tours": [ ] }, "meta": { "page": 1, "limit": 20, "total": 9 } }

// error ("fail" for 4xx, "error" for 5xx)
{ "status": "fail",
  "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ { "path": "email", "message": "…" } ], "requestId": "…" } }
```

### 4.2 Error codes

| Code | HTTP status |
|---|---|
| `VALIDATION_ERROR` | 400 |
| `UNAUTHENTICATED` | 401 |
| `INVALID_CREDENTIALS` | 401 |
| `TOKEN_EXPIRED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `PAYLOAD_TOO_LARGE` | 413 |
| `UNSUPPORTED_MEDIA_TYPE` | 415 |
| `RATE_LIMITED` | 429 |
| `INTERNAL` | 500 |
| `SERVICE_UNAVAILABLE` | 503 |

Services throw `new AppError(code, message, details?)`. The HTTP status comes from the code.

### 4.3 Server helpers

| Helper | What it does |
|---|---|
| `getSession(cookieSource?)` | Reads and verifies the session cookie. Returns `{ userId, role, iat }` or `null`. Route Handlers pass `request.cookies`; pages and actions use `cookies()` from `next/headers`. |
| `getCurrentUser()` | Wrapped in React `cache()`, so it runs once per request. Returns the active user as `{ id, name, email, role, photo }`, or `null`. Never includes the password (S8). Rejects tokens issued before a password change (S14). |
| `requireUser({ next? })` | On pages: redirects to `/login?next=…`. In actions and handlers: throws `UNAUTHENTICATED`. |
| `requireRole(...roles)` | Same as `requireUser`, and also checks the role (`FORBIDDEN`). |
| `withApi(handler, { auth?, roles?, body?, query?, params?, rateLimit? })` | For Route Handlers. Adds the request ID, checks the origin on POST, PUT, PATCH and DELETE (S9), checks auth, validates with Zod, applies the rate limit, and turns thrown errors into the format in §4.1 (B9). |
| `action(schema, handler, { auth?, roles?, rateLimit? })` | For Server Actions. Parses `FormData` with Zod, checks auth and the rate limit, and returns an `ActionState` (below). Never swallows `redirect()` or `notFound()` (B18). |
| `parseQuery(schema, searchParams)` | Validates `searchParams` for pages. Invalid values fall back to defaults rather than throwing. |
| `safeNext(next)` | Returns `next` only if it is a same-site path starting with a single `/`. Otherwise returns `/` (S22). |

```ts
type ActionState<T = void> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: { code: ErrorCode; message: string; fieldErrors?: Record<string, string> } };
```

**Next.js gotchas to code against:**
- `params` and `searchParams` are Promises: `const { slug } = await params`.
- `cookies()` and `headers()` are async.
- `redirect()` and `notFound()` work by throwing, so never catch them.

### 4.4 Services, mappers and adapters

| Function | Returns |
|---|---|
| `usersService.findActiveById(id)` | user, or `null` |
| `toursService.list(query)` | `{ items, total }`; cached with tag `tours` (R5) |
| `toursService.getBySlug(slug)` | tour; cached with tag `tour:<id>`; throws `NOT_FOUND` |
| `toursService.getById(id)` | tour; throws `NOT_FOUND` |
| `reviewsService.listForTour(tourId, page)` | `{ items, total }`; cached with tag `reviews:<tourId>` |
| `reviewsService.canReview(userId, tourId)` | `boolean`; never cached |
| `bookingsService.hasPaidBooking(userId, tourId)` | `boolean`; never cached |
| `bookingsService.listMine(userId)` | bookings with tour summaries; never cached |
| DTO mappers in each module's `dto.ts` | plain objects that can safely go to the browser (R6) |
| `mailer.enqueue(template, { to, firstName, url, ...vars })` | queues the email |
| `storage.put(key, buffer, contentType)` / `storage.delete(key)` / `storage.urlFor(key)` | |
| `images.normalize(file, preset)` | Checks the upload, re-encodes it as WebP at most 2000px wide (users: 512px), and returns a buffer. |
| `stripeClient.createCheckoutSession(params)` / `stripeClient.constructEvent(rawBody, signature)` | |
| `formatPrice(rupees)` | `₹24,999`, `₹1,24,999`: `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })` (B20) |
| `formatDate(date, style?)` | `12 Mar 2027`, always with `timeZone: 'Asia/Kolkata'` (B19) |
| `toIstDay(date)` / `fromIstDay('2027-03-12')` | convert between a stored `Date` and an IST calendar day (B19) |
| `formatDistance(km)` | `16 km` |

Email templates are `Welcome`, `PasswordReset` and `BookingConfirmed`. They are React Email components owned by the `designer`. Their props are listed in `docs/contracts.md`.

### 4.5 Test helpers

- `createUser({ role?, active? })`, `createTour(overrides?)`, `createBooking({ user, tour, startDate? })`
- `callRoute(handlerModule, { method, path, params?, body?, as?: user })` builds a `NextRequest`, sets the session cookie, calls the exported handler and returns the parsed response.
- `mockSession(user | null)` mocks `next/headers` cookies so tests can call Server Actions and page data functions directly.
- `fakes.mailer.sent`, `fakes.storage.files` and `fakes.stripe.sessions` let tests inspect what the app sent.

### 4.6 UI contracts

- **`src/components/ui/`** (owned by `designer`) holds design-system components with typed props. They are Server Components unless they need the browser (R2). `/styleguide` shows each one in every state, and is the visual contract between `designer` and `web`.
- **`src/components/features/`** (owned by `web`) holds page-level components built from `ui/` components. `web` doesn't restyle `ui/` components. If a page needs a new component or variant, `web` asks `designer`.
- **Client Components** receive only DTOs and plain values as props, never documents or functions other than Server Actions.

---

## 5. Security requirements

Each requirement needs a regression test whose name includes its ID, for example `it('[S5] non-author cannot edit a review')`.

| ID | Requirement | v1 mistake it prevents |
|---|---|---|
| **S1** | Every Route Handler, Server Action and protected page states its access level, and anything undeclared is denied. `test/security/access-matrix.test.ts` checks every API route in §1.4 and every action in §1.6 as an anonymous user, a `user`, a `guide` and an `admin`. | Booking CRUD had no auth at all, so anyone could list or delete bookings. |
| **S2** | No debug or diagnostic endpoints. `/healthz` returns only `{ status: 'ok' }`. `/styleguide` calls `notFound()` in production. | `/test-webhook` echoed every request header, cookies included. |
| **S3** | Sensitive fields never leave the server. All API responses and Client Component props go through DTO mappers. Queue jobs carry only `{ to, firstName, url }`. Tests check signup, login, `/me`, the props passed to account components, and the queued job payload. | Signup and reset responses included the bcrypt hash. Whole user documents, hash included, were stored in Redis jobs. |
| **S4** | No mass assignment. Input schemas are strict and list exactly which fields are allowed. Generic updates can't set `password`, `role` (except admin), `active`, `ratingsAverage`, `ratingsQuantity`, `user` or `tour`. Admin user updates allow only `name`, `email`, `role` and `active`. | The admin user update passed `req.body` to `findByIdAndUpdate`, which skips hashing, so passwords could be saved as plain text. A review's `user` could be spoofed through the body. |
| **S5** | Ownership checks. Only a review's author can edit it; the author or an admin can delete it. Bookings are readable only by their owner and by admins. The ID of the user acting always comes from the session, never from a form field. | Any user could edit or delete anyone's review. |
| **S6** | Deactivated users are left out of queries, can't log in, and existing sessions stop working. | The `active` flag was set but never checked anywhere. |
| **S7** | No injection. All input is Zod-validated, and login fields must be strings. Tour filters are built from an allowlist of fields and operators, never by stringifying user input and running a regex over it. | `{"email":{"$gt":""}}` reached Mongoose. `mongo-sanitize` and `xss` were installed but never used. |
| **S8** | The password field is selected only in the login and change-password service functions. It never appears in `getCurrentUser()` or in any props. | `protect` loaded `+password` and passed it to every view. |
| **S9** | Session cookie settings: `httpOnly`, `secure` in production, `sameSite: 'lax'`, `path: '/'`. Logging out deletes the cookie with the same options. Nothing changes state on a GET. Server Actions rely on Next.js's built-in check that the request's Origin matches the host, so `serverActions.allowedOrigins` is never widened. `withApi` checks the origin on POST, PUT, PATCH and DELETE, except for the Stripe webhook. | The logout cookie wasn't httpOnly. Checkout was started with a GET. |
| **S10** | The API is same-origin. CORS headers are added only for origins listed in `CORS_ORIGINS`. | `cors()` allowed every origin. |
| **S11** | CSP uses a per-request nonce set in `proxy.ts`, with `'strict-dynamic'`. There's no `'unsafe-inline'` for scripts in production (`'unsafe-eval'` only in development). Only exact hosts are allowed (Stripe, the map tile server, the storage host), with no wildcards such as `wss://*`. `'unsafe-inline'` for styles needs an ADR explaining why. | The CSP allowed `'unsafe-inline'` scripts and `wss://*`. |
| **S12** | TLS certificate checks stay on for Redis, SMTP and Mongo. | The Redis connection used `rejectUnauthorized: false`. |
| **S13** | Forgot-password gives the same response whether or not the email exists. The reset token is 32 random bytes, stored as a sha256 hash, valid for 10 minutes and usable once. The emailed link goes to the `/reset-password/[token]` page. | The response revealed whether an email was registered. The reset link pointed at an API PATCH route that a browser can't open. |
| **S14** | Session JWTs are verified with the algorithm pinned to HS256. The secret must be at least 32 characters, checked at startup. Tokens must have `exp`. Tokens issued before `passwordChangedAt` are rejected. | |
| **S15** | Rate limits are stored in Redis: 300 requests per 15 minutes per IP on `/api/v1`, and 10 per 15 minutes per IP and email on signup, login, forgot-password, reset and change-password, whether they arrive through the API or a Server Action. Tests use an in-memory store. | The in-memory limiter reset on every serverless cold start. |
| **S16** | Uploads are capped at 5 MB per file, through `serverActions.bodySizeLimit` and a check in `withApi`, with fixed file counts. Only JPEG, PNG and WebP are accepted, checked with sharp metadata rather than the browser-supplied type. Images are re-encoded (which removes EXIF data) and get random keys. Rejected uploads return 400, 413 or 415, or a matching `ActionState` error. | The type check trusted the client's mimetype, there was no size limit, and a rejected file returned 500. |
| **S17** | Payments: the price comes from the database at checkout, and the currency is always `inr`. A booking is created only from a verified webhook. The webhook finds the user by `metadata.userId`, not by email. Processing is idempotent by `stripeSessionId`. The signature is verified against the raw body from `await request.text()`. | The webhook found the user by email, and a duplicate webhook delivery created a duplicate booking. |
| **S18** | Secrets are never committed. `.env.example` lists every key with a placeholder. No secret goes in a `NEXT_PUBLIC_*` variable; CI fails if a `NEXT_PUBLIC_` name contains `SECRET`, `KEY` or `PASSWORD`. CI runs `npm audit --audit-level=high`, and Dependabot is enabled. | |
| **S19** | Production errors never show stack traces. `error.tsx` shows a generic message and the error's digest. API errors use the format in §4.1. Unknown errors are logged with the request ID. | |
| **S20** | Passwords must be 8–72 characters. Login runs a bcrypt compare against a dummy hash when the user isn't found, so response time doesn't reveal which emails exist. | |
| **S21** | No `dangerouslySetInnerHTML` anywhere; the ESLint rule `react/no-danger` is an error. User content such as reviews and names is rendered as text, never as HTML. | |
| **S22** | Post-login redirects go through `safeNext()`, which accepts only same-site paths starting with a single `/`. | New in v2: the `next` parameter would otherwise be an open redirect. |
| **S23** | `proxy.ts` is never the only auth check. Every protected page, Server Action and Route Handler calls `requireUser()` or `requireRole()` itself. A test sends requests with the `x-middleware-subrequest` header and with no cookie, and confirms protected data is still refused. | In March 2025, a Next.js vulnerability (CVE-2025-29927) let attackers skip middleware entirely. Apps that only checked auth in middleware were exposed. |

---

## 6. Correctness requirements

| ID | Requirement | v1 bug |
|---|---|---|
| **B1** | The `sort` parameter is a string. Parse it as a comma-separated list, check it against the allowlist, and default to `-createdAt`. | `queryString.sort()` was called as a function, so any `?sort=` request crashed. |
| **B2** | The `top-5-cheap` alias sets the validated query that the query builder reads. | The alias set `req.customQuery`, which nothing read. |
| **B3** | Geo endpoints return documents. Coordinates are parsed as numbers and range-checked: latitude −90 to 90, longitude −180 to 180, distance > 0, unit `mi` or `km`. | `tours-within` returned the `.explain()` query plan, and coordinates were passed as strings. |
| **B4** | Images are updated through their own endpoint, which accepts any subset of the files. A JSON `PATCH /tours/[id]` never touches images. | `resizeTourImages` crashed when `req.files` was undefined and required both the cover and the gallery images. |
| **B5** | Schema rules match the domain: `duration` isn't unique, `slug` is. Defaults are functions (use `timestamps`, never `default: Date.now()`). | `duration` was unique, so two tours couldn't have the same length. `createdAt` was computed once at startup. |
| **B6** | The review service recalculates ratings after create, update and delete. It awaits the work, rounds to one decimal, and clears the cached tour and review data (R5). Deleting the last review resets the tour to its defaults. A missing document returns 404 instead of crashing. | The post-hook crashed when the document was `null`, and the recalculation wasn't awaited. |
| **B7** | The webhook handler awaits all its work. It returns 2xx only once the booking is saved (or already exists), and 500 on failure so Stripe retries. | `checkoutBooking` was fire-and-forget inside `catchAsync` with no `next`. An error caused an unhandled rejection, which shut the server down. |
| **B8** | Checkout returns 404 when the tour doesn't exist and 400 when `startDate` isn't one of its future start dates. `currency` is `inr` and `unit_amount` is the price in paise (`price * 100`, an integer because prices are whole rupees). Image URLs are absolute and come from our own storage. `success_url` is `/my-tours?booking=success`. | A missing tour crashed. Images pointed at `natours.dev`. The amount wasn't rounded. No start date was recorded. |
| **B9** | Errors always get a response, in every environment. `withApi` maps CastError, duplicate key errors (to 409), ValidationError, ZodError, JWT errors and Stripe signature errors to error codes. Server Actions return expected errors as `ActionState` and let unexpected ones reach `error.tsx`. Pages use `notFound()` for missing data. | When `NODE_ENV` was neither `development` nor `production`, requests hung with no response. |
| **B10** | The app never hangs without a database. Mongoose uses `serverSelectionTimeoutMS: 5000`, requests fail with 503 when the database is unreachable, and `/readyz` reports it. | v1 logged the connection error and kept serving without a database. |
| **B11** | Pagination: `page` ≥ 1; `limit` from 1 to 100, default 20. Responses include `meta.total`. Pages show a pagination control from the same numbers. | `limit` had no upper bound. |
| **B12** | List queries don't populate anything by default. The tour page populates guides (name, photo, role). Reviews load through their own paginated query. Bookings populate only the fields they need. | `pre(/^find/)` hooks populated on every query, and bookings pulled full user documents. |
| **B13** | No duplicate handlers or logic: each behaviour lives in one service function, used by both the action and the Route Handler. No dead routes. | `/users/my-tours` returned the user. `submitFormData` was duplicated. `isLoggedIn` ran twice per page. |
| **B14** | `passwordChangedAt` is set in exactly one place: the model hook. | The reset handler wrote a misspelled `changedPasswordAt`. |
| **B15** | Account updates go through the validated service only, from both `updateMeAction` and `PATCH /api/v1/users/me`. | `/submit-form-data` duplicated the update logic without validation. |
| **B16** | Duplicate email or tour name returns 409 `CONFLICT`, or the matching field error in `ActionState`. | |
| **B17** | Models and the Mongoose connection survive hot reload. Models are registered as `mongoose.models.X ?? model(...)`, and the connection promise is cached on `globalThis`. | New in v2 (Next.js reloads modules in development). |
| **B18** | `redirect()` and `notFound()` are never inside a `try/catch` that could swallow them. The `action()` helper re-throws them. | New in v2 (Next.js pitfall). |
| **B19** | Start dates are calendar days in India Standard Time. They're stored as 00:00 IST (18:30 UTC on the previous day), compared by IST calendar day ("is this departure in the future?"), and always displayed with `timeZone: 'Asia/Kolkata'` through `formatDate`. A test sets the server's time zone to UTC and checks that a 1 January departure shows as 1 January, not 31 December. | New in v2 (the classic off-by-one-day bug when servers run in UTC). |
| **B20** | Money is whole rupees everywhere: the model, the API, bookings and the UI. Stripe gets paise (`price * 100`). Prices are always shown through `formatPrice` (₹ with Indian grouping, no decimals), never with string concatenation or `toFixed`. | New in v2. |

---

## 7. Rendering: server first, client only where needed

### 7.1 The rule

**Render on the server by default.** Every page and component is a React Server Component unless it needs something only the browser has. Data is loaded on the server, next to the database, and HTML is streamed to the browser. Client Components are small pieces inside server-rendered pages, and they receive plain data as props.

| ID | Requirement |
|---|---|
| **R1** | **Server Components by default.** Pages, layouts and data-loading components are Server Components. A component is a Client Component (`'use client'`) **only** if it needs one of these: event handlers for live behaviour (`onClick`, `onChange`), React state or effects, browser-only APIs (`window`, Leaflet, `FileReader`, `IntersectionObserver`), or updating after the page has loaded (polling). |
| **R2** | **Every client file says why.** The line after `'use client'` is a comment `// client: <reason from R1>`. `scripts/check-client-boundaries.ts` fails CI if any client file lacks it. The `'use client'` boundary sits as low in the tree as possible: the button, not the page. |
| **R3** | **Pages call services directly.** Server Components never fetch our own `/api` over HTTP. Independent data loads run in parallel (`Promise.all`), with no request waterfalls. Repeated lookups in one request (the current user, the tour) are deduplicated with React `cache()`. |
| **R4** | **Streaming.** Slower sections (reviews, guides, "your booking" state) sit inside `<Suspense>`, with skeleton fallbacks the same size as the real content, so nothing shifts (CLS < 0.1). Route segments have `loading.tsx`. |
| **R5** | **Caching public data, never personal data.** Tour lists, tour details and review lists are cached with tags (`tours`, `tour:<id>`, `reviews:<tourId>`) using the Next.js tagged data cache, and services clear the tags (`revalidateTag`) whenever that data changes. Anything that depends on who is logged in (session, bookings, `canReview`, the header's account menu) is never inside a cached function. A Playwright test logs in as two different users and checks each sees only their own data. |
| **R6** | **A safe boundary between server and browser.** Props passed to Client Components are DTOs (§1.3) or plain values: no Mongoose documents, `ObjectId`s or secrets. Files under `src/server/` import `server-only`, so importing them from client code fails the build. |
| **R7** | **Forms work before JavaScript loads.** Site forms are `<form action={serverAction}>`, so they work before the page's JavaScript has loaded and with JavaScript turned off. When JavaScript is available, `useActionState` and `useFormStatus` add field errors and a pending state without reloading the page. After a change, the action clears the affected cache tags or paths, then redirects or returns state. |
| **R8** | **Browser-only components load lazily.** The route map uses `next/dynamic` with `ssr: false`, called from inside a Client Component. Its server-rendered fallback (the itinerary list) has the same size, so nothing shifts. Leaflet's code loads only on tour pages. |
| **R9** | **JavaScript budget.** Phase 0 records each route's "First Load JS" from `next build` in `docs/bundle-baseline.json`. No page may add more than **40 KB gzipped** over the framework baseline, not counting chunks that load lazily (the map). `scripts/check-bundle.ts` enforces this in CI. |
| **R10** | **Metadata from the server.** Every page has `generateMetadata` (title, description, canonical URL). Tour pages use the cover photo as their Open Graph image. `sitemap.ts` lists every tour, and `robots.ts` excludes `/me`, `/my-tours` and `/styleguide`. |
| **R11** | **What works without JavaScript:** the overview with filters and pagination, the tour page (the map is replaced by the itinerary list), login, signup, forgot and reset password, booking (the booking form sends the user to Stripe), writing a review, updating account details, changing password, and deactivating through `/me/deactivate`. **What needs JavaScript:** the map, the photo preview, the confirmation polling on My tours, live field errors without a page reload, and the dialog version of the deactivate step. A Playwright project with JavaScript disabled covers the first list. |

### 7.2 Rendering per page

| Page | Rendering | Data loaded on the server | Client Components (and why) |
|---|---|---|---|
| `/` overview | Server-rendered on each request (reads `searchParams`); data from the tagged cache | `toursService.list(query)` | None required. Optional: `FilterAutoSubmit` (event handler) to submit the filter form on change. |
| `/tour/[slug]` | Server-rendered; tour data from the cache; personal parts streamed in `<Suspense>` | tour, guides, the first page of reviews; for logged-in users, their booking state and `canReview` | `RouteMap` (Leaflet needs the browser), `StarRatingInput` (state), `ReviewForm` wrapper (`useActionState` for live errors), `BookingSubmit` (pending state). The booking panel itself is a server-rendered form. |
| `/login`, `/signup`, `/forgot-password`, `/reset-password/[token]` | Server-rendered form posting to a Server Action | whether the user is already logged in (then redirect) | `AuthForm` wrapper (`useActionState`), `PasswordToggle` (state) |
| `/me` | Server-rendered on each request (personal) | `getCurrentUser()` | `PhotoInput` (`FileReader` preview), `DeactivateDialog` (dialog state; links to `/me/deactivate` without JavaScript) |
| `/me/deactivate` | Server-rendered | current user | none |
| `/my-tours` | Server-rendered on each request (personal) | `bookingsService.listMine` | `BookingConfirmationPoller` (only with `?booking=success`; polls, then calls `router.refresh()`) |
| Header (in the root layout) | Server-rendered; reads the session | current user | `MobileMenu` (open and closed state) |
| `/credits` | Server-rendered from the tagged cache | `photoCredits` of every tour | none |
| `/styleguide` | Server-rendered; `notFound()` in production | none | Interactive demos only |
| Error pages | `not-found.tsx` is server-rendered. `error.tsx` and `global-error.tsx` are Client Components, which Next.js requires. | none | `error.tsx` (required by Next.js), with a "Try again" button |

---

## 8. Deployment and architecture requirements

| ID | Requirement | Why |
|---|---|---|
| **D1** | The web server runs as a Next.js standalone Docker container. The email worker is a separate long-running Node process from the same image, started with a different command. If you later move the web app to Vercel, the worker still needs a long-running host; record that move in an ADR. | On Vercel, v1 lost uploaded files, never ran its email worker reliably, and reset its rate limiter on every instance. |
| **D2** | Uploads go to object storage through the storage adapter. The container's filesystem is treated as read-only. `next/image` loads the stored images through `images.remotePatterns`. | |
| **D3** | Email is sent through a queue. The web app enqueues; the worker renders the React Email template and sends it, retrying 3 times with exponential backoff. A failed email never fails the user's request. The one exception: if Redis is down when forgot-password tries to enqueue, it returns `SERVICE_UNAVAILABLE` and clears the reset token. The queue connection is created on first use in `src/server/queue/`, not when a module loads. | v1 created the queue and its worker inside `authController` as soon as the file was imported. |
| **D4** | Config is validated with Zod in `instrumentation.ts` at startup; the app refuses to start if it's invalid. A CI step checks that every key in the config schema appears in `.env.example`. | |
| **D5** | Graceful shutdown on SIGTERM. The worker finishes its current job, then closes the queue and Redis. The web server lets in-flight requests finish (up to 10 seconds), then closes Mongo and Redis. The lead checks the current Next.js docs for how to hook into standalone-server shutdown and records it in an ADR. | |
| **D6** | `/healthz` is a liveness check. `/readyz` checks Mongo and Redis. The Docker `HEALTHCHECK` uses `/healthz`. | |
| **D7** | Logs are structured JSON (pino) in production and pretty-printed in development. Every log line and every error response carries the request ID from `proxy.ts`. | |
| **D8** | Multi-stage Dockerfile on `node:24-slim`, running as a non-root user. It runs `next build` with `output: 'standalone'`, copies `.next/static` and `public`, and bundles the worker with esbuild into `dist/worker.js`. `docker-compose.yml` runs `mongo`, `redis`, `mailpit`, `web` and `worker`. | |
| **D9** | Build output (`.next`, `dist`, `coverage`, Playwright reports) is gitignored. | v1 committed `bundle.js` and its source map. |
| **D10** | `npm run seed` (run with `tsx`) loads `seed/data/` as described in `seed/README.md`. It is idempotent and has a `--reset` flag. It sets every seed user's password from `SEED_USER_PASSWORD` (required, development and staging only, never committed) and hashes it once through the model. It uploads `seed/img/` to storage. If any tour start date has passed, it moves **all** dates (tour start dates, bookings, reviews) forward by the same whole number of years, so tours stay in season and past trips stay in the past. It refuses to run when `NODE_ENV=production`. | v1's seed dates were in the past, and its seed file held password hashes. |
| **D11** | CI runs on every push and pull request: install, `tsc --noEmit`, lint (ESLint and stylelint), format check, the client-boundary check (R2), the `NEXT_PUBLIC_` check (S18), unit and integration tests with coverage, `next build`, the bundle budget (R9), `npm audit --audit-level=high`, knip, Playwright (e2e, no-JavaScript project, accessibility, screenshots), Lighthouse CI (U24), and a Docker build. | |
| **D12** | Deployment: a `render.yaml` blueprint (web, worker, Redis), MongoDB Atlas, an S3 or R2 bucket, and the Stripe webhook pointed at `/webhooks/stripe`. The README covers deploying, rotating secrets and rolling back. | |
| **D13** | API versioning with `/api/v1`. `docs/openapi/openapi.yaml` is kept in sync with the Route Handlers, and CI checks it with `redocly lint`. | |
| **D14** | **Map tiles and India's borders.** Standard OpenStreetMap tiles may draw India's international boundaries differently from the official map of India, and the Ladakh tour runs close to them. In Phase 0 the lead compares tile providers that show India's boundaries as India officially recognises them against keeping every tour map zoomed in to its route, checks each provider's terms and pricing, and records the choice in an ADR. The map's CSP hosts follow that choice. | New in v2. |

---

## 9. Design and UI (full redesign)

v2 gets a new visual identity. **Nothing from v1's CSS is reused.** v1's look had these problems, which v2 must not repeat:
- Body text was `#777` on white. That's a contrast ratio of 4.48:1, just below the WCAG AA minimum of 4.5:1.
- Green gradients were used everywhere, and images were cut into skewed shapes with `clip-path`.
- There was no way to filter or sort tours, no way to choose a start date, and nowhere to write a review.

### 9.1 Design brief

- **Subject:** small-group tours across India: Himalayan treks and high passes (Uttarakhand, Ladakh, Spiti), the backwaters and tea hills of Kerala, the Thar Desert, the Andaman Islands, the heritage cities of the Golden Triangle and Hampi, tea country in Darjeeling and Sikkim, tiger country at Ranthambore, the living root bridges of Meghalaya and white water at Rishikesh. Tours run 3 to 8 days, cost ₹12,999 to ₹42,999, and are rated easy, medium or difficult.
- **Audience:** Indian travellers, mostly in their 20s to 50s, planning on their phones. They want to know whether a tour fits their fitness, their dates and their budget, and whether it's the right season to go.
- **Primary job:** help people choose a tour that fits, then book a start date with confidence.
- **Secondary jobs:** see and manage bookings, leave a review after a trip, manage the account.
- **Content:** the 13 seed tours, with their real names, places, itineraries, guides, reviews and photos.
- **No placeholder content anywhere a person can see it**: no lorem ipsum, no "John Doe", no grey boxes or stock placeholder images, in the product, the styleguide, mockups and emails. Use the seed content. Test factories may generate data, but it must look real too.

### 9.2 Starting direction: "Milestone"

The `designer` starts from this direction. They may change any part of it, but must explain each change in `docs/design/direction.md` and show the result at the design gate.

**Idea.** All over India, roadside milestones tell travellers where they are and how far they have to go: a whitewashed stone with a coloured cap, a place name and a distance in kilometres. Yellow caps mark national highways and green caps state highways. The interface borrows that plain, legible way of giving directions. The photography carries the colour and the drama.

**Palette** (light theme; the designer derives the dark theme and status colours):

| Name | Hex | Role |
|---|---|---|
| Neel | `#1F2B4D` | Headings, primary text, header, focus ring. The indigo blue of Indian dye and of the blueing in lime wash. |
| Slate | `#45505E` | Body text |
| Whitewash | `#EEF1F5` | Page background: the cool, slightly blue white of a lime-washed wall or milestone |
| Paper | `#FAFBFC` | Surfaces: forms, panels, booking panel |
| Highway yellow | `#F2B705` | The single accent, from national-highway milestone caps: the main "Book" button and the route line on the map |
| State green | `#2F6B4F` | Secondary, from state-highway milestone caps: success messages and selected filters |

Measured contrast ratios:
- Neel on Whitewash: 12.27:1
- Slate on Whitewash: 7.23:1
- Slate on Paper: 7.91:1
- Neel text on Highway yellow: 7.64:1
- State green text on Whitewash: 5.55:1
- Paper text on State green: 6.07:1

Highway yellow on Whitewash is only 1.6:1, so **Highway yellow is never used for text and never as the only thing marking an edge**. A yellow button always has Neel text. On the map, the route line gets a Neel outline so it stands out against the map tiles.

**Type.**
- One family in two widths: **Anek Latin** set narrow (semi-condensed, semibold) for display and headings, like the lettering on a milestone, and at normal width for text. **Anek Devanagari** is the same design for Hindi, so the site can add Hindi later without changing fonts. The designer confirms both are available through `next/font/google` and records the result in `direction.md`.
- Prices, days and dates line up in columns. Use tabular figures if the font has them; otherwise align them with the layout.
- Scale: ratio 1.25 from a 1rem (16px) body size: 0.8, 1, 1.25, 1.563, 1.953, 2.441, 3.052, 3.815rem.
- Line height: 1.55 for body text, 1.1 for headings.
- Paragraphs are 45–75 characters wide.
- Sentence case everywhere, including headings and buttons.

**Layout.**
- Mobile-first and left-aligned.
- Content is at most about 72rem wide, on a 12-column grid from 64em up.
- **Overview as the road ahead.** A list of tours rather than a grid of identical cards. Each row shows: photo, a small milestone marker with the length in days, name, region, difficulty, next start date and the "from" price. Facts line up in columns on desktop and stack under the photo on mobile.
- **Tour page:** photo with the tour name, then a strip of facts, then the route map next to the day-by-day itinerary, then the description, guides, reviews and photo credits. The booking panel sticks to the side on desktop and becomes a bar at the bottom of the screen on mobile.

```
Overview (desktop)
┌────────────────────────────────────────────────────────────────────────┐
│ Natours                                      Tours  My tours  Account  │
├────────────────────────────────────────────────────────────────────────┤
│ Find your next trip                                                    │
│ [Difficulty ▾] [Length ▾] [Month ▾] [Max price ▾] [Sort ▾]             │
│ 13 tours                                                               │
├────────────────────────────────────────────────────────────────────────┤
│ [photo]  [5 days]  Kerala Backwaters and Hills   ▲ Easy      5 Dec     │
│                    Fort Kochi, Kerala                       ₹24,999    │
├────────────────────────────────────────────────────────────────────────┤
│ [photo]  [8 days]  Ladakh High Passes            ▲▲▲ Difficult 12 Jun  │
│                    Leh, Ladakh                              ₹42,999    │
└────────────────────────────────────────────────────────────────────────┘

Tour page (desktop)
┌────────────────────────────────────────────────────────────────────────┐
│ [ wide photo                                                         ] │
│ [ Valley of Flowers Trek                                             ] │
├────────────────────────────────────────────────────────────────────────┤
│ ▲▲ Medium   6 days   Up to 14 people   Rishikesh, Uttarakhand   ★ 4.5  │
├─────────────────────────────────────────────┬──────────────────────────┤
│ [ map: route line through day markers     ] │ Book this tour           │
│ [ 1 ── 2 ── 3 ── 4                        ] │ Start date [10 Jul ▾]    │
│ Day 1  Drive along the Alaknanda to         │ ₹18,999 per person       │
│        Joshimath                            │ [ Book this tour ]       │
│ Day 2  Walk up to Ghangaria                 │                          │
│ About this tour (max 75 characters a line)  │                          │
│ Your guides   Reviews   Photo credits       │                          │
└─────────────────────────────────────────────┴──────────────────────────┘
```

**Signature element: the route as milestones.**
- On the tour page, the map draws the itinerary as a Highway yellow line (with a Neel outline). Each day's stop is a small milestone-shaped marker with the day number, matching the day-by-day list beside it.
- Day numbers appear here because the itinerary really is a sequence. **No other part of the site uses numbered markers.**
- When the map first comes into view, the line draws itself once along the route in at most 1.2 seconds. With `prefers-reduced-motion`, it appears already drawn.
- This is where the design is bold. Everything else stays quiet.

**Difficulty.** Shown as one, two or three small peaks, always together with the word: easy, medium, difficult. The number of peaks carries the meaning, so colour is never the only signal.

**Voice and copy.**
- Indian English with British spelling (colour, organise, travelling), plain and specific, in sentence case, written from the traveller's point of view.
- Prices as `₹24,999` and `₹1,24,999` (Indian grouping, no decimals), dates as `12 Mar 2027`, distances in kilometres and heights in metres.
- Buttons say exactly what happens ("Book this tour", "Save changes", never "Submit"). An action keeps the same word through the whole flow: "Book this tour", then Stripe, then "Booked" on My tours.
- Errors say what happened and how to fix it, and don't apologise.
- Empty states invite the next action ("No tours match these filters. Clear filters").

### 9.3 Defaults to avoid

These are the look of a generic template, an AI-generated site or a tourism cliché, not choices made for this brief. The designer checks the direction and every screen against this list. Using any of them needs a written reason in `direction.md`.

- Cream background with a high-contrast serif and a terracotta accent; or near-black with a single acid-green or bright red accent; or a newspaper layout with thin rules and dense columns.
- The SaaS card kit: everything in identical rounded cards with the same soft grey shadow, one border radius on everything, gradient washes as decoration.
- Template details: an ALL-CAPS label above every heading, details joined with middle dots ("A · B · C"), labels in the form "Word — fragment", near-black (`#111`) in place of a real colour, monospace for small labels, "→" added to buttons and links.
- Headlines with one word picked out in italic, bold or another colour.
- Numbered markers (01, 02, 03) on content that isn't a sequence.
- Every section fading and sliding up on scroll; cards that lift or grow on hover.
- **India tourism clichés:** saffron, white and green used as a decorative palette; mandala, paisley or rangoli patterns as background ornament; Taj Mahal, elephant or lotus silhouettes as icons; "exotic", "mystical" or "incredible" in the copy; Latin fonts dressed up to look like Devanagari, with a bar along the top.
- From v1: green gradients, skewed image shapes, grey text below AA contrast.

### 9.4 Design system requirements

| ID | Requirement |
|---|---|
| **U1** | **Tokens.** `src/styles/tokens.css` defines CSS custom properties for colour (by role: `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-focus`, plus status colours), type (families from `next/font` variables, scale steps, weights, line heights), spacing (4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96), radius (at most two values, each with a stated use), one elevation (for overlays only), and motion (durations and easing). Breakpoints are documented in `direction.md`, because custom properties can't be used in media queries. **No raw hex colours or pixel values outside `tokens.css`**; stylelint enforces this. |
| **U2** | **Themes.** Light and dark themes follow `prefers-color-scheme`, by swapping token values only. Both themes meet the contrast rules in U22. |
| **U3** | **CSS structure.** Global files (`reset.css`, `tokens.css`, `base.css`) are imported once in the root layout and use the cascade layers `reset, tokens, base, components, utilities`. Each component has a CSS Module that writes its rules inside `@layer components`. Selectors are single classes: no IDs, no `!important`, at most one level of nesting. |
| **U4** | **Components** live in `src/components/ui/` with typed props, and are Server Components unless R1 requires otherwise. The minimum set: button (primary, secondary, quiet), link, text field, select, checkbox, file input with preview, star rating (display, plus a keyboard-usable input), alert and toast, difficulty symbol, price, start-date select, tour row, facts strip, itinerary, map frame, booking panel, review item, review form, guide item, avatar (photo, or initials when there's no photo), photo credits, pagination, empty state, confirm dialog (native `<dialog>`), header with mobile menu, footer, skip link, and a skeleton for each streamed section (R4). |
| **U5** | **Styleguide.** `/styleguide` (development and test only) shows every component in every state: default, hover, focus, active, disabled, error, pending and empty. It works in both themes and at mobile and desktop widths. |
| **U6** | **Fonts** load through `next/font` (in `src/styles/fonts.ts`) with only the weights and subsets the design uses (Latin now; Devanagari ready for Hindi), exposed as CSS variables for the tokens. |
| **U7** | **Images.** Every image uses `next/image` with a correct `sizes` value and `priority` only on the first visible photo, so the browser gets right-sized files and the layout doesn't shift. Photos are never stretched or cut into shapes. |
| **U8** | **Emails** are React Email components in `src/emails/`. They use the same palette and type, with a system-font fallback, and include a plain-text version. They're previewed with the React Email dev server and checked in Mailpit in light and dark mail clients. |

### 9.5 UX requirements

| ID | Requirement |
|---|---|
| **U9** | Every page has one `<h1>`, a logical heading order, landmarks (`header`, `nav`, `main`, `footer`), and a skip link to the main content. |
| **U10** | **Overview:** filters for difficulty, length, start month and maximum price, and sorting by price, rating and length. Filters are a GET form, so the URL can be shared and the filters work without JavaScript (R11). The page shows the result count, an empty state with "Clear filters", and pagination when there are more than 12 tours. |
| **U11** | **Tour page:** route map and itinerary (§9.2), facts strip, description, guides and paginated reviews, plus the booking panel. The panel lists only future start dates, shows the price, and has a "Book this tour" button. Logged-out users see "Log in to book", which brings them back to this tour after logging in (S22). If the user has already booked, the panel says so and links to My tours. |
| **U12** | **Booking flow:** choose a date, `startCheckoutAction` redirects to Stripe Checkout, the user comes back to My tours and sees a confirmation banner. If the webhook hasn't arrived yet, `BookingConfirmationPoller` says "Confirming your booking" and refreshes for up to 30 seconds. After that it says the confirmation email is on its way. Cancelling at Stripe returns to the tour page with the chosen date still selected. |
| **U13** | **My tours:** upcoming and past bookings in separate groups. Each shows the start date, price paid and a link to the tour. Past tours offer "Write a review" if the user hasn't reviewed it. The empty state links to the tours. |
| **U14** | **Reviews:** the form appears only when `canReview` is true. The star input works with the keyboard and announces its value. Authors can edit and delete their own reviews in place, and deleting asks for confirmation first. |
| **U15** | **Account:** separate sections for details, photo, password and deactivation. The photo shows a preview before upload. Deactivating asks for confirmation and says what will happen. |
| **U16** | **Auth forms:** errors appear next to the field they belong to, using `fieldErrors`. There's a show-password toggle and correct `autocomplete` attributes. After login, the user goes to the safe `next` path (S22). |
| **U17** | **Feedback:** every submit button shows a pending state (`useFormStatus`) and is disabled until the action finishes. Alerts and toasts use a live region. Messages follow the voice rules in §9.2. |
| **U18** | **Error pages:** `not-found.tsx` and `error.tsx` in the new design, with a way back to the tours. They never show stack traces (S19). |
| **U19** | **Header:** Tours, My tours, and either an account menu or "Log in" and "Sign up". On mobile, the menu is a button that opens and closes it, with `aria-expanded`. Without JavaScript, the links are shown in a plain list. |
| **U20** | **Copy:** `docs/design/copy.md` holds the glossary (tour, start date, booking, guide, review), the list of button and message wording, and the Indian English and formatting rules from §9.2. Pages use exactly that wording. |

### 9.6 Accessibility, performance and visual quality

| ID | Requirement |
|---|---|
| **U21** | **Works without JavaScript** as defined in R11. |
| **U22** | **WCAG 2.2 AA.** Text contrast is at least 4.5:1 (3:1 for large text). Interface parts and focus indicators are at least 3:1. Every interactive element has a visible focus indicator. Touch targets are at least 44×44px. Form errors are linked to their fields with `aria-describedby` and `aria-invalid`. The map doesn't trap keyboard focus, and the itinerary list is its text alternative. Colour is never the only signal. **Test:** `@axe-core/playwright` on every page in both themes finds no serious or critical violations, and the reviewer records a keyboard-only walkthrough of the booking flow in `docs/design/a11y-walkthrough.md`. |
| **U23** | **Responsive** from 320px to 1920px with no horizontal scrolling. Checked at 375, 768, 1280 and 1920px. |
| **U24** | **Performance budget** (Lighthouse CI, mobile, on the overview and a tour page, against `next start`): Performance ≥ 90, Accessibility 100, Best Practices ≥ 95, SEO ≥ 95. LCP under 2.5 seconds, CLS under 0.1. JavaScript per R9. |
| **U25** | **Motion:** one moment that plays by itself, the route line (§9.2). All other motion responds to something the user did (opening a menu or dialog, a toast appearing), lasts at most 200ms, and never runs on scroll. Everything respects `prefers-reduced-motion`. |
| **U26** | **Visual regression:** Playwright screenshots of the styleguide, overview, tour page, My tours and account page at 375 and 1280px, in both themes. Baselines are generated in the CI container, because font rendering differs between machines. A changed baseline needs the lead's approval. |
| **U27** | **Photo credits.** The seed photos are licensed CC BY, CC BY-SA or similar, which require credit. Each tour page has a "Photo credits" section listing every photo's author and licence, with links to the licence and the source page. `/credits` lists every photo on the site the same way. A test checks that every tour photo has a credit. |

### 9.7 Design process and gate

1. **Direction (PD-1).** The `designer` writes `docs/design/direction.md` containing:
   - The brief in their own words.
   - The palette (4–6 named colours), type choices and scale.
   - Layout concept with ASCII wireframes of the overview, tour page, My tours and account page, each on mobile and desktop.
   - The signature element and the design principles.
2. **Self-review.** The designer checks every part of the direction against §9.3 and asks: "Would I have produced this for any travel site?" Any part where the answer is yes gets revised, and `direction.md` records what changed and why.
3. **Mockups (PD-2).** The designer builds static mockups of the overview and tour page, on mobile and desktop, as plain HTML and CSS under `docs/design/mockups/` using seed content. They take Playwright screenshots into `docs/design/screens/`.
4. **Design gate (you approve).** The lead shows you `direction.md` and the screenshots, then waits for your approval or changes. **No components or page styling start before you approve.**
5. **Build (PD-3 to PD-5).** Tokens, then components, then the styleguide. The designer screenshots each component in both themes and critiques it before marking it done. A useful rule is "before you leave, remove one accessory": cut anything that doesn't help someone choose or book a tour.
6. **Design QA (P2-DS1).** Once the pages exist, the designer screenshots every page at 375 and 1280px in both themes, compares them with `direction.md`, and files fixes as tasks for `web`.

---

## 10. Code quality standards

| ID | Standard |
|---|---|
| **Q1** | TypeScript `strict` with `noUncheckedIndexedAccess`. No `any` without a comment explaining why. `tsc --noEmit` passes in CI. |
| **Q2** | ESLint flat config with `--max-warnings=0`: `eslint-config-next` (including `core-web-vitals`), `typescript-eslint`, and `eslint-plugin-security`. Extra rules: `no-console` (use the logger), `react/no-danger` (S21), `no-restricted-imports` blocking `**/modules/*/model` from outside its module and blocking `src/server/**` from client components. Also stylelint with `stylelint-config-standard` and the U1 and U3 rules. Prettier with `singleQuote: true` and `trailingComma: 'all'`. |
| **Q3** | Naming: files are kebab-case, React components are PascalCase, and hooks start with `use`. Server Actions end in `Action`. Error codes are UPPER_SNAKE. CSS Module classes are camelCase. |
| **Q4** | Module boundaries from §3.2 and UI boundaries from §4.6. |
| **Q5** | No commented-out code. No `TODO` without an issue link. No leftover debugging logs. v1's history has several "added logs for debugging" commits; don't repeat that. |
| **Q6** | Every Route Handler and Server Action has tests for: the happy path, a validation failure, and authorization (anonymous, wrong role, and not-owner where it applies). Every S and B ID has a regression test tagged with its ID. Client Components with logic (star input, poller, photo input) have Testing Library tests. Coverage must be at least 85% of lines in `src/server/modules/**/service.ts` and at least 75% of `src/server/**` overall; CI fails below that. |
| **Q7** | Tests are deterministic. No network calls: Stripe, SMTP, storage, Redis and the map tiles are faked. Each test file gets its own in-memory database. Expiry logic uses fake timers. Route Handlers are tested with `callRoute()`, and Server Actions with `mockSession()`. |
| **Q8** | Commits follow Conventional Commits and include the task ID, for example `feat(tours): query builder with allowlist [P1-CA1]`. One task per commit where possible. |
| **Q9** | Exported service functions have TSDoc covering parameters, return value and the error codes they throw. |
| **Q10** | Documentation: a README (setup, scripts, architecture, deployment), `docs/contracts.md`, `docs/design/`, and an ADR in `docs/adr/NNNN-title.md` for every deviation from this plan. |
| **Q11** | No unused dependencies or exports (knip). The lockfile is committed. New dependencies need a one-line reason in the commit message. |

### Definition of Done (for every task)

- [ ] `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test` all pass.
- [ ] Tests cover the requirement IDs the task lists.
- [ ] No files changed outside the teammate's owned paths, unless the owner agreed.
- [ ] Every new `'use client'` file meets R1 and R2.
- [ ] The OpenAPI fragment is updated if the task changed an endpoint.
- [ ] For UI tasks: screenshots at 375 and 1280px in both themes have been checked against `direction.md`, and axe reports nothing serious.
- [ ] The task is marked complete in the shared task list, with a one-line summary sent to the lead.

---

## 11. Team

### 11.1 Roles and file ownership

Teammates share one checkout. **Only edit files in your owned paths.** If you need a change somewhere else, message the owner.

| Teammate | Owns (write access) | Main requirement IDs |
|---|---|---|
| **lead** | `plan.md`, `docs/contracts.md`, `docs/adr/`, `docs/openapi/openapi.yaml`, `docs/bundle-baseline.json`, `src/lib/format.ts`, `package.json` and lockfile, `tsconfig.json`, `test/setup.ts`, `test/helpers/`, all model files (`src/server/modules/*/model.ts`, written in Phase 0, then changed only through the lead) | Phase 0, the gates, Q8, Q10 |
| **platform** | `next.config.ts`, `src/proxy.ts`, `src/instrumentation.ts`, `src/server/{config,deps,db,logger,errors,rate-limit}.ts`, `src/server/{api,actions,queue,storage,stripe,mailer}/**`, `src/server/images.ts`, `src/worker/**`, `src/app/{healthz,readyz}/**`, `scripts/check-*.ts`, Docker and compose files, `render.yaml`, `lighthouserc.json`, `.github/`, ESLint, stylelint and Prettier configs | S2, S9–S12, S15, S16, S18, S19, S23 (proxy side), B9, B10, B17, B18, R2, R9, D1–D13 |
| **identity** | `src/server/session.ts`, `src/server/redirects.ts`, `src/server/modules/{auth,users}/**` except models, `src/app/api/v1/{auth,users}/**`, `docs/openapi/paths/{auth,users}.yaml` | S3–S9, S13, S14, S20, S22, S23, B13–B16 |
| **catalog** | `src/server/modules/{tours,reviews}/**` except models, `src/app/api/v1/{tours,reviews}/**`, `scripts/seed.ts`, `seed/**`, `docs/openapi/paths/{tours,reviews}.yaml` | S4, S5, S7, B1–B6, B11, B12, B16, B19, R5 (cache tags), D10 |
| **commerce** | `src/server/modules/bookings/**` except the model, `src/app/api/v1/bookings/**`, `src/app/webhooks/stripe/**`, `docs/openapi/paths/bookings.yaml` | S1 (bookings), S17, B7, B8, B20 |
| **designer** | `docs/design/**`, `src/styles/**`, `src/components/ui/**`, `src/emails/**`, `src/app/styleguide/**` | U1–U8, U20, U25, and the look of everything |
| **web** | `src/app/**` except `api/`, `webhooks/`, `healthz/`, `readyz/` and `styleguide/`; `src/components/features/**`; `public/**` | R1, R3, R4, R6–R8, R10, R11, S21, U9–U19, U21, U23, U27 |
| **reviewer** | `test/security/**`, `test/regression/**`, `test/e2e/**`, `test/a11y/**`, `test/visual/**`, `docs/design/a11y-walkthrough.md`. Read-only everywhere else. | All S and B IDs, R5 (two-user test), R11, U22, U24, U26 (verification) |

Each module owner writes the integration tests for their module under `test/integration/<module>/`. `web` and `designer` write component tests under `test/components/`.

### 11.2 Workflow rules

1. **Plan first.** Before changing files on a task, send the lead a short plan: files you'll touch, approach, which parts run on the server and which in the browser, and the IDs you'll test. Wait for approval.
2. **Contracts are fixed.** If a contract in `docs/contracts.md` doesn't fit, message the lead. Don't work around it. The lead decides, updates the contract, writes an ADR and tells everyone affected.
3. **Dependencies.** Ask the lead to add a package. Don't edit `package.json` yourself.
4. **Git.**
   - Stage only your owned paths (`git add <paths>`), never `git add -A`.
   - Never reset, rebase, stash or force-push.
   - If `.git/index.lock` exists, wait a few seconds and try again.
5. **Backend and web hand-off.**
   - Module owners deliver a service, its DTO mappers and its Server Actions.
   - `web` builds pages that call those services and actions. `web` never queries models or writes business logic in a page.
6. **Designer and web hand-off.**
   - `web` builds pages from `ui/` components.
   - If a page needs something the styleguide doesn't have, `web` messages `designer` with the page, what's needed and a screenshot. `web` doesn't style around it.
   - `designer` adds it to the styleguide, then tells `web`.
7. **Review loop.** The reviewer checks each completed task against §5 to §10. Findings become tasks in the shared list, assigned to the owner and tagged with the ID, for example `[S5] updateReviewAction lets non-author edit` or `[R1] TourRow marked 'use client' with no reason`. The owner fixes them. The reviewer re-checks and closes them.
8. **Blocked?** Message the lead with what's blocking you and which task. Pick up another unblocked task in the meantime.
9. **No scope creep.** Stretch features (§1.2) start only when the lead says so after the Phase 2 gate.

### 11.3 Teammate briefs (the lead uses these when creating each teammate)

- **platform:** "You are `platform` on the Natours v2 team, a Next.js full-stack app. Read plan.md §1–§10 and docs/contracts.md. You own the paths listed for platform in §11.1. Your tasks are the `P1-PL*`, `P2-PL*` and `P3-PL*` tasks in §12. Follow the workflow rules in §11.2."
- **identity:** "You are `identity` … your tasks are `P1-ID*`. Harden `getCurrentUser`, `requireUser` and `requireRole` first (S6, S8, S14, S23), because every other teammate depends on them."
- **catalog:** "You are `catalog` … your tasks are `P1-CA*`. You own the tour and review cache tags (R5), so every write that changes tours or reviews must clear the right tags."
- **commerce:** "You are `commerce` … your tasks are `P1-CO*`. Use the Stripe adapter only. Tests use the fake; never call the real Stripe API."
- **designer:** "You are `designer` … read §9 closely, it's your brief. Your tasks are `PD-*` and `P2-DS1`. Write the direction and mockups first. The lead takes them to the user at the design gate, and you don't build components until the user approves. Components are Server Components unless R1 says otherwise. Use real seed content, never lorem ipsum. Screenshot and critique your own work in both themes before marking a task done."
- **web:** "You are `web` … read §7 closely. Your tasks are `P1-WE*` and `P2-WE*`. Pages are Server Components that call services directly. Client Components are small, give a reason (R2) and receive only DTOs. Forms use Server Actions and work without JavaScript. Before the design gate, build routes, data loading and forms with plain unstyled markup. After it, build pages only from `ui/` components."
- **reviewer:** "You are `reviewer` … you write the access-matrix, regression, e2e, no-JavaScript, two-user cache, accessibility, screenshot and Lighthouse checks. Review each task as it's completed, and file findings as tasks for the owner. Don't edit source files."

---

## 12. Phases and tasks

Load every task below into the shared task list with its owner and dependencies.

Phase D (design) runs **at the same time** as Phase 1, because it doesn't need the backend. Web pages are styled only after the design gate and once the components they use exist.

### Phase 0: Foundation (the lead works alone; no teammates yet)

| Task | Work | Depends on |
|---|---|---|
| P0-1 | Check current stable Next.js, React and Node versions and the Next.js docs; write `docs/adr/0001-versions.md`. Run `create-next-app` (TypeScript, App Router, `src/` directory, ESLint, no Tailwind). Install every dependency from §2. Add `.gitignore`, `.env.example`, stylelint, Prettier and Vitest configs, and the npm scripts `dev`, `build`, `start`, `worker`, `typecheck`, `lint`, `format:check`, `test`, `test:e2e` and `seed`. | none |
| P0-2 | `src/server/config.ts` (Zod), `instrumentation.ts`, `logger.ts`, `errors.ts` (AppError and the codes from §4.2), `deps.ts`, `src/lib/format.ts` with tests for B19 and B20 | P0-1 |
| P0-3 | `db.ts` (connection cached on `globalThis`) and all four models exactly as in §1.3, with DTO mappers | P0-2 |
| P0-4 | `session.ts` (`getSession`, `getCurrentUser`, `requireUser`, `requireRole`), `redirects.ts` (`safeNext`), and `bookingsService.hasPaidBooking` | P0-3 |
| P0-5 | `withApi`, `action()`, `ActionState`, `parseQuery`, response helpers; `/healthz` | P0-4 |
| P0-6 | Fake adapters (mailer, storage, Stripe, rate limiter), `test/setup.ts` (including the `next/headers` mock), factories, `callRoute`, `mockSession`; one example test each for a Route Handler, a Server Action and a page data function | P0-5 |
| P0-7 | The map-tile decision (D14) as an ADR. `docs/contracts.md` (§4 with exact TypeScript signatures), empty module folders, a placeholder page for every route in §1.5, `docs/bundle-baseline.json` from a first `next build` (R9), the `docs/openapi` skeleton, and a CI workflow running typecheck, lint, tests and build | P0-6 |

**Phase 0 gate:**
- `npm run typecheck && npm run lint && npm test && npm run build` pass.
- `docs/contracts.md` is complete.
- The lead now creates the team.

### Phase D: Design (in parallel with Phase 1)

| Task | Owner | Work | IDs | Depends on |
|---|---|---|---|---|
| PD-1 | designer | `docs/design/direction.md` and `docs/design/copy.md`, following §9.7 steps 1 and 2 | U20 | P0 |
| PD-2 | designer | Static mockups of the overview and tour page (mobile and desktop), with screenshots in `docs/design/screens/` | | PD-1 |
| **Design gate** | lead | Show the user the direction and screenshots, and wait for approval. Record any changes they ask for as an ADR. | | PD-2 |
| PD-3 | designer | Tokens, reset and base CSS, `fonts.ts`, light and dark themes | U1, U2, U3, U6 | Design gate |
| PD-4 | designer | `ui/` components and the `/styleguide` page. Deliver in this order so `web` can start early: header, footer and skip link; form parts; tour row; facts strip; booking panel; itinerary and map frame; reviews; the rest. | U4, U5, U25 | PD-3 |
| PD-5 | designer | React Email templates `Welcome`, `PasswordReset` and `BookingConfirmed` | U8 | PD-3, P1-PL2 |

### Phase 1: Core features (in parallel)

| Task | Owner | Work | IDs | Depends on |
|---|---|---|---|---|
| P1-PL1 | platform | `proxy.ts` (request ID, CSP nonce, early login redirects), security headers in `next.config.ts`, the Redis rate limiter, and the origin check in `withApi` | S9, S10, S11, S15, S23, D7 | P0 |
| P1-PL2 | platform | Queue adapter, `src/worker/index.ts`, SMTP mailer with retries, rendering React Email templates | D3, S12 | P0 |
| P1-PL3 | platform | Storage adapters (local, S3), `images.normalize`, upload limits, `images.remotePatterns` | S16, D2, U7 | P0 |
| P1-PL4 | platform | `/readyz`, database timeouts, graceful shutdown for the web server and worker | D5, D6, B10 | P0 |
| P1-PL5 | platform | Standalone Dockerfile, worker bundle, `docker-compose.yml`; `check-client-boundaries.ts` and `check-bundle.ts` | D8, D9, R2, R9 | P1-PL2 |
| P1-ID1 | identity | Signup, login and logout (services, Route Handlers and actions), cookie settings; harden `getCurrentUser` and `requireUser` | S3, S6, S8, S9, S14, S20, S23 | P0 |
| P1-ID2 | identity | Forgot password, reset password, change password (API and actions) | S13, S22, B14 | P1-ID1, P1-PL2 |
| P1-ID3 | identity | `/api/v1/users/me` plus `updateMeAction` (including photo) and `deactivateMeAction` | S4, S6, B15, B16 | P1-ID1, P1-PL3 |
| P1-ID4 | identity | Admin user endpoints | S4 | P1-ID1 |
| P1-CA1 | catalog | Query builder (filter allowlist, `month`, sort, fields, pagination), shared by the API and the overview page | S7, B1, B11 | P0 |
| P1-CA2 | catalog | Tour service with cache tags, tour CRUD and `PUT /tours/[id]/images` | S4, B4, B5, B12, B16, R5 | P1-CA1, P1-PL3 |
| P1-CA3 | catalog | `top-5-cheap` alias, stats, monthly plan, geo endpoints | B2, B3 | P1-CA1 |
| P1-CA4 | catalog | Reviews: service with cache tags, API, the three review actions, `canReview`, rating recalculation | S4, S5, B6, R5 | P1-CA2 |
| P1-CA5 | catalog | `scripts/seed.ts` as described in D10 and `seed/README.md`: loads users, tours (with photo credits), bookings and reviews, uploads photos, shifts dates when needed | D10, B19 | P1-CA2 |
| P1-CO1 | commerce | Checkout service in INR, `POST /api/v1/bookings/checkout-session` and `startCheckoutAction` (redirects to Stripe) | S9, S17, B8, B20 | P0 |
| P1-CO2 | commerce | Stripe webhook Route Handler: signature check, idempotency, booking-confirmed email | S17, B7 | P1-CO1, P1-PL2 |
| P1-CO3 | commerce | `listMine`, `GET /api/v1/bookings/mine` and admin booking CRUD | S1, S5, B12 | P0 |
| P1-WE1 | web | App shell: route groups, root layout with header and footer, `MobileMenu`, `not-found.tsx`, `error.tsx`, `global-error.tsx`, `loading.tsx` files, `generateMetadata`, `sitemap.ts`, `robots.ts`; unstyled versions of every page in §1.5 | R1, R4, R10, S19, U9, U18, U19 | P0 |
| P1-WE2 | web | Overview: server-rendered GET filter form, sorting, pagination, empty state | R3, R11, U10 | P1-WE1, P1-CA1, PD-4 |
| P1-WE3 | web | Tour page: server-rendered sections with `<Suspense>`, `RouteMap` (lazy, browser only, tiles per D14), booking form, review list, `ReviewForm`, photo credits; the `/credits` page | R3, R4, R6, R8, U11, U14, U27, D14 | P1-WE1, P1-CA4, P1-CO1, PD-4 |
| P1-WE4 | web | Login, signup, forgot-password and reset-password pages using the auth actions | R7, U16 | P1-WE1, P1-ID2, PD-4 |
| P1-WE5 | web | Account page, `/me/deactivate`, My tours, `BookingConfirmationPoller` | R7, U12, U13, U15 | P1-WE1, P1-ID3, P1-CO3, PD-4 |
| P1-RV1 | reviewer | Access-matrix test for every Route Handler and Server Action, plus the S23 test that sends the `x-middleware-subrequest` header | S1, S23 | P0 |
| P1-RV2 | reviewer | `test/regression/v1.test.ts`: one test per S and B ID. Tests may fail until the matching feature lands. | all S, B | P0 |
| P1-RV3 | reviewer | axe tests for every page in both themes; the no-JavaScript Playwright project (R11) | U22, R11 | P1-WE1 |
| P1-RV4 | reviewer | Review each completed task and file findings | | ongoing |

**Phase 1 gate:**
- Typecheck, lint, all tests, the build, the client-boundary check and the bundle budget pass.
- The access matrix, every regression test, the axe tests and the no-JavaScript tests pass.
- Coverage meets the Q6 thresholds.
- The reviewer has no open findings.

### Phase 2: Integration, polish and hardening

| Task | Owner | Work | Depends on |
|---|---|---|---|
| P2-WE1 | web | Finish every page: pending, error and empty states, toasts, the `fieldErrors` display | Phase 1 |
| P2-DS1 | designer | Design QA: screenshot every page at 375 and 1280px in both themes, compare with `direction.md` and §9.3, and file fixes for `web` | P2-WE1 |
| P2-RV1 | reviewer | Playwright smoke test against `docker compose`: sign up, log in, filter tours, open a tour, choose a date, check out with the fake Stripe client, simulate the webhook, see the booking in My tours, leave a review. Also the two-user cache test (R5). | P1-PL5, P2-WE1 |
| P2-RV2 | reviewer | Screenshot baselines (U26), the Lighthouse CI config and budgets (U24), and the keyboard walkthrough (U22) | P2-DS1 |
| P2-ALL1 | each owner | OpenAPI path fragments for their own module; the lead assembles them and adds `redocly lint` to CI | Phase 1 |
| P2-RV3 | reviewer | Full security sweep against §5, `npm audit`, knip, `react/no-danger`, the `NEXT_PUBLIC_` check, and checking that error responses never leak stack traces | Phase 1 |
| P2-PL1 | platform | Complete the CI pipeline as described in D11 | P2-RV2 |

**Phase 2 gate:**
- CI passes in full.
- The reviewer signs off on the security sweep and the accessibility walkthrough.
- The designer signs off on design QA.
- The lead runs `docker compose up`, checks the main user flows by hand, and **sends you the final screenshot set** (every page at 375 and 1280px, light and dark).

### Phase 3: Deployment

| Task | Owner | Work |
|---|---|---|
| P3-PL1 | platform | `render.yaml` (web, worker, Redis), production config checklist, Stripe webhook setup, S3 or R2 bucket policy |
| P3-PL2 | platform | README sections on deploying, rotating secrets, rolling back and running the seed in staging |
| P3-RV1 | reviewer | Smoke test and Lighthouse run against the staging URL, using Stripe test mode |
| P3-LD1 | lead | Final acceptance against §13, then the summary for the user |

---

## 13. Final acceptance checklist

**Backend**
- [ ] Every Route Handler in §1.4 and every Server Action in §1.6 exists and matches the access-matrix test.
- [ ] Every ID from S1 to S23 and B1 to B20 has a passing, tagged regression test.
- [ ] Coverage thresholds from Q6 are met.
- [ ] Typecheck, lint, format check, audit, knip, the client-boundary check, the `NEXT_PUBLIC_` check and the OpenAPI lint pass in CI.
- [ ] `docker compose up` starts the web server, worker, Mongo, Redis and Mailpit; `/readyz` returns 200.
- [ ] Signup sends a welcome email to Mailpit. Password reset works from the email link.
- [ ] A test-mode Stripe checkout creates exactly one booking, with its start date, even when the webhook is delivered twice.
- [ ] Uploaded images survive a container restart because they're in object storage.
- [ ] `git ls-files` shows no secrets and no build output.

**Rendering**
- [ ] Every `'use client'` file has a valid reason (R1, R2), and the boundaries are as low in the tree as possible.
- [ ] No page fetches our own `/api` (R3).
- [ ] The two-user test shows no personal data leaking through the cache (R5).
- [ ] The no-JavaScript Playwright project passes for everything listed in R11.
- [ ] The bundle budget (R9) passes, and Leaflet loads only on tour pages.
- [ ] Every page has metadata, and the sitemap lists every tour (R10).

**Design and UI**
- [ ] You approved the design direction at the design gate, and any changes you asked for are recorded as ADRs.
- [ ] No raw colours or pixel values exist outside `tokens.css`.
- [ ] `/styleguide` shows every component in U4 in every state, in both themes. It returns 404 in production.
- [ ] Every page passes axe with no serious or critical issues in both themes, and the keyboard walkthrough is written up.
- [ ] Lighthouse budgets (U24) pass on the overview and a tour page.
- [ ] Screenshot baselines exist for the pages in U26 and match the approved direction.
- [ ] Emails render in the new design in Mailpit.
- [ ] Prices show as ₹ with Indian grouping and dates in IST on every page and email; the B19 time-zone test passes.
- [ ] Every tour photo has a visible credit on its tour page and on `/credits` (U27).
- [ ] No placeholder text, names or images appear anywhere (§9.1).

**Process**
- [ ] Every deviation from this plan has an ADR in `docs/adr/`.

---

## 14. Kickoff prompt for the lead

Paste this into Claude Code, with agent teams enabled, in the repository that contains this file:

```text
Read plan.md and seed/README.md in full. You are the team lead for the Natours v2 rebuild: a full-stack
Next.js app for tours across India, with a full redesign, rendered on the server wherever possible.

1. Do Phase 0 (P0-1 … P0-7) yourself. Start by checking the current stable Next.js, React and Node
   versions and the Next.js docs, and record them in docs/adr/0001-versions.md. Do not create
   teammates until the Phase 0 gate in §12 passes.
2. Then create an agent team with seven teammates: platform, identity, catalog, commerce, designer,
   web, reviewer. Give each one its brief from §11.3 and its ownership row from §11.1.
3. Put every Phase D and Phase 1–3 task from §12 into the shared task list with its owner and
   dependencies. Phase D runs in parallel with Phase 1.
4. Require each teammate to send you a short plan before changing files, including what runs on the
   server and what runs in the browser. Approve or correct it against plan.md, especially §7.
5. Design gate: when PD-2 is done, show me docs/design/direction.md and the screenshots in
   docs/design/screens/, and wait for my approval or changes. Don't let the designer start PD-3
   until I approve.
6. Enforce the ownership map and workflow rules in §11. Answer contract questions yourself, update
   docs/contracts.md, and record the decision as an ADR in docs/adr/.
7. At each phase gate, run the gate checks yourself. Do not start the next phase until they pass.
   At the Phase 2 gate, send me the final screenshot set.
8. When Phase 3 is done, give me a summary: what was built, which requirement IDs are covered by
   tests, every ADR (deviation from the plan), open issues, and what you'd improve about this plan
   for the next agent-team run.
```
