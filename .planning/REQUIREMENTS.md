# Requirements: Natours v2

**Defined:** 8 Nov 2026
**Core Value:** A traveller planning on their phone can choose a tour that fits their fitness, dates and budget, then book a start date with confidence.

**Source:** `plan.md` §5–§10. IDs and meaning are unchanged; each line here is a one-line summary, and `plan.md` holds the full text. Lines marked *(amended)* follow a decision in PROJECT.md → Key Decisions, and each one is recorded as an ADR in the first phase. `F` IDs are new names for capabilities that `plan.md` §1.2 and §1.4 describe but give no requirement ID (DEL-20). They add no scope.

**Cross-cutting rules** (such as Q1 or R1) map to the phase that sets them up and first enforces them, and from then on they apply to every later phase.

## v1 Requirements

### Features without a plan ID (F)

- [ ] **F1**: Anyone can see tour statistics (`GET /api/v1/tours/stats`)
- [ ] **F2**: Guides, lead guides and admins can see a year's monthly plan (`GET /api/v1/tours/monthly-plan/[year]`)
- [ ] **F3**: A visitor can sign up, log in and log out, through the site's forms and through `/api/v1/auth` (§1.4, §1.6)
- [ ] **F4**: A logged-in user can change their password from `/me` or `PATCH /api/v1/auth/password`, and gets a new session cookie
- [ ] **F5**: Admins can list, view, update and deactivate users through `/api/v1/users`
- [ ] **F6**: Admins and lead guides can create, update and delete tours and replace their images through `/api/v1/tours`. Deleting a tour that has bookings returns 409; otherwise its reviews are deleted too.
- [ ] **F7**: Admins can list all reviews. Admins and lead guides can list and view bookings, and admins can create, update and delete bookings by hand (§1.4).

### Security (S)

- [ ] **S1**: Every Route Handler, Server Action and protected page declares its access level, and anything undeclared is denied. An access-matrix test checks every API route and action as an anonymous visitor, `user`, `guide` and `admin`.
- [ ] **S2**: There are no debug endpoints. `/healthz` returns only `{ status: 'ok' }`, and `/styleguide` is a 404 in production.
- [ ] **S3**: Sensitive fields never leave the server. API responses and Client Component props go through DTO mappers, and queue jobs carry only `{ to, firstName, url }`.
- [ ] **S4**: No mass assignment. Strict input schemas list exactly the allowed fields, and admin user updates allow only `name`, `email`, `role` and `active`.
- [ ] **S5**: Ownership is enforced:
  - Only a review's author edits it; the author or an admin deletes it.
  - Bookings are readable only by their owner and admins.
  - The acting user's ID always comes from the session.
- [ ] **S6**: *(amended)* Deactivated users are left out of queries and can't log in, and their existing sessions stop working on their next request to a page, action or the API. `requireUser`, `requireRole`, `withApi` and `action()` always go through `getCurrentUser()`, which reads the user and their role from the database.
- [ ] **S7**: No injection. All input is Zod-validated, login fields must be strings, and tour filters are built from an allowlist of fields and operators.
- [ ] **S8**: The password field is selected only in the login and change-password services, and never appears in `getCurrentUser()` or in any props.
- [ ] **S9**: Cookies and origin checks:
  - The session cookie is httpOnly, secure in production, `sameSite: 'lax'` and `path: '/'`, and logout deletes it with the same options.
  - Nothing changes state on a GET.
  - `withApi` checks the origin on POST, PUT, PATCH and DELETE, except for the Stripe webhook.
- [ ] **S10**: The API is same-origin. CORS headers are sent only for origins listed in `CORS_ORIGINS`.
- [ ] **S11**: The CSP uses a per-request nonce set in `proxy.ts`, with `'strict-dynamic'`. Production has no `'unsafe-inline'` for scripts, and only exact hosts are allowed (Stripe, map tiles, storage).
- [ ] **S12**: *(amended)* TLS certificate checks stay on for MongoDB Atlas and SMTP. Redis runs without TLS, and only on the instance's private Docker network.
- [ ] **S13**: Password reset:
  - Forgot-password gives the same response whether or not the email exists.
  - Reset tokens are 32 random bytes, stored as a sha256 hash, valid for 10 minutes and usable once.
  - The emailed link opens `/reset-password/[token]`.
