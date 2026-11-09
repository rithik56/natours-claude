# Roadmap: Natours v2

## Overview

Natours v2 is rebuilt in eight sequential phases, from an empty repository to a demo on AWS. Phase 1 lays the foundation: the scaffold, the data layer, sessions, the request pipeline, test fakes and a CI baseline. Phase 2 ends at the design gate, where the user approves the "Milestone" direction and the mockups before any styling starts. Phase 3 builds the approved design system and the app shell. Phases 4 to 6 are the vertical slices a traveller can click through locally: browse tours, accounts, then booking with reviews. Phase 7 proves the whole site against the security, accessibility, performance, no-JavaScript and visual standards. Phase 8 puts the demo on AWS, and nothing before it uses AWS.

Every v1 requirement (113 in all) maps to exactly one phase. Cross-cutting rules map to the phase that first establishes and enforces them, and they apply to every later phase. Requirements that belong to one feature map to the phase that completes them.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and contracts** - Scaffold, data layer, sessions, request pipeline, test kit, CI baseline and ADRs
- [ ] **Phase 2: Design direction and approval gate** - Direction, copy, map-tile decision and mockups from seed content, ending with the user's approval
- [ ] **Phase 3: Design system and app shell** - Tokens, themes, fonts, `ui/` components, `/styleguide`, header, footer and error pages
- [ ] **Phase 4: Browse tours** - Seed data, overview with filters, tour page with route map, photo credits and the catalogue API
- [ ] **Phase 5: Accounts** - Sign up, log in, password reset and change, account page, background email and the local container stack
- [ ] **Phase 6: Bookings, My tours and reviews** - Stripe Checkout in INR, webhook, My tours, reviews and admin bookings
- [ ] **Phase 7: Hardening and quality gates** - Full CI, security sweep, accessibility, Lighthouse, no-JavaScript and screenshot checks
- [ ] **Phase 8: Deployment to AWS** - One EC2 instance in Mumbai with Caddy, Atlas, S3, SES and Stripe test mode

## Phase Details

### Phase 1: Foundation and contracts
**Goal:** A developer can clone the repository, run the app and the test suite locally, and every later phase builds on a tested data layer, session and request pipeline, with CI guarding the quality rules from the first commit.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** S1, S3, S9, S10, S11, S14, S18, S21, B5, B9, B10, B13, B14, B17, B18, B19, B20, R1, R2, R6, R9, D4, D7, D9, Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11
**Success Criteria** (what must be TRUE):
  1. A developer can install, start the app against a local MongoDB and open it. The app refuses to start with a message naming any missing or invalid config key. With MongoDB stopped, requests fail with a 503 within about 5 seconds instead of hanging, `/readyz` reports not ready, and build output is not tracked in git. (D4, B10, D9)
  2. `formatPrice(124999)` shows `₹1,24,999`, `formatDate` always uses `Asia/Kolkata`, and a test run with the server on UTC still shows a 1 January departure as 1 January. The User, Tour, Review and Booking models survive hot reload, keep money in whole rupees, and set `passwordChangedAt` only in the model hook. DTO mappers return plain objects with string IDs and never include password, token or `active` fields. (B19, B20, B5, B14, B17, S3, R6)
  3. A session token that is expired, signed with another algorithm or issued before a password change is rejected, and `getCurrentUser()` re-reads the user and role from the database on every request. A call through `withApi` or `action()` is denied unless it declares an access level. Every mapped error type (bad ID, duplicate key, validation, JWT, Stripe signature) comes back in the standard JSON error format with the request ID, and cross-origin writes are refused. CORS headers go only to origins in `CORS_ORIGINS`. `redirect()` and `notFound()` pass through `action()` untouched. Production responses carry a per-request CSP nonce with `'strict-dynamic'` and no `'unsafe-inline'` for scripts, and logs are structured JSON carrying the same request ID. (S14, S1, S9, S10, S11, B9, B13, B18, D7)
  4. Every push and pull request runs the quality gates in GitHub Actions and they pass: strict typecheck with `noUncheckedIndexedAccess`, ESLint (including `react/no-danger`), stylelint and Prettier with zero warnings, the client-boundary check (a `'use client'` file without a `// client: <reason>` line fails), the `NEXT_PUBLIC_` secret check, `.env.example` completeness, `npm audit`, knip, tests with the coverage thresholds, and a build that records the per-route bundle baseline in `docs/bundle-baseline.json`. (Q1, Q2, Q3, Q4, Q5, Q6, Q11, S18, S21, R1, R2, R9)
  5. The repository holds what later phases rely on: `docs/contracts.md` with exact TypeScript signatures, an ADR for every Key Decision in PROJECT.md (ADR 0001 records the versions used), fakes for Stripe, mail, storage, queue and rate limiting, the test helpers (`createUser`, `callRoute`, `mockSession`) with one example test each for a Route Handler, a Server Action and a page data function, a README with setup and scripts, and the commit convention that cites requirement IDs. (Q7, Q8, Q9, Q10)
