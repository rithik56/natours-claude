# Findings: architect

Reviewer: `architect`. Scope: plan.md §0 "Versions", §1.4–§1.6, §2, §3, §4, §7, §8 (D1–D13). Round 1, 8 November 2026 (IST).

**Sources.**
- **Next.js:** facts come from the docs bundled in `next@16.4.5` (`next/dist/docs/`, `@doc-version: 16.4.5`). That is the same version https://nextjs.org/docs/llms.txt reports ("Reference and guides for Next.js 16.4.5"). Findings cite the public URL of each page. Where the docs were unclear I read the shipped source in `next@16.4.5/dist/`.
- **Packages:** versions come from `npm view` on 8 Nov 2026.
- **Seed data:** claims were checked with Python scripts over every record in `seed/data/*.json`.

**Current versions.** next 16.4.5 and react 19.3.1. Node.js 26 has been Active LTS since 28 Oct 2026. Node.js 24 has been Maintenance LTS since 20 Oct 2026 and reaches end of life on 30 Apr 2028 (source: https://raw.githubusercontent.com/nodejs/Release/main/schedule.json).

---

### ARC-01 Blocker: "The Next.js tagged data cache" names no API, and the API Next.js 16 recommends can't be used with the nonce CSP (S11)
- **Where:** plan.md:L44–L47 (§0), L521–L524 (§4.4), L571 (S11), L626 (R5), L636–L646 (§7.2)
- **Affects:** R5, S11, B6, R7; tasks P0-1, P1-PL1, P1-CA2, P1-CA4, P1-WE1–P1-WE5
- **Problem:** R5 caches data "using the Next.js tagged data cache", and L47 lists "The tagged data cache API" as version-sensitive, but the plan never names the API. Next.js 16 has two caching models, and they can't be mixed.
  1. **Cache Components:** `cacheComponents: true` plus `'use cache'`, `cacheTag`, `cacheLife` and `updateTag`.
     - The docs recommend this model, and the `unstable_cache` page says it "has been replaced by `use cache` in Next.js 16". A lead following §0 ("check the Next.js docs") will pick it.
     - It turns on Partial Prerendering (PPR) by default, and PPR "is incompatible with nonce-based CSP".
     - It also forces every `cookies()` read and every uncached database read into `<Suspense>`, or the route fails with a "blocking-route" error. The root-layout header reads the session on every page.
  2. **The previous model:** `unstable_cache(fn, keys, { tags })` plus `revalidateTag`. It works with per-request nonces, because every page renders dynamically and the data cache still works on dynamic pages.

  `cacheTag()` throws unless `cacheComponents` is on. Three teammates each own part of this choice: `catalog` owns the tags, `platform` owns `next.config.ts` and `web` owns the pages.
- **Evidence:**
  - https://nextjs.org/docs/app/guides/content-security-policy: "When you use nonces in your CSP, **all pages must be dynamically rendered** … Pages will build successfully but may encounter runtime errors if not properly configured … **Partial Prerendering (PPR) is incompatible** with nonce-based CSP since static shell scripts won't have access to the nonce".
  - https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents: "`cacheComponents` implements **Partial Prerendering (PPR)** as the default behavior".
  - https://nextjs.org/docs/app/api-reference/functions/unstable_cache: "This API has been replaced by `use cache` in Next.js 16".
  - https://nextjs.org/docs/app/getting-started/caching: components that read `cookies`, `headers` or `searchParams` "should be wrapped in `<Suspense>`", otherwise the "blocking-route" error appears.
  - `next@16.4.5/dist/server/use-cache/cache-tag.js`: `throw new Error('`cacheTag()` is only available with the `cacheComponents` config.')`.
- **Effect on the build:** If `catalog` writes `'use cache'` and `platform` enables `cacheComponents`, one of two things happens:
  - Pages that read the session fail with blocking-route errors.
  - Or, once `web` adds Suspense boundaries, the static shell ships its scripts without the nonce. The browser then blocks every script, nothing hydrates, and every Client Component in §7.2 is dead.

  Teammates will choose differently.
- **Proposed fix:** Replace L47 with:
  > Caching uses the **previous caching model**: `cacheComponents` stays off. Public data is cached with `unstable_cache(fn, keyParts, { tags })` and cleared as R5 describes. Cache Components would turn on Partial Prerendering, which can't be used with the per-request CSP nonce (S11). Every page renders dynamically, because the root layout reads the session. No page exports `dynamic = 'force-static'` or `generateStaticParams`.

  In R5 (L626), replace "using the Next.js tagged data cache" with "using `unstable_cache` with `tags` (§0)". The alternative is Cache Components with the experimental SRI hash CSP (`experimental.sri`) instead of a nonce. That contradicts S11 as written, so I don't recommend it.
- **Confidence:** verified

### ARC-02 Major: `revalidateTag` as the plan uses it is deprecated, and its replacements either show stale data after a write or throw in Route Handlers
- **Where:** plan.md:L626 (R5), L596 (B6), L628 (R7), L603 (B13), L812 (U14)
- **Affects:** R5, R7, B6, B13, U14; tasks P1-CA2, P1-CA4, P1-WE3
- **Problem:** R5 says "services clear the tags (`revalidateTag`)". In Next.js 16:
  - The one-argument form is deprecated. It warns at runtime, it is a type error, and it "may be removed".
  - `revalidateTag(tag, 'max')` is stale-while-revalidate. The source deliberately does not mark the path revalidated "so that server actions don't pull their own writes". After posting, editing or deleting a review, the user is redirected back to the old list and the old rating.
  - `updateTag` gives read-your-own-writes but throws in Route Handlers. B13 requires one service function shared by the action and the Route Handler, so a service that calls `updateTag` breaks the API, and one that calls `'max'` breaks the form.
- **Evidence:**
  - https://nextjs.org/docs/app/api-reference/functions/revalidateTag: "No second argument (deprecated)". For invalidation outside a Server Action it says "Pass `{ expire: 0 }` to expire the data immediately".
  - https://nextjs.org/docs/app/api-reference/functions/updateTag: "can **only** be called from within Server Actions".
  - `next@16.4.5/dist/server/web/spec-extension/revalidate.js`: `updateTag` throws when `workStore.page.endsWith('/route')`.
- **Effect on the build:** Review create, edit and delete look broken until a second reload. Unit tests still pass, the reviewer's e2e tests fail, and each teammate picks a different variant.
- **Proposed fix:** In R5, replace "services clear the tags (`revalidateTag`)" with:
  > services clear the tags through the cache adapter (§3.2 rule 9). Its real implementation calls `revalidateTag(tag, { expire: 0 })`, which works in both Server Actions and Route Handlers, so the next request reads fresh data. Don't use `updateTag` (it throws in Route Handlers) or the `'max'` profile (users wouldn't see their own change).

  Add `cache.invalidate(...tags)` to §4.4.
