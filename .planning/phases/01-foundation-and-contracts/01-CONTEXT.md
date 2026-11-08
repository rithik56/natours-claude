# Phase 1: Foundation and contracts - Context

**Gathered:** 2026-11-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 turns an empty repository into a foundation that every later phase builds on. A developer can clone the repository, install, start the app against a local MongoDB, open it and run the tests. CI guards the quality rules from the first commit.

It delivers:
- The Next.js 16 scaffold and tooling.
- Zod config validated at startup.
- pino logging with request IDs.
- `AppError` and the error codes.
- `src/lib/format.ts`.
- The `db.ts` connection.
- The four models (User, Tour, Review, Booking) with their DTO mappers.
- Sessions (`getSession`, `getCurrentUser`, `requireUser`, `requireRole`) and `safeNext`.
- `withApi`, `action()`, `ActionState`, `parseQuery` and the response helpers.
- `proxy.ts` with the request ID and the CSP nonce, and the security headers.
- `/healthz` and `/readyz`.
- Fakes for Stripe, mail, storage, queue and rate limiting.
- The test kit (`createUser`, `callRoute`, `mockSession` and the other factories).
- The CI quality gates in GitHub Actions.
- `docs/contracts.md`, the ADRs, the README and the commit convention.

Requirements: S1, S3, S9, S10, S11, S14, S18, S21, B5, B9, B10, B13, B14, B17, B18, B19, B20, R1, R2, R6, R9, D4, D7, D9, Q1–Q11.

Not in this phase:
- Any feature a traveller can use.
- Any styling, which waits for the Phase 2 design gate.
- Redis, the worker and real adapters, which arrive in Phases 5, 6 and 8.
- The seed script, which arrives in Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Dates and prices
- **D-01:** `formatDate` always writes months with three letters, for example "4 Sep 2027" and "12 Mar 2027". `Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' })` writes September as "Sept", so `formatDate` builds the string from `formatToParts` and trims it to "Sep". A test covers a September date; the seed's Ladakh (4 Sep 2027) and Spiti (18 Sep 2027) departures are real cases. Tests and mockups assert on `formatDate`'s output, never on hard-coded month strings. (B19; DES-14, QA-24)
- **D-02:** There is one date style, and it always shows the year: "5 Dec 2026". There is no year-less short style. If Phase 2's design direction needs a compact style, it adds one through an ADR. (B19, U20; DES-14)
- **D-03:** A start date is bookable while its IST calendar day is strictly after today's IST day, so it can be booked until the day before departure. On 20 Nov 2026 (IST) the 21 Nov departure is bookable; on 21 Nov it isn't. Phase 1 provides this as a tested date helper beside `toIstDay` and `fromIstDay`. Phase 4 uses it for the booking panel, Phase 6 for the checkout check (B8), and the seed in Phase 4 for "upcoming". (B19; QA-14)
- **D-04:** A booked trip is "upcoming" until its last day, `startDate + duration − 1` (IST calendar days), has passed. After that it's "past". Phase 1 provides this as a tested helper, and Phase 6's My tours (U13) uses it. When choosing this, the user accepted that "Write a review" appears only once the trip is over. Phase 6 must confirm whether review eligibility (`canReview`) also requires a finished trip. That is stricter than S5/B6's "paid booking", so it needs an ADR. (B19, U13; QA-14)
- **D-05:** `priceDiscount` is dropped from the Tour model in v2. One price is shown, filtered, sorted, snapshotted on the booking and charged. No seed tour has a discount. This is recorded as an ADR that deviates from plan.md §1.3. (B20; QA-05)

### Setup under GSD (adapting plan.md Phase 0)
- **D-06:** Dependencies are installed in the phase that first uses them, not all at once as plan.md P0-1 says. knip (Q11) stays strict from the first commit, with no ignore list for packages that aren't used yet. ADR 0001 records the versions checked now for the whole §2 stack, so later phases install the same majors. Each later install's commit message gives a one-line reason (Q11). This needs an ADR deviating from P0-1.
- **D-07:** Phase 1 writes the parts of `docs/contracts.md` that everything shares, with exact TypeScript signatures:
  - the response and error format (§4.1) and the error codes (§4.2);
  - the server helpers (§4.3): `getSession`, `getCurrentUser`, `requireUser`, `requireRole`, `withApi`, `action()`, `ActionState`, `parseQuery` and `safeNext`;
  - the `format.ts` functions and the IST date helpers;
  - the adapter interfaces (mailer, storage, Stripe, queue, rate limit);
  - the test helpers (§4.5);
  - the model fields and the DTO types.

  Each feature phase adds its own service signatures (§4.4) and email-template props when it builds them. This needs an ADR deviating from P0-7's "all of §4".
