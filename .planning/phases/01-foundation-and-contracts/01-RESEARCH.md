# Phase 1: Foundation and contracts - Research

**Researched:** 2026-11-08
**Domain:** Next.js 16 (App Router) full-stack foundation: Mongoose 9 data layer, jose session, request pipeline (`proxy.ts`, `withApi`, `action()`), nonce CSP, test kit with fakes, GitHub Actions quality gates
**Confidence:** HIGH (most behaviour below was reproduced in throwaway spikes on Next 16.4.5, Mongoose 9.12.0, Vitest 5.1.0, jose 6.2.15, Zod 4.6.7, Node 22.21.1 and 24.22.2 on this machine this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dates and prices**
- **D-01:** `formatDate` always writes months with three letters, for example "4 Sep 2027" and "12 Mar 2027". `Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' })` writes September as "Sept", so `formatDate` builds the string from `formatToParts` and trims it to "Sep". A test covers a September date; the seed's Ladakh (4 Sep 2027) and Spiti (18 Sep 2027) departures are real cases. Tests and mockups assert on `formatDate`'s output, never on hard-coded month strings. (B19; DES-14, QA-24)
- **D-02:** There is one date style, and it always shows the year: "5 Dec 2026". There is no year-less short style. If Phase 2's design direction needs a compact style, it adds one through an ADR. (B19, U20; DES-14)
- **D-03:** A start date is bookable while its IST calendar day is strictly after today's IST day, so it can be booked until the day before departure. On 20 Nov 2026 (IST) the 21 Nov departure is bookable; on 21 Nov it isn't. Phase 1 provides this as a tested date helper beside `toIstDay` and `fromIstDay`. Phase 4 uses it for the booking panel, Phase 6 for the checkout check (B8), and the seed in Phase 4 for "upcoming". (B19; QA-14)
- **D-04:** A booked trip is "upcoming" until its last day, `startDate + duration − 1` (IST calendar days), has passed. After that it's "past". Phase 1 provides this as a tested helper, and Phase 6's My tours (U13) uses it. When choosing this, the user accepted that "Write a review" appears only once the trip is over. Phase 6 must confirm whether review eligibility (`canReview`) also requires a finished trip. That is stricter than S5/B6's "paid booking", so it needs an ADR. (B19, U13; QA-14)
- **D-05:** `priceDiscount` is dropped from the Tour model in v2. One price is shown, filtered, sorted, snapshotted on the booking and charged. No seed tour has a discount. This is recorded as an ADR that deviates from plan.md §1.3. (B20; QA-05)

**Setup under GSD (adapting plan.md Phase 0)**
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

**The app before the design gate**
- **D-09:** At the end of Phase 1 the only page is `/`. It is unstyled semantic HTML inside `<html lang="en-IN">`: the name "Natours" and one true sentence about the product, such as small-group tours across India. It has no Next.js starter content, no styling and no header or footer (those are Phase 3). The only Route Handlers are `/healthz` and `/readyz`. Every other route in §1.5 is created by the phase that builds it. This needs an ADR deviating from P0-7's "a placeholder page for every route", which conflicts with CLAUDE.md's ban on placeholder text.
- **D-10:** The R9 baseline is one shared floor. Phase 1 measures `/` with Lighthouse CI `resource-summary:script:size` against `next start` and records the value in `docs/bundle-baseline.json`. Every page's budget is the floor plus 40 KB gzipped. The tour page's budget is the floor plus 40 KB plus a map allowance that Phase 4 sets. Each new page joins the Lighthouse CI budget in the phase that builds it. This needs an ADR amending R9's per-route wording. (R9; DEL-04)

**Runtime and local setup**
- **D-11:** Node.js 24 LTS, as plan.md says. It has been Maintenance LTS since 20 Oct 2026 and is supported until 30 Apr 2028, well past the demo. The project pins it with `engines.node`, `.nvmrc`, `node-version-file` in CI and `@types/node` `^24`. The developer's Mac has Homebrew `node@22`, so the README tells them to run `brew install node@24`. ADR 0001 records that Node 26 (Active LTS since 28 Oct 2026) was considered and not chosen. (ARC-22)
- **D-12:** Local MongoDB runs from `docker-compose.yml` with only a `mongo` service and a named volume: run `docker compose up -d mongo`, then `npm run dev`. Phase 5 adds web, worker, Redis and Mailpit to the same file. Use the MongoDB major that Atlas M0 runs, so Phase 8 has no surprises. Tests still use mongodb-memory-server (Q7). Docker Desktop is installed and running on the developer's machine.

**Carried forward (already decided; not re-discussed)**
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

### Deferred Ideas (OUT OF SCOPE)
- **Tour discounts** (`priceDiscount`): dropped from v2 (D-05). If it comes back as its own feature, it must define amount-off against sale price, what checkout charges and snapshots, and what filters and sorts use (QA-05).
- **A year-less compact date style:** only if Phase 2's design direction needs it, through an ADR (D-02).
- **An "On this trip now" state on My tours:** considered and not adopted. Trips are upcoming or past (D-04).
- **A booking notice period** (N days before departure): considered and not adopted. Bookable until the day before (D-03).
- *Notes for later phases:* Phase 6 settles `canReview` vs finished trip (D-04), SEC-08 (lead-guide booking access) and SEC-09 (`BookingConfirmed` job payload). Phase 5 settles SEC-22 (`logoutAction` access), ARC-17 (Redis client options) and ARC-13 (worker bundle). None of these is built in Phase 1.
</user_constraints>

## Project Constraints (from CLAUDE.md)

Extracted from `/Users/rithikagarwal/Desktop/natours-claude/CLAUDE.md` and `.claude/CLAUDE.md` [VERIFIED: both read via system context this session]:

- `plan.md` is the spec and stays **unedited**; every deviation is an ADR in `docs/adr/`.
- Stay within the plan; trace every change to requirement IDs. (Root CLAUDE.md still mentions §11.1 ownership and §12 task IDs: rewriting it is a Phase 1 task, DEL-23.)
- **Content:** only real seed content (`seed/`). No placeholder text, names or images anywhere a person can see: product, styleguide, mockups, emails, **test fixtures**. Every photo needs its credit (U27).
- **Locale:** prices in ₹ with Indian grouping via `formatPrice` only; dates in IST via `formatDate`; distances in km; Indian English (British spelling).
- **Process:** Conventional Commits citing requirement IDs (Q8 amended). Design gate (user approval of `docs/design/direction.md` + mockups) before any styling (§9.7); Phase 1 therefore ships **no styling**.
- **Tech stack (fixed):** Next.js 16 App Router, React 19, Node 24 LTS, TypeScript strict, Mongoose, Zod, jose + bcryptjs, plain CSS Modules, Vitest, Testing Library, Playwright, ESLint, stylelint, Prettier, GitHub Actions, pino (full list in `.claude/CLAUDE.md`).
- **Network for dev and CI:** `mongodb-memory-server` downloads a MongoDB binary; `next/font/google` downloads fonts at build (Phase 1 must not use `next/font/google`: no styling); Playwright needs Chromium (not Phase 1).
- **GSD workflow enforcement:** repo edits go through a GSD command (this research runs inside `/gsd-plan-phase`).
- Zero budget: free-tier only; public repo so GitHub Actions on standard runners is free.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| S1 | Every handler/action/protected page declares an access level; undeclared is denied | Required `access` option, no default, runtime refusal (see Pattern 4; SEC-15). Glob-based access-matrix test comes in later phases; Phase 1 tests default-deny on `withApi`/`action()` |
| S3 | Sensitive fields never leave the server; DTO mappers | DTO split `toSelf`/`toPublicProfile`/`toAdminUser` (SEC-10); DTO rule extended to `ActionState.data`, errors, logs (SEC-11); pino `redact` |
| S9 | Cookie flags + origin check on state-changing methods | Cookie options constant; `withApi` origin check accepts `APP_URL` origin + `CORS_ORIGINS`, accepts missing `Origin` (SEC-26) |
| S10 | CORS only for `CORS_ORIGINS` | `withApi` answers `OPTIONS`; no `Allow-Credentials`; empty default |
| S11 | Per-request nonce CSP with `'strict-dynamic'` | Spike-verified `proxy.ts` pattern; **root layout must force dynamic** (Pitfall 1); `style-src-attr 'unsafe-inline'` ADR |
| S14 | JWT HS256 pinned, 7 days, no role, rejected if issued before `passwordChangedAt` | jose spike results; second-precision compare (SEC-18) |
| S18 | Secrets never committed; `NEXT_PUBLIC_` check; audit; Dependabot | `scripts/check-env.ts`, `.github/dependabot.yml`, `.gitignore` fix for `.env.example` (Pitfall 3) |
| S21 | No `dangerouslySetInnerHTML` | `react/no-danger: error` spike-verified under eslint-config-next 16.4.5 |
| B5 | Schema rules (duration not unique, slug unique, timestamps) | Model spec below |
| B9 | Every error gets a response | Error mapper table (Pattern 5); Mongoose/Zod/jose/Stripe error shapes verified |
| B10 | Never hang without DB; 503; `/readyz` | `bufferCommands: false` + `serverSelectionTimeoutMS` spike results (Pattern 2) |
| B13 | One service function per behaviour | Layering + example tests that call the same service from action and handler |
| B14 | `passwordChangedAt` only in model hook | Mongoose 9 async pre-save hook verified |
| B17 | Models and connection survive hot reload | `globalThis` promise cache, cleared on rejection (QA-19) |
| B18 | `redirect()`/`notFound()` pass through `action()` | `unstable_rethrow` verified to work in plain Node (usable under Vitest) |
| B19 | IST calendar days, formatDate Asia/Kolkata, UTC-server test | Intl spike on Node 24.22.2; Vitest `test.env.TZ='UTC'` verified |
| B20 | Money whole rupees; `formatPrice` | `₹1,24,999` re-verified on Node 24.22.2 (ICU 78.3, CLDR 48.0) |
| R1 | Server Components by default | `/` is a Server Component; no client files in Phase 1 |
| R2 | `// client: <reason>` line after `'use client'` | `scripts/check-client-boundaries.ts` (Node 24 native TS) |
| R6 | DTOs to client; `server-only` in `src/server/` | `server-only` alias for Vitest; boundary check script |
| R9 | JS budget baseline | LHCI `resource-summary:script:size` = **transferSize** (verified in @lhci/utils source); D-10 floor + 40 KB |
| D4 | Zod config validated at startup | `register()` spike: throwing does NOT stop the server; must `process.exit(1)` (Pitfall 2) |
| D7 | Structured logs with request ID | pino 10 config; request ID from `x-request-id` |
| D9 | Build output gitignored | scaffold `.gitignore` lacks `dist`, Playwright dirs, `.lighthouseci`, `.env.example` negation |
| Q1 | strict + noUncheckedIndexedAccess | tsconfig additions |
| Q2 | ESLint zero warnings, stylelint, Prettier | Verified: `security/detect-object-injection` is a warning in `recommended` and breaks `--max-warnings=0` (Pitfall 8); stylelint fails on empty input without `--allow-empty-input` (Pitfall 7) |
| Q3 | Naming conventions | Script-based check (discretion) |
| Q4 | Module boundaries | `no-restricted-imports` for models + script check for client files importing `src/server` |
| Q5 | No commented-out code / TODO w/o issue / debug logs | `no-console` (verified), TODO regexp script, code review for commented-out code |
| Q6 | Tests + coverage thresholds | Vitest 5 `coverage.thresholds` glob syntax verified not to fail when glob matches nothing |
| Q7 | Deterministic tests | Fakes; `vi.useFakeTimers({ toFake: ['Date'] })` verified with Mongo + jose; per-file DB |
| Q8 | Conventional Commits with req IDs | Commit convention doc + optional commit-msg check |
| Q9 | TSDoc on exported service functions | Convention; few services in Phase 1 |
| Q10 | README, contracts, ADRs | Document plan below |
| Q11 | knip strict; lockfile committed | knip behaviour verified (Pitfall 9) |
</phase_requirements>

## Summary

Phase 1 is a greenfield scaffold plus a set of cross-cutting contracts. The stack is fixed by `plan.md` §2 and CONTEXT.md, so research focused on (a) the exact current versions and whether they install together, (b) behaviours the plan-review flagged as risky, which I reproduced in small spikes, and (c) a few new traps that the review did not catch. All current versions resolve cleanly together when TypeScript is held at 5.9.x and ESLint at 9.39.x, `stylelint-config-standard` is pinned to 41 (npm otherwise tried v40, which needs stylelint 17), and Node is 24.15+ (stylelint 18 refuses Node 22.21.1, which is what this Mac has).

Five findings change how the phase must be planned and are **not in the plan-review**. (1) `create-next-app@16.4.5` enables `cacheComponents: true` and `partialPrefetching: true` by default; they must be disabled with `--no-cache-components` or the CSP nonce design and CONTEXT's `unstable_cache` decision break. (2) Throwing from `instrumentation.ts` `register()` does **not** stop `next start`: the server prints "Ready" and answers 500. D4's "refuses to start" needs an explicit `process.exit(1)`. (3) A statically prerendered page gets the CSP header with a nonce but its `<script>` tags carry no nonce, so with `'strict-dynamic'` and no `'unsafe-inline'` the browser would block all of Next's scripts; the root layout must force dynamic rendering (`await connection()`) from day one, even though Phase 1's only page is trivial. (4) `next build` does not call `register()` at all (reproduced), which neatly satisfies ARC-07 for the instrumentation hook, but any module-scope `schema.parse(process.env)` would still run during prerender. (5) The scaffold's `.gitignore` contains `.env*`, which ignores `.env.example`.

The recommended plan shape is seven plans in a mostly linear dependency chain (scaffold and tooling, then core libs, data layer, session and request pipeline, fakes and test kit, CI and bundle baseline, documents), with the CI workflow created right after the scaffold so gates are added as each script lands. Every exported symbol must be exercised by a Phase 1 test, because knip is strict from the first commit and the contract surface is mostly consumed by later phases.

**Primary recommendation:** Scaffold with `create-next-app@16.4.5 --ts --app --src-dir --eslint --no-tailwind --no-agents-md --no-react-compiler --no-cache-components --use-npm`, pin TypeScript 5.9.x / ESLint 9.39.x / `@types/node` ^24, force every page dynamic via `await connection()` in the root layout, make `register()` call `process.exit(1)` on invalid config, and implement the rest exactly as the locked decisions say, using the verified patterns below.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Request ID + CSP nonce + early login redirect | Frontend Server (`proxy.ts`, Node runtime) | — | Next 16 proxy runs before render; Node runtime by default; must never be the only auth check (S23) |
| Other security headers (HSTS, XCTO, Referrer-Policy, Permissions-Policy, X-Frame-Options) | Frontend Server (`next.config.ts` `headers()`) | CDN/Static | Applies to static files too; `proxy.ts` matcher excludes them |
| Config validation | API/Backend (`instrumentation.ts` → `config.ts`) | — | Runs once at server start (not at build); exits process on failure |
| Session cookie read/verify, `getCurrentUser` | API/Backend (server helpers) | Database (re-read user + role) | Role lives in DB, JWT carries only `sub`/`iat`/`exp` |
| Origin check, CORS, error mapping, access default-deny | API/Backend (`withApi`) | — | Route Handlers only |
| Form parsing, access, `ActionState` | API/Backend (`action()`) | Browser (`useActionState` wrapper, later phases) | Server Actions |
| Query parsing for pages | Frontend Server (`parseQuery`) | — | Pages parse `searchParams` with Zod, invalid → defaults |
| Persistence, models, hooks | Database / Storage (Mongoose) | API/Backend | Two hooks only: password hashing + `passwordChangedAt`, slug |
| DTO mapping | API/Backend | — | Only plain objects cross to browser (R6/S3) |
| Formatting (`formatPrice`, `formatDate`, IST helpers) | Shared pure lib (`src/lib`) | Browser + server | No `server-only`; safe in both; reads no clock itself |
| Clock (`now()`) | API/Backend | — | Pinned by `APP_NOW` outside production |
| Cache adapter (`cached`, `invalidate`) | API/Backend | — | Wraps `unstable_cache`/`revalidateTag`; fake outside Next (ARC-02/03) |
| Health/readiness | API/Backend (Route Handlers) | Database | `/healthz` static body; `/readyz` pings Mongo |
| Quality gates | CI (GitHub Actions) | Local scripts | Same npm scripts locally and in CI |

## Standard Stack

### Core
Versions verified with `npm view` on 2026-11-08 [VERIFIED: npm registry]. Install each in the plan that first imports it (D-06).

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.4.5 (published 2026-11-03) | Framework | `latest` dist-tag; fixed by plan |
| react / react-dom | 19.3.1 (scaffold pins 19.3.0; registry latest 19.3.1) | UI runtime | Next peer `^19.0.0` |
| typescript | **5.9.3** (`^5`) | Types | `typescript-eslint@8.72.1` peers `typescript >=4.8.4 <6.1.0`; npm `latest` is 7.0.2 and must NOT be used (ARC-22) |
| @types/node | **^24** (24.19.2) | Node types | D-11; registry latest is 26.x (wrong major) |
| mongoose | 9.12.0 | ODM | Plan: "Mongoose 9"; Node `>=20.19` |
| zod | 4.6.7 | Validation + config | v4 API (see Code Examples) |
| jose | 6.2.15 | HS256 JWT | Plan §2; Node `>=20.19` |
| bcryptjs | 3.0.3 | Password hashing in User hook (cost 12 prod) | Pure JS; plan §2 |
| pino | 10.4.0 | JSON logs | Plan §2 |
| server-only | 0.0.1 | Build guard | R6 |

### Supporting (dev)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint | **^9** (9.39.5) | Lint | create-next-app pins `^9`; `eslint-plugin-react` (via eslint-config-next) peers ESLint 9 (ARC-22) |
| eslint-config-next | 16.4.5 | Next + React + a11y rules (brings `typescript-eslint ^8.56`, `eslint-plugin-react`, `react-hooks`) | Always |
| eslint-plugin-security | 4.2.1 | Security lint | Q2 (see Pitfall 8 on `detect-object-injection`) |
| stylelint | 18.0.0 | CSS lint | Node `^22.22.2 \|\| ^24.15.0 \|\| >=26` |
| stylelint-config-standard | **41.0.0** (pin) | CSS rules | v41 peers stylelint ^18; unpinned install resolved v40 (peer ^17) and failed ERESOLVE |
| prettier | 3.9.10 | Formatting (`singleQuote`, `trailingComma: 'all'`) | Q2 |
| knip | 6.44.2 | Unused deps/exports | Q11 |
| vitest | 5.1.0 | Tests (engines Node `^22.12 \|\| ^24 \|\| >=26`; bundles its own vite) | Q6/Q7 |
| @vitest/coverage-v8 | 5.1.0 | Coverage thresholds | Q6 |
| mongodb-memory-server | 11.3.0 (default mongod 8.2.6) | In-memory DB | Q7; postinstall downloads the binary |
| @lhci/cli | 0.16.0 (lighthouse 13.6.0) | R9 baseline + budget | D-10 |
| pino-pretty | 13.2.0 | Dev log formatting | D7 (dev only) |
| @types/react, @types/react-dom | ^19 | Types | Scaffold default |

**Not needed in Phase 1 (do not install; knip would flag them):** `tsx` (Node 24 runs `.ts` natively, spike-verified), `@testing-library/react` (no client components), `jsdom`, `playwright`, `@axe-core/playwright`, `stripe`, `bullmq`, `ioredis`, `nodemailer`, `react-email`, `sharp`, `rate-limiter-flexible`, `leaflet`. Fakes/interfaces for Stripe, queue, mail and rate limiting are plain TypeScript with no SDK.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tsx` for scripts | Node 24 native type stripping | Native needs `.ts` extensions in relative imports and erasable syntax only (no enums/namespaces); zero dependency. Chosen. Seed script (Phase 4) may still want `tsx` for path aliases |
| One mongod per test file | One mongod in `globalSetup`, unique database name per file | Faster; still "an in-memory database per test file" (Q7) in effect. Claude's discretion |
| Node 26 | Node 24 | CONTEXT locks 24 (D-11); ADR 0001 records 26 considered |

**Installation (per plan, illustrative):**
```bash
# plan 01-01 (scaffold output, then pin)
npm install next@16.4.5 react@19.3.1 react-dom@19.3.1
npm install -D typescript@5.9.3 @types/node@^24 @types/react@^19 @types/react-dom@^19 eslint@^9 eslint-config-next@16.4.5 eslint-plugin-security@4.2.1 stylelint@18.0.0 stylelint-config-standard@41.0.0 prettier@3.9.10 knip@6.44.2 vitest@5.1.0 @vitest/coverage-v8@5.1.0
# later plans, when first imported
npm install zod@4.6.7 server-only@0.0.1 pino@10.4.0 mongoose@9.12.0 jose@6.2.15 bcryptjs@3.0.3
npm install -D mongodb-memory-server@11.3.0 pino-pretty@13.2.0 @lhci/cli@0.16.0
```

**Version verification:** every version above was read from `npm view` this session. Training-data versions were stale (e.g. memory said Zod 3, ESLint 9 only, TS 5).

## Package Legitimacy Audit

Ran `gsd-tools query package-legitimacy check --ecosystem npm …` on all candidates [VERIFIED: seam output]. Result: only `bcryptjs`, `pino`, `pino-pretty` and `typescript` returned `OK`; every other package returned `SUS`. The reasons are `too-new` (the seam judges the **latest version's** publish date, which is within weeks for actively released packages) and `unknown-downloads` (download API returned null). I cross-checked package age with `npm view <pkg> time.created`: `mongodb-memory-server` created 2017-05-11, `knip` 2022-10-09, `server-only` 2022-09-03, `pino-pretty` 2018-04-04. All have well-known source repos. These are widely used first-party/ecosystem packages named in `plan.md` §2 and in official docs, so the `SUS` verdicts are heuristic false positives, but per protocol they are still reported and **gated**.

| Package | Registry | Age | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|-----|--------------|-------------|---------|-------------|
| next | npm | years | 92.6M | github.com/vercel/next.js | SUS (too-new) | Flagged (false positive) |
| react, react-dom | npm | years | 253M / 238M | github.com/react/react | SUS (too-new) | Flagged (false positive) |
| mongoose | npm | years | 8.9M | github.com/Automattic/mongoose | SUS (too-new) | Flagged (false positive) |
| zod | npm | years | 456M | github.com/colinhacks/zod | SUS (too-new) | Flagged (false positive) |
| jose | npm | years | 228M | github.com/panva/jose | SUS (too-new) | Flagged (false positive) |
| bcryptjs | npm | years | 19.8M | github.com/dcodeIO/bcrypt.js | OK | Approved |
| pino / pino-pretty | npm | years | 77.5M / 36.2M | github.com/pinojs/pino | OK | Approved |
| server-only | npm | 4 yrs | 33.9M | none listed (React-team package) | SUS (no-repository) | Flagged |
| typescript | npm | years | 419M | github.com/microsoft/TypeScript | OK | Approved |
| eslint, eslint-config-next, eslint-plugin-security | npm | years | 206M / 48M / 4.9M | official repos | SUS (too-new) | Flagged (false positive) |
| stylelint, stylelint-config-standard | npm | years | 14.2M / null | github.com/stylelint/* | SUS | Flagged (false positive) |
| prettier, knip, vitest, @vitest/coverage-v8 | npm | years | null / null / 180M / null | official repos | SUS | Flagged (false positive) |
| mongodb-memory-server | npm | 9 yrs | null | github.com/typegoose/mongodb-memory-server | SUS | Flagged. **Has `postinstall: node ./postinstall.js`**: I read it; it only calls `postInstallEnsureBinary` to pre-download the mongod binary (documented network behaviour, plan §0). No project-external paths |
| @lhci/cli | npm | years | null | github.com/GoogleChrome/lighthouse-ci | SUS | Flagged (false positive) |
| @types/node, @types/react, @types/react-dom | npm | years | 632M / null / null | github.com/DefinitelyTyped | SUS | Flagged (false positive) |

**Packages removed due to SLOP verdict:** none.
**Packages flagged SUS:** all rows above marked Flagged. **Planner action:** insert ONE `checkpoint:human-verify` task at the start of the first plan that installs packages ("confirm this package list against `plan.md` §2 and ADR 0001 before `npm install`"), rather than one per package. Per-package gates would add ~25 pointless checkpoints for names the plan itself prescribes. All names were discovered from `plan.md` §2 / official docs, not from web search, and the Next scaffold itself pins next/react/eslint/typescript.

## Architecture Patterns

### System Architecture Diagram

```
                       Browser / curl / Playwright (later)
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │ next.config.ts headers()  (HSTS, XCTO,│  static + dynamic responses
                 │ Referrer-Policy, Permissions-Policy,  │
                 │ X-Frame-Options)                      │
                 └──────────────────┬───────────────────┘
                                    ▼
   page request ────────► proxy.ts  (matcher excludes /api, /webhooks, /healthz,
   (not /api, /healthz)     │         /readyz, _next/static, _next/image, prefetches)
                            │  • x-request-id  (always overwrite)
                            │  • nonce → CSP header on REQUEST and RESPONSE
                            │  • early /login?next= redirect (convenience only)
                            ▼
              ┌─────────────┴───────────────────────────────┐
              ▼                     ▼                       ▼
        Server Component      Server Action            Route Handler
        page.tsx               action(schema, fn,       withApi(handler,
        (layout: await          { access, ... })         { access, body, query,
         connection())          prevState+FormData         params, rateLimit })
              │                     │                       │  mints request ID if
              │ parseQuery          │ Zod → ActionState     │  proxy skipped it;
              │                     │ unstable_rethrow      │  origin check on
              ▼                     ▼                       ▼  POST/PUT/PATCH/DELETE
         requireUser/requireRole  ──►  getCurrentUser()  ◄── getSession(cookie)
                                          │   (React cache())    │ jose HS256 pinned,
                                          │                      │ exp required,
                                          ▼                      ▼ iat ≥ floor(pwChangedAt/1000)
                                       services ───────► models (Mongoose 9) ───► MongoDB
                                          │                 ▲
                                          │                 └─ db.ts: globalThis promise,
                                          ▼                    bufferCommands:false,
                                   deps.ts adapters             serverSelectionTimeoutMS:5000,
                                   (fakes in test/ci/dev;       cleared on rejection
                                    cache, mailer, storage,
                                    stripe, queue, rate-limit)

  errors thrown anywhere ──► AppError(code,msg,details?) ──► withApi mapper ──► {status:'fail'|'error',
        (CastError, E11000, ValidationError, ZodError, JOSEError, Stripe sig,      error:{code,message,details?,requestId}}
         MongooseServerSelectionError → SERVICE_UNAVAILABLE 503)                    + pino log with same requestId

  Server start:  instrumentation.ts register() ─► getConfig() ─► invalid? stderr message naming keys + process.exit(1)
  next build:    does NOT call register(); needs no DB, no secrets
  CI: install → typecheck → lint → stylelint → prettier → check-client-boundaries → check-env → audit → knip → test+coverage → build → LHCI (collect/assert) vs docs/bundle-baseline.json
```

### Recommended Project Structure (Phase 1 only; every other folder arrives with its phase)

```
.github/
  workflows/ci.yml
  dependabot.yml
docs/
  adr/0001-versions.md … NNNN-*.md
  contracts.md
  bundle-baseline.json
  plan-review/            # committed (CONTEXT: Claude's discretion)
src/
  app/
    layout.tsx            # <html lang="en-IN">, await connection(); no fonts, no CSS import
    page.tsx              # "Natours" + one true sentence
    healthz/route.ts      # { status: 'ok' } only
    readyz/route.ts       # pings Mongo; 200 / 503
  proxy.ts
  instrumentation.ts
  server/
    config-schema.ts      # Zod schema only; NO server-only; importable by scripts
    config.ts             # 'server-only'; getConfig() lazy+memoised
    clock.ts              # now()
    logger.ts  errors.ts  db.ts  session.ts  redirects.ts  cache.ts  deps.ts
    api/                  # with-api.ts, responses.ts, parse-query.ts, origin.ts, error-mapper.ts
    actions/              # action.ts, action-state.ts
    adapters/             # mailer, storage, stripe, queue, rate-limit interfaces + fakes
    modules/
      users/   model.ts dto.ts service.ts   # service.ts: findActiveById only
      tours/   model.ts dto.ts
      reviews/ model.ts dto.ts
      bookings/ model.ts dto.ts
  lib/
    format.ts             # formatPrice, formatDate, formatDistance (safe on server and client)
    ist.ts                # toIstDay, fromIstDay, isBookable, tripStatus, month bounds
    messages.ts           # central user-facing wording (Indian English)
scripts/
  check-client-boundaries.ts  check-env.ts  check-conventions.ts  measure-bundle.ts
test/
  setup.ts  global-setup.ts
  helpers/                # factories, call-route, mock-session, db
  server/ lib/ ...        # tests mirror src
seed/                     # exists
docker-compose.yml  .nvmrc  .env.example  vitest.config.ts  knip.json
eslint.config.mjs  stylelint.config.mjs  .prettierrc.json  lighthouserc.json
```
Notes: no `src/styles/`, no `ui/`, no `components/` (design gate). Stylelint therefore has **zero files** to lint in Phase 1 (Pitfall 7). `instrumentation.ts` and `proxy.ts` live in `src/` because the project uses `src/` [CITED: node_modules/next/dist/docs proxy.md: "in the project root, or inside `src` if applicable"].

### Pattern 1: Lazy config, validated at server start, exit on failure
**What:** `config-schema.ts` exports the Zod schema (no `server-only`, no relative imports) so `scripts/check-env.ts` can read its keys. `config.ts` (`import 'server-only'`) exports `getConfig()`: parse once, memoise. `instrumentation.ts` calls it only when `NEXT_RUNTIME === 'nodejs'`, prints every failing key (never values), and calls `process.exit(1)`.
**Why:** Spike results (Next 16.4.5): `next build` never invoked `register()` (no output, build succeeded with the throw enabled). At `next start`, `throw` inside `register()` printed "Failed to prepare server… loading instrumentation hook" but the process **kept listening** and returned HTTP 500. `process.exit(1)` after `console.error` terminated it with exit code 1 and the message visible.
```ts
// src/instrumentation.ts   (no console: ESLint no-console is an error; use stderr)
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { loadConfigOrExit } = await import('./server/config-startup');
  loadConfigOrExit();
}
```
`loadConfigOrExit` catches `ZodError`, writes `Invalid configuration:\n  - SESSION_SECRET: <message from messages.ts>\n` to `process.stderr`, then `process.exit(1)`. [VERIFIED: spike on next@16.4.5]

### Pattern 2: DB connection, fail fast, retry after failure (B10, B17, QA-19)
```ts
// src/server/db.ts
import 'server-only';
import mongoose from 'mongoose';
const g = globalThis as typeof globalThis & { __natoursMongo?: Promise<typeof mongoose> };

