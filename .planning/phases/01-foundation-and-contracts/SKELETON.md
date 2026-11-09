# Walking Skeleton — Natours v2

**Phase:** 1
**Generated:** 2026-11-09

## Capability Proven End-to-End

A developer clones the repository, runs `npm ci`, `docker compose up -d mongo` and `npm run dev`, and opens `/`. That page is server-rendered per request, inside `<html lang="en-IN">`, with a per-request CSP nonce on every script. `/readyz` gives 200 from a real MongoDB ping, and 503 within about 5 seconds once MongoDB is stopped. `npm test` runs against an in-memory MongoDB, and the same gates run in GitHub Actions on every push.

The thinnest slice is plan 01-01's tracer task: browser to `next start`, then the server-rendered `/`; and curl to `/readyz`, then `db.ts`, then MongoDB. Plans 01-02 to 01-15 expand from it without changing its architecture.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.4.5, App Router, React 19.3, TypeScript 5.9 (`strict`, `noUncheckedIndexedAccess`), Node.js 24 LTS | Fixed by plan.md §2. TypeScript stays on 5.9 because typescript-eslint supports only below 6.1. Node 26 was considered and not chosen (D-11, ADR 0001). |
| Rendering | Server Components only in Phase 1, and every page dynamic (`await connection()` in the root layout). Cache Components off; public data later cached through the `unstable_cache` adapter | A per-request CSP nonce needs request-time rendering (RESEARCH Pitfall 1, ADR 0012). |
| Data layer | MongoDB 8.0 with Mongoose 9. The connection is cached on `globalThis`, with `bufferCommands: false` and a 5 s server-selection timeout. Models are registered with `mongoose.models.X ?? model()`. Tests use mongodb-memory-server, one server per run with a database per file. | B10, B17 and Q7. Atlas M0 runs 8.0, so Phase 8 has no version surprises (D-12). |
| Data to the browser | DTO mappers only: string ids, ISO timestamps, IST `YYYY-MM-DD` days, and no sensitive fields (`toPublicUser` has no email; `toSelf` is for the current user) | S3, R6, SEC-10 and SEC-11 (ADR 0013). |
| Auth | An HS256 JWT pinned to one algorithm (jose) in an httpOnly, sameSite lax cookie lasting 7 days, with no role in the token. `getCurrentUser()` re-reads the user and role from the database on every request, and rejects tokens issued before `passwordChangedAt` at second precision. bcryptjs cost 12. | S14 amended, S9, SEC-02, SEC-18 (ADR 0015). |
| Request pipeline | `proxy.ts` handles the request ID and nonce CSP. `withApi` (Route Handlers) and `action()` (Server Actions) require an `access` declaration and refuse at runtime without one. Errors are mapped to the §4.1 envelope with the request ID. pino JSON logs with redaction. | S1, S9 to S11, B9, B18 and D7 (ADRs 0011 and 0017). |
| Config | Zod schema validated in `instrumentation.ts` `register()`, which calls `process.exit(1)` naming the bad keys. APP_ENV is separate from NODE_ENV; APP_URL is the only public origin. | D4, QA-21 and SEC-12 (ADR 0010). |
| Outside world | Interfaces plus fakes for mail, email queue, storage, Stripe and rate limiting, chosen by APP_ENV through `deps.ts`. Staging and production refuse fakes. | plan.md §3.2 rule 9 and Q7 (ADR 0016). |
| Deployment target (Phase 1) | Documented local full-stack run (README quick start), with MongoDB in `docker compose` and `next start` checked by `npm run smoke`, plus CI on GitHub Actions. AWS arrives only in Phase 8. | PROJECT.md Constraints, Hosting (ADR 0019). |
| Directory layout | `src/app` (routes), `src/server` (`server-only`: config, db, session, api, actions, adapters, and `modules/<name>/{model,dto,service}`), `src/lib` (code safe on both sides: format, ist, messages), `scripts/` (Node-native TypeScript checks), `test/` mirroring `src/`, and `docs/adr` | plan.md §3.3, adjusted by ADR 0024 (ARC-24). |
| Quality gates | ESLint 9 with `--max-warnings=0` (security plugin; react/no-danger and no-console as errors; model, zod and next/cache import rules), Prettier, stylelint, knip with no ignore list, the client-boundary and conventions checks, check-env, npm audit, coverage (75% for `src/server`, 85% per service file), build, smoke, and the Lighthouse CI JS budget (floor + 40 KB) | Q1 to Q11, R2, S18 and R9 (ADRs 0009 and 0018). |

## Stack Touched in Phase 1

- [x] Project scaffold: framework, build, lint and test runner (plans 01-01 and 01-03)
- [x] Routing: at least one real route. `/` (page), `/readyz` and `/healthz` (Route Handlers) (plans 01-01 and 01-11)
- [x] Database: at least one real read and one real write. `/readyz` pings MongoDB; models write and read users, tours, reviews and bookings in tests; `getCurrentUser()` reads a user per request (plans 01-01, 01-07, 01-08 and 01-09)
- [ ] UI: at least one interactive element wired to the API. Not applicable in Phase 1, by locked decision D-09: the only page is `/`, with the name and one true sentence, unstyled, until the Phase 2 design gate (plan.md §9.7). The interaction path is proven instead by `withApi` and `action()` example tests acting as real seed users (plan 01-12). Phase 3 adds the shell, and Phase 4 adds the first interactive form (the overview's GET filter form).
- [x] Deployment: a documented local full-stack run command (README quick start, plan 01-02) checked by `npm run smoke` (plans 01-04 and 01-06), plus GitHub Actions CI (plans 01-03 and 01-15)

## Out of Scope (Deferred to Later Slices)

- Any styling, `next/font`, tokens or `ui/` components (Phases 2 and 3, behind the design gate)
- Every route in plan.md §1.5 other than `/`, and every `/api/v1` route (Phases 4 to 6, D-09)
- Feature services and their contracts: tours, reviews, bookings and auth (§4.4, added per phase, ADR 0005)
- Redis, the BullMQ worker, real mail, storage and Stripe adapters, rate limits in force (Phases 4 to 6, and 8)
- The early login redirect in `proxy.ts` and protected pages (Phase 5)
- The seed script (Phase 4, ADR 0023)
- Docker image, worker bundle and graceful shutdown (Phase 5)
- Playwright, axe, screenshot tests and full Lighthouse scores (Phase 7)
- AWS deployment (Phase 8)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without changing its architectural decisions:

- Phase 2: the design direction, copy and mockups from seed content, ending with the user's approval (design gate)
- Phase 3: tokens, themes, fonts, `ui/` components, `/styleguide`, header, footer and error pages
- Phase 4: seed data, the overview with filters, the tour page with its route map, photo credits and the catalogue API
- Phase 5: sign up, log in, password reset, the account page, background email and the local container stack
- Phase 6: Stripe Checkout in INR, the webhook, My tours, reviews and admin bookings
- Phase 7: full CI, security sweep, accessibility, Lighthouse, no-JavaScript and screenshot checks
- Phase 8: one EC2 instance in Mumbai with Caddy, Atlas, S3, SES and Stripe test mode