**Review findings:** ARC-02, ARC-03, ARC-04, ARC-07, ARC-08, ARC-13, ARC-17, ARC-18, ARC-20 (m), ARC-22 (m), ARC-23 (m), ARC-24 (m), ARC-26 (m), DEL-20, DEL-23 (m), DEL-24 (m), DEL-26 (m), DES-08, DES-11, DES-12, DES-13 (m), DES-14 (m), QA-04, QA-05, QA-10, QA-14 (m), QA-16, QA-17, QA-19, QA-20, QA-21, QA-23 (m), QA-24 (m), SEC-01, SEC-08, SEC-09, SEC-10, SEC-11, SEC-12, SEC-14, SEC-15, SEC-17, SEC-18, SEC-22 (m), SEC-26 (m)
**Plans:** 10/15 plans executed in 12 waves (walking skeleton: `01-foundation-and-contracts/SKELETON.md`)

Plans:
**Wave 1**
- [x] 01-01-PLAN.md — Walking skeleton: package gate, Next.js 16 scaffold, `/`, `/readyz` on MongoDB, Vitest with in-memory MongoDB

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — CLAUDE.md for GSD, plan review committed, README quick start, ADRs 0001–0008
- [x] 01-03-PLAN.md — ESLint, Prettier, stylelint, knip, client-boundary and conventions checks, CI workflow, Dependabot

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-04-PLAN.md — Config validated at startup (exits naming bad keys), check-env, smoke script in CI

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 01-05-PLAN.md — formatPrice, formatDate, IST day helpers, clock, messages, AppError, Zod error map, pino logger
- [x] 01-06-PLAN.md — proxy.ts request ID and nonce CSP, security headers, nonce proven on the built app

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 01-07-PLAN.md — Fail-fast DB connection, User model, user DTOs, findActiveById, createUser

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 01-08-PLAN.md — Tour, Review and Booking models, DTOs and seed-based factories
- [x] 01-09-PLAN.md — HS256 sessions, getCurrentUser with a DB read per request, requireUser/Role, safeNext, mockSession

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 01-10-PLAN.md — Adapters and fakes (mail, queue, storage, Stripe, rate limit, cache), deps.ts by APP_ENV

**Wave 8** *(blocked on Wave 7 completion)*
- [ ] 01-11-PLAN.md — withApi (default deny, origin, CORS, validation, error mapping), /healthz, /readyz, callRoute

**Wave 9** *(blocked on Wave 8 completion)*
- [ ] 01-12-PLAN.md — action() with ActionState, redirect pass-through, example tests

**Wave 10** *(blocked on Wave 9 completion)*
- [ ] 01-13-PLAN.md — R9 JavaScript floor with Lighthouse CI, enforced in CI

**Wave 11** *(blocked on Wave 10 completion)*
- [ ] 01-14-PLAN.md — docs/contracts.md, ADRs 0019–0024 and index, full README

**Wave 12** *(blocked on Wave 11 completion)*
- [ ] 01-15-PLAN.md — Phase gate: clean-clone check, all gates, push authorisation, green CI run