export function connectDb(): Promise<typeof mongoose> {
  if (!g.__natoursMongo) {
    const p = mongoose.connect(getConfig().MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: getConfig().DB_SERVER_SELECTION_TIMEOUT_MS, // default 5000; tests lower it
    });
    g.__natoursMongo = p.catch((err) => { g.__natoursMongo = undefined; throw toServiceUnavailable(err); });
  }
  return g.__natoursMongo;
}
```
Spike results (Mongoose 9.12.0): with `bufferCommands: false` and an unreachable host, `openUri` rejects after ~1500 ms with `MongooseServerSelectionError` (the configured timeout), and a query on a never-connected connection throws immediately `MongooseError: Cannot call \`xes.find()\` before initial connection is complete if \`bufferCommands = false\``. So every entry point (`withApi`, `action()`, page data, `/readyz`) must `await connectDb()` **before** touching a model, and the error mapper must map `MongooseServerSelectionError`, `MongoServerSelectionError`, `MongoNetworkError` and that "before initial connection" `MongooseError` to `SERVICE_UNAVAILABLE`. Do not cache a rejected promise (QA-19). [VERIFIED: spike]

### Pattern 3: Session (jose) and the SEC-18 second-precision rule
Spike results (jose 6.2.15, under Vitest 5.1.0 with `TZ=UTC`):
- `jwtVerify(token, secret, { algorithms: ['HS256'] })` rejects an HS512 token with `errors.JOSEAlgNotAllowed`, an `alg: none` token with a `JOSEError`, and an expired token with `errors.JWTExpired`.
- `requiredClaims: ['exp','iat','sub']` makes a token **without `exp`** fail with `errors.JWTClaimValidationFailed`. Always pass it (S14 "tokens must have exp").
- Payload shape produced: `{"sub":"u1","iat":1794153409,"exp":1794758209}` (iat in whole seconds).
- `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(...)` works with both `SignJWT().setIssuedAt()` and live MongoDB calls (no stall), confirming QA-20.