- **Confidence:** verified

### ARC-03 Major: Cached services and cache invalidation throw outside a Next.js request, which breaks Vitest, `scripts/seed.ts` and the P0-6 example tests
- **Where:** plan.md:L384 (rule 9), L431 (`test/setup.ts`), L540–L545 (§4.5), L941 (P0-6), L664 (D10), L857 (Q7); seed/README.md:L35–L36
- **Affects:** R5, B6, D10, Q6, Q7; tasks P0-6, P1-CA2, P1-CA4, P1-CA5
- **Problem:** `test/setup.ts` mocks only `next/headers`. Outside a Next.js server:
  - `unstable_cache` throws "Invariant: incrementalCache missing in unstable_cache".
  - `revalidateTag` throws "Invariant: static generation store missing in revalidateTag(...)".
  - `cacheTag` throws (ARC-01).

  Also, seed/README.md:L35–L36 tells the seed script to recalculate ratings "through the review service". That service clears tags (B6), so the seed crashes. Rule 9 puts every other outside system behind an adapter with a fake, but not the Next.js cache.
- **Evidence:**
  - `next@16.4.5/dist/server/web/spec-extension/unstable-cache.js:59–61` and `revalidate.js` (`function revalidate`) contain the two invariant throws quoted above.
  - https://nextjs.org/docs/app/guides/testing/vitest: Vitest "currently does not support" async Server Components, so "page data functions" (L544) can only be tested as plain async functions.
- **Effect on the build:**
  - The P0-6 page-data example test fails, which blocks the Phase 0 gate.
  - Module owners each mock `next/cache` differently.
  - The B6 check "clears the cached tour and review data" can't be asserted.
  - `npm run seed` crashes.
- **Proposed fix:**
  - Rule 9: "Storage, mailer, queue, Stripe, the rate-limit store **and the Next.js cache** are adapters". The new file `src/server/cache.ts` exports two functions:
    - `cached(fn, keyParts, tags)`: real implementation is `unstable_cache`; the fake calls `fn` directly.
    - `invalidate(...tags)`: real implementation is `revalidateTag(tag, { expire: 0 })`; the fake records the tags in `fakes.cache.invalidated`.
  - The seed script uses the fake.
  - Add `fakes.cache.invalidated` to §4.5.
  - Add the cache fake and the `server-only` alias (ARC-04) to the P0-6 description of `test/setup.ts`.
- **Confidence:** verified

### ARC-04 Major: `import 'server-only'` in every `src/server/` file throws in Vitest, in the `tsx` seed script and in the esbuild worker bundle
- **Where:** plan.md:L373 (rule 2), L627 (R6), L662 (D8), L664 (D10), L427–L428
- **Affects:** R6, D1, D3, D8, D10, Q6; tasks P0-6, P1-PL2, P1-PL5, P1-CA5
- **Problem:** `server-only` throws on import unless the resolver uses the `react-server` export condition. Next.js aliases it to an empty module only inside its own builds. The plan creates three other entry points that load `src/server/` code:
  1. Vitest.
  2. `tsx scripts/seed.ts`, which loads the models.
  3. `dist/worker.js` built with esbuild, which loads `queue`, `mailer`, `config` and `logger`.

  For the worker, building with `--conditions=react-server` is not a way out: under that condition `react-dom/server` throws, and React Email rendering needs it.
- **Evidence:**
  - `server-only@0.0.1/package.json`: `"exports": { ".": { "react-server": "./empty.js", "default": "./index.js" } }`. `index.js` throws "This module cannot be imported from a Client Component module…".
  - `next@16.4.5/dist/build/create-compiler-aliases.js`: `'server-only$': 'next/dist/compiled/server-only/empty'` (server compilers only).
  - In `react-dom@19.3.1`, `exports["./server"]["react-server"]` points to `server.react-server.js`, which throws "react-dom/server is not supported in React Server Components."
- **Effect on the build:**
  - The first integration test fails on import, so the P0-6 example tests can't pass as written.
  - The seed script crashes.
  - The worker crashes at startup, so no email is ever sent. This may not be found until P2-RV1 and the §13 Mailpit check.
- **Proposed fix:** Add to rule 2:
  > Code that runs outside Next.js aliases `server-only` to an empty module:
  > - Vitest: `resolve.alias` in `vitest.config.ts`.
  > - The seed script: `tsx --conditions=react-server` (it renders no React).
  > - The worker bundle: esbuild `alias: { 'server-only': './src/worker/empty.ts' }`, **not** `--conditions=react-server`.

  Reference this from P0-1 and P1-PL5.
- **Confidence:** verified