- [ ] **S14**: *(amended)* Session JWTs:
  - Verified with the algorithm pinned to HS256 and a secret of at least 32 characters.
  - Expire after 7 days, with the cookie's `maxAge` matching, and carry no role.
  - Rejected if issued before `passwordChangedAt`.
- [ ] **S15**: Rate limits are stored in Redis:
  - 300 requests per 15 minutes per IP on `/api/v1`.
  - 10 per 15 minutes per IP and email on signup, login, forgot, reset and change password, whether through the API or a Server Action.
- [ ] **S16**: Uploads:
  - At most 5 MB per file, with fixed file counts.
  - Only JPEG, PNG and WebP, checked with sharp, then re-encoded and stored under random keys.
  - Rejected uploads return 400, 413 or 415.
- [ ] **S17**: Payments:
  - The price comes from the database, and the currency is always `inr`.
  - A booking is created only from a verified webhook, which finds the user by `metadata.userId`.
  - Processing is idempotent by `stripeSessionId`, and the signature is checked against the raw body.
- [ ] **S18**: Secrets are never committed:
  - `.env.example` lists every key.
  - No secret goes in a `NEXT_PUBLIC_*` variable, and CI checks this.
  - CI runs `npm audit --audit-level=high`, and Dependabot is on.
- [ ] **S19**: Production errors never show stack traces. `error.tsx` shows a generic message and the digest, API errors use the §4.1 format, and unknown errors are logged with the request ID.
- [ ] **S20**: Passwords are 8–72 characters. Login runs a compare against a dummy hash when the user isn't found, so response time doesn't reveal which emails exist.
- [ ] **S21**: No `dangerouslySetInnerHTML` (`react/no-danger` is an error). User content renders as text.
- [ ] **S22**: Post-login redirects go through `safeNext()`, which accepts only same-site paths starting with a single `/`.
- [ ] **S23**: `proxy.ts` is never the only auth check. Every protected page, action and Route Handler calls `requireUser()` or `requireRole()` itself, and a test sending `x-middleware-subrequest` proves it.

### Correctness (B)

- [ ] **B1**: `sort` is a comma-separated string, checked against an allowlist and defaulting to `-createdAt`.
- [ ] **B2**: The `top-5-cheap` alias sets the validated query that the query builder reads.
- [ ] **B3**: Geo endpoints return documents. Coordinates are parsed as numbers and range-checked: latitude −90 to 90, longitude −180 to 180, distance above 0, unit `mi` or `km`.
- [ ] **B4**: Tour images are updated through their own endpoint, which accepts any subset of the files. A JSON `PATCH /tours/[id]` never touches images.
- [ ] **B5**: Schema rules match the domain: `duration` isn't unique and `slug` is. Dates come from timestamps, never `default: Date.now()`.
- [ ] **B6**: The review service recalculates ratings after create, update and delete:
  - The work is awaited and rounded to one decimal.
  - The cached tour and review data is cleared.
  - Deleting a tour's last review resets it to the defaults.
  - A missing review returns 404.
- [ ] **B7**: The webhook awaits all its work. It returns 2xx only once the booking is saved or already exists, and 500 on failure so Stripe retries.
- [ ] **B8**: Checkout:
  - Returns 404 for a missing tour, and 400 when `startDate` isn't one of the tour's future start dates.
  - Charges in INR paise.
  - Uses absolute image URLs from our own storage.
  - Sets `success_url` to `/my-tours?booking=success`.
- [ ] **B9**: Every error gets a response:
  - `withApi` maps CastError, duplicate keys (409), ValidationError, ZodError, JWT errors and Stripe signature errors.
  - Actions return expected errors as `ActionState`.
  - Pages use `notFound()` for missing data.
- [x] **B10**: The app never hangs without a database. Server selection times out after 5 seconds, requests then fail with 503, and `/readyz` reports it.
- [ ] **B11**: Pagination:
  - `page` is at least 1, and `limit` runs from 1 to 100 (default 20).
  - Responses include `meta.total`, and pages show a pagination control.
- [ ] **B12**: List queries populate nothing by default:
  - The tour page populates guides (name, photo, role).
  - Reviews load through their own paginated query.
  - Bookings populate only the fields they need.