Rule: reject when `iat < Math.floor(passwordChangedAt.getTime() / 1000)`; equality is accepted (SEC-18). **Contract deviation:** `plan.md` §4.3 says `getSession` returns `{ userId, role, iat }`; CONTEXT (S14 amended) says the JWT carries **no role**. Contract should be `getSession(): Promise<{ userId: string; iat: number } | null>`, role comes only from `getCurrentUser()`. Record in an ADR. Cookie options constant (shared by set and delete, S9): `{ httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 7*24*60*60 }`. Cookie writes are legal only in Server Actions and Route Handlers (not Server Components) [CITED: Next cookies() docs, ASSUMED unchanged in 16.4.5; plan Wave 0 should confirm in `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`].

`getCurrentUser()` is wrapped in React `cache()`. **Verified:** outside React Server rendering, `cache()` does not dedupe (2 calls ran the function twice), so Vitest tests can prove "re-reads user and role from the DB" by changing the role between two calls; a "runs once per request" test is not possible under Vitest and should not be written.

### Pattern 4: Default-deny `withApi` and `action()`
```ts
export type Access = 'public' | 'auth' | 'owner' | { roles: readonly Role[] };
withApi(handler, opts: { access: Access; body?: ZodType; query?: ZodType; params?: ZodType; rateLimit?: RateLimitSpec })
action(schema, handler, opts: { access: Access; rateLimit?: RateLimitSpec })
  // returns: (prev: ActionState<T>, formData: FormData) => Promise<ActionState<T>>   (ARC-09)
```
`access` is a required property (type error if omitted) **and** checked at runtime: if a cast/JS caller passes `undefined`, respond `FORBIDDEN` (never run the handler). `'owner'` means "authenticated; ownership is enforced by the service" and exists so the Phase 6 access matrix can classify routes. No implicit role hierarchy: lists are explicit (plan §1.4 lists `guide, lead-guide, admin` for monthly-plan) [VERIFIED: plan.md:232].
`action()` catch block: `unstable_rethrow(err)` first (verified to rethrow `redirect()` with digest `NEXT_REDIRECT;replace;/login;307;` and `notFound()` with digest `NEXT_HTTP_ERROR_FALLBACK;404` while leaving a plain `Error` alone, **and it works in plain Node, so Vitest can test B18**), then map `AppError`/`ZodError` to `ActionState`, then rethrow unexpected errors to `error.tsx`. `unstable_rethrow` carries an `unstable_` prefix but is the documented API [CITED: next docs `unstable_rethrow.md`].