### ARC-05 Blocker: R9 can't be measured as written, because Next.js 16 no longer prints "First Load JS"
- **Where:** plan.md:L630 (R9), L942 (P0-7), L968 (P1-PL5), L992 (Phase 1 gate), L1044 (§13)
- **Affects:** R9, U24; tasks P0-7, P1-PL5, P2-PL1; Phase 0 and Phase 1 gates
- **Problem:** R9 says Phase 0 records each route's "First Load JS" from `next build` and `check-bundle.ts` enforces 40 KB gzipped on top of it. Next.js 16 removed that column, so there is nothing to record or compare.
- **Evidence:**
  - https://nextjs.org/docs/app/guides/upgrading/version-16: "**Next.js 16** removes the `size` and `First Load JS` metrics from the `next build` output … The most effective way to measure actual route performance is through tools such as Chrome Lighthouse".
  - https://nextjs.org/docs/app/guides/package-bundling documents the replacements: `next analyze` (v16.1+), and `next analyze --output` plus `next analyze export` to JSON Lines (v16.4+).
- **Effect on the build:** P0-7 can't produce `docs/bundle-baseline.json`. `platform` has to invent a measurement, so the gate check means whatever one person decides.
- **Proposed fix:** Replace R9 with:
  > `scripts/check-bundle.ts` builds the app, starts `next start`, and loads each §1.5 route in Playwright (Chromium, JavaScript on, no interaction). It sums the compressed transfer size of every `script` response until network idle, excluding chunks that contain Leaflet (R8). Phase 0 records each placeholder route's number in `docs/bundle-baseline.json`. The framework baseline is the smallest of those numbers. No route may exceed it by more than 40 KB.

  Use `next analyze --output` to find out why a route grew, not as the gate. A weaker alternative is a Lighthouse CI `resource-summary:script:size` assertion, but that only covers the two U24 pages.
- **Confidence:** verified that the metric was removed; the replacement is a proposal

### ARC-06 Major: Dynamic segments named `[id]` and `[tourId]` side by side under `api/v1/tours/` fail the build
- **Where:** plan.md:L235–L239, L253–L254, L403
- **Affects:** §1.4; tasks P1-CA2, P1-CA4, P1-RV1, P2-ALL1
- **Problem:** `tours/[id]/…` (L235–L239) and `tours/[tourId]/reviews` (L253–L254) become sibling folders. Next.js rejects two dynamic segments with different names at the same level.
- **Evidence:**
  - I ran the route sorter from `next@16.4.5/dist/shared/lib/router/utils/sorted-routes.js` on the plan's paths. It threw: `You cannot use different slug names for the same dynamic path ('id' !== 'tourId').`
  - With `[id]/reviews` instead, all 38 routes in §1.4 and §1.5 sort without error. This is the only conflict.
- **Effect on the build:** `next dev` and `next build` fail as soon as P1-CA4 lands. The access matrix, the OpenAPI fragments and the `callRoute` paths then need renaming.
- **Proposed fix:** In §1.4, use `GET|POST /api/v1/tours/[id]/reviews` and add "(`[id]` is the tour ID)". The service parameter can stay `tourId`.
- **Confidence:** verified

### ARC-07 Major: `next build` will query MongoDB, and may need every runtime secret, both in the Docker build stage and in CI
- **Where:** plan.md:L296 (`sitemap.ts`), L631 (R10), L383 (rule 8), L658 (D4), L662 (D8), L665 (D11)
- **Affects:** R10, D4, D8, D11; tasks P1-WE1, P1-PL5, P0-7
- **Problem:**
  - `sitemap.ts` lists every tour (R10). A sitemap "is cached by default unless it uses a Request-time API or dynamic config", so it is prerendered during `next build` and calls `toursService` at build time. Neither the Docker build stage nor the CI `next build` step has a database. After the 5-second server-selection timeout (B10), the build fails.
  - Rule 8 plus D4 invite `export const config = schema.parse(process.env)` at module scope in `config.ts`. Prerendering evaluates modules, so that line makes the build require all runtime secrets.
- **Evidence:**
  - https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap ("cached by default…").
  - https://nextjs.org/docs/app/guides/building: step 5 "Prerenders static pages".
- **Effect on the build:** The Docker build (D8, D11) and the CI build fail, or secrets get passed in as build arguments and end up in image layers.
- **Proposed fix:**
  - Add a rule to §3.4: "`next build` needs no database and no secrets."
  - Add `export const dynamic = 'force-dynamic'` to `sitemap.ts`, which still reads the tag-cached tour list (R5).
  - `config.ts` exports `getConfig()`, which parses on first call. `instrumentation.ts` calls it at startup (D4).
  - CI builds with an empty environment to prove the rule.
- **Confidence:** verified for `sitemap.ts`; likely for the module-scope config

### ARC-08 Major: Module boundaries (§3.2 rule 6) contradict §3.3, §4.4 lacks the cross-module functions the features need, and the Q2 lint rule fails on the seed script and the test factories
- **Where:** plan.md:L372, L381, L382, L417, L419, L521–L527, L852, L974, L976, L977
- **Affects:** B6, B12, Q2, Q4; tasks P0-7, P1-CA1, P1-CA2, P1-CA4, P1-CA5, P1-CO2, P1-CO3
- **Problem:**
  1. **Internal files that other code must import.** Rule 6 exposes only four files per module, but §3.3 adds three more that other code needs:
     - `tours/query-builder.ts`: the overview page must parse with it (P1-CA1: "shared by the API and the overview page").
     - `tours/cache.ts`: the reviews module must clear the `tour:<id>` and `tours` tags (B6).
     - `bookings/webhook.ts`: the webhook route must call it.
  2. **Cross-module calls missing from §4.4:**
     - The review service writes `Tour.ratingsAverage` and `Tour.ratingsQuantity`, a Tour-model write from another module.
     - `DELETE /tours/[id]` needs a booking count (409) and deletes reviews, so tours and reviews import each other.
     - That booking count lives in a commerce-owned module, but P1-CA2 doesn't depend on any commerce task.
  3. **Lint versus model access.** Q2 blocks importing `**/modules/*/model` from outside its module. But `scripts/seed.ts` needs fixed `_id`s and hashing "through the model" (seed/README), and factories such as `createUser({ active: false })` need models. With `--max-warnings=0`, lint fails.