- [ ] **B13**: Each behaviour lives in one service function, shared by the action and the Route Handler, and there are no dead routes.
- [ ] **B14**: `passwordChangedAt` is set in exactly one place, the model hook.
- [ ] **B15**: Account updates go only through the validated service, from both `updateMeAction` and `PATCH /api/v1/users/me`.
- [ ] **B16**: A duplicate email or tour name returns 409 `CONFLICT`, or the matching `ActionState` field error.
- [x] **B17**: Models and the Mongoose connection survive hot reload: models register as `mongoose.models.X ?? model(...)`, and the connection promise is cached on `globalThis`.
- [ ] **B18**: `redirect()` and `notFound()` are never swallowed by a `try/catch`; `action()` re-throws them.
- [ ] **B19**: Start dates are IST calendar days, stored as 00:00 IST, compared by IST day and always shown with `Asia/Kolkata`. A test with the server on UTC shows a 1 January departure as 1 January.
- [ ] **B20**: Money is whole rupees everywhere, and Stripe gets paise (`price * 100`). Prices are always shown through `formatPrice`: ₹ with Indian digit grouping and no decimals.

### Rendering (R)

- [x] **R1**: Server Components by default. A component is a Client Component only if it needs event handlers, state or effects, browser-only APIs, or updates after the page loads.
- [ ] **R2**: In every client file, the line after `'use client'` is `// client: <reason>`, and `check-client-boundaries.ts` fails CI without it. Client boundaries sit as low in the tree as possible.
- [ ] **R3**: Pages call services directly and never fetch our own `/api`. Independent data loads run in parallel, and repeated lookups are deduplicated with `cache()`.
- [ ] **R4**: Slower sections stream inside `<Suspense>`, with skeletons the same size as the content (CLS under 0.1). Route segments have `loading.tsx`.
- [ ] **R5**: *(amended)* Public data is cached with `unstable_cache` tags (`tours`, `tour:<id>`, `reviews:<tourId>`), and `cacheComponents` stays off. Services clear the tags when the data changes. Personal data is never cached, and a two-user Playwright test proves it.
- [ ] **R6**: Props passed to Client Components are DTOs or plain values. Every file under `src/server/` imports `server-only`.
- [ ] **R7**: Site forms are `<form action={serverAction}>` and work without JavaScript. With JavaScript, `useActionState` and `useFormStatus` add field errors and a pending state.
- [ ] **R8**: The route map loads through `next/dynamic` with `ssr: false`, called from a Client Component. Its fallback is the itinerary list at the same size, and Leaflet loads only on tour pages.
- [ ] **R9**: *(amended)* No page adds more than 40 KB gzipped of JavaScript over its Phase 0 baseline. Lighthouse CI measures this with `resource-summary:script:size` budgets on every page, and the tour page has its own budget that includes the lazily loaded map.
- [ ] **R10**: Metadata and search:
  - Every page has `generateMetadata` (title, description, canonical URL), and tour pages use the cover photo for Open Graph.
  - `sitemap.ts` lists every tour.
  - `robots.ts` excludes `/me`, `/my-tours` and `/styleguide`.
- [ ] **R11**: These work without JavaScript, covered by a no-JavaScript Playwright project: the overview, the tour page, the auth flows, booking, writing a review, account updates and deactivation.

### Deployment and architecture (D)

- [ ] **D1**: The web server runs as a Next.js standalone Docker container. The email worker is a separate long-running process from the same image.
- [ ] **D2**: Uploads go to object storage through the storage adapter, and the container's filesystem is treated as read-only. `next/image` loads stored images through `remotePatterns`.
- [ ] **D3**: Email goes through a queue:
  - The web app enqueues, and the worker renders and sends with 3 retries and backoff.
  - A failed email never fails the user's request. The exception is forgot-password when Redis is down.
  - The queue connects on first use.
- [ ] **D4**: Config is validated with Zod in `instrumentation.ts` at startup, and the app refuses to start if it's invalid. CI checks that every key is in `.env.example`.
- [ ] **D5**: Graceful shutdown on SIGTERM. The worker finishes its current job. The web server lets in-flight requests finish (up to 10 seconds), then closes Mongo and Redis.
- [ ] **D6**: `/healthz` is the liveness check and `/readyz` checks Mongo and Redis. The Docker `HEALTHCHECK` uses `/healthz`.
- [ ] **D7**: Logs are structured JSON (pino) in production and pretty-printed in development. Every log line and error response carries the request ID.
- [ ] **D8**: A multi-stage Dockerfile on `node:24-slim` runs as a non-root user, with standalone output and the worker bundled by esbuild. `docker-compose.yml` runs `mongo`, `redis`, `mailpit`, `web` and `worker`.
- [x] **D9**: Build output (`.next`, `dist`, `coverage`, Playwright reports) is gitignored.
- [ ] **D10**: *(amended)* `npm run seed`:
  - Loads `seed/` idempotently, has a `--reset` flag and refuses to run in production.
  - Sets every password from `SEED_USER_PASSWORD` and uploads the photos.
  - Rolls forward only the tour start dates that have passed. Past bookings and reviews never move.
  - Shifts the date strings, moves a Golden Triangle departure one day earlier if day 4 lands on a Friday, takes `--today=YYYY-MM-DD`, and checks the `seed/README.md` rules afterwards.