### Pattern 5: Error mapping (B9) and standard response (§4.1)
| Thrown | Detect by | Code (HTTP) | Verified shape |
|--------|-----------|-------------|----------------|
| `AppError` | `instanceof` | its code | — |
| `ZodError` | `instanceof z.ZodError` | `VALIDATION_ERROR` 400 | issues have `code`, `path`, `message`; `z.flattenError()` gives `{formErrors, fieldErrors}` |
| Mongoose `CastError` | `err.name === 'CastError'` | `VALIDATION_ERROR` 400 (bad ID) → or `NOT_FOUND` for `:id` params; decide in contracts | name `CastError` |
| Mongoose `ValidationError` | `err.name === 'ValidationError'` | `VALIDATION_ERROR` 400 | Mongoose messages include rejected values: **do not return them** (SEC-11) |
| Duplicate key | `err.code === 11000` | `CONFLICT` 409 | `MongoServerError`, `keyPattern: {"email":1}`, `keyValue: {"email":"d@example.com"}`; message contains collection/index/value: **never return `message`/`keyValue`**, use `keyPattern` keys only to name the field |
| `jose` `JWTExpired` | `errors.JWTExpired` | `TOKEN_EXPIRED` 401 | verified class |
| other `jose` `JOSEError` | `instanceof errors.JOSEError` | `UNAUTHENTICATED` 401 | verified |
| Stripe signature | `err.type === 'StripeSignatureVerificationError'` | `VALIDATION_ERROR` 400 | Phase 1 has no Stripe SDK; map by `name`/`type` string against the **fake** Stripe adapter's thrown error; Phase 6 confirms against the SDK [ASSUMED for the real SDK's `type` string] |
| DB unreachable | see Pattern 2 | `SERVICE_UNAVAILABLE` 503 | verified error classes |
| anything else | — | `INTERNAL` 500, generic message, logged with request ID | — |

Error codes and statuses (copy exactly) [VERIFIED: plan.md:475-488]: `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401, `INVALID_CREDENTIALS` 401, `TOKEN_EXPIRED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `PAYLOAD_TOO_LARGE` 413, `UNSUPPORTED_MEDIA_TYPE` 415, `RATE_LIMITED` 429, `INTERNAL` 500, `SERVICE_UNAVAILABLE` 503. Envelope [VERIFIED: plan.md:461-471]: `{ "status": "success", "data": {…} }`, list adds `"meta": { "page", "limit", "total" }`, errors `{ "status": "fail" | "error", "error": { "code", "message", "details": [{path,message}], "requestId" } }` (`fail` for 4xx, `error` for 5xx). Roles [VERIFIED: plan.md:76]: `user` (default), `guide`, `lead-guide`, `admin`.