- **Evidence:** the plan.md lines quoted above.
- **Effect on the build:**
  - Teammates either break rule 6 or invent their own re-exports.
  - `catalog` is blocked waiting on contract changes to call bookings.
  - `npm run lint` fails on the seed script or the factories, which breaks the Definition of Done.
- **Proposed fix:**
  - Rule 6 becomes: "A module's public surface is `service.ts`, `actions.ts`, `dto.ts` and `schemas.ts`. Other files are internal and are re-exported through those."
  - Add to §4.4: `toursService.setRatings(tourId, { average, quantity })`, `reviewsService.deleteForTour(tourId)` and `bookingsService.countForTour(tourId)`. The lead writes `countForTour` in P0-4, next to `hasPaidBooking`.
  - Add a rule: "Services may import each other only for use inside functions, never at module top level" (this allows the tours/reviews cycle safely).
  - Q2: exempt `scripts/**` and `test/helpers/**` from the model-import rule.
- **Confidence:** verified

### ARC-09 Major: The plan wires Server Actions two incompatible ways, and `action()` can't serve both
- **Where:** plan.md:L501, L505–L509 (§4.3), L628 (R7), L639, L642, L644 (§7.2)
- **Affects:** R7, R11, U12, U17; tasks P0-5, P1-CO1, P1-WE3, P1-WE5
- **Problem:**
  - Some forms bind actions directly in Server Components: the booking panel ("itself is a server-rendered form"), `/me/deactivate` ("none") and the header logout. A plain `<form action>` calls the action with `(formData)`.
  - Other forms use `useActionState`: `AuthForm` and `ReviewForm`. The `useActionState` function receives `(previousState, payload)`.
  - §4.3 doesn't give the signature of the function `action()` returns. If it expects `(prev, formData)`, the booking form passes FormData as `prev` and `undefined` as the form data. Zod fails, and the returned `ActionState` is shown nowhere.
  - Forms bound directly can't show any error at all, for example the B8 400 when a start date is no longer available.
- **Evidence:** https://react.dev/reference/react/useActionState: the function "receives the previous state … as its first argument, followed by the actionPayload".
- **Effect on the build:** Depending on how `action()` is typed, either "Book this tour" silently does nothing, or the auth forms break. Errors from directly bound forms are invisible.
- **Proposed fix:** Add to §4.3:
  > `action()` returns `(prevState: ActionState, formData: FormData) => Promise<ActionState>`. Every form that can fail is rendered by a small Client Component that calls `useActionState` and puts its `formAction` on `<form action>`. This still works before JavaScript loads (React progressive enhancement). A form that can't fail (logout) binds `logoutAction.bind(null, initialState)`.

  §7.2: the booking panel gets a `BookingForm` wrapper (`useActionState`), and `/me/deactivate` gets the same wrapper.
- **Confidence:** verified

### ARC-10 Major: The plan uses `NODE_ENV` to tell environments apart, but it is `production` in every built app (CI, compose, staging, production)
- **Where:** plan.md:L294 (`/styleguide`), L562 (S2), L664 (D10), L798 (U5), L829 (U26), L1004, L1020, L1050
- **Affects:** S2, U5, U26, D10; tasks P2-RV2, P3-PL2, P3-RV1
- **Problem:**
  - `/styleguide` is "development and test only; `notFound()` in production". But U26 screenshots it "in the CI container", and CI tests a build (D11, U24 "against `next start`"). `next build`, `next start` and standalone `server.js` all run with `NODE_ENV=production`, so the styleguide returns 404 wherever screenshots run.
  - D10's seed "refuses to run when `NODE_ENV=production`", yet P3-PL2 and D10 call for seeding staging. Staging runs the production image.
  - That image contains only the standalone output, `.next/static`, `public` and the worker (D8). It has no `tsx`, `scripts/seed.ts` or `seed/` data, so the seed can't run inside it anyway.
- **Evidence:**
  - https://nextjs.org/docs/app/guides/environment-variables: Next.js assigns `production` "for all other commands", and the allowed values are `production`, `development` and `test`.
  - The standalone `server.js` template in `next@16.4.5/dist/build/utils.js` sets `process.env.NODE_ENV = 'production'`.
- **Effect on the build:** The U26 styleguide baselines can't be produced (or get taken against `next dev`, which is flaky). §13's "/styleguide shows every component" can't be checked on a build. The staging seed is impossible as described.
- **Proposed fix:**
  - Add `APP_ENV` (`development | test | staging | production`), read at runtime through `config.ts`.
  - `/styleguide` is served when `APP_ENV` is `development` or `test`. Playwright's web server sets `APP_ENV=test`.
  - The seed refuses `APP_ENV=production` and runs from a developer machine or a CI job against staging's database and bucket. P3-PL2 documents this.
  - §13: "returns 404 when `APP_ENV=production`".
- **Confidence:** verified

### ARC-11 Minor: D5's web-server shutdown can't be built as written in the App Router
- **Where:** plan.md:L659 (D5), L967 (P1-PL4)
- **Affects:** D5
- **Problem:** Standalone `server.js` already handles SIGTERM:
  1. It calls `server.close()`, waiting for in-flight requests with **no time limit**.
  2. It runs `nextServer.close()`.
  3. It calls `process.exit(143)`.

  The only documented hook, `NEXT_MANUAL_SIG_HANDLE`, is a Pages Router feature (`_document.js`). Setting it **removes** Next's own drain, and app code has no handle on the HTTP server. So "up to 10 seconds, then close Mongo and Redis" can't be done inside the app.
- **Evidence:**
  - `next@16.4.5/dist/server/lib/start-server.js:304–380` (`if (!process.env.NEXT_MANUAL_SIG_HANDLE) process.on('SIGTERM', cleanup)`).
  - https://nextjs.org/docs/app/guides/self-hosting: "The Next.js server will finish in-flight requests … Platforms should allow a configurable drain period (10-30 seconds is recommended)". The "Manual Graceful Shutdowns" section is Pages Router only.