- [ ] **D11**: CI runs on every push and pull request:
  - Install, typecheck, lint, format check, and the client-boundary and `NEXT_PUBLIC_` checks.
  - Tests with coverage, the build and the bundle budget.
  - `npm audit` and knip.
  - Playwright (e2e, no-JavaScript, accessibility and screenshots), Lighthouse CI and a Docker build.
- [ ] **D12**: *(amended)* The demo deploys to one AWS EC2 instance in Mumbai, running `docker compose` with web, worker, Redis, and Caddy for HTTPS on a DuckDNS subdomain.
  - It uses MongoDB Atlas M0, S3 for images, SES for email, and the Stripe test-mode webhook at `/webhooks/stripe`.
  - The README covers deploying, rotating secrets and rolling back.
- [ ] **D13**: The API is versioned under `/api/v1`. `docs/openapi/openapi.yaml` matches the Route Handlers, and CI checks it with `redocly lint`.
- [ ] **D14**: The map-tile provider is chosen for how it shows India's boundaries, with its terms and pricing checked, and the choice is recorded in an ADR. The CSP's map hosts follow it.

### Design, UI and UX (U)

- [ ] **U1**: `tokens.css` defines colour, type, spacing, radius, elevation and motion tokens. There are no raw hex or pixel values anywhere else, and stylelint enforces this.
- [ ] **U2**: Light and dark themes follow `prefers-color-scheme` by swapping token values only, and both meet U22's contrast rules.
- [ ] **U3**: Global CSS uses the cascade layers `reset, tokens, base, components, utilities`. Component CSS Modules write inside `@layer components`, with single-class selectors, no IDs and no `!important`.
- [ ] **U4**: The `ui/` component set from §9.4 exists with typed props, as Server Components unless R1 requires otherwise.
- [ ] **U5**: `/styleguide` (development and test only) shows every component in every state, in both themes, at mobile and desktop widths.
- [ ] **U6**: Fonts load through `next/font` with only the weights and subsets used, exposed as CSS variables.
- [ ] **U7**: Every image uses `next/image` with a correct `sizes` value, and `priority` only on the first visible photo. Photos are never stretched or cut into shapes.
- [ ] **U8**: Emails are React Email components in the site's palette and type, with a system-font fallback and a plain-text version, checked in Mailpit.
- [ ] **U9**: Every page has one `<h1>`, a logical heading order, landmarks and a skip link.
- [ ] **U10**: The overview:
  - Filters by difficulty, length, start month and maximum price, through a GET form.
  - Sorts by price, rating and length.
  - Shows the result count, an empty state with "Clear filters", and pagination above 12 tours.
- [ ] **U11**: The tour page shows the route map with the itinerary, the facts strip, description, guides, paginated reviews and the booking panel. The booking panel:
  - Lists only future start dates.
  - Shows "Log in to book" to logged-out users, then returns them to the tour.
  - Says so when the user has already booked.
- [ ] **U12**: The booking flow:
  - Choose a date, pay at Stripe Checkout, and return to My tours with a confirmation banner.
  - The poller shows "Confirming your booking" for up to 30 seconds.
  - Cancelling at Stripe returns to the tour with the chosen date still selected.
- [ ] **U13**: My tours:
  - Groups bookings into upcoming and past, each with its start date, the price paid and a link to the tour.
  - Past trips offer "Write a review" if the user hasn't reviewed that tour.
  - The empty state links to the tours.
