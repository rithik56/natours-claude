---
phase: 04-browse-tours
plan: 06
subsystem: ui
tags: [tour-page, metadata, notFound, next-16, react-cache, route-map, gallery, photo-credits, api, openapi, adr-0032]

# Dependency graph
requires:
  - phase: 04-04
    provides: the one cached catalogue, the tours service list() and the catalogue query
  - phase: 04-03
    provides: the seeded catalogue and the Playwright seed project the tour-page specs run against
provides:
  - "/tour/[slug]: cover with its credited caption, the single h1, facts, an empty booking slot, the static route with the day list, the description, the gallery and the photo credits, all in the first response"
  - "A missing slug is a real HTTP 404 from the built app (smoke-checked); no loading.tsx on the tour segment or the root (ADR 0032)"
  - "Per-tour metadata from generateMetadata: title, description with formatPrice, canonical, og:image of the cover, social card"
  - "getBySlug (cached per tour id, slug looked up in the catalogue first), getById (uncached), getGuides (lead guide first), findActivePublicByIds"
  - "TourDetail holds guideIds instead of guides (RESEARCH Pattern 6)"
  - "GET /api/v1/tours/[id] with the public guides, 400 and 404 in the standard envelope"
  - "TourRoute, TourGallery, MapFrame animate={false} and FRAME_TOKENS, PhotoCredits with an optional author link"
  - "ADR 0032, the contracts section for the tour detail, and the OpenAPI path for /tours/{id}"
affects:
  - 04-07 (booking panel, guides list and reviews stream into the empty aside slot and the reserved sections)
  - 04-08 (Leaflet replaces the static MapFrame in the same 5:3 slot; FRAME_TOKENS and the still variant are its baseline)
  - 04-10 (/credits, which the photo credits section links to; it may keep a loading.tsx)

# Actuals (#2632): the estimate was 100000 tokens over 3 tasks.
# Same chars/4 scale as the estimate, measured over the changed files at HEAD (30 files, 175292 characters).
actuals:
  tokens: 43823
  tasks: 3
  commits: 5
# Measured from the verified base: git rev-list --count plan_head_before..HEAD (#3968).
plan_head_before: d126d0e63950acdc7be24aeae67857211c57b0d8
plan_head_after: 6ffcc00

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The slug is looked up in the cached catalogue before any per-tour cache entry exists (T-04-17); the id-keyed detail is read through the cache"
    - "The page and generateMetadata share one lookup per request through React cache(); notFound() runs before any JSX (R4)"
    - "Every absolute URL comes from APP_URL through getConfig(), never from request headers (SEC-12)"
    - "Root metadata is built inside generateMetadata, so the build needs no environment (ARC-07)"
    - "Public guide reads select name, photo and role only, through toPublicUser (S3)"
    - "Static drawings take their sizes from the tokens as numbers, with a unit test that reads tokens.css (C6)"

key-files:
  created:
    - src/app/tour/[slug]/page.tsx
    - src/app/tour/[slug]/page.module.css
    - src/app/api/v1/tours/[id]/route.ts
    - src/components/features/tour-route.tsx
    - src/components/features/tour-route.module.css
    - src/components/features/tour-gallery.tsx
    - src/components/features/tour-gallery.module.css
    - docs/adr/0032-no-loading-file-on-the-tour-page.md
    - test/app/tour-page-metadata.test.ts
    - test/app/tour-page.spec.ts
    - test/app/api/tours-detail.test.ts
    - test/components/features/tour-gallery.test.ts
    - test/components/ui/map-frame.test.ts
    - test/server/modules/users/public-by-ids.test.ts
  modified:
    - src/app/layout.tsx
    - src/server/modules/tours/dto.ts
    - src/server/modules/tours/service.ts
    - src/server/modules/users/service.ts
    - src/components/ui/map-frame.tsx
    - src/components/ui/map-frame.module.css
    - src/components/ui/photo-credits.tsx
    - scripts/smoke.ts
    - test/server/modules/tours/dto.test.ts
    - test/server/modules/tours/service.test.ts
    - test/components/ui/photo-credits.test.ts
    - docs/adr/README.md
    - docs/contracts.md
    - docs/openapi/openapi.yaml