- **D-08:** Test factories (`createUser`, `createTour`, `createBooking`) always take their data from `seed/data/*.json`. `createUser` uses real seed people with their `@example.com` emails, `createTour` copies a real seed tour with overrides, and `createBooking` uses start dates that are valid for that tour. Tests never invent names, emails or tour content. This follows the CLAUDE.md content rule.

### The app before the design gate
- **D-09:** At the end of Phase 1 the only page is `/`. It is unstyled semantic HTML inside `<html lang="en-IN">`: the name "Natours" and one true sentence about the product, such as small-group tours across India. It has no Next.js starter content, no styling and no header or footer (those are Phase 3). The only Route Handlers are `/healthz` and `/readyz`. Every other route in §1.5 is created by the phase that builds it. This needs an ADR deviating from P0-7's "a placeholder page for every route", which conflicts with CLAUDE.md's ban on placeholder text.
- **D-10:** The R9 baseline is one shared floor. Phase 1 measures `/` with Lighthouse CI `resource-summary:script:size` against `next start` and records the value in `docs/bundle-baseline.json`. Every page's budget is the floor plus 40 KB gzipped. The tour page's budget is the floor plus 40 KB plus a map allowance that Phase 4 sets. Each new page joins the Lighthouse CI budget in the phase that builds it. This needs an ADR amending R9's per-route wording. (R9; DEL-04)

### Runtime and local setup
- **D-11:** Node.js 24 LTS, as plan.md says. It has been Maintenance LTS since 20 Oct 2026 and is supported until 30 Apr 2028, well past the demo. The project pins it with `engines.node`, `.nvmrc`, `node-version-file` in CI and `@types/node` `^24`. The developer's Mac has Homebrew `node@22`, so the README tells them to run `brew install node@24`. ADR 0001 records that Node 26 (Active LTS since 28 Oct 2026) was considered and not chosen. (ARC-22)
- **D-12:** Local MongoDB runs from `docker-compose.yml` with only a `mongo` service and a named volume: run `docker compose up -d mongo`, then `npm run dev`. Phase 5 adds web, worker, Redis and Mailpit to the same file. Use the MongoDB major that Atlas M0 runs, so Phase 8 has no surprises. Tests still use mongodb-memory-server (Q7). Docker Desktop is installed and running on the developer's machine.

### Carried forward (already decided; not re-discussed)
- GSD phases replace the agent team: there's no §11.1 file ownership and there are no §12 task IDs, and commits cite requirement IDs and the GSD plan (PROJECT.md Key Decisions).
- `plan.md` stays unedited, and every deviation is an ADR in `docs/adr/`.
- This phase writes an ADR for every PROJECT.md Key Decision, plus the ones from this discussion. ADR 0001 records the versions.
- Caching uses `unstable_cache(fn, keys, { tags })`. `cacheComponents` stays off and every page renders dynamically, because of the CSP nonce (ARC-01).
- `requireUser`, `requireRole`, `withApi` and `action()` always go through `getCurrentUser()`, which reads the user and role from the database. Sessions last 7 days, and the JWT carries no role (S14 amended, SEC-02).
- Regression tests tagged with their ID (for example `it('[S14] …')`) are written with each feature (DEL-02, QA-22).
- All four models are built in Phase 1 (roadmap success criterion 2).

### Claude's Discretion
The user agreed that Claude decides these; they don't need the user again.
- **Commit format:** Conventional Commits citing the requirement IDs and the GSD plan, for example `feat(session): pin HS256 and reject stale tokens [S14, B14] (01-03)`. New dependencies get a one-line reason in the body (Q8, Q11).
- **Root `CLAUDE.md` rewrite** (DEL-23):
  - Remove the §11.1 ownership, §12 task ID and "lead" wording.
  - Point to the REQUIREMENTS.md IDs, GSD plans and `docs/adr/`.
  - Keep the seed-content and Indian-conventions rules word for word.
  - The file has an uncommitted whitespace-only edit by the user; build on the current file.
- **Commit `docs/plan-review/`:** it's untracked today, and REQUIREMENTS.md and ROADMAP.md cite it.
- **Scaffold** (DEL-24): run `create-next-app` in a temporary folder (TypeScript, App Router, `src/`, ESLint, no Tailwind, no `AGENTS.md` if the flag exists on stable), then copy it in. Keep `CLAUDE.md`, `.claude/`, `.planning/`, `docs/`, `seed/` and `plan.md`. Delete the starter page, styles and images.
- **Versions** (ARC-22, ARC-23): TypeScript 5.x and ESLint 9, as create-next-app pins them, because typescript-eslint doesn't support TypeScript 7. Check current library APIs, not remembered ones.
- **CSP:**
  - Scripts use a nonce with `'strict-dynamic'` and no `'unsafe-inline'`; `'unsafe-eval'` is allowed in development only.
  - Styles use `style-src-elem 'self' 'nonce-…'` plus `style-src-attr 'unsafe-inline'` for `next/image`'s style attributes, recorded in an ADR as S11 requires (ARC-20).
  - Set `form-action` and the other directives explicitly (SEC-14), and make the `proxy.ts` matcher explicit (ARC-18).