- [ ] **U14**: The review form appears only when `canReview` is true, and the star input works by keyboard and announces its value. Authors edit and delete in place, with a confirmation before deleting.
- [ ] **U15**: The account page has separate sections for details, photo (with a preview), password and deactivation. Deactivating asks for confirmation and says what will happen.
- [ ] **U16**: Auth forms show errors next to their fields, a show-password toggle and correct `autocomplete` values. After logging in, the user goes to the safe `next` path.
- [ ] **U17**: Every submit button shows a pending state and is disabled until the action finishes. Alerts and toasts use a live region.
- [ ] **U18**: `not-found.tsx` and `error.tsx` are in the new design, with a way back to the tours and no stack traces.
- [ ] **U19**: The header has Tours, My tours, and either an account menu or "Log in" and "Sign up". On mobile it's a menu button with `aria-expanded`; without JavaScript, a plain list of links.
- [ ] **U20**: `docs/design/copy.md` holds the glossary, the button and message wording, and the Indian English rules. Pages use exactly that wording.
- [ ] **U21**: Works without JavaScript, as R11 defines.
- [ ] **U22**: WCAG 2.2 AA:
  - Contrast of 4.5:1 for text (3:1 for large text), and 3:1 for interface parts and focus indicators.
  - A visible focus indicator on every interactive element, and touch targets of at least 44×44 px.
  - Form errors linked to their fields, and a map that doesn't trap keyboard focus.
  - Tested with axe in both themes, plus a written keyboard walkthrough of booking.
- [ ] **U23**: Responsive from 320 to 1920 px with no horizontal scrolling, checked at 375, 768, 1280 and 1920 px.
- [ ] **U24**: Lighthouse CI (mobile) on the overview and a tour page: Performance at least 90, Accessibility 100, Best Practices at least 95 and SEO at least 95. LCP under 2.5 seconds and CLS under 0.1.
- [ ] **U25**: One motion plays by itself: the route line, drawing in at most 1.2 seconds. Every other motion responds to the user, lasts at most 200 ms and never runs on scroll, and everything respects `prefers-reduced-motion`.
- [ ] **U26**: Playwright screenshots of the styleguide, overview, tour page, My tours and account page, at 375 and 1280 px in both themes, with baselines generated in the CI container.
- [ ] **U27**: Every tour page credits each photo's author and licence, with links. `/credits` lists every photo, and a test checks that every tour photo has a credit.

### Code quality (Q)

- [x] **Q1**: TypeScript `strict` with `noUncheckedIndexedAccess`, no `any` without a comment explaining why, and `tsc --noEmit` passing in CI.
- [ ] **Q2**: ESLint flat config with zero warnings:
  - `eslint-config-next`, `typescript-eslint` and `eslint-plugin-security`.
  - `no-console`, `react/no-danger` and restricted imports.
  - Plus stylelint and Prettier.
- [ ] **Q3**: Naming:
  - Files are kebab-case, components PascalCase, and hooks start with `use`.
  - Server Actions end in `Action`, and error codes are UPPER_SNAKE.
  - CSS Module classes are camelCase.
- [ ] **Q4**: The module boundaries from §3.2 and UI boundaries from §4.6 hold.
- [ ] **Q5**: No commented-out code, no `TODO` without an issue link, and no leftover debugging logs.
- [ ] **Q6**: *(amended)* Testing and coverage:
  - Every Route Handler and action has happy-path, validation and authorisation tests.
  - Every S and B ID has a tagged regression test, written with its feature.
  - Coverage is at least 85% of service lines and 75% of `src/server/**`.
- [x] **Q7**: Tests are deterministic. No network calls, with fakes for Stripe, SMTP, storage, Redis and map tiles; an in-memory database per test file; and fake timers for expiry.
- [ ] **Q8**: *(amended)* Commits follow Conventional Commits and cite the requirement IDs they cover and the GSD plan, one plan task per commit where possible.
- [ ] **Q9**: Exported service functions have TSDoc covering their parameters, return value and error codes.
- [ ] **Q10**: Documentation: a README (setup, scripts, architecture, deployment), `docs/contracts.md`, `docs/design/`, and an ADR for every deviation from `plan.md`.
- [x] **Q11**: No unused dependencies or exports (knip), and the lockfile is committed. New dependencies need a one-line reason in the commit message.

## v2 Requirements