key-decisions:
  - "No loading.tsx on the tour segment or at the root: a loading boundary answers a missing slug with 200 (RESEARCH Pitfall 1). Streaming sits inside the page after the 404 decision (ADR 0032)"
  - "getBySlug returns null for an unknown slug, and the page calls notFound(); getById throws NOT_FOUND for the API (ADR 0031, contracts)"
  - "TourDetail carries guideIds and not guide objects, so the guides can stream separately (RESEARCH Pattern 6)"
  - "og:image is the direct /media/<cover key> URL on APP_URL, the original JPEG, not an optimiser URL (RESEARCH A3)"
  - "The static route keeps animate={false} under the Leaflet map (C3); MapFrame constants equal the tokens (C6); numerals take weight 600 (C4)"
  - "A gallery photo or credit row with no matching credit is left out, because it could not be captioned (U27)"

patterns-established:
  - "Tour detail reads ids only; populated guides are not needed in the tours module"
  - "Each tour-page section that depends on data it cannot know in advance is a server component on the page, rendered from the cached detail"

requirements-completed: [U11, R4, R3, R10, U7, U27, B12, R8]

# Metrics
duration: 30min
completed: 2026-11-16
status: complete

coverage:
  - id: D1
    description: "/tour/[slug] renders the cover with its credited caption, the single h1, the facts strip, the route and itinerary, the description, the gallery and the credits in the first response"
    requirement: U11
    verification:
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[U11] /tour/ladakh-high-passes has one h1, the cover with its credited caption, and a facts strip"
        status: pass
    human_judgment: false
  - id: D2
    description: "A missing slug is a real 404 with the not-found page, from the built app, with no loading.tsx on the tour segment or the root"
    requirement: R4
    verification:
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[R4] /tour/does-not-exist shows the not-found page with a 404 status"
        status: pass
      - kind: other
        ref: "npm run smoke (scripts/smoke.ts): /tour/does-not-exist answered 404; /tour/valley-of-flowers-trek answered 200"
        status: pass
    human_judgment: false
  - id: D3
    description: "Title, description with formatPrice, canonical, og:image of the cover, locale and social card from APP_URL"
    requirement: R10
    verification:
      - kind: unit
        ref: "test/app/tour-page-metadata.test.ts#[R10] gives the tour name as the title and the description template"
        status: pass
      - kind: unit
        ref: "test/app/tour-page-metadata.test.ts#[SEC-12] builds the canonical URL from APP_URL, never from the request"
        status: pass
    human_judgment: false
  - id: D4
    description: "The static route holds its 5:3 slot with JavaScript off and lists the itinerary without Day 2 for Kedarkantha"
    requirement: R8
    verification:
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[DES-18] Kedarkantha Winter Trek lists Day 1, 3, 4, 5 and 6, and no Day 2"
        status: pass
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[D-07] the route keeps the same box when it scrolls into view, so nothing jumps"
        status: pass
      - kind: unit
        ref: "test/components/ui/map-frame.test.ts#[U25] with animate={false} the route is drawn still"
        status: pass
    human_judgment: false
  - id: D5
    description: "The gallery follows the description, one column on a phone and three from 64em, each photo captioned Photo: author, licence"
    requirement: U7
    verification:
      - kind: unit
        ref: "test/components/features/tour-gallery.test.ts#[U7] renders one figure per photo, in the order given"
        status: pass
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[D-09] the three gallery photos follow the description, each captioned"
        status: pass
    human_judgment: false
  - id: D6
    description: "The photo credits list has a row per photo, the cover first; two photos by the same author are two rows; an author without a link is plain text"
    requirement: U27
    verification:
      - kind: unit
        ref: "test/components/ui/photo-credits.test.ts#[U27] two credits with the same author and licence render as two rows"
        status: pass
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[U27] the photo credits list has all four photos"
        status: pass
    human_judgment: false
  - id: D7
    description: "GET /api/v1/tours/[id] returns the tour with guides id, name, photo and role in the lead-first order; 400 and 404 in the envelope; no email"
    requirement: B12
    verification:
      - kind: integration
        ref: "test/app/api/tours-detail.test.ts#[B12] answers 200 with the tour, whose guides hold exactly id, name, photo and role"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-detail.test.ts#[B12] a malformed id is a 400 VALIDATION_ERROR; an unknown id is a 404 NOT_FOUND"
        status: pass
      - kind: unit
        ref: "test/server/modules/tours/service.test.ts#[B12] puts the lead guide first, even when the tour lists him second"
        status: pass
    human_judgment: false
  - id: D8
    description: "The route and itinerary sit side by side from 64em and stack on a phone; the reading order at 375px is the design contract's"
    requirement: R8
    verification:
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[D-06] the headings read cover and name, then itinerary, description, photos and photo credits"
        status: pass
    human_judgment: true
    rationale: "The side-by-side layout at 64em and the stacked layout at 375px were not reviewed by a person against the approved mockups; the design gate asks for that check."
  - id: D9
    description: "ADR 0032, the contracts section for the tour detail, and the OpenAPI path for /tours/{id}"
    requirement: R4
    verification:
      - kind: other
        ref: "npm run format:check passes; js-yaml parses docs/openapi/openapi.yaml with paths /tours and /tours/{id}"
        status: pass
    human_judgment: true
    rationale: "The wording of the ADR and the contract is for a reader to check; no test reads it."