### Phase 2: Design direction and approval gate
**Goal:** The user has seen and approved how Natours will look, built from real seed content, before any token, component or page styling starts.
**Mode:** mvp
**Depends on:** Phase 1 (repository conventions and the ADR folder; no code dependency)
**Requirements:** D14, U20
**Success Criteria** (what must be TRUE):
  1. The user can read `docs/design/direction.md` and find the brief in the designer's own words, a named palette of four to six colours with measured contrast and derived dark-theme and status colours, the type choices and scale, ASCII wireframes of the overview, tour page, My tours and account page on mobile and desktop, the signature element, and a recorded self-review against the "defaults to avoid" list showing what changed and why. (Design gate process, plan.md §9.7; supports U20)
  2. The user can open static HTML and CSS mockups of the overview and a tour page on mobile and desktop, and the Playwright screenshots in `docs/design/screens/`. They use only real seed content: real tour names, photos with their credits, prices in ₹ with Indian grouping and dates in IST. No placeholder text, names or images appear anywhere. (Design gate process, plan.md §9.7)
  3. `docs/design/copy.md` holds the glossary (tour, start date, booking, guide, review), the button and message wording, and the Indian English and formatting rules, so later pages can use exactly that wording. (U20)
  4. An ADR compares map-tile providers on how they draw India's boundaries (the Ladakh tour runs close to them) against keeping every tour map zoomed in to its route, with each provider's terms and pricing checked, and names the chosen provider and the CSP hosts that follow from it. (D14)
  5. **Human checkpoint (design gate):** the user has reviewed `direction.md`, the mockups and the screenshots and approved them, or asked for changes that are recorded as an ADR and shown again. No token, component or page styling exists until the user approves. (Design gate, plan.md §9.7, PROJECT.md Constraints)
**Review findings:** DEL-17, DES-08, DES-12, DES-14 (m)
**Plans:** TBD
**UI hint**: yes

### Phase 3: Design system and app shell
**Goal:** Every page can be built from approved, accessible, themed components, and the site has its shell, error pages and a living styleguide.
**Mode:** mvp
**Depends on:** Phase 2 (approved design gate), Phase 1
**Requirements:** S2, S19, U1, U2, U3, U4, U5, U6, U9, U18, U19, U25
**Success Criteria** (what must be TRUE):
  1. In development, `/styleguide` shows every `ui/` component from the minimum set in every state (default, hover, focus, active, disabled, error, pending and empty), in light and dark themes, at mobile and desktop widths, using real seed content. In a production build it returns 404 and no debug endpoints exist. (U4, U5, U2, S2)
  2. Colour, type, spacing, radius, elevation and motion come only from `tokens.css`. stylelint fails on a raw hex or pixel value outside it, on IDs, on `!important`, and on component rules outside `@layer components`. The dark theme swaps token values only and follows `prefers-color-scheme`, and fonts load through `next/font` with only the weights and subsets in use. (U1, U2, U3, U6)
  3. Every page shares the shell: a skip link, header, footer, landmarks and a single `<h1>`. The header offers Tours, My tours, and either an account menu or "Log in" and "Sign up". On mobile it is a menu button with `aria-expanded`, and without JavaScript it is a plain list of links. (U9, U19)
  4. An unknown URL or a thrown error shows the new-design `not-found` and `error` pages with a way back to the tours. In a production build the error page shows only a generic message and the digest, never a stack trace. (U18, S19)
  5. The route line draws itself once in at most 1.2 seconds, every other motion responds to the user, lasts at most 200 ms and never runs on scroll, and all of it respects `prefers-reduced-motion`. (U25)
**Review findings:** ARC-10, DEL-12, DEL-16, DES-05, DES-09, DES-10, DES-13 (m), DES-15 (m), DES-19 (m), DES-20 (m), QA-21, SEC-11, SEC-16
**Plans:** TBD
**UI hint**: yes