None. Everything in `plan.md` is v1. The §1.2 stretch features are out of scope (see below).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Email verification, seat limits per start date, refresh tokens, admin dashboard UI (`plan.md` §1.2 stretch) | The plan defers them until after the Phase 2 gate, and a learning demo doesn't need them |
| Live Stripe payments | This is a demo only, so Stripe stays in test mode |
| Email to the public | SES stays in its sandbox, sending only to verified demo addresses |
| Hosting after the AWS Free plan ends | The demo is shut down then, with no paid upgrade |
| Custom domain | A free DuckDNS subdomain is enough for the demo |
| Render and `render.yaml` | Replaced by AWS (D12, amended) |
| Agent-team execution, the §11.1 file ownership and the §12 task IDs | Replaced by GSD phases |
| Hindi UI | The fonts keep it possible later (U6), but it isn't built now |
| Anything reused from v1 | `plan.md` §0 |

## Known Issues from the Plan Review

The review (`docs/plan-review/`, Round 1) logged 127 findings: 8 Blockers, 80 Majors and 39 Minors. When planning a phase, read the findings listed against its requirements. `(m)` marks a Minor; everything else listed is a Major.

**Resolved by Key Decisions:** ARC-01, ARC-05, DEL-02, DEL-03, DEL-04, QA-01 and SEC-02 (Blockers); ARC-16, ARC-19, DES-01, QA-22 and SEC-13 (Majors).

**No longer apply under GSD** (they concern the agent-team process): DEL-01 (Blocker), DEL-05 to DEL-11, DEL-13, DEL-14, DEL-19, DEL-21 (m) and DEL-25 (m).

**General, with no single requirement:**
- ARC-22 (m): version pins are stale. Settle in ADR 0001.
- ARC-23 (m): APIs have changed in several §2 libraries.
- ARC-24 (m): §3.3 is missing files that the plan uses.
- DEL-20: some requirements have no task, test or acceptance check. The F IDs and this file's traceability address most of this.
- DEL-23 (m): CLAUDE.md and plan.md word some rules in conflicting ways.
- DEL-24 (m): `create-next-app` refuses to run in this repository.
- QA-25: several §13 items can't be checked by a test or command.

**Open findings by requirement:**