- **User-facing messages:** one central messages module, for example `src/lib/messages.ts`, in Indian English. Zod schemas and `AppError` take their wording from it, and no Zod default message reaches a user. Phase 2's `copy.md` rewords this one file (DES-12, U20).
- **Config:**
  - `config.ts` grows per phase, in line with D-06.
  - Add an `APP_URL` key, a public base URL for reset links, Stripe URLs and the origin check (SEC-12).
  - Add an environment switch that isn't `NODE_ENV`, so test, Playwright and Lighthouse runs behave correctly (QA-21).
  - Validate config at runtime start in `instrumentation.ts`, not during `next build` (ARC-07). `next.config.ts` and `proxy.ts` are allowed exceptions to "only `config.ts` reads `process.env`" (ARC-26).
  - CI runs a check-env script (every key is in `.env.example`, and no `NEXT_PUBLIC_` name contains SECRET, KEY or PASSWORD) and enables Dependabot (D4, S18; DEL-20).
- **Clock:** all date logic reads one `now()` helper, so tests, and later Playwright, can pin the date (QA-20). Expiry tests use fake timers without stalling the database driver.
- **Mappers:**
  - Split the user mappers: `toPublicUser` has no email, and a self or current-user mapper is for `/me` (SEC-10).
  - The DTO rule also covers Server Action return values, error payloads and log fields (SEC-11).
- **Session timing:** `iat` against `passwordChangedAt` is compared at second precision, so the cookie issued right after a password change or reset is accepted (SEC-18). `passwordChangedAt` is set only in the model hook (B14).
- **Default deny:** `withApi` and `action()` require an explicit access declaration, and leaving it out is a type error or is refused at runtime (S1; SEC-15).
- **CORS:** origins in `CORS_ORIGINS` also pass the S9 origin check (SEC-26). `redirect()` and `notFound()` are re-thrown by `action()` (B18).
- **Model validators** run on updates as well as creates, for example `runValidators` and update hooks for the name length and the slug (QA-04). B5 applies: `duration` isn't unique, `slug` is, and dates come from `timestamps`.
- **IST helpers:** month boundaries for filters and the monthly plan use IST, not UTC (QA-10).
- **`server-only`:** aliased to an empty module under Vitest and tsx, so service tests run (ARC-04, QA-16). Lint rules allow test factories (and later the seed script) to import models (ARC-08, DEL-26, QA-17).
- **Database outage** (B10; QA-19): `serverSelectionTimeoutMS: 5000`, requests fail with 503, and `/readyz` reports not ready. In Phase 1 `/readyz` checks only MongoDB; Phase 5 adds Redis.
- **Example tests:**
  - The Route Handler example uses `/readyz` or `/healthz`.
  - With no feature yet, the Server Action and page data function examples may be fixtures inside the test files that exercise `action()`, `mockSession` and `getCurrentUser`.
  - All of them still use seed content.
- **Test layout and coverage:** where the tagged regression tests live (with their feature tests, or in a `test/regression/` index), and which files count towards Q6's 85% and 75% thresholds (QA-23).
- **ADR format:** `docs/adr/NNNN-kebab-title.md`, numbered from 0001.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Specification
- `plan.md` §0: version notes and network notes (mongodb-memory-server, next/font and Playwright need network access).
- `plan.md` §1.3: data model for User, Tour, Review and Booking. Note D-05: no `priceDiscount`.
- `plan.md` §1.4: API access levels (public, auth, roles, owner), which shape the default-deny design and the access matrix.
- `plan.md` §2: tech stack.
- `plan.md` §3: runtime view, layering rules, folder layout and request pipeline.
- `plan.md` §4: contracts. Phase 1 writes the shared parts (D-07).
- `plan.md` §5, §6, §7, §8 and §10: the S, B, R, D and Q requirement texts and the Definition of Done.
- `plan.md` §12 Phase 0 (P0-1 to P0-7): the original scope, adapted by D-06, D-07, D-09 and D-10.
- `.planning/REQUIREMENTS.md`: the requirement wording, including the amended S6, S12, S14, Q6, Q8 and R9, and the "Known Issues from the Plan Review" table.
- `.planning/ROADMAP.md` (the "Phase 1: Foundation and contracts" section): the success criteria and the review findings assigned to this phase.
- `.planning/PROJECT.md`: Key Decisions (each becomes an ADR in this phase) and Constraints.