### Phase 4: Browse tours
**Goal:** A traveller can find a tour that fits their fitness, dates and budget, and see its route, itinerary, guides, reviews and photo credits. API clients get the same catalogue.
**Mode:** mvp
**Depends on:** Phase 3 (components and shell), Phase 2 (map-tile decision), Phase 1 (data layer and request pipeline)
**Requirements:** F1, F2, F6, S4, S7, S16, B1, B2, B3, B4, B11, B12, R3, R4, R8, R10, D2, D10, U7, U10, U11, U27
**Success Criteria** (what must be TRUE):
  1. `npm run seed` loads the 13 tours, 35 users, 52 reviews, 58 bookings and 52 photos (uploaded through the storage adapter), and running it twice changes nothing. `--reset` rebuilds, and it refuses to run in production. Run on 8 Nov 2026, every tour has an upcoming start date, the earliest being Meghalaya Living Root Bridges on 21 Nov 2026. Run with a later `--today`, only start dates that have passed move forward, past bookings and reviews never move, and the `seed/README.md` rules are checked afterwards. (D10, D2)
  2. On `/`, a traveller filters by difficulty, length, start month and maximum price through a GET form, sorts by price, rating and length, sees the result count, and gets a "Clear filters" empty state and pagination above 12 tours (so the 13 seed tours span two pages). The URL can be shared, everything works with JavaScript off, and an invalid `sort`, `page` or `limit` falls back to a default instead of crashing. (U10, B1, B11, S7, R3, R4)
  3. A tour page shows the cover photo and name, a facts strip, the route map beside the day-by-day itinerary, the description, guides, paginated reviews and a booking panel. The panel lists only future start dates as IST calendar days with the price in ₹, shows "Log in to book" to logged-out visitors, and says "already booked" with a link to My tours when a paid booking exists. Leaflet and its tiles load only on tour pages, the page stays usable without JavaScript (the itinerary list replaces the map at the same size), and slower sections stream behind same-sized skeletons. A missing slug returns 404. (U11, R8, R4, B12, U7)
  4. Each tour page credits every photo's author and licence with links, `/credits` lists all 52 photos, and a test fails if any tour photo has no credit. Every page has a title, description and canonical URL, tour pages use the cover photo for the social preview, `/sitemap.xml` lists all 13 tours, and `/robots.txt` excludes `/me`, `/my-tours` and `/styleguide`. (U27, R10, U7)
  5. API clients can list tours with filters, `month`, `sort`, `fields` and pagination (`meta.total`), call `top-5-cheap`, `stats`, and the geo endpoints that return real documents for range-checked coordinates, and guides, lead guides and admins can read the monthly plan. Admins and lead guides can create, update and delete tours (409 if the tour has bookings, otherwise its reviews go too) and replace any subset of images through the separate images endpoint, while a JSON `PATCH` can never touch images or rating fields. Oversized or wrong-type uploads get 413 or 415, and every failure uses the standard error body. (F1, F2, F6, B2, B3, B4, S4, S16)
**Review findings:** ARC-03, ARC-04, ARC-06, ARC-07, ARC-08, ARC-10, ARC-14, ARC-15, ARC-18, ARC-20 (m), DEL-16, DEL-27 (m), DES-02, DES-03, DES-04, DES-05, DES-06, DES-07, DES-11, DES-15 (m), DES-16 (m), DES-17 (m), DES-18 (m), DES-22 (m), QA-02, QA-03, QA-04, QA-06, QA-07, QA-08, QA-10, QA-11, QA-13 (m), QA-17, QA-18, QA-20, QA-21, SEC-05, SEC-07, SEC-12, SEC-16, SEC-17, SEC-19, SEC-24 (m), SEC-27 (m)
**Carry-over findings:** ARC-02, QA-12 (cache design for R5, which closes in Phase 6; PROJECT.md Key Decisions says to settle it while planning this phase)
**Plans:** TBD
**UI hint**: yes