- **Effect on the build:** P1-PL4 may set `NEXT_MANUAL_SIG_HANDLE` and cut requests off mid-flight. Or it writes an ADR anyway.
- **Proposed fix:** Rewrite D5 for web:
  > Next's built-in SIGTERM handling drains requests. The 10 seconds is the platform's grace period: compose `stop_grace_period: 10s` and Render `maxShutdownDelaySeconds` (ARC-16). The image's `CMD ["node", "server.js"]` is in exec form so Node receives the signal. Open Mongo and Redis sockets close when the process exits. Never set `NEXT_MANUAL_SIG_HANDLE`.

  The worker part of D5 stands.
- **Confidence:** verified

### ARC-12 Major: The Docker HEALTHCHECK on `node:24-slim` fails as specified, and the worker inherits it
- **Where:** plan.md:L660 (D6), L662 (D8), L1033
- **Affects:** D6, D8; tasks P1-PL5, P2-RV1
- **Problem:**
  1. The slim image has no `curl` or `wget`. The docker-node build installs them, then purges them with `apt-get purge -y --auto-remove`.
  2. Docker sets `HOSTNAME` to the container ID, and `server.js` binds to `process.env.HOSTNAME || '0.0.0.0'`. The server therefore listens on the container's own address, not on 127.0.0.1, so a localhost probe fails. Next's official Dockerfile sets `ENV HOSTNAME="0.0.0.0"` for this reason.
  3. The worker runs from the same image, so it inherits the HEALTHCHECK. Nothing listens there, so the worker is unhealthy forever.
  4. The image runs as a non-root user, but Next writes `.next/cache` (the data and image caches). The copied files must be owned by that user, as in the official example's `--chown=node:node`.
- **Evidence:**
  - https://raw.githubusercontent.com/nodejs/docker-node/main/24/trixie-slim/Dockerfile
  - https://docs.docker.com/engine/containers/run/ (`HOSTNAME`: "The hostname associated with the container")
  - https://raw.githubusercontent.com/vercel/next.js/canary/examples/with-docker/Dockerfile (lines 82, 98–99, 112)
  - https://docs.docker.com/reference/compose-file/services/ ("the healthcheck set by the image can be disabled by setting `disable: true`")
- **Effect on the build:** Both containers report unhealthy. Anything that uses `depends_on: condition: service_healthy` hangs, including the P2-RV1 smoke test and the §13 compose check. Cache writes fail with EACCES.
- **Proposed fix:** D8 becomes:
  > Runtime stage: `ENV HOSTNAME=0.0.0.0 PORT=3000`; files copied with `--chown` to the runtime user; `CMD ["node","server.js"]`; `HEALTHCHECK CMD ["node","-e","fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]`. In compose, the worker sets `healthcheck: { disable: true }`, or uses its own check if one is added.
- **Confidence:** verified for each fact; the effect is likely

### ARC-13 Major: The worker bundle (D8) won't run from the standalone image
- **Where:** plan.md:L655 (D1), L658 (D4), L662 (D8), L384 (rule 9), L968 (P1-PL5)
- **Affects:** D1, D3, D4, D8, U8; tasks P1-PL2, P1-PL5
- **Problem:**
  - The image's `node_modules` is the standalone trace, so it holds only what the Next server uses. Worker-only packages are missing: `nodemailer`, plus the React Email renderer (`react-email` or `@react-email/render`, see ARC-23).
  - If esbuild leaves packages external, the worker crashes with "Cannot find module".
  - If esbuild bundles everything, it needs three settings: the `server-only` alias (ARC-04), `jsx: 'automatic'` for the `.tsx` templates, and `platform: 'node'`.
  - The worker must also not import `deps.ts`, which pulls in every adapter. That includes sharp, whose native `.node` binary esbuild can't bundle.
  - `instrumentation.ts` doesn't run in the worker, so D4's startup config check never happens there.
- **Evidence:**
  - https://nextjs.org/docs/app/api-reference/config/next-config-js/output: standalone holds "only the files needed at runtime" for the Next server.
  - `react-email@6.11.8` exports its components and depends on `@react-email/render`.
- **Effect on the build:** The worker crash-loops in compose and on Render. No welcome, reset or booking emails go out, so P1-ID2, P1-CO2 and the §13 Mailpit check fail.
- **Proposed fix:** D8 becomes:
  > `dist/worker.js` is a full esbuild bundle: `bundle: true, platform: 'node', target: 'node24', jsx: 'automatic', alias: { 'server-only': … }, external: ['sharp']`. It imports only `queue`, `mailer`, `config`, `logger` and `src/emails/`, never `deps.ts`, and calls `getConfig()` at startup. CI runs `node dist/worker.js --check` inside the built image: it validates the config, renders each template once and exits 0.
- **Confidence:** likely