### Pattern 6: `proxy.ts`, CSP and headers (S11)
Verified spike policy (production-style) and Next's own CSP guide [CITED: nextjs.org CSP guide via Context7 `/vercel/next.js/v16.2.9`]: set `x-nonce`, `x-request-id` and `Content-Security-Policy` on the **request** headers passed to `NextResponse.next({ request: { headers } })` **and** on the response. Proxy defaults to the Node runtime, so `Buffer`/`crypto.randomUUID()` are fine [CITED: proxy.md "Proxy defaults to using the Node.js runtime"]. Proxy "should not rely on shared modules or globals", so it reads `process.env` directly (ARC-26 exception) and does not import `config.ts`.
Recommended policy (dev adds `'unsafe-eval'` to `script-src`):
```
default-src 'self';
script-src 'self' 'nonce-<n>' 'strict-dynamic';
style-src-elem 'self' 'nonce-<n>';
style-src-attr 'unsafe-inline';
img-src 'self' blob: data:;
font-src 'self';
connect-src 'self';
form-action 'self' https://checkout.stripe.com;
frame-ancestors 'none'; base-uri 'self'; object-src 'none';
upgrade-insecure-requests
```
(`form-action` Stripe host is needed from Phase 6 for the no-JS booking redirect (SEC-14); including it now keeps the policy in one place. Map-tile hosts are added by Phase 4 after D14.) Matcher (spike-verified syntax):
```ts
export const config = { matcher: [{
  source: '/((?!api|webhooks|healthz|readyz|_next/static|_next/image|favicon.ico).*)',
  missing: [{ type: 'header', key: 'next-router-prefetch' }, { type: 'header', key: 'purpose', value: 'prefetch' }],
}] };
```
`withApi` mints its own request ID for excluded routes (ARC-18). Other headers (HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Frame-Options: DENY`) go in `next.config.ts` `headers()` (plan §3.4). Set `serverActions.bodySizeLimit` under `experimental.serverActions` [CITED: serverActions.md in installed docs shows `experimental: { serverActions: { bodySizeLimit } }`]; value `'6mb'` per the review (Phase 4 needs uploads, but setting it now keeps `next.config.ts` complete; optional).

### Pattern 7: Cache adapter (ARC-02, ARC-03)
`src/server/cache.ts` exports `cached(fn, keyParts, tags)` (real: `unstable_cache(fn, keyParts, { tags })`) and `invalidate(...tags)` (real: `revalidateTag(tag, { expire: 0 })`). Fake: `cached` calls `fn` directly; `invalidate` pushes to `fakes.cache.invalidated`. Verified in installed docs: `revalidateTag(tag, profile)` second argument required; `{ expire: 0 }` is the documented way from Route Handlers/webhooks; one-argument form is deprecated; `unstable_cache` is documented as "replaced by `use cache`" but remains available [CITED: next docs `revalidateTag.md`, `unstable_cache.md`]. Phase 1 needs the adapter and its fake only if contracts/DTO tests reference it; services that use it arrive in Phase 4. **Knip risk:** an exported `cache.ts` with no importer is flagged; either exercise it in a Phase 1 test (fake behaviour test) or defer the file to Phase 4 and list the contract in `docs/contracts.md` only. Recommend the former, because ADR/contract says the fake must exist.

### Pattern 8: IST date helpers (B19, QA-10, QA-14, D-01..D-04)
Verified on Node 24.22.2 (ICU 78.3, CLDR 48.0) [VERIFIED: spike]:
- `Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(124999)` → `₹1,24,999`.
- `Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'})` on `2027-09-03T18:30:00Z` → `4 Sept 2027`; `formatToParts` returns month part `Sept`. So `formatDate` must replace a `Sept` month part with `Sep` (D-01). Also `new Date('2026-12-31T18:30:00Z')` formats as `1 Jan 2027` (the B19 case).
- Vitest `test: { env: { TZ: 'UTC' } }` makes the whole suite run with `process.env.TZ === 'UTC'` and `new Date('2027-01-01T00:00:00+05:30').getDate() === 31` locally; `Intl` with `Asia/Kolkata` still yields `1 Jan 2027`. Use this config for B19 (plus one test file that also asserts the helper is unaffected by a non-UTC TZ via `vi.stubEnv` is unnecessary).
Helpers: `fromIstDay('2027-03-12')` → `Date` at 00:00 IST (`2027-03-11T18:30:00.000Z`); `toIstDay(date)` → `'YYYY-MM-DD'` computed from `Asia/Kolkata` parts, never from `getDate()`. `isBookable(startDate, now)` ⇔ `toIstDay(start) > toIstDay(now)` (string comparison is safe for ISO days). `tripStatus(startDate, durationDays, now)`: last day = `addDaysIst(toIstDay(start), duration-1)`; `'upcoming'` while `lastDay >= today`, else `'past'` (D-04, QA-14). `istMonthBounds('2027-01')` → `[fromIstDay('2027-01-01'), fromIstDay('2027-02-01'))` for the Phase 4 filter (QA-10). All take an explicit `now: Date` argument (callers pass `now()` from `clock.ts`), which keeps `src/lib` pure and safe on the client.

### Pattern 9: Models (B5, B14, B17, B20, QA-04)
Spike results (Mongoose 9.12.0) [VERIFIED]:
- Pre hooks are **async functions with no `next`**: `s.pre('save', async function () { if (!this.isModified('password')) return; this.password = await bcrypt.hash(this.password, cost); if (!this.isNew) this.passwordChangedAt = new Date(); })`. New users get no `passwordChangedAt` (undefined), changed passwords get one. Use cost 12 in production and a low cost (e.g. 4) under test via config, so tests stay fast (ASSUMED value; plan says cost 12).
- `findByIdAndUpdate` does **not** run validators by default (name `'x'` was accepted); with `{ runValidators: true }` it rejects ("minimum allowed length"). `{ returnDocument: 'after' }` returns the updated doc. Prescription (QA-04): services load → assign → `save()` so hooks and validators run; `findByIdAndUpdate` only for B6 rating fields (Phase 6).
- `select: false` works: `findById` returns no `password`; `.select('+password')` returns the hash (`$2…`).
- `CastError` name verified for `findById('nope')`.
- Register as `(mongoose.models.User as Model<UserDoc> | undefined) ?? model<UserDoc>('User', schema)` (B17). Caveat for dev: edits to a schema are not picked up by hot reload until restart; mention in README (ASSUMED but standard consequence).
Fields: copy `plan.md` §1.3 [VERIFIED: plan.md:122-186] **minus `priceDiscount`** (D-05). `Tour.price` integer > 0 whole rupees (add `validate: Number.isInteger`), `startDates: Date[]` each IST midnight (validator: `toIstDay(d)` round-trips `fromIstDay`), `images` ≤ 3, indexes `{ price:1, ratingsAverage:-1 }`, `{ slug:1 }` unique, `{ startLocation:'2dsphere' }`, `{ startDates:1 }`; Review unique `{ tour:1, user:1 }`; Booking `currency` literal `'inr'`, `status` enum `paid|refunded`, `stripeSessionId` unique **sparse**, indexes `{user:1}`, `{tour:1}`. No `pre(/^find/)` hooks (B12). Slug hook: regenerate when `name` modified on save (a rename changes the slug; plan-review notes the human may prefer redirects, so keep it simple and record in contracts). Slug generation needs a library or a tiny function: **Don't add `slugify`**; write a 6-line deterministic function (ASCII-fold + lowercase + hyphens) because tour names are English; if a name could produce a collision the unique index rejects it (409). This is the one hand-rolled item; it is trivial and avoids a dependency under strict knip. (ASSUMED acceptable; planner may prefer `slugify` with justification.)
Test-DB setup: `MongoMemoryServer` default mongod is 8.2.6; Atlas Free clusters run MongoDB 8.0 [CITED: mongodb.com/docs/atlas/reference/free-shared-limitations "Free clusters run MongoDB 8.0"]. Use `mongo:8.0` in `docker-compose.yml` (manifest exists, verified) and pin `MONGOMS_VERSION=8.0.x` via env/`package.json` `config.mongodbMemoryServer.version` so tests match Atlas (exact 8.0.x patch to be chosen at execution; ASSUMED that the binary is downloadable for macOS arm64 and Linux CI).

### Anti-Patterns to Avoid
- **Module-scope `schema.parse(process.env)`** in `config.ts`: runs during `next build` prerender (ARC-07).
- **Static pages with a CSP nonce**: no nonce on scripts (Pitfall 1).
- **Throwing from `register()` to "refuse to start"** (Pitfall 2).
- **`import 'server-only'` in files that scripts must import** (`config-schema.ts`, `check-*.ts` inputs).
- **Putting `access` default in `withApi`/`action()`**: SEC-15.
- **Returning Mongoose/Mongo error messages**: leaks collection, index and values (SEC-11).
- **Exporting unused contract symbols** (knip).
- **Building URLs from `Host`/`X-Forwarded-*`**: use `APP_URL` only (SEC-12).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification, alg pinning | Custom HMAC code | `jose` `SignJWT` / `jwtVerify({ algorithms:['HS256'], requiredClaims })` | alg-confusion, `none`, clock skew handled; verified in spike |
| Password hashing | Custom KDF | `bcryptjs` | plan §2 |
| Input validation + config | Manual checks | Zod 4 (`z.strictObject`, `z.flattenError`, `z.email`) | S4/S7; error shapes verified |
| Re-throwing Next control-flow errors | Digest string checks | `unstable_rethrow` from `next/navigation` | covers redirect, notFound, forbidden, unauthorized, dynamic-usage errors; verified |
| Structured logging with redaction | `console.log` JSON | `pino` with `redact` | D7/SEC-11; `no-console` enforced |
| Currency/date formatting | String concatenation, `toFixed` | `Intl.NumberFormat` / `Intl.DateTimeFormat(...).formatToParts` | B19/B20; only the `Sept`→`Sep` patch is custom |
| In-memory Mongo for tests | Mocking Mongoose | `mongodb-memory-server` | Q7 |
| CSS/JS budget measurement | Parsing `.next` manifests | Lighthouse CI `resource-summary:script:size` | Next 16 dropped "First Load JS" (ARC-05); LHCI uses `transferSize` (verified in source) |
| Unused-code detection | Custom grep | `knip` | Q11 |
| Dependency updates | Manual | Dependabot (`npm` + `github-actions`) | S18 |
| Slug | `slugify` dependency | 6-line pure function (only exception) | tour names are English; avoids a strict-knip dependency |

**Key insight:** the foundations here are all "deceptively small" security primitives (alg pinning, redirect pass-through, error leakage). Use the library behaviours verified above and write tests that pin them; the only custom code that earns its keep is the glue (`withApi`, `action()`, error mapper, IST helpers).

## Common Pitfalls

### Pitfall 1: Static page + nonce CSP = all scripts blocked
**What goes wrong:** `next build` marks `/` as `○ (Static)`. The CSP header (with a nonce) is added by proxy at request time, but the prerendered HTML's `<script>` tags have **no `nonce` attribute** (0 occurrences in the spike). With `'strict-dynamic'` and no `'unsafe-inline'` the browser blocks every Next script.
**Why:** Next applies nonces only during request-time rendering [CITED: CSP guide: "must use dynamic rendering to add nonces"].
**How to avoid:** root `layout.tsx` is `async` and does `await connection()` (from `next/server`). Spike: after that, build shows `ƒ /` and `ƒ /_not-found`, and scripts carry `nonce="…"`. Later phases keep it dynamic via `getCurrentUser()`.
**Warning signs:** build output shows `○` for any route; `curl` of the HTML contains `<script src=…>` without `nonce=`.

### Pitfall 2: `register()` throw does not stop the server
**What goes wrong:** invalid config appears to "start" (`✓ Ready`) but every request returns 500, which fails the success criterion "refuses to start with a message naming the key".
**How to avoid:** log to stderr then `process.exit(1)` (Pattern 1). Test: spawn `next start` with a missing key in a child process? That requires a build; instead unit-test `loadConfigOrExit` with `process.exit` stubbed, and have CI start the built app once with a bad env and assert exit code 1 (cheap, in the LHCI/build job).
**Also:** `no-console` forbids `console.error`; use `process.stderr.write`.

### Pitfall 3: `.gitignore` from the scaffold
The scaffold ignores `.env*`, which hides `.env.example` (S18), and does not ignore `dist`, `.lighthouseci`, `playwright-report`, `test-results`, `blob-report` (D9). Fix: keep `.env*` and add `!.env.example`; add `/dist/`, `/.lighthouseci/`, `/playwright-report/`, `/test-results/`, `/blob-report/`, `/playwright/.cache/`, `*.tsbuildinfo` (already), `.DS_Store` (already). `next-env.d.ts` is ignored by the scaffold; fine.

### Pitfall 4: Scaffold defaults conflict with locked decisions
`create-next-app@16.4.5` without flags wrote `cacheComponents: true` and `partialPrefetching: true` into `next.config.ts` (observed); with `--no-cache-components` the file is an empty config. It also installs `next/font/google` Geist in `layout.tsx`, starter CSS (fails stylelint-config-standard with 7 errors, observed), logos in `public/`, a README, and `@types/node ^20` (must be ^24). `--no-agents-md` and `--no-agent-feedback` exist on stable [VERIFIED: `--help` output]. Delete all starter UI, `public/*`, `globals.css`, `page.module.css`, and do **not** import `next/font/google` (network at build + styling is Phase 3).

### Pitfall 5: Node version on the developer's Mac
Local default is Node 22.21.1, below stylelint 18's `^22.22.2 || ^24.15.0` and vitest/knip are fine. README must say `brew install node@24` (D-11) and the `.nvmrc` contains `24`. CI: `actions/setup-node` with `node-version-file: .nvmrc`. Latest Node 24 today is 24.22.2 (`Krypton`) [VERIFIED: nodejs.org dist index]. Add `engines.node` `>=24.15 <25` (or `<27` per ARC-22) and `.npmrc` `engine-strict=true` so a wrong Node fails loudly (ASSUMED helpful, low risk).

### Pitfall 6: `server-only` and `next/cache` outside Next
`server-only` throws on plain import (exports map sends only the `react-server` condition to `empty.js`) [CITED: findings-architect ARC-04, package exports read there]. Vitest alias verified: `resolve.alias: { 'server-only': path.resolve(import.meta.dirname, 'empty.ts') }` made `import 'server-only'` succeed in a test. `unstable_cache` and `revalidateTag` throw "Invariant…" outside a request [CITED: ARC-03, read from Next source], so route all use through `cache.ts` and mock/fake it. Scripts (check-env etc.) import only files without `server-only`.

### Pitfall 7: stylelint with zero CSS files
Verified: `stylelint "nothing/**/*.css"` exits 1 with `NoFilesFoundError`; `--allow-empty-input` passes. Phase 1 has no CSS. Script: `"lint:css": "stylelint --allow-empty-input \"src/**/*.css\""`. Provide a real `stylelint.config.mjs` extending `stylelint-config-standard` (U1/U3 custom rules arrive in Phase 3). A missing config yields `ConfigurationError` (verified).

### Pitfall 8: eslint-plugin-security noise breaks zero-warnings
`security.configs.recommended` makes `security/detect-object-injection` a **warning** (flagged `o[h]` in the spike). With `--max-warnings=0` and `noUncheckedIndexedAccess` code full of `record[key]`, this will fail CI constantly. Recommendation: keep the rest of the plugin, set `'security/detect-object-injection': 'off'` with a comment and an ADR line (it is known for false positives; Zod/allowlists cover real injection, S7). [VERIFIED: spike; judgement ASSUMED]. Also verified: `react/no-danger` and `no-console` both fire as errors alongside eslint-config-next flat configs.

### Pitfall 9: Strict knip vs. a contract-heavy phase
Verified: knip reports unused **files** and unused **devDependencies** (e.g. `prettier` was flagged until referenced by a script; `eslint-plugin-security` was flagged until imported by `eslint.config.mjs`), recognises `src/proxy.ts` and `src/instrumentation.ts` as Next entries (not reported), and reported an orphan `src/lib-unused.ts`. Consequences: (a) every Phase 1 export must be imported by app code or a test (knip treats Vitest tests as entries); (b) write `knip.json` entries for `scripts/*.ts`, `test/**`, `vitest.config.ts`; (c) reference `prettier` in an npm script (`format:check`), `stylelint` in `lint:css`, `@lhci/cli` in the LHCI script, `pino-pretty` as a pino transport string (knip may not see it; add it via `ignoreDependencies: ['pino-pretty']` **only if** needed, and justify in ADR, since CONTEXT forbids an ignore list for not-yet-used packages but pino-pretty is used by a string target). Types-only packages `@types/*` are handled by knip.

### Pitfall 10: Mongo client choices that lose the 5 s promise
`serverSelectionTimeoutMS` alone is not enough because Mongoose buffers commands for `bufferTimeoutMS` (10 s default) when the connection drops (QA-19). With `bufferCommands:false` the failure is immediate or at the selection timeout (spike: 1.5 s with a 1.5 s setting). Tests must not rely on Vitest's default 5 s test timeout; set `DB_SERVER_SELECTION_TIMEOUT_MS` lower (e.g. 500) in the B10 test.

### Pitfall 11: Origin and CORS inconsistencies (SEC-26, SEC-12)
Origin check must accept `APP_URL`'s origin and entries of `CORS_ORIGINS`, and accept a missing `Origin` (curl/admin scripts; `SameSite=Lax` already blocks cross-site cookie sends). CORS: never send `Access-Control-Allow-Credentials`; `withApi` answers `OPTIONS`; default `CORS_ORIGINS` empty. Next's Server Action origin check is separate and `serverActions.allowedOrigins` must stay unset [CITED: serverActions.md "If not set, only the same origin is allowed"].

### Pitfall 12: Test-only gotchas
- `callRoute` must pass `params` as a **Promise** (Next 16) and default `Origin` to `APP_URL` so writes are not rejected (QA-17, ARC wording fixes).
- `fakes.rateLimit.reset()` between tests.
- Coverage `include: ['src/server/**/*.ts']` with `exclude` for `src/server/config.ts`/real adapters (QA-23). A per-glob threshold whose glob matches no file (no `service.ts` exists yet in Phase 1) **did not fail** in the spike, so the Q6 85% threshold can be configured now.
- React `cache()` does not dedupe under Vitest (see Pattern 3).
- Fake timers: only `['Date']` (verified safe with Mongo + jose).

### Pitfall 13: Local `main` is 6 commits ahead of `origin/main`
CI runs only after a push; pushing is a user-authorised action. The plan should end with an explicit human checkpoint ("push `main`, confirm the first GitHub Actions run is green"), because success criterion 4 cannot be verified without it. `actions/checkout` latest is v7.0.1, `actions/setup-node` v7.1.0, `actions/upload-artifact` v7.0.2 [VERIFIED: `gh api releases/latest`].

## Code Examples

### Zod 4: strict input, flattened errors, centralised messages (DES-12)
```ts
// Verified output (Zod 4.6.7): issues = [{code:'invalid_format', path:['email'], message:'Enter a valid email.'},
//   {code:'too_small', path:['password'], message:'Your password needs 8 to 72 characters.'},
//   {code:'unrecognized_keys', path:[], message:'Unrecognized key: "role"'}]
//  z.flattenError(error) -> { formErrors:[…], fieldErrors:{ email:[…], password:[…] } }
import { z } from 'zod';
import { messages } from '@/lib/messages';
const schema = z.strictObject({
  email: z.email({ error: messages.email.invalid }),
  password: z.string().min(8, { error: messages.password.length }).max(72, { error: messages.password.length }),
});
```
Zod 4 uses `{ error: … }` (not `{ message }` in the common path) and top-level `z.email()`. Missing fields otherwise read "Invalid input: expected string, received undefined" (verified) which is exactly the default text DES-12 forbids reaching users, so every schema takes its messages from `messages.ts` and `action()`/`withApi` map by issue `code` for fallbacks.

### Vitest config skeleton (verified pieces)
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: {
    '@': path.resolve(import.meta.dirname, 'src'),
    'server-only': path.resolve(import.meta.dirname, 'test/empty.ts'),   // verified alias pattern
  } },
  test: {
    env: { TZ: 'UTC', APP_ENV: 'test' },                                   // verified: process.env.TZ === 'UTC'
    globalSetup: ['test/global-setup.ts'],                                 // one mongod; unique db per file
    setupFiles: ['test/setup.ts'],                                         // next/headers mock, fakes reset
    coverage: { provider: 'v8',
      include: ['src/server/**/*.ts'],
      exclude: ['src/server/config.ts', 'src/server/adapters/**/real-*.ts'],
      thresholds: { lines: 75, 'src/server/modules/**/service.ts': { lines: 85, perFile: true } } },  // glob with no match did not fail
  },
});
```
`@` alias is declared manually; whether Vite 8 can read `tsconfig` paths natively is ASSUMED and not needed.

### Lighthouse CI for the R9 floor
```jsonc
// lighthouserc.json  (assertion key format verified in @lhci/utils source; unit = bytes; falls back to transferSize)
{ "ci": {
  "collect": { "url": ["http://localhost:3000/"], "numberOfRuns": 3,
    "startServerCommand": "npm run start", "startServerReadyPattern": "Ready",
    "settings": { "preset": "desktop", "chromeFlags": "--no-sandbox" } },
  "assert": { "assertions": { "resource-summary:script:size": ["error", { "maxNumericValue": <floor + 40960>, "aggregationMethod": "median" }] } } } }