# Deliberate deviations and the TDD record are in the body below.
---

# Phase 4 Plan 06: Tour page slice Summary

**Tour page at /tour/[slug] renders in its first response with a real 404 for a missing slug, full metadata, a static route with itinerary, a captioned gallery and photo credits, and GET /api/v1/tours/[id] with its public guides**

## Performance

- **Duration:** about 30 min (approximate; the start time was not recorded, and the five commits fall between 18:17 and 18:27 IST)
- **Tasks:** 3 (Task 1 tracer, Task 2 TDD with a RED commit, Task 3 TDD)
- **Commits:** 5 task commits, plus this SUMMARY
- **Files:** 30 changed (14 created, 16 modified, counting tests and docs)

## Accomplishments

- `/tour/[slug]` answers the tour in the first response: the cover with its credited caption, the one h1, the facts strip, an empty booking slot (filled by 04-07), the itinerary beside the static route, the description, the captioned gallery and the photo credits.
- A missing slug answers HTTP 404 with the Phase 3 not-found page, checked on the built app by `npm run smoke`. No `loading.tsx` exists under `src/app/tour/[slug]` or at `src/app/loading.tsx` (ADR 0032).
- Every tour page carries its title, the description `{summary} {n} days, {price} per person.` through `formatPrice`, a canonical URL, the cover as og:image with its alt text, `en_IN`, and `summary_large_image`. All absolute URLs come from APP_URL.
- The slug is looked up in the cached catalogue before any per-tour entry exists, so an unknown slug creates no cache entry (T-04-17). The page and its metadata share one lookup per request through React `cache()`.
- `GET /api/v1/tours/[id]` returns the tour the page shows (B13) with `guides` in lead-first order, each guide carrying only id, name, photo and role (S3). A malformed id is 400 VALIDATION_ERROR and an unknown id is 404 NOT_FOUND, both in the standard envelope with a request ID.
- The static route is `MapFrame` with `animate={false}` in a fixed 5:3 slot, so the box does not move when Leaflet replaces it in 04-08. `MapFrame`'s drawing sizes now equal the tokens they name, and a unit test reads `tokens.css` to hold them there (C6).
- `PhotoCredits` renders a plain-text author when no link exists, and rows are keyed by position, so two photos by the same author are two rows (C7).

## Task Commits

1. **Task 1: `/tour/[slug]` renders the tour, 404s a missing slug, and carries its metadata** - `053f925` (feat, tracer)
2. **Task 2 (RED): failing tests for the route, gallery and photo credits** - `e923ec0` (test)
3. **Task 2 (GREEN): static route with itinerary, captioned gallery and full photo credits** - `246020e` (feat)
4. **Task 3: GET /api/v1/tours/[id] with the public guides** - `4e67b0d` (feat)
5. **Task 3 docs: ADR 0032, contracts and OpenAPI for the detail** - `6ffcc00` (docs)

**Plan metadata:** this SUMMARY, committed after the task commits. STATE.md and ROADMAP.md are left to the orchestrator.

## TDD record

- **Task 2:** the RED tests were run and failed for the intended reasons before any implementation: the photo credits render threw on the missing `authorUrl`, the map had no `animate` prop or token constants, and the gallery module did not exist (a missing-module failure, the expected RED for a new module). The browser checks failed on the missing sections, the missing route and the Day 2 row. The RED commit `e923ec0` was made before the GREEN commit `246020e`, and both suites were then green (12 Vitest tests; 20 Playwright tests across the tour page, the map and the styleguide).
- **Task 3:** the guide-order, `findActivePublicByIds` and `getById` tests passed on arrival, because those service methods were written in Task 1 (see deviations). The detail route tests were written before the route file, but the RED run was not captured separately, so this task has no RED commit. The route and its tests were verified green (7 detail tests, 32 across the users, tours service and detail suites).

## Files Created/Modified