### ARC-14 Major: The committed lockfile may not install sharp's Linux binaries in Docker or CI
- **Where:** plan.md:L335, L861 (Q11 lockfile), L936 (P0-1), L662 (D8)
- **Affects:** S16, U7, D2, D8; tasks P0-1, P1-PL3, P1-PL5
- **Problem:**
  - The lead installs on this machine, which is macOS arm64. The images build on Linux: linux-arm64 for local Docker on Apple Silicon, and linux-x64 for CI and Render.
  - sharp's docs warn that npm lockfiles shared between platforms can miss the other platform's binaries (npm bug #4828).
  - The docs list `node_modules/sharp/**/*` as a common `outputFileTracingIncludes` pattern for native assets.
  - On glibc images such as `node:24-slim`, sharp recommends jemalloc for long-running processes.
- **Evidence:**
  - https://sharp.pixelplumbing.com/install, "Cross-platform" ("npm package-lock.json files shared by multiple platforms can cause installation problems due to npm bug #4828") and "Linux memory allocator".
  - https://nextjs.org/docs/app/api-reference/config/next-config-js/output (include patterns).
  - https://nextjs.org/docs/app/guides/self-hosting (the glibc note).
- **Effect on the build:** Image uploads (`images.normalize`) and `next/image` optimisation can fail in containers ("Could not load the sharp module"), and memory can grow on Render.
- **Proposed fix:**
  - P0-1: run `npm install --os=linux --cpu=x64 --libc=glibc sharp` and `--cpu=arm64` so the lockfile carries the Linux binaries.
  - D8: run `npm ci` inside the build stage, add a `.dockerignore` that excludes `node_modules`, add `outputFileTracingIncludes: { '/*': ['node_modules/sharp/**/*', 'node_modules/@img/**/*'] }`, and add jemalloc or record a decision in the ADR.
- **Confidence:** likely

### ARC-15 Major: Object storage is undefined in development and compose, and Next.js 16 blocks image optimisation from local addresses
- **Where:** plan.md:L56–L61, L656 (D2), L662 (D8), L966 (P1-PL3), L977 (P1-CA5), L1003 (P2-RV1), L1036
- **Affects:** D2, U7, U27, D10; tasks P1-PL3, P1-CA5, P2-RV1
- **Problem:**
  - S3 or R2 isn't needed until Phase 3, but the seed uploads 52 photos and P2-RV1 runs against compose.
  - Compose has no storage service.
  - P1-PL3's "local" adapter is undefined: where it writes (D2 says the filesystem is read-only) and how files are served.
  - D2 loads images through `images.remotePatterns`. Next.js 16 blocks optimising images from local or private IP addresses by default. A localhost URL or a MinIO container at a 172.x address both fail.
- **Evidence:** https://nextjs.org/docs/app/guides/upgrading/version-16, "Local IP Restriction (Breaking change)", and https://nextjs.org/docs/app/api-reference/components/image#dangerouslyallowlocalip.
- **Effect on the build:** Every tour photo is broken in development and compose. P2-RV1 and the design screenshots show broken images.
- **Proposed fix (decision for the human):**
  - **(A, recommended):** `storage.urlFor(key)` returns `/media/<key>` in every environment, served by `src/app/media/[...key]/route.ts` from the storage adapter. `next/image` treats it as a local image, the CSP only needs `img-src 'self'`, and compose mounts a volume for the local adapter.
  - **(B):** Add MinIO to compose, plus `dangerouslyAllowLocalIP` in non-production builds only. Because `next.config` is fixed at build time (ARC-26), this means a separate image per environment.
- **Confidence:** verified for the Next.js facts; the effect is likely

### ARC-16 Major: The `render.yaml` details the plan leaves out make Render lose queued jobs and conflict with S12
- **Where:** plan.md:L345, L572 (S12), L657 (D3), L660 (D6), L666 (D12), L1019 (P3-PL1)
- **Affects:** D3, D5, D6, D12, S12; task P3-PL1
- **Problem:** Render's current Blueprint spec says:
  - Key Value is `type: keyvalue`, and `redis` is a deprecated alias. `ipAllowList` is required.
  - `maxmemoryPolicy` defaults to `allkeys-lru`. Render recommends `noeviction` for job queues, and BullMQ says `noeviction` "is the only setting that guarantees the correct behavior of the queues".
  - The internal URL is `redis://`, unauthenticated by default, on a private network. Only external connections use TLS.
  - Health checks use `healthCheckPath` (web services only), not the Dockerfile HEALTHCHECK.
  - `maxShutdownDelaySeconds` defaults to 30 (range 1–300).
- **Evidence:**
  - https://render.com/docs/blueprint-spec ("redis is a deprecated alias for keyvalue", maxmemoryPolicy, maxShutdownDelaySeconds, healthCheckPath)
  - https://render.com/docs/key-value (internal connections, "For job queues, we recommend using noeviction")
  - https://render.com/docs/health-checks
  - https://docs.bullmq.io/guide/going-to-production
- **Effect on the build:** Under memory pressure, rate-limit keys evict email jobs, so D3's emails are lost. An S12 implementation that insists on `rediss://` rejects the internal URL.
- **Proposed fix:** D12 becomes:
  > `keyvalue` with `maxmemoryPolicy: noeviction` and `ipAllowList: []`; web `healthCheckPath: /healthz`; `maxShutdownDelaySeconds` set from D5 for web and worker.

  S12 decision for the human: the internal URL with internal auth enabled (no TLS, private network), or the external `rediss://` URL. I recommend the internal URL with auth, recorded in an ADR.
- **Confidence:** verified

### ARC-17 Major: Default Redis client options make signup, login and forgot-password hang while Redis is down
- **Where:** plan.md:L575 (S15), L657 (D3), L600 (B10)
- **Affects:** D3, S15, B10; tasks P1-PL1, P1-PL2, P1-ID1, P1-ID2
- **Problem:**
  - BullMQ advises that producers should fail fast (`enableOfflineQueue: false`) and workers should wait (`maxRetriesPerRequest: null`).
  - With defaults, a Queue connection uses BullMQ's 1–20 s reconnect backoff and ioredis's offline queue. A command is flushed only after `maxRetriesPerRequest: 20` reconnect attempts. By my estimate from those defaults, that is a few minutes.
  - D3's "a failed email never fails the user's request", and the forgot-password path that returns `SERVICE_UNAVAILABLE`, become a hung request. The rate limiter (S15) on login has the same problem.
  - The plan doesn't specify connection options, or whether the queue and the rate limiter share a client.
- **Evidence:**
  - https://docs.bullmq.io/guide/going-to-production (maxRetriesPerRequest, enableOfflineQueue)
  - `ioredis@6.0.0/built/redis/RedisOptions.js` (`enableOfflineQueue: true`, `maxRetriesPerRequest: 20`)
  - `bullmq@6.7.2/dist/cjs/classes/redis-connection.js:116` (retry strategy `Math.max(Math.min(Math.exp(times), 20000), 1000)`)
- **Effect on the build:** A Redis outage stalls the core flows instead of degrading them as D3 intends.
- **Proposed fix:** Add to D3:
  > Separate clients. Queue producer: `enableOfflineQueue: false`, `maxRetriesPerRequest: 1`, `connectTimeout: 2000`. Worker: `maxRetriesPerRequest: null`. Rate limiter: `enableOfflineQueue: false`; when Redis is unreachable it returns `SERVICE_UNAVAILABLE` (fail closed, an S15 decision for security).
- **Confidence:** likely

### ARC-18 Major: proxy.ts's matcher is unspecified, and either choice breaks something
- **Where:** plan.md:L446–L449, L576 (S16), L661 (D7), L964 (P1-PL1)
- **Affects:** D7, S11, S16, S23; tasks P1-PL1, P1-CA2
- **Problem:**
  - §3.4 says proxy runs "on every page request". D7 says every error response "carries the request ID from proxy.ts".
  - The CSP guide's matcher excludes `api`, static files and prefetches. With that matcher, API errors have no request ID from proxy.
  - If `/api` is included instead, proxy buffers request bodies up to `proxyClientMaxBodySize` (10 MB by default) and truncates anything larger. `PUT /tours/[id]/images` can carry a cover plus 3 images at 5 MB each, about 20 MB.
  - A matcher that excludes a page also skips that page's Server Actions.
- **Evidence:**
  - https://nextjs.org/docs/app/guides/content-security-policy (the matcher).
  - https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize ("By default, the maximum body size is 10MB … only be buffered up to the limit").
  - https://nextjs.org/docs/app/api-reference/file-conventions/proxy ("Server Functions … a Proxy matcher that excludes a path will also skip Server Function calls on that path").
- **Effect on the build:** Image uploads are corrupted, or API errors lack request IDs. The platform and identity teammates will read §3.4 differently.
- **Proposed fix:** Add to §3.4:
  > proxy matches everything except `/api/`, `/webhooks/`, `/healthz`, `/readyz`, `/_next/static`, `/_next/image` and metadata files, and skips prefetches. It always overwrites `x-request-id`. `withApi` mints a request ID for API requests. Pages and actions read it with `headers()`.
- **Confidence:** verified

### ARC-19 Major: D10's date shift moves every past booking and review into the future once the first departure passes (21 Nov 2026)
- **Where:** plan.md:L664 (D10), L977 (P1-CA5); seed/README.md:L30–L34, L41–L44
- **Affects:** D10, B19, U13, S5; tasks P1-CA5, P2-RV1, P3-PL2
- **Problem:** The earliest tour start date is 2026-11-21, so any seed run after it shifts every date by at least +1 year. Past data runs up to 2026-08-08 (bookings) and 2026-08-20 (reviews), so a +1 shift puts it after the run date. D10's promise that "past trips stay in the past" is false.
- **Evidence:** script over every record in `seed/data`:

  | Seed run date | Shift | Past bookings moved into the future | Reviews dated in the future |
  |---|---|---|---|
  | 22 Nov 2026 | +1 year | 52 of 52 | 52 of 52 |
  | 15 Dec 2026 | +1 year | 52 of 52 | 52 of 52 |
  | 1 Mar 2027 | +1 year | 24 of 52 | 26 of 52 |
  | 1 Jun 2027 | +1 year | 12 of 52 | 12 of 52 |

  A shift of +2 years (for runs from 22 Nov 2027 to 21 Nov 2028) puts the Taj Mahal day of all 3 "Golden Triangle Heritage" departures on a Friday, which breaks the seed README's rule.
- **Effect on the build:** My tours shows past trips as upcoming. Reviews exist for trips that haven't happened. The "Write a review" e2e flows and the staging data are wrong.
- **Proposed fix:** D10 becomes:
  > Tour start dates and upcoming bookings move by Y whole years, the smallest Y that puts every start date on or after today. Past bookings, reviews and every `createdAt` move by max(Y − 1, 0) years. After shifting, the script checks every rule in `seed/README.md` (including the Golden Triangle Friday rule) and stops with an error if any fails.

  I simulated this for run dates from Nov 2026 to Nov 2028: past trips stay past and upcoming bookings stay future every time. The Friday case at Y = 2 needs a decision from the human: move those departures one day, or use Y = 3.
- **Confidence:** verified

### ARC-20 Minor: With a nonce-only `style-src`, the browser blocks every `next/image` inline style
- **Where:** plan.md:L571 (S11), L800 (U7)
- **Affects:** S11, U7, U24
- **Problem:** `next/image` writes a `style` attribute on every image (`color: transparent`, and the positioning styles when `fill` is used). Nonces don't apply to style attributes, so this optional ADR is in fact required. Without it, `fill` images lose their positioning, and the CSP violations logged to the console could lower the Lighthouse Best Practices score (U24).
- **Evidence:** `next@16.4.5/dist/shared/lib/get-img-props.js:399–410`. The CSP guide's sample uses `style-src 'self' 'nonce-…'`.
- **Proposed fix:** Decide in P1-PL1: `style-src-elem 'self' 'nonce-…'` plus `style-src-attr 'unsafe-inline'`, recorded in an ADR. This probably overlaps with security's findings.
- **Confidence:** verified

### ARC-21 Minor: The data cache is per instance, so scaling the web service past one instance serves stale tours
- **Where:** plan.md:L626 (R5), L666 (D12)
- **Problem:** The default cache lives on each instance's disk and in memory. `revalidateTag` on one instance doesn't reach the others.
- **Evidence:** https://nextjs.org/docs/app/guides/self-hosting ("stored on the local filesystem … of each Next.js server instance", "Multi-Instance Cache Coordination").
- **Proposed fix:** D12: "One web instance. Scaling out needs a shared `cacheHandler` on Redis (ADR)."
- **Confidence:** verified

### ARC-22 Minor: The version pins are stale or will break the install
- **Where:** plan.md:L42–L43, L327, L343, L662, L936
- **Problem:**
  - Node 26 has been Active LTS since 28 Oct 2026, and Node 24 has been Maintenance LTS since 20 Oct 2026.
  - This machine runs Node 22.21.1, below stylelint 18's `^22.22.2 || ^24.15.0 || >=26`.
  - `typescript@latest` is 7.0.2, the native compiler without the classic JS API, and `typescript-eslint` 8.72.1 requires `<6.1.0`.
  - ESLint 10 is current, but `eslint-plugin-react` (a dependency of `eslint-config-next`) peers on `^9.7`.
  - create-next-app 16.4.5 pins `typescript ^5`, `eslint ^9` and `@types/node ^20`.
- **Evidence:** `npm view` output; nodejs/Release `schedule.json`; the create-next-app 16.4.5 template.
- **Proposed fix:** Add to P0-1:
  > Keep Node 24 (supported to Apr 2028) unless the ADR moves to 26. Add `engines.node: ">=24.15 <27"`, an `.nvmrc`, and `node-version-file` in CI. Keep TypeScript 5.x and ESLint 9 as create-next-app pins them. Set `@types/node` to `^24`.
- **Confidence:** verified

### ARC-23 Minor: The APIs teammates will remember have changed in several §2 libraries
- **Where:** plan.md:L329–L343, L575, L800
- **Problem and current API:**
  - **React Email 6:** components come from `react-email`. `@react-email/components` is deprecated ("Package no longer supported").
  - **BullMQ 6** (30 Jul 2026): ioredis must be installed explicitly, and the legacy `repeat` API was removed.
  - **Mongoose 9:** pre hooks take no `next()`, and `new: true` is deprecated in favour of `returnDocument: 'after'`. This affects the lead's password and slug hooks.
  - **`next/image`:** `priority` is deprecated in favour of `preload` (U7).
  - **`NextRequest.ip`** was removed in Next.js 15, so S15's per-IP limits need an IP source. On Render that is the `x-forwarded-for` header set by Render's proxy; security should confirm which hop to trust.
- **Evidence:**
  - `npm view @react-email/components deprecated`
  - https://raw.githubusercontent.com/taskforcesh/bullmq/master/docs/gitbook/changelog.md (6.0.0)
  - https://raw.githubusercontent.com/Automattic/mongoose/master/docs/migrating_to_9.md
  - https://nextjs.org/docs/app/api-reference/components/image#priority
  - https://nextjs.org/docs/app/guides/upgrading/version-15 (`geo` and `ip` removed)
- **Proposed fix:** Name these versions and APIs in §2, and say in `docs/adr/0001-versions.md` that teammates follow it.
- **Confidence:** verified

### ARC-24 Minor: §3.3 is missing files the plan uses, and some have no owner
- **Where:** plan.md:L386–L442, L881–L890
- **Problem:**
  - Missing: `(site)/credits/page.tsx` (§1.5), `loading.tsx` for `/me` and `/my-tours` (R4), `src/server/cache.ts` (ARC-03), the media route (ARC-15), `src/worker/empty.ts` (ARC-04) and `docs/bundle-baseline.json`.
  - The S18 and D4 check scripts aren't listed.
  - `vitest.config.ts` (which holds the Q6 thresholds), `playwright.config.ts` (the reviewer's no-JS, accessibility and visual projects), `knip`, `redocly` and `.dockerignore` appear neither in the layout nor in §11.1.
- **Effect on the build:** The reviewer can't add the P1-RV3 projects without editing a file it doesn't own.
- **Proposed fix:** Add them to §3.3. Give `playwright.config.ts` to the reviewer and `vitest.config.ts` to the lead.
- **Confidence:** verified

### ARC-25 Minor: `requireUser()` can't tell whether it is running in a page or in an action
- **Where:** plan.md:L498–L499
- **Problem:** The helper should redirect on pages and throw in actions and handlers, but Next.js has no public API for detecting the context.
- **Proposed fix:** `requireUser({ onMissing: 'redirect' | 'throw', next? })`, defaulting to `'throw'`. Pages pass `'redirect'`.
- **Confidence:** likely

### ARC-26 Minor: Rule 8 ("only `config.ts` reads `process.env`") can't hold for `next.config.ts` and `proxy.ts`, and `next.config` is fixed at build time
- **Where:** plan.md:L383, L450, L571
- **Problem:**
  - `next.config.ts` needs the storage host for `remotePatterns`, and proxy needs the CSP hosts.
  - `next.config` can't import a module that starts with `import 'server-only'`. Outside Next's server compilers that import throws, the same mechanism as ARC-04.
  - The standalone `server.js` embeds `JSON.stringify(nextConfig)` at build time, so the image is tied to the environment it was built for.
- **Evidence:** `next@16.4.5/dist/build/utils.js` (the server.js template).
- **Proposed fix:** Rule 8: "`config.ts` and `next.config.ts` read `process.env`. Values `next.config.ts` uses are build-time inputs, listed in the ADR." Option A of ARC-15 removes the need for `remotePatterns`.
- **Confidence:** verified for the template; likely for the import failure

---

**Wording fixes**
- L450: write `experimental.serverActions.bodySizeLimit`, and set it a little above 5 MB (for example `'6mb'`). The docs say the limit counts the whole multipart body, so a `'5mb'` limit rejects a 5 MB photo. Keep the 5 MB per-file check in the action.
- L543: `callRoute` must pass `params` as a Promise, because Route Handlers receive `{ params: Promise<…> }` in Next.js 16.
- L643: say what the poller does: `router.refresh()` every few seconds for up to 30 seconds (U12), with no API call.
- L800 (U7): replace `priority` with `preload`, or with `loading="eager"` and `fetchPriority="high"` as the docs recommend.
- L345, L666: "managed Redis" becomes "Render Key Value (`type: keyvalue`)".
- L329: "Mongoose (latest major)" becomes "Mongoose 9".
- L44–L47: add "`revalidateTag` takes a second argument" and "`next build` no longer prints First Load JS".

**Severity count: 2 Blocker, 16 Major, 8 Minor (26 findings).**