```
`size` falls back to `transferSize` [VERIFIED: @lhci/utils/src/assertions.js lines 345-347 and lighthouse `computed/resource-summary.js`], so the baseline is compressed transfer size; `next start` compresses responses by default (ASSUMED; confirm the measured value is much smaller than the raw chunk sizes). `scripts/measure-bundle.ts` reads `.lighthouseci/lhr-*.json`, takes the median of `audits['resource-summary'].details.items.find(i => i.resourceType==='script').transferSize`, and writes `docs/bundle-baseline.json` (`{ floorBytes, budgetDeltaBytes: 40960, measuredAt, route: '/', lighthouse: '13.6.0', next: '16.4.5' }`); in CI the script runs in `--check` mode. Mobile vs desktop preset is a choice (U24 is mobile); pick `mobile` default settings for consistency with Phase 7 (ASSUMED). The server needs `APP_ENV=ci`, `MONGODB_URI` etc. so `register()` passes; `/` itself never touches the DB.

### Conventional commit + CI step list
`feat(session): pin HS256 and reject stale tokens [S14, B14] (01-03)` (CONTEXT). CI job order: `npm ci` → `typecheck` → `lint` (`eslint --max-warnings=0`) → `lint:css` → `format:check` → `check:client` → `check:env` → `audit` (`npm audit --audit-level=high`) → `knip` → `test:coverage` → `build` (with **empty** env to prove ARC-07: only `APP_ENV=ci` needed) → `lhci` collect+assert+baseline check. Note: build with no secrets works because `register()` is not called at build (verified) and config is lazy.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts`, exported `proxy`, Node runtime default | Next 16.0 | CSP nonce proxy (verified); no `runtime` config allowed |
| `revalidateTag(tag)` | `revalidateTag(tag, { expire: 0 })` (or `'max'`), `updateTag` in actions only | Next 16 | Cache adapter (Pattern 7) |
| First Load JS in build output | Removed; use Lighthouse / `next analyze` | Next 16 | R9 via LHCI (D-10) |
| `unstable_cache` | `use cache` + Cache Components | Next 16 | Intentionally NOT used (nonce CSP incompatible); `unstable_cache` still exists |
| Mongoose pre hooks with `next` | async hooks, no `next()` | Mongoose 9 | Verified; `returnDocument:'after'` replaces `new:true` |
| Zod 3 `{ message }`, `z.string().email()` | Zod 4 `{ error }`, `z.email()`, `z.strictObject`, `z.flattenError` | Zod 4 | Verified output shapes |
| TypeScript latest | TS 7 native compiler is `latest` but unsupported by typescript-eslint (`<6.1.0`) | 2026 | Pin 5.9.3 |
| tsx for scripts | Node 24 native TypeScript | Node 22.18+/24 | Verified |