### Phase 5: Accounts
**Goal:** A visitor can create an account, log in, recover a forgotten password and manage their own account, with background email and the full container stack running locally.
**Mode:** mvp
**Depends on:** Phase 4 (pages, storage and image handling), Phase 3, Phase 1
**Requirements:** F3, F4, F5, S6, S8, S13, S15, S20, S22, S23, B15, B16, R7, D1, D3, D5, D6, D8, U8, U15, U16, U17
**Success Criteria** (what must be TRUE):
  1. A visitor can sign up, log in and log out through the site's forms (with JavaScript off too) and through `/api/v1/auth`. Field errors appear beside the field, a show-password toggle works, and a duplicate email shows an email field error (409 from the API). Passwords outside 8 to 72 characters are refused, and login takes the same time whether or not the email exists. After login the user lands on the safe `next` path, and an off-site `next` goes to `/`. (F3, R7, U16, U17, B16, S20, S22)
  2. Forgot-password answers the same way for known and unknown emails. The reset email reaches Mailpit in the Natours design with a plain-text part, and its link opens `/reset-password/[token]`. The token works once within 10 minutes, and a used or expired one is refused. A welcome email arrives at signup, and a failed email never fails the signup request. (S13, D3, U8)
  3. On `/me` a user can update name, email and photo (with a preview before upload), change password (a new session cookie is issued and older sessions stop working) and deactivate after confirming, using a dialog with JavaScript and `/me/deactivate` without. After deactivation the open session stops working on the next page, action or API request, and login is refused. The password hash never appears in a response, in props or from `getCurrentUser()`. (U15, F4, B15, S6, S8)
  4. Protected pages, actions and API handlers refuse anonymous callers even when `proxy.ts` is bypassed: a request carrying `x-middleware-subrequest` and no cookie gets nothing. The 11th auth attempt for the same IP and email within 15 minutes gets 429, and `/api/v1` allows 300 requests per 15 minutes per IP, both counted in Redis. Admins can list, view, update (only `name`, `email`, `role` and `active`) and deactivate users through `/api/v1/users`, and everyone else is refused. (S23, S15, F5)
  5. `docker compose up` starts web, worker, MongoDB, Redis and Mailpit from one non-root image, `/healthz` and `/readyz` (MongoDB and Redis) report healthy, and the container health check uses `/healthz`. On SIGTERM the worker finishes its current job and the web server lets in-flight requests finish (up to 10 seconds) before closing its connections. (D1, D3, D5, D6, D8)
**Review findings:** ARC-02, ARC-04, ARC-07, ARC-09, ARC-11 (m), ARC-12, ARC-13, ARC-14, ARC-17, ARC-18, ARC-25 (m), DEL-12, DEL-16, DEL-18, DES-04, DES-09, DES-12, DES-19 (m), QA-04, QA-12, QA-15 (m), QA-17, QA-18, QA-19, SEC-01, SEC-03, SEC-04, SEC-05, SEC-09, SEC-12, SEC-14, SEC-15, SEC-20 (m), SEC-21 (m), SEC-25 (m)
**Plans:** TBD
**UI hint**: yes

### Phase 6: Bookings, My tours and reviews
**Goal:** A logged-in traveller can book a start date through Stripe Checkout, see the booking in My tours, and after the trip review the tour.
**Mode:** mvp
**Depends on:** Phase 5 (accounts, queue, worker and email), Phase 4
**Requirements:** F7, S5, S17, B6, B7, B8, R5, U12, U13, U14
**Success Criteria** (what must be TRUE):
  1. A logged-in traveller picks one of a tour's future start dates in the booking panel and is sent to Stripe Checkout in INR, with the amount taken from the database price in paise and product images served from our own storage by absolute URL (the fake Stripe adapter stands in locally). It works with JavaScript off. A missing tour returns 404, and a start date that isn't one of the tour's future departures returns 400. Cancelling at Stripe returns to the tour with the chosen date still selected. (B8, S17, U12)
  2. After payment, a verified webhook, checked against the raw body, creates exactly one booking with its start date, even when Stripe delivers the event twice. A failure returns 500 so Stripe retries, and the booking-confirmed email reaches Mailpit. (S17, B7)
  3. The user returns to `/my-tours?booking=success`, sees "Confirming your booking" for up to 30 seconds and then the confirmation. My tours groups trips into upcoming and past, each showing the start date, the price paid and a link to the tour, and links to the tours when empty. Past trips the user hasn't reviewed offer "Write a review". (U12, U13)
  4. Only a traveller with a paid booking can review a tour, once per tour, and the review form appears only when they can. The star input works by keyboard and announces its value. Authors edit and delete their reviews in place after a confirmation, and an admin can delete any review. The tour's rating recalculates after every create, update and delete, rounded to one decimal and reset when the last review goes, and the overview and tour page show it immediately. (U14, B6, S5, R5)
  5. Bookings can be read only by their owner and by admins. Admins and lead guides can list and view bookings, and admins can create, update and delete them by hand. Two different logged-in travellers on the same tour page and My tours each see only their own booking state, review form and trips, proven by a two-user Playwright test. (F7, S5, R5)