| Requirement | Findings |
|-------------|----------|
| F6 | ARC-06, DEL-27 (m), SEC-24 (m) |
| S1 | SEC-01, SEC-08, SEC-15, SEC-22 (m) |
| S2 | ARC-10, DEL-16, DES-10, QA-21, SEC-16 |
| S3 | SEC-09, SEC-10, SEC-11 |
| S4 | DES-07, QA-04, QA-06, SEC-07, SEC-19 |
| S5 | QA-07, SEC-07, SEC-08, SEC-15 |
| S6 | DEL-18, QA-15 (m), SEC-04, SEC-15 |
| S9 | QA-17, SEC-12 |
| S10 | SEC-26 (m) |
| S11 | ARC-18, ARC-20 (m), DES-08, DES-11, SEC-14 |
| S13 | SEC-04, SEC-12, SEC-21 (m), SEC-25 (m) |
| S14 | QA-17, SEC-18 |
| S15 | ARC-17, SEC-05 |
| S16 | ARC-14, ARC-18, DES-07, SEC-05, SEC-17 |
| S17 | QA-05, QA-17, QA-18, SEC-06, SEC-23 (m) |
| S18 | DES-08 |
| S19 | SEC-11 |
| S20 | SEC-04, SEC-20 (m) |
| S22 | SEC-03, SEC-12 |
| S23 | ARC-18, ARC-25 (m), QA-17, SEC-01 |
| B1 | DES-03, QA-11, QA-17 |
| B3 | QA-17, QA-18 |
| B4 | DES-07, QA-03, QA-17 |
| B5 | QA-04 |
| B6 | ARC-02, ARC-03, ARC-08, QA-08, QA-09 (m), QA-12, QA-16 |
| B7 | QA-17, SEC-06 |
| B8 | QA-03, QA-05, QA-20, SEC-12 |
| B9 | DES-12, SEC-11 |
| B10 | ARC-17, QA-19 |
| B11 | DES-03, QA-11, QA-17 |
| B12 | ARC-08 |
| B13 | ARC-02 |
| B14 | SEC-18 |
| B15 | QA-17 |
| B16 | DES-12, QA-04, QA-17, QA-18, SEC-04 |
| B17 | QA-19 |
| B19 | DES-14 (m), QA-10, QA-14 (m), QA-20, QA-24 (m) |
| B20 | DES-13 (m), QA-05 |
| R5 | ARC-02, ARC-03, ARC-21 (m), DEL-18, QA-12, QA-21 |
| R6 | ARC-04, SEC-10, SEC-11 |
| R7 | ARC-02, ARC-09, QA-12 |
| R8 | DES-05, DES-11 |
| R10 | ARC-07, DES-02, DES-22 (m), SEC-12 |
| R11 | ARC-09, DES-04, DES-16 (m), QA-21, SEC-14 |
| D1 | ARC-04, ARC-13 |
| D2 | ARC-14, ARC-15, DEL-16 |
| D3 | ARC-04, ARC-13, ARC-17, SEC-04, SEC-09 |
| D4 | ARC-07, ARC-13, ARC-26 (m), QA-21, SEC-12 |
| D5 | ARC-11 (m) |
| D6 | ARC-12, QA-19 |
| D7 | ARC-18, SEC-11, SEC-17 |
| D8 | ARC-04, ARC-07, ARC-12, ARC-13, ARC-14, DEL-16 |
| D10 | ARC-03, ARC-04, ARC-10, ARC-15, QA-20, QA-21, SEC-16, SEC-27 (m) |
| D11 | ARC-07, DEL-15, DEL-17 |
| D12 | DEL-17 |
| D13 | DEL-22 (m) |
| D14 | DEL-17, DES-08 |
| U1 | DES-09, DES-19 (m), DES-20 (m) |
| U3 | DES-05 |
| U4 | DEL-12, DES-05, DES-15 (m) |
| U5 | ARC-10, DES-10 |
| U6 | DES-13 (m) |
| U7 | ARC-14, ARC-15, ARC-20 (m), DES-11 |
| U8 | ARC-13, DES-09, DES-19 (m), SEC-09 |
| U10 | DES-02, DES-03, DES-15 (m), DES-16 (m), DES-17 (m), QA-02, QA-08, QA-10, QA-11 |
| U11 | DES-02, DES-04, DES-16 (m), DES-17 (m), DES-18 (m), QA-02, QA-06, QA-07, QA-08, QA-13 (m) |
| U12 | ARC-09 |
| U13 | QA-06, QA-07, SEC-07 |
| U14 | ARC-02, DEL-12, QA-07, QA-12, SEC-07 |
| U15 | DEL-12, SEC-14 |
| U16 | DES-12 |
| U17 | ARC-09, DES-04, DES-12 |
| U19 | DEL-12 |
| U20 | DES-12, DES-14 (m) |
| U22 | DES-04, DES-05, DES-10, DES-18 (m), DES-20 (m), DES-21 (m) |
| U23 | DES-04 |
| U24 | ARC-20 (m), DEL-15, DES-08, DES-11, DES-13 (m), QA-21, SEC-14 |
| U26 | ARC-10, DEL-15, DES-03, DES-08, DES-10, QA-11, QA-20, QA-21, SEC-16 |
| U27 | ARC-15, DES-06, DES-07, QA-03 |
| Q2 | ARC-08, DEL-26 (m) |
| Q4 | ARC-08 |
| Q6 | ARC-03, ARC-04, QA-16, QA-17, QA-23 (m) |
| Q7 | ARC-03, DES-08, QA-16, QA-20 |

## Traceability

Which phases cover which requirements. See `.planning/ROADMAP.md` for the phase goals and success criteria. Cross-cutting rules map to the phase that first establishes and enforces them; feature requirements map to the phase that completes them.