**Deprecated/outdated:** `NextRequest.ip` (removed in 15; per-IP rate-limit IP source is a Phase 5 decision), `@react-email/components` (Phase 5), `next/image` `priority` (Phase 4), `cacheComponents` (disabled by design).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Cookie writes allowed only in Server Actions/Route Handlers in Next 16.4.5 | Pattern 3 | `session` set/clear helper placed wrongly; confirm in installed `cookies.md` |
| A2 | Real Stripe SDK signature error has `type: 'StripeSignatureVerificationError'` | Pattern 5 | Error mapper misses it in Phase 6; Phase 1 maps via fake only |
| A3 | `mongodb-memory-server` can download an 8.0.x binary on macOS arm64 and Linux CI | Pattern 9 | Tests fail to start; fall back to default 8.2.6 |
| A4 | `next start` serves gzip so LHCI `transferSize` ≈ gzipped size | Code Examples | Baseline too large; adjust or document |
| A5 | Disabling `security/detect-object-injection` is acceptable | Pitfall 8 | Needs user's OK only if they want that rule; recorded in ADR |
| A6 | Script-based checks for Q3/Q5 (no ESLint plugin) | Don't Hand-Roll / Plan slicing | Minor; alternative is `eslint-plugin-unicorn` |
| A7 | Slug function is hand-rolled instead of a library | Pattern 9 | Edge cases in non-ASCII names; none in seed |
| A8 | `--no-sandbox` Chrome flag needed on GitHub runners | Code Examples | LHCI fails to launch; flip flag |
| A9 | `engine-strict` in `.npmrc` helps local DX | Pitfall 5 | Could block a dev on Node 24.0 to 24.14; relax |
| A10 | bcrypt cost 4 under test is fine | Pattern 9 | None |
| A11 | Config key names (`APP_ENV`, `APP_URL`, `APP_NOW`, `SESSION_SECRET`, `CORS_ORIGINS`, `MONGODB_URI`, `DB_SERVER_SELECTION_TIMEOUT_MS`, `LOG_LEVEL`) | Plan slicing | Naming only; settle in contracts |
| A12 | Vitest 5 can alias `@` without a tsconfig-paths plugin (manual alias used) | Code Examples | None; manual alias verified pattern |
| A13 | `deps.ts` returns fakes for `development`, `test`, `ci` and throws for staging/production until real adapters land | Open Questions | Dev experience in Phases 2-4 |

## Open Questions (RESOLVED)

Resolved by the planner on 9 Nov 2026 under Claude's Discretion (CONTEXT.md); each is carried into the named plan and ADR.

1. **`CastError` mapping: 400 or 404?** RESOLVED: `VALIDATION_ERROR` 400 for malformed IDs; services throw `NOT_FOUND` for well-formed missing IDs. Plan 01-11, ADR 0017, `docs/contracts.md`.
2. **What does `deps.ts` do in `development` in Phases 1-4?** RESOLVED: fakes for `development|test|ci`; in `staging|production` the mail, queue, storage, Stripe and rate-limit adapters throw a clear error until their real adapters land; the cache adapter is real outside `test`. Plan 01-10, ADR 0016.
3. **Hash cost and `SESSION_SECRET` in `.env.example`.** RESOLVED: bcrypt cost 12, and 4 only under `APP_ENV=test` (plan 01-07). `.env.example` lists every key with a comment; secret values stay empty (with a "generate with openssl rand -base64 48" comment), and `check:env` fails if a secret-named key has a value. The rewritten CLAUDE.md states that `.env.example` is configuration, not visible content. Plans 01-02 and 01-04, ADR 0010.
4. **Mobile vs desktop Lighthouse preset for the floor.** RESOLVED: Lighthouse's default mobile emulation, so the floor matches Phase 7's U24 runs. Plan 01-13, ADR 0018.
5. **Should `docs/bundle-baseline.json` be rewritten by CI or only checked?** RESOLVED: recorded locally with `npm run bundle:record` and committed; CI runs `npm run bundle:check` only. Plan 01-13, ADR 0018.
6. **Does the user want `eslint-plugin-security` retained with one rule off (A5)?** RESOLVED: keep the plugin's recommended config with only `security/detect-object-injection` off, explained in ADR 0009. Plan 01-03.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 24.15+ | stylelint 18, project engines | ✗ (machine has 22.21.1) | 22.21.1 (`/opt/homebrew/opt/node@22`) | `brew install node@24` per D-11; `npx node@24` works for one-offs (24.22.2 verified) |
| npm | install | ✓ | 10.9.4 | — |
| Docker + Compose v2 | local MongoDB (D-12) | ✓ | 28.5.1 | `mongo:8.0` manifest verified; or rely on tests only |
| MongoDB (container) | dev server | ✗ not running | — | `docker compose up -d mongo` |
| Network (fastdl.mongodb.org, npm) | mongodb-memory-server binary, installs | ✓ (binary 8.2.6 downloaded in spike) | — | — |
| Google Chrome | Lighthouse CI locally | ✓ | `/Applications/Google Chrome.app` | CI uses ubuntu runner Chrome |
| GitHub CLI, authenticated | push/verify CI | ✓ | account `rithik56` | — |
| GitHub remote | CI | ✓ public repo `rithik56/natours-claude`, `main` is 6 commits ahead | — | user must authorise `git push` |