**Review findings:** ARC-02, ARC-03, ARC-08, ARC-09, ARC-21 (m), DEL-12, DEL-18, QA-03, QA-05, QA-06, QA-07, QA-08, QA-09 (m), QA-12, QA-16, QA-17, QA-18, QA-20, QA-21, SEC-06, SEC-07, SEC-08, SEC-12, SEC-15, SEC-23 (m)
**Plans:** TBD
**UI hint**: yes

### Phase 7: Hardening and quality gates
**Goal:** The whole site is proven to meet its security, accessibility, performance, no-JavaScript and visual standards in CI before it goes online.
**Mode:** mvp
**Depends on:** Phase 6
**Requirements:** R11, D11, D13, U21, U22, U23, U24, U26
**Success Criteria** (what must be TRUE):
  1. One push to GitHub runs the full pipeline and it passes: install, typecheck, lint, format check, the client-boundary and `NEXT_PUBLIC_` checks, tests with coverage, build, bundle budget, `npm audit`, knip, Playwright (end-to-end, no-JavaScript, accessibility and screenshots), Lighthouse CI, `redocly lint` of an `openapi.yaml` that matches every Route Handler, and a Docker build. A recorded security sweep against plan.md §5 confirms that every S and B ID has a passing tagged test, the access matrix covers every route and action, `git ls-files` shows no secrets or build output, and no error response leaks a stack trace. (D11, D13)
  2. Lighthouse CI on mobile, against `next start`, scores the overview and a tour page at Performance 90 or more, Accessibility 100, Best Practices 95 or more and SEO 95 or more, with LCP under 2.5 seconds and CLS under 0.1. No page adds more than 40 KB gzipped of JavaScript over its Phase 1 baseline (R9, owned by Phase 1, is re-measured on every page here). (U24)
  3. axe finds no serious or critical violations on every page in light and dark themes, and a written keyboard-only walkthrough of the booking flow is recorded in `docs/design/a11y-walkthrough.md`. Layouts have no horizontal scrolling at 375, 768, 1280 and 1920 px. (U22, U23)
  4. A Playwright project with JavaScript disabled passes for the overview with filters and pagination, the tour page, sign up, log in, forgot and reset password, booking, writing a review, account updates and deactivation. (R11, U21)
  5. Screenshot baselines for the styleguide, overview, tour page, My tours and account page, at 375 and 1280 px in both themes, are generated in the CI container and match the approved direction. The user receives the final screenshot set and every item in the plan §13 checklist that no test can check has been checked by hand and recorded. (U26)
**Review findings:** ARC-07, ARC-09, ARC-10, ARC-20 (m), DEL-15, DEL-17, DEL-22 (m), DES-03, DES-04, DES-05, DES-08, DES-10, DES-11, DES-13 (m), DES-16 (m), DES-18 (m), DES-20 (m), DES-21 (m), QA-11, QA-20, QA-21, QA-25, SEC-14, SEC-16
**Plans:** TBD
**UI hint**: yes