- `src/app/tour/[slug]/page.tsx` - the tour page, `generateMetadata`, `notFound()` before any JSX, the sections in D-06 order
- `src/app/tour/[slug]/page.module.css` - phone order, and the 64em two-column grid with the aside sticky at `--space-5`
- `src/app/layout.tsx` - root metadata built inside `generateMetadata` with `metadataBase` and the title template (ARC-07)
- `src/server/modules/tours/service.ts` - `getBySlug`, `getById`, `getGuides` (cached per tour id; lead guide first)
- `src/server/modules/tours/dto.ts` - `TourDetail` gains `guideIds` and drops `guides`
- `src/server/modules/users/service.ts` - `findActivePublicByIds` (active users; name, photo, role only)
- `src/app/api/v1/tours/[id]/route.ts` - GET /api/v1/tours/[id]
- `src/components/ui/map-frame.tsx`, `map-frame.module.css` - `animate` prop, `FRAME_TOKENS`, still variant, outline 8, numerals 600, marker stroke from `--focus-ring-width`
- `src/components/ui/photo-credits.tsx` - `authorUrl` optional, keys by position
- `src/components/features/tour-route.tsx`, `tour-route.module.css` - the static route in a 5:3 slot with the itinerary beside it
- `src/components/features/tour-gallery.tsx`, `tour-gallery.module.css` - the captioned gallery
- `scripts/smoke.ts` - 404 for a missing slug, 200 with the tour name for a seeded one
- `docs/adr/0032-no-loading-file-on-the-tour-page.md`, `docs/adr/README.md` - the R4 deviation and its index row
- `docs/contracts.md` - two "differs from plan.md section 4" rows and the tour detail section
- `docs/openapi/openapi.yaml` - `/tours/{id}`, its parameter, `PublicUser`, `TourDetail`, `TourWithGuides`
- Tests: `test/app/tour-page-metadata.test.ts`, `test/app/tour-page.spec.ts`, `test/app/api/tours-detail.test.ts`, `test/components/features/tour-gallery.test.ts`, `test/components/ui/map-frame.test.ts`, `test/components/ui/photo-credits.test.ts`, `test/server/modules/users/public-by-ids.test.ts`, `test/server/modules/tours/dto.test.ts`, `test/server/modules/tours/service.test.ts`

## Decisions Made

- No `loading.tsx` on the tour segment or at the root, recorded in ADR 0032. Streaming sits inside the page after the 404 decision.
- `getBySlug` returns null and the page calls `notFound()`. `getById` throws NOT_FOUND for the API. Recorded in contracts (plan.md 4 difference, citing ADR 0031).
- `TourDetail` holds `guideIds`, so the tour document is read without a populate and the guides stream separately (RESEARCH Pattern 6).
- The og:image is the direct `/media/<cover key>` URL on APP_URL, the original JPEG under 1 MB (RESEARCH A3).
- `preload` is used on the cover image rather than the deprecated `priority` in Next 16.4.5 (the plan names `preload`).
- The static route keeps `animate={false}` (C3). `FRAME_TOKENS` mirrors the tokens (C6), and the numerals take weight 600 (C4).
- A gallery image or credit row with no matching credit is left out, because it cannot be captioned (U27).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `node_modules` was missing in the fresh worktree**
- **Found during:** Task 1 setup
- **Issue:** The worktree had no installed dependencies.
- **Fix:** Ran `npm ci` against the committed lockfile, as ADR 0004 directs (install when first used). No package was added or changed.
- **Files modified:** none committed (`node_modules` is gitignored)
- **Verification:** Vitest, tsc, lint and the Playwright run passed after the install.
- **Committed in:** not committed (environment only)

**2. [Rule 3 - Blocking] `next-env.d.ts` was missing**
- **Found during:** Task 1 typecheck (TS2307 on the seed image imports)
- **Issue:** The generated, gitignored Next types file was absent in the worktree.
- **Fix:** Ran `npx next typegen`. Nothing was committed.
- **Verification:** `npx tsc --noEmit` clean.
- **Committed in:** not committed (environment only)

**3. [Rule 3 - Blocking] A stale `.next` broke the Playwright dev server**
- **Found during:** final verification
- **Issue:** The production build output in `.next` (from the empty-environment build) made the styleguide focus and touch-target checks fail under `next dev`. Those checks had passed earlier.
- **Fix:** Removed `.next` (gitignored build cache), reran the styleguide spec (8 of 8 pass single-worker), then rebuilt for the smoke run.
- **Verification:** 21 of 21 browser checks pass in the default configuration; smoke passes on the fresh build.
- **Committed in:** not committed (environment only)

### Scope and design decisions (not auto-fixes)

