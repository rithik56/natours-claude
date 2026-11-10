# Natours v2

## What This Is

A from-scratch rebuild of Natours, a tour-booking web app, as a full-stack Next.js 16 application. It offers 13 small-group tours across India, priced in rupees. Pages render on the server first. It has a full visual redesign, Stripe Checkout in INR and a public REST API. It is a learning project for building a production-grade Next.js app with AI-assisted development, deployed as a demo. `plan.md` is the full specification.

## Core Value

A traveller planning on their phone can choose a tour that fits their fitness, dates and budget, then book a start date with confidence.

## Requirements

### Validated

(None yet — ship to validate)

### Active

The detailed, testable requirements are `plan.md`'s IDs (S1–S23, B1–B20, R1–R11, D1–D14, U1–U27, Q1–Q11), listed in `REQUIREMENTS.md`. At product level:

- [ ] **Browse tours:**
  - An overview with filters (difficulty, length, start month, maximum price), sorting and pagination, with filters in the URL that work without JavaScript (U10).
  - A tour page with a route map, day-by-day itinerary, guides, reviews and a booking panel (U11).
- [ ] **Accounts:** sign up, log in, log out, reset a forgotten password by email, and change password (§1.4 auth, S13, S20, S22, U16)
- [ ] **Account page:** update name, email and photo (with a preview before upload), and deactivate the account after confirming (U15, S6)
- [ ] **Bookings:**
  - Pick a future start date and pay through Stripe Checkout in INR (S17, B8, B20).
  - See a confirmation state on return (U12).
  - See upcoming and past trips on My tours (U13).
- [ ] **Reviews:**
  - Only a traveller with a paid booking can review a tour, once per tour.
  - Authors edit and delete their own reviews in place (U14, S5, B6).
- [ ] **Public REST API (`/api/v1`):**
  - Filtering, sorting, field selection and pagination.
  - `top-5-cheap`, stats and the monthly plan.
  - Geo queries and admin endpoints (§1.4).
- [ ] **Emails in the new design:** welcome, password reset and booking confirmed, sent from a background worker (U8, D3)
- [ ] **Full redesign:** the "Milestone" design direction, a design system with light and dark themes, WCAG 2.2 AA and performance budgets (§9, U1–U27)
- [ ] **Search-friendly pages:** metadata, Open Graph images, a sitemap and `robots.txt` (R10)
- [ ] **Photo credits:** every photo's author and licence on its tour page and on `/credits` (U27)
- [ ] **Indian conventions:** ₹ with Indian digit grouping, dates in IST, kilometres and Indian English (B19, B20, U20)
- [ ] **v1 mistakes:** every one is designed out and proven by a regression test tagged with its ID (S1–S23, B1–B20)
- [ ] **Server-first rendering:** client code only where R1 allows. Forms and the core flows work without JavaScript (R1–R11).
- [ ] **Demo on AWS:** the app runs on AWS (see Key Decisions), with the web server and email worker as separate long-running containers (D1–D14, as amended by ADRs)

### Out of Scope

- **Stretch features from §1.2** (email verification, seat limits per start date, refresh tokens, admin dashboard UI): the plan defers them until after the Phase 2 gate, and a learning demo doesn't need them.
- **Live payments:** this is a demo only. Stripe stays in test mode.
- **Email to the public:** SES stays in its sandbox and sends only to verified demo addresses. Seed accounts use `example.com` anyway.
- **Hosting beyond the AWS Free plan:** the demo is shut down when the credits end, so there's no paid upgrade.
- **Custom domain:** a free DuckDNS subdomain is enough for a demo.
- **Render and `render.yaml`:** replaced by AWS, because Render has no free background worker.
- **Agent-team execution (§11, §14):** replaced by GSD phases, which also makes the §11.1 ownership map and the §12 task IDs obsolete.
- **Hindi UI:** fonts keep it possible later (U6), but it isn't built now.
- **Anything from v1** (code, CSS, data, photos): `plan.md` §0 rules it out.

## Context