**Missing dependencies with no fallback:** none blocking, but **Node 24 must be installed before any script runs** (Phase 1's first plan must start with a human step or `nvm`-less `brew install node@24` + PATH check; Homebrew `node@24` is keg-only like node@22, so add it to PATH).
**Missing with fallback:** local MongoDB (start via compose).

## Security Domain

`security_enforcement` is enabled; ASVS level 1, block on high [VERIFIED: .planning/config.json]. Phase 1 builds the controls.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (session verification only; login flows are Phase 5) | `jose` HS256 pinned, `exp` required, bcryptjs hook |
| V3 Session Management | yes | httpOnly/secure/lax cookie, 7-day `exp` = `maxAge`, stale-token rejection, DB re-read per request |
| V4 Access Control | yes | default-deny `access` option, `requireRole` explicit lists, DB-sourced role |
| V5 Input Validation | yes | Zod 4 strict schemas; `parseQuery` with defaults |
| V6 Cryptography | yes | no hand-rolled crypto: jose, bcryptjs, `crypto.randomUUID()` for IDs/nonce |
| V7 Error handling & logging | yes | standard error format, no stack traces, pino `redact` |
| V8 Data protection | yes | DTO mappers, `select:false` fields, email only in `toSelf`/`toAdminUser` |
| V13 API / V14 Config | yes | CORS allowlist, origin check, CSP + headers, env validation, secret scanning checks |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JWT alg confusion / `none` | Spoofing | `algorithms: ['HS256']` (verified rejects HS512 and `none`) |
| Stale session after password change | Spoofing/EoP | `iat` ≥ `floor(passwordChangedAt/1000)` (SEC-18) |
| Role escalation via stale token | EoP | role read from DB every request, no role in JWT |
| Missing auth on a route | EoP | required `access`, runtime refusal |
| CSRF on API writes | Tampering | `SameSite=Lax` + origin check on POST/PUT/PATCH/DELETE; Server Actions rely on Next's built-in origin compare |
| Cross-origin API use | Info disclosure | CORS only for `CORS_ORIGINS`, no credentials |
| XSS | Tampering | nonce CSP `strict-dynamic`, no `dangerouslySetInnerHTML` (`react/no-danger`), React escaping |
| Open redirect | Tampering | `safeNext()`: only paths starting with a single `/` (reject `//`, `/\`, schemes) |
| Reset-link/host-header poisoning | Spoofing | `APP_URL` only (SEC-12) |
| Info leak via errors/logs | Info disclosure | AppError messages only; Mongo/Mongoose messages logged, never returned; pino `redact` for password, cookie, authorization, stripe-signature, tokens, URL token segments |
| Mass assignment | Tampering | `z.strictObject` (verified: unrecognized keys → issue) |
| Supply chain (slopsquatting, malicious postinstall) | Tampering | package audit above, `npm audit`, Dependabot, one human-verify checkpoint; only `mongodb-memory-server` has a postinstall (read, benign) |
| Booking/ReDoS in dev tooling | DoS | not applicable in Phase 1 |

CVE-2025-29927 note (SEC-01): Next 16 runs `proxy.ts` regardless of `x-middleware-subrequest`; tests must instead prove checks work when `proxy.ts` is bypassed (present-but-invalid cookie, direct calls with `mockSession(null)`). Phase 1 delivers the helpers; Phase 5 writes the S23 tests.

## Suggested Plan Slicing (input for the planner)

Mode is `mvp` (vertical slice), but this phase is infrastructure: the "user" is a developer; the vertical slice is "clone → install → `docker compose up -d mongo` → `npm run dev` → open `/` → `npm test` → CI green". Suggested ordering with dependencies:

| Plan | Scope | Depends on | Notes |
|------|-------|-----------|-------|
| 01-01 | Human step: Node 24; package-list checkpoint. Scaffold via `create-next-app` in a temp dir with the flags above, copy in, delete starter UI; pin versions; `.gitignore`, `.nvmrc`, `.npmrc`, `.env.example`, tsconfig (`noUncheckedIndexedAccess`, `allowImportingTsExtensions`), ESLint/Prettier/stylelint/knip/Vitest configs, npm scripts, `docker-compose.yml` (mongo:8.0, named volume, 127.0.0.1 port), `/` page + `<html lang="en-IN">` + `await connection()`; commit `docs/plan-review/`; rewrite root `CLAUDE.md` (DEL-23); ADR 0001 versions | — | knip must pass with only what exists |
| 01-02 | `.github/workflows/ci.yml` (initially: typecheck, lint, css, format, knip, audit, build with empty env), `dependabot.yml`, `check-env.ts`, `check-client-boundaries.ts`, `check-conventions.ts` | 01-01 | Gates exist "from the first commit"; add steps as scripts land |
| 01-03 | `config-schema/config`, `instrumentation.ts`, `clock`, `logger` (pino + redact), `errors`, `messages`, `format`, `ist` + tests (B19/B20/D-01..D-04, UTC) | 01-01 | Pure and fast; no DB |
| 01-04 | `db.ts`, four models + hooks, DTO mappers, `usersService.findActiveById`, test DB helpers + global setup, model tests (B5, B14, B17, B20, S3 key-absence) | 01-03 | Needs mongodb-memory-server |
| 01-05 | `session`, `redirects/safeNext`, `getCurrentUser`, `requireUser/Role`, `withApi`, `action`, `parseQuery`, response helpers, error mapper, origin/CORS, `proxy.ts`, `next.config.ts` headers, `/healthz`, `/readyz` + tests (S1, S9, S10, S11, S14, B9, B10, B13, B18, D7) | 01-04 | Largest plan; consider splitting session vs pipeline |
| 01-06 | Fakes (mailer, storage, Stripe, queue, rate limit, cache), `deps.ts`, `createUser/Tour/Booking/Review`, `callRoute`, `mockSession`, three example tests (Route Handler via `/readyz`; Server Action fixture; page data function fixture) | 01-05 | All fixtures use seed JSON (D-08) |
| 01-07 | `lighthouserc.json`, `measure-bundle.ts`, `docs/bundle-baseline.json`, CI LHCI + bad-env start check; coverage thresholds enforced | 01-06 | Needs a built app |
| 01-08 | `docs/contracts.md` (exact signatures), ADRs for each PROJECT.md Key Decision + D-05/06/07/09/10, README (setup, scripts, structure, commit convention), final verification; **human checkpoint: push and confirm CI green** | all | Contracts should be written from the code, not before |

Each task commit cites requirement IDs and the plan, e.g. `feat(db): fail fast without a database [B10, B17] (01-04)`.

## Sources

### Primary (HIGH confidence)
- `/Users/rithikagarwal/Desktop/natours-claude/.planning/phases/01-foundation-and-contracts/01-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/config.json`: read in full this session.
- `plan.md` lines 16-70, 118-340 (data model, API, pages, actions), 322-552 (stack, architecture, contracts), 555-612 (S and B), 614-632 (R), 847-872 (Q), 926-950 (Phase 0): read this session.
- `docs/plan-review/findings-{architect,security,qa,delivery,design}.md`: all findings assigned to Phase 1 read.
- Installed Next 16.4.5 docs (`node_modules/next/dist/docs/01-app/...`, from a scratch install): `proxy.md`, `instrumentation.md`, `unstable_cache.md`, `revalidateTag.md`, `unstable_rethrow.md`, `connection.md`, `serverActions.md`, CSP guide.
- Context7 `/vercel/next.js/v16.2.9`: CSP nonce proxy example, matcher, `serverActions.allowedOrigins`, instrumentation `register`.
- Spikes run this session (scratchpad, not committed): Next 16.4.5 build/start with `proxy.ts` + `instrumentation.ts`; Mongoose 9.12.0 + mongodb-memory-server 11.3.0 hooks/validators/duplicate/Cast/connection failure; jose 6.2.15 alg/exp/iat; Zod 4.6.7 shapes; Vitest 5.1.0 alias/TZ/coverage glob/fake timers; ESLint 9 + eslint-config-next + eslint-plugin-security; stylelint 18 + config-standard 41; knip 6.44.2; Node 24.22.2 Intl output; Node 24 TypeScript stripping.
- `@lhci/utils@0.16.0` source (`assertions.js`) and `lighthouse@13.6.0` `computed/resource-summary.js`: size vs transferSize.
- npm registry (`npm view`) for all versions/peers/engines; nodejs.org dist index and `nodejs/Release` schedule; GitHub releases API for Actions versions.

### Secondary (MEDIUM confidence)
- MongoDB Atlas docs (via WebSearch result summary): "Free clusters run MongoDB 8.0" (mongodb.com/docs/atlas/reference/free-shared-limitations). The tool summary also cited a non-official April 2026 tutorial; I rely only on the official statement and recommend the user confirm in the Atlas UI during Phase 8.
- LHCI configuration docs (raw GitHub `docs/configuration.md`): assertion key format, `startServerCommand`, `startServerReadyPattern`, `numberOfRuns`.

### Tertiary (LOW confidence)
- Items tagged `[ASSUMED]` in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, versions read from registry and installed together in scratch projects (one ERESOLVE found and resolved).
- Architecture: HIGH, key behaviours reproduced; the contract shapes follow `plan.md` plus review findings.
- Pitfalls: HIGH for the spike-verified ones (1, 2, 3, 4, 7, 8, 9, 10), MEDIUM for environment-dependent ones (5, 13, A3, A4, A8).

**Research date:** 2026-11-08
**Valid until:** about 2026-11-22 (fast-moving: Next, Vitest, eslint-config-next and Node 24.x patch releases land weekly; re-run `npm view` for exact patch versions when ADR 0001 is written)