| Requirement | Phase | Status |
|-------------|-------|--------|
| F1 | Phase 4 | Pending |
| F2 | Phase 4 | Pending |
| F3 | Phase 5 | Pending |
| F4 | Phase 5 | Pending |
| F5 | Phase 5 | Pending |
| F6 | Phase 4 | Pending |
| F7 | Phase 6 | Pending |
| S1 | Phase 1 | Pending |
| S2 | Phase 3 | Pending |
| S3 | Phase 1 | Pending |
| S4 | Phase 4 | Pending |
| S5 | Phase 6 | Pending |
| S6 | Phase 5 | Pending |
| S7 | Phase 4 | Pending |
| S8 | Phase 5 | Pending |
| S9 | Phase 1 | Pending |
| S10 | Phase 1 | Pending |
| S11 | Phase 1 | Pending |
| S12 | Phase 8 | Pending |
| S13 | Phase 5 | Pending |
| S14 | Phase 1 | Pending |
| S15 | Phase 5 | Pending |
| S16 | Phase 4 | Pending |
| S17 | Phase 6 | Pending |
| S18 | Phase 1 | Pending |
| S19 | Phase 3 | Pending |
| S20 | Phase 5 | Pending |
| S21 | Phase 1 | Pending |
| S22 | Phase 5 | Pending |
| S23 | Phase 5 | Pending |
| B1 | Phase 4 | Pending |
| B2 | Phase 4 | Pending |
| B3 | Phase 4 | Pending |
| B4 | Phase 4 | Pending |
| B5 | Phase 1 | Pending |
| B6 | Phase 6 | Pending |
| B7 | Phase 6 | Pending |
| B8 | Phase 6 | Pending |
| B9 | Phase 1 | Pending |
| B10 | Phase 1 | Complete |
| B11 | Phase 4 | Pending |
| B12 | Phase 4 | Pending |
| B13 | Phase 1 | Pending |
| B14 | Phase 1 | Pending |
| B15 | Phase 5 | Pending |
| B16 | Phase 5 | Pending |
| B17 | Phase 1 | Complete |
| B18 | Phase 1 | Pending |
| B19 | Phase 1 | Pending |
| B20 | Phase 1 | Pending |
| R1 | Phase 1 | Complete |
| R2 | Phase 1 | Pending |
| R3 | Phase 4 | Pending |
| R4 | Phase 4 | Pending |
| R5 | Phase 6 | Pending |
| R6 | Phase 1 | Pending |
| R7 | Phase 5 | Pending |
| R8 | Phase 4 | Pending |
| R9 | Phase 1 | Pending |
| R10 | Phase 4 | Pending |
| R11 | Phase 7 | Pending |
| D1 | Phase 5 | Pending |
| D2 | Phase 4 | Pending |
| D3 | Phase 5 | Pending |
| D4 | Phase 1 | Pending |
| D5 | Phase 5 | Pending |
| D6 | Phase 5 | Pending |
| D7 | Phase 1 | Pending |
| D8 | Phase 5 | Pending |
| D9 | Phase 1 | Complete |
| D10 | Phase 4 | Pending |
| D11 | Phase 7 | Pending |
| D12 | Phase 8 | Pending |
| D13 | Phase 7 | Pending |
| D14 | Phase 2 | Pending |
| U1 | Phase 3 | Pending |
| U2 | Phase 3 | Pending |
| U3 | Phase 3 | Pending |
| U4 | Phase 3 | Pending |
| U5 | Phase 3 | Pending |
| U6 | Phase 3 | Pending |
| U7 | Phase 4 | Pending |
| U8 | Phase 5 | Pending |
| U9 | Phase 3 | Pending |
| U10 | Phase 4 | Pending |
| U11 | Phase 4 | Pending |
| U12 | Phase 6 | Pending |
| U13 | Phase 6 | Pending |
| U14 | Phase 6 | Pending |
| U15 | Phase 5 | Pending |
| U16 | Phase 5 | Pending |
| U17 | Phase 5 | Pending |
| U18 | Phase 3 | Pending |
| U19 | Phase 3 | Pending |
| U20 | Phase 2 | Pending |
| U21 | Phase 7 | Pending |
| U22 | Phase 7 | Pending |
| U23 | Phase 7 | Pending |
| U24 | Phase 7 | Pending |
| U25 | Phase 3 | Pending |
| U26 | Phase 7 | Pending |
| U27 | Phase 4 | Pending |
| Q1 | Phase 1 | Complete |
| Q2 | Phase 1 | Pending |
| Q3 | Phase 1 | Pending |
| Q4 | Phase 1 | Pending |
| Q5 | Phase 1 | Pending |
| Q6 | Phase 1 | Pending |
| Q7 | Phase 1 | Complete |
| Q8 | Phase 1 | Pending |
| Q9 | Phase 1 | Pending |
| Q10 | Phase 1 | Pending |
| Q11 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 113 total (F 7, S 23, B 20, R 11, D 14, U 27, Q 11)
- Mapped to phases: 113
- Unmapped: 0

**By phase:** Phase 1: 35, Phase 2: 2, Phase 3: 12, Phase 4: 22, Phase 5: 22, Phase 6: 10, Phase 7: 8, Phase 8: 2.

---
*Requirements defined: 8 Nov 2026*
*Last updated: 8 Nov 2026 after roadmap creation*