- **Natours v1** (`rithik56/natours`) was built with Express, Pug and MongoDB. A code review found security holes, crash bugs and deployment problems, and `plan.md` turns each one into a numbered requirement.
- **`plan.md`** (1,091 lines) is the spec:
  - §1: scope, data model, REST API, pages and Server Actions
  - §2: stack
  - §3: architecture and layering rules
  - §4: contracts
  - §5–§10: requirements by family (S security, B correctness, R rendering, D deployment, U design, Q quality)
  - §12: phases and tasks
  - §13: final acceptance checklist
- **`seed/`** holds the content the app starts with:
  - 13 tours with itineraries, coordinates, start dates and guides.
  - 35 fictional users: 1 admin, 5 lead guides, 9 guides and 20 travellers.
  - 52 reviews and 58 bookings: 52 past trips and 6 upcoming.
  - 52 freely licensed Wikimedia Commons photos with credits.
  - Seed emails use `example.com`. `seed/README.md` describes how the seed script loads it all.
- **The seed's first departure is 21 Nov 2026.** As written, D10's date shift breaks from that date, which is why the seed rule was settled during initialisation.
- **The plan review** (`docs/plan-review/`) had five reviewers: architect, security, qa, design and delivery.
  - Round 1 found 8 Blockers, 80 Majors and 39 Minors.
  - Round 2 stopped part-way, and no `report.md` was written. The review will not be resumed.
  - The Blockers were settled during initialisation (see Key Decisions). Majors and Minors are attached to the requirements they affect and handled when each phase is planned.
- **There is no code yet.** The repository holds `plan.md`, `seed/`, the plan review, `CLAUDE.md` and `.claude/settings.json` (which turns on the agent-teams flag and plugins).
- **Root `CLAUDE.md` is out of date:** it still describes the agent-team rules (§11.1 file ownership, §11.2 workflow and §12 task IDs), which the decision to use GSD replaces.
- **Who it's for:** the user is building this to learn Next.js 16 and AI-assisted development. The deployed demo is a by-product.

## Constraints

- **Tech stack:**
  - `plan.md` §2 as written: Next.js 16 (App Router), React 19, Node.js 24 LTS, TypeScript `strict`, MongoDB with Mongoose, Zod, a `jose` JWT session with `bcryptjs`, plain CSS Modules with no framework, `next/font` (Anek Latin and Anek Devanagari), `next/image` with sharp, and Leaflet.
  - Also: Stripe Checkout, a BullMQ worker on Redis, React Email with nodemailer, pino, Vitest, Testing Library, Playwright, axe, Lighthouse CI, ESLint, stylelint, Prettier and GitHub Actions.
  - ADR 0001 records the versions checked at the start.
- **Hosting:**
  - The demo runs on an AWS Free plan account, created after July 2025, with more than 4 months of credits left on 8 Nov 2026.
  - The plan closes after six months from sign-up, or when the credits run out.
  - Only the final deployment phase uses AWS. Every earlier phase runs locally on `docker compose`, with fakes for Stripe, storage and mail.
- **Budget:** zero spend. When the Free plan ends, the demo is shut down.
- **Email:** SES through SMTP if the Free plan allows it, which hasn't been confirmed. If not, any SMTP provider's free tier, since nodemailer only needs SMTP credentials.
- **Content:**
  - Only real seed content: no placeholder text, names or images anywhere a person can see, including the product, styleguide, mockups, emails and test fixtures (`CLAUDE.md`, §9.1).
  - Every photo needs its credit (U27).
- **Locale:**
  - Prices in ₹ with Indian digit grouping (₹1,24,999), formatted only through `formatPrice`.
  - Dates are calendar days in India Standard Time, formatted through `formatDate`.
  - Distances in kilometres, and copy in Indian English with British spelling.
- **Process:**
  - `plan.md` is the spec and stays unedited. Every deviation is an ADR in `docs/adr/`.
  - Commits follow Conventional Commits and cite the requirement IDs they cover (Q8, as amended).