- **C4 and C6 applied in Task 2.** The plan's Task 2 text names only C3 for `MapFrame`. The UI-SPEC's Route map section, which the plan cites, also sets the token-aligned constants, the 600 numeral weight and the 8-unit outline, so they were applied with a unit test that reads `tokens.css`.
- **`toGuides` was not written.** The plan's artifact list names it. `getGuides` reads `PublicUser` through `findActivePublicByIds`, so no populated-guide mapper is needed. Nothing depends on it.
- **`TourRoute` takes `locations` only.** The plan's `label` prop was not added, because `MapFrame` already names the route through its `aria-label`.
- **The booking slot is a `div`, not an `aside` element,** and is hidden with `:empty` until 04-07, so no empty landmark appears.
- **`preload` instead of `priority`** on the cover image (Next 16.4.5 deprecates `priority`; the plan names `preload`).
- **Extra test files.** `public-by-ids.test.ts` is separate because `users/service.test.ts` allows one `useTestDatabase()` call per file. `map-frame.test.ts`, `tour-gallery.test.ts` are new. `tours/service.test.ts` wraps its describes under one database hook.

### Process deviations (disclosed)

- **TDD order for Task 3.** The `findActivePublicByIds`, `getGuides` and `getById` code landed in the Task 1 tracer, so Task 3's service tests passed on arrival and have no RED commit. The detail route was written before its tests were run, and the RED run for the route was not captured. This is the one place the RED discipline was not followed.
- **Interim knip warning.** The Task 1 commit exported `getById` and `getGuides` before any caller existed, so knip flagged them until Task 3 used them. Knip is clean at HEAD.

**Total deviations:** 3 auto-fixed (all Rule 3, all environment), 4 scope and design decisions, 2 process deviations.
**Impact on plan:** None on behaviour or requirements. The unused-export and TDD-order items were handled in the same plan, and the environment fixes were not committed.

## Issues Encountered

- A zsh glob on the `[slug]` path and an unquoted `$FILES` list broke the first Prettier call. Re-ran with quoted, explicit paths.
- The worktree guard refused several compound shell commands. They were split into plain, separate commands, and every git operation targeted the worktree.
- Prettier reformatted files between edits. Each file was re-read before the next edit.

## Known Stubs

- `src/app/tour/[slug]/page.tsx`: the `aside` slot is empty and hidden until plan 04-07 fills it with the booking panel. This is intentional and tracked by plan 04-07.
- The "Read the photo credits" link points to `/credits`, which plan 04-10 builds. Until then it leads to the not-found page.
- Cover and gallery alt text uses the stored `alt` where the seed has one, and otherwise the tour name or the cleaned photo title (D-15). Drafting the 52 alt texts for approval is not part of this plan.

## Threat Flags

None beyond the plan's register. The new public read of `/api/v1/tours/[id]` is covered by T-04-17 (no cache entry for an arbitrary id), T-04-18 (canonical and og:image from APP_URL) and T-04-19 (guides carry only id, name, photo and role). No new trust boundary was added.

## Next Phase Readiness

- Plan 04-07 fills the booking slot and streams the guides and reviews into the reserved sections, behind same-sized skeletons.
- Plan 04-08 replaces the static `MapFrame` in the 5:3 slot with Leaflet. The `FRAME_TOKENS` values and the still variant are its baseline.
- Plan 04-10 builds `/credits`, which the photo credits section already links to.

**Open for the orchestrator and the user:**
- The new strings used on this page are in UI-SPEC "New copy, needs approval": "Itinerary", "Photos", "About this tour", "Photo credits", "Read the photo credits", the "Photo: {author}, {licence}" caption and the "Photo by {author}, {licence}" credit wording. None is in `docs/design/copy.md` yet. Approval belongs to the user, so this plan did not add them.
- A person has not yet reviewed the 375px and 1280px layouts against the approved mockups (design gate).
- `.planning/REQUIREMENTS.md` was not changed. The orchestrator marks U11, R4, R3, R10, U7, U27, B12 and R8 through the shared-ID gate.

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16*

## Self-Check: PASSED

Checked after writing: every created file exists on disk; the five task commits (`053f925`, `e923ec0`, `246020e`, `4e67b0d`, `6ffcc00`) are ancestors of HEAD; no `loading.tsx` exists under `src/app/tour/[slug]` or at `src/app/loading.tsx`. Before this SUMMARY: Vitest passed 77 files and 947 tests; Playwright passed the tour page, map frame, browse list and styleguide specs (21 tests); `npm run build` passed with the default and an empty environment; `npm run smoke` passed on a fresh build; `npx tsc --noEmit`, `npm run lint`, `npm run lint:css`, `npm run format:check` and `npx knip` were clean.