### Plan review findings for this phase
- `docs/plan-review/findings-architect.md`: ARC-02, ARC-03, ARC-04, ARC-07, ARC-08, ARC-13, ARC-17, ARC-18, ARC-20, ARC-22, ARC-23, ARC-24, ARC-26. Its version notes record next 16.4.5, react 19.3.1 and the Node LTS dates.
- `docs/plan-review/findings-security.md`: SEC-01, SEC-08, SEC-09, SEC-10, SEC-11, SEC-12, SEC-14, SEC-15, SEC-17, SEC-18, SEC-22, SEC-26.
- `docs/plan-review/findings-qa.md`: QA-04, QA-05, QA-10, QA-14, QA-16, QA-17, QA-19, QA-20, QA-21, QA-23, QA-24.
- `docs/plan-review/findings-design.md`: DES-08, DES-11, DES-12, DES-13, DES-14.
- `docs/plan-review/findings-delivery.md`: DEL-04 (bundle baseline), DEL-20, DEL-23, DEL-24, DEL-26.

### Content and conventions
- `CLAUDE.md` (root) and `.claude/CLAUDE.md`: the content rule (no placeholder text or names, including in test fixtures) and the Indian conventions.
- `seed/README.md`: the seed rules. Dates are IST `YYYY-MM-DD` strings stored as 00:00 IST, emails use `example.com`, and passwords come from `SEED_USER_PASSWORD`.
- `seed/data/users.json`, `seed/data/tours.json`, `seed/data/reviews.json`, `seed/data/bookings.json`: the source data for the test factories (D-08).

### Framework docs
- After install, `node_modules/next/dist/docs/`: the version-matched Next.js docs (proxy.ts, CSP with nonces, `unstable_cache`, async `params` and `cookies()`). The ARC findings used these.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- There is no application code yet. The repository holds `plan.md`, `seed/` (data and 52 photos), `docs/plan-review/`, `.planning/`, `CLAUDE.md` and `.claude/settings.json`.
- `seed/data/*.json` is the source for the test factories (D-08). The 13 tours have no `priceDiscount`, which supports D-05.

### Established Patterns
- None in code yet. This phase sets the patterns every later phase follows: layering (§3.2), `server-only`, DTO mappers, `withApi` and `action()`, the error format, `format.ts` and the IST helpers.

### Integration Points
- GitHub remote `rithik56/natours-claude` is **public**, so Actions minutes on standard runners are free (zero budget). `gh` is authenticated as `rithik56`. Local `main` is 4 commits ahead of `origin/main`, and CI runs only once those are pushed.
- Developer machine: macOS, Homebrew `node@22` with no version manager (Node 24 is needed, D-11), npm 10.9, and Docker Desktop 28.5 with Compose v2 running.
- `create-next-app` refuses to run in this non-empty repository (DEL-24), so scaffold in a temporary folder and copy in.

</code_context>

<specifics>
## Specific Ideas

- `/` in Phase 1 is the real product saying only what's true now: "Natours" and one true sentence. It must not suggest features that don't exist yet, such as "Book now".
- The date examples to test against: "4 Sep 2027" (not "4 Sept 2027"), "21 Nov 2026" and "1 Jan 2027". The server runs on UTC in the B19 test.
- `formatPrice(124999)` gives "₹1,24,999". This was verified with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })` on Node 22 (ICU 77.1, CLDR 47.0); re-check on Node 24.

</specifics>

<deferred>
## Deferred Ideas

- **Tour discounts** (`priceDiscount`): dropped from v2 (D-05). If it comes back as its own feature, it must define amount-off against sale price, what checkout charges and snapshots, and what filters and sorts use (QA-05).
- **A year-less compact date style:** only if Phase 2's design direction needs it, through an ADR (D-02).
- **An "On this trip now" state on My tours:** considered and not adopted. Trips are upcoming or past (D-04).
- **A booking notice period** (N days before departure): considered and not adopted. Bookable until the day before (D-03).

### Notes for later phases (raised here, decided there)
- **Phase 6:** confirm whether `canReview` requires a finished trip (D-04) and record an ADR if so. Settle SEC-08: §1.4 lets lead guides read all bookings, but S5 says owner and admin only. Settle SEC-09: the `BookingConfirmed` job needs the tour, date and price, beyond `{ to, firstName, url }`.
- **Phase 5:** settle SEC-22 (`logoutAction` is auth-only but `POST /logout` is public), the ARC-17 Redis client options (fail fast while Redis is down) and ARC-13 (running the worker bundle from the standalone image).

</deferred>

---

*Phase: 01-foundation-and-contracts*
*Context gathered: 2026-11-08*