- **Design gate:** the user approves the design direction (`docs/design/direction.md` plus mockup screenshots) before any component or page styling starts (§9.7).
- **Accounts needed** by the deployment phase: AWS (have one), MongoDB Atlas, Stripe test-mode keys, and the DuckDNS subdomain.
- **Network for local development and CI:** `mongodb-memory-server` downloads a MongoDB binary, `next/font/google` downloads fonts at build time, and Playwright needs Chromium.

## Key Decisions

Each decision below is recorded as an ADR in `docs/adr/` during the first phase.

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| GSD phases and executors replace the seven-teammate agent team (§11, §14). The §11.1 file-ownership map and §12 task IDs no longer apply. Commits cite requirement IDs and the GSD plan. | One person learning with GSD, rather than a seven-session team. Also avoids DEL-01, DEL-05 to DEL-08 and the other agent-team findings. | — Pending |
| `plan.md` is the spec. GSD requirements reuse its IDs unchanged, and deviations are ADRs rather than edits. | One ID scheme, so commits and tests stay traceable to `plan.md`, as `CLAUDE.md` asks. | — Pending |
| Deploy on AWS instead of Render: one EC2 instance in Mumbai (`ap-south-1`) running `docker compose` (web, worker, Redis, Caddy), plus MongoDB Atlas M0, S3 for images and SES for email. Images are built in GitHub Actions; an instance role gives the app access to S3 and SES. Replaces `render.yaml` (D12, P3-PL1, P3-PL2). | Render has no free background worker, which D1 requires. AWS Free plan credits cover a 1 GB instance for the demo window. | — Pending |
| Redis runs on the instance's private Docker network without TLS (amends S12). | There's no managed Redis on a zero budget. The review already found S12 doesn't fit a host's internal Redis (SEC-21). | — Pending |
| Use a free DuckDNS subdomain, with HTTPS from Caddy and Let's Encrypt and an Elastic IP. | There's no domain, but secure cookies (S9) and Stripe webhooks need HTTPS. | — Pending |
| Demo only: Stripe in test mode, SES sandbox with verified recipients, shut down when the credits end. | It's a learning project, so no real customers. | — Pending |
| Cache public data with `unstable_cache(fn, keys, { tags })`; `cacheComponents` stays off, and every page renders dynamically (ARC-01, SEC-13). | Cache Components turns on Partial Prerendering, which can't carry the per-request CSP nonce (S11). The `revalidateTag` details (ARC-02, QA-12) are settled when the catalogue phase is planned. | — Pending |
| R9 is measured with Lighthouse CI `resource-summary:script:size` budgets on every page. Phase 0 baselines go in `docs/bundle-baseline.json`, and protected pages use a login script (ARC-05, DEL-04). | Next.js 16 removed "First Load JS", and U24 already needs Lighthouse CI. | — Pending |
| The seed rolls forward only start dates that have passed. Past bookings and reviews never move, and an upcoming booking whose date passes becomes a past trip. It shifts `YYYY-MM-DD` strings, moves a Golden Triangle departure one day earlier if day 4 lands on a Friday, takes a `--today` flag, and checks the `seed/README.md` rules afterwards (amends D10; QA-01, DEL-03, ARC-19, DES-01). | Simulated on the seed data for every run date to Nov 2028: all 39 departures stay within the next 12 months, against 1 of 39 if every date shifts together. | — Pending |
| Regression tests are written with each feature. A final check confirms every S and B ID has a passing tagged test (DEL-02, QA-22). | Keeps `npm test` green, and there's no reviewer teammate in GSD. | — Pending |
| `requireUser`, `requireRole`, `withApi` and `action()` always use `getCurrentUser()`, a database read per request. The role comes from the database, not the token, and sessions expire after 7 days (SEC-02). | Otherwise deactivation (S6), a password change (S14) and a role change have no effect on `/api/v1`. | — Pending |
| Plan-review Majors and Minors are handled during each phase's planning; the review's Rounds 2–3 are not resumed. | The Blockers are settled, and the rest are local to a phase. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 8 Nov 2026 after initialisation*