### Phase 8: Deployment to AWS
**Goal:** The demo runs on AWS at a public HTTPS address, with real email, image storage and Stripe test-mode payments.
**Mode:** mvp
**Depends on:** Phase 7
**Requirements:** S12, D12
**Success Criteria** (what must be TRUE):
  1. Anyone can open the app at the chosen DuckDNS subdomain over HTTPS (Caddy with Let's Encrypt, on an Elastic IP). It runs on one EC2 instance in Mumbai (`ap-south-1`) under `docker compose` with web, worker and Redis, uses MongoDB Atlas M0, and shows the seeded tours with images served from S3. `/healthz` and `/readyz` report healthy. (D12)
  2. Signing up on the deployed site sends the welcome email through SES to a verified demo address, and the password-reset link in that email works. (D12, S12)
  3. Booking with a Stripe test card on the deployed site creates exactly one booking through the Stripe test-mode webhook at `/webhooks/stripe`, even if the event is delivered twice, and the booking appears in My tours with its confirmation email. (D12)
  4. An uploaded photo survives a container restart because it lives in S3. TLS certificate checks are on for Atlas and SMTP, Redis is reachable only on the instance's private Docker network, and no secret is in the repository, the image or any `NEXT_PUBLIC_` variable. (S12, D12)
  5. The README covers deploying, rotating secrets, rolling back (rehearsed once) and shutting the demo down when the AWS credits end, and the user has walked through the plan §13 final acceptance checklist on the live site. (D12)
**Review findings:** DEL-17
**Plans:** TBD

## Mapping Conventions

- **Cross-cutting rules** map to the phase that first establishes and enforces them: Q1 to Q11, R1, R2, R6, R9 and S18 to Phase 1, and R3 and S4 to Phase 4. Later phases must keep obeying them, and each phase's tests add to the shared access matrix, no-JavaScript project and OpenAPI fragments.
- **Feature requirements** map to the phase that completes them. Where a requirement is built in one phase and closed in a later one, the roadmap follows the closing phase: S6, S8, S22 and S23 to Phase 5 (they need login and protected pages), R5 to Phase 6 (it needs personal data on the tour page for the two-user test), S2 and S19 to Phase 3 (they need `/styleguide` and `error.tsx`), and R11, U21, U22 to Phase 7 (they need every flow to exist).
- **Process-only deliverables** have no requirement ID: the design direction, mockups and the design gate (plan.md §9.7) in Phase 2, supported by D14 and U20.
- The security sweep, access-matrix completeness and OpenAPI accuracy are re-checked in Phase 7 without re-mapping the S and B requirements they cover.

## Planning Notes

- **Phase 1** is the largest phase by requirement count, but most of its requirements are rules that the structure satisfies. Expect several plans: scaffold and tooling, config, logging and errors, formatting, data layer, session and request pipeline, test kit, and CI with docs and ADRs. `create-next-app` refuses to run in this repository (DEL-24), and CLAUDE.md still describes the agent-team rules (DEL-23). `getCurrentUser()` and the session helpers land here following the SEC-02 decision, but S6 closes in Phase 5, where deactivation exists.
- **Phase 2** has two requirement IDs because its main deliverable is a human decision. It stays a separate phase so the gate is a hard stop before Phase 3.
- **Phase 3** builds contrast, focus, touch-target and error-linking rules into tokens and components. The full U22 audit and the booking walkthrough happen in Phase 7. React Email templates for U8 are built in Phase 5 from these tokens.
- **Phase 4** is where the catalogue cache design is settled (ARC-02, QA-12, ARC-21, DEL-18, QA-21), even though R5 closes in Phase 6. Local development uses a storage adapter that is not AWS. The S3 adapter arrives in Phase 8. Add each endpoint's OpenAPI fragment as it lands so D13 can close in Phase 7. Add the tile host chosen in Phase 2 and the storage host to the CSP.
- **Phase 5** introduces Redis (rate limits, queue) and the worker. `/readyz` gains its Redis check here, extending the MongoDB check from Phase 1.
- **Phase 6** uses the fake Stripe adapter locally, so decide at planning time whether the user also runs real test-mode Checkout through the Stripe CLI. Real test keys are only required in Phase 8. Check that the CSP `form-action` allows the Stripe Checkout host for the no-JavaScript booking path.
- **Phase 8** must resolve a conflict: D10 makes the seed refuse to run when `NODE_ENV=production`, but the demo needs seeded data. Settle this with an ADR, for example by running the seed from the developer's machine against Atlas and S3. SES SMTP on the AWS Free plan is unconfirmed, and if it isn't available any free-tier SMTP provider works, because nodemailer only needs SMTP credentials.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and contracts | 10/15 | In Progress | - |
| 2. Design direction and approval gate | 0/0 | Not started | - |
| 3. Design system and app shell | 0/0 | Not started | - |
| 4. Browse tours | 0/0 | Not started | - |
| 5. Accounts | 0/0 | Not started | - |
| 6. Bookings, My tours and reviews | 0/0 | Not started | - |
| 7. Hardening and quality gates | 0/0 | Not started | - |
| 8. Deployment to AWS | 0/0 | Not started | - |
