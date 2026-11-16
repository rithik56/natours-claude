# Phase 4: Browse tours - Context

**Gathered:** 2026-11-16
**Status:** Ready for planning

<domain>
## Phase Boundary

A traveller finds a tour that fits their fitness, dates and budget, then sees its route, itinerary, guides, reviews and photo credits. API clients get the same catalogue. This phase also loads the seed data (13 tours, 35 users, 52 reviews, 58 bookings, 52 photos) and owns the tour and review cache tags.

In scope: the seed script (D10, D2), the tours service, the tour list at `/` (U10), the tour page at `/tour/[slug]` (U11), `/credits`, page metadata, `/sitemap.xml` and `/robots.txt` (U27, R10, U7), and the tour API (F1, F2, F6, B2, B3, B4, S4, S16). Out of scope: booking and checkout (Phase 6), accounts and login (Phase 5), writing reviews (Phase 6).

Roadmap mode is `mvp`: the first plans are a thin slice the user can see working.

</domain>

<decisions>
## Implementation Decisions

### Tour list at `/` (filters, sort, paging)
- **D-01:** On a 375px phone the filter form sits in a collapsible "Filters" disclosure (a native `details`, closed by default) above the list. Its summary shows how many filters are active. It works with JavaScript off, and it stays open after applying when any filter is active.
- **D-02:** Length and maximum price are preset choices in selects, not free number inputs. The real seed ranges are lengths of 3 to 8 days and prices of ₹12,999 to ₹42,999. Suggested bands: length "Any", "3 to 4 days", "5 to 6 days", "7 to 8 days"; maximum price "Any", "Up to ₹20,000", "Up to ₹30,000", "Up to ₹40,000", written through `formatPrice`. The planner may adjust the exact bands to the seed.
- **D-03:** With no sort chosen the list is ordered by rating, highest first, with ties broken by name so the order is stable and shareable. The available sorts stay as the roadmap says: price, rating and length. No new sort is added.
- **D-04:** The start-month select lists only months that have an upcoming departure, each shown as a month and year. Run on 8 Nov 2026 that is Nov 2026 to Apr 2027 and Jun to Oct 2027 (no May 2027). The list is derived from the data, not hard-coded.
- **D-05:** Filters and sort are applied by one submit button and no JavaScript on the list page (U10, R11). There is no auto-apply on change. This keeps the R9 script budget untouched.

### Tour page `/tour/[slug]`
- **D-06:** On a phone the order is cover photo and name, facts strip, booking panel, route map and itinerary, description, photo gallery, guides, then reviews. The booking panel comes straight after the facts strip. From the desktop breakpoint it becomes a sticky column beside the content. No pinned bottom bar.
- **D-07:** The Leaflet route map and the India boundary load when the map scrolls into view, then the route line draws once. The day-by-day itinerary list is always visible beside the map (below it on a phone) and is never hidden or replaced. Until Leaflet loads, and with JavaScript off, the map slot holds a same-size static route drawing with no animation, so nothing jumps (R8, U11). *Amended 2026-11-16 at the UI-SPEC check: the original wording could be read as the itinerary list disappearing once the map loads; the user confirmed the itinerary stays visible and the static route holds the slot.*
- **D-08:** Reviews are paged 5 per page, newest first. Page links appear only when a tour has more than 5 reviews. They work without JavaScript through a query parameter and return to the reviews heading. Every seed tour has exactly 4 reviews, so a test must add reviews to prove paging.

### Photos and credits
- **D-09:** Each tour has 4 photos (a cover plus three more). The three extra photos appear as a gallery after the description: stacked on a phone and a row on desktop, plain images with no JavaScript. Each has a one-line caption of the form "Photo: author, licence". The full credit list with links is the existing `PhotoCredits` section lower on the page (U27).
- **D-10:** `/credits` lists all 52 photos grouped by tour (each group links to its tour page). Each row has a small lazy-loaded thumbnail, the photo title linked to its source, the author, and the licence linked to its licence page. A test fails if any tour photo has no credit.

### Build order and API timing
- **D-11:** First slice is the seed script together with the tours service, then the filtered, sorted, paged list at `/`. After that come the tour page, then credits and SEO, then the remaining API. Planning should split these into plans in that order.
- **D-12:** The public GET endpoints (list, then tour detail) ship with the page they mirror, as thin wrappers over the one shared service (B13). Stats, top-5-cheap, geo and the monthly plan follow. Admin create, update, delete and the images endpoint (uploads, the 409 rule, 413 and 415) come last, so the visible pages are not held up.

### Tours API writes and photos (settled 2026-11-16 at plan-phase, from RESEARCH.md Open Questions 1–4)
- **D-13:** `imageCover` becomes optional in the tour model, so `POST /tours` stays JSON-only (B4, S4). The public catalogue (list, tour page, sitemap) skips any tour without a cover, so no placeholder image is ever shown. The admin API still returns these tours, and the cover is added through the images endpoint. Recorded in an ADR.
- **D-14:** The images endpoint replaces by position. `imageCover` (optional) replaces the cover. File n of `images` (up to 3, optional) replaces gallery slot n, and the other slots stay as they are. Each uploaded file comes with its credit (a `credits` part), so every stored photo keeps a complete credit (U27).
- **D-15:** Each `photoCredits` entry gets an optional `alt` field in the model, seed data and DTO. The executor drafts the 52 alt texts and stops at a human-verify checkpoint for approval before they are committed to `seed/data`. Until approved, or when `alt` is absent, covers use the tour name and gallery images use the cleaned photo title.
- **D-16 (SEC-24):** F6 as written: admins and lead guides may create, update (including price) and delete any tour. Recorded in an ADR so a stricter rule can be adopted later.

### Claude's Discretion
- **Cache tags (ARC-02, QA-12):** the real adapter already calls `revalidateTag(tag, { expire: 0 })` (ADR 0012), which works in actions and Route Handlers. Planning must still write the table of which writes clear which tags (`tours`, `tour:<id>`, `reviews:<tourId>`). A rating change must also clear `tours`, because the list sorts and filters by rating. Never cache anything that depends on who is logged in (R5). Settle which functions are cached and how listing queries are keyed so arbitrary filter combinations do not create unbounded cache entries.
- **Query parameter names** for filters, sort and paging, and their fallbacks (an invalid `sort`, `page` or `limit` falls back to a default instead of crashing). These are a shared-URL contract, so name them once.
- Image delivery: sizes, formats and the `sizes` attribute for the list row, the gallery, the cover and the `/credits` thumbnails, plus the social-preview image from the cover photo (U7). Seed images are at most 1920px wide JPEGs (about 31 MB in total).
- Internals of the seed script (D10, D2, ADR 0023): `--today`, `--reset`, idempotency, the production refusal, and uploading through the storage adapter.
- Which sections stream behind same-sized skeletons (the booking panel depends on the user, so it is a candidate) and the exact skeleton sizes.
- The site base URL for canonical links, the sitemap and the social preview.
- The label of the filter submit button and every new string. Any string that is not yet in `docs/design/copy.md` must be added there with the wording approved, as at the Phase 3 design gate.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Specification and roadmap
- `plan.md` (unedited spec) — U10 (overview), U11 (tour page), R5 (caching), B6 (rating recalculation clears cache), R8, R10, U7, U27, and §4 `toursService`. Never edit it; record deviations as ADRs in `docs/adr/`.
- `.planning/ROADMAP.md` — "Phase 4: Browse tours": goal, five success criteria, requirement IDs, review findings and carry-over findings.
- `.planning/REQUIREMENTS.md` — requirement IDs F1, F2, F6, S4, S7, S16, B1 to B4, B11, B12, R3, R4, R8, R10, D2, D10, U7, U10, U11, U27.
- `.planning/PROJECT.md` — Key Decisions (cache with `unstable_cache`, `cacheComponents` off, ARC-01, SEC-13).
- `docs/contracts.md` — each difference from plan.md §4 and its ADR; the Phase 1 contracts this phase builds on.

### Caching and data layer
- `docs/adr/0012-tagged-data-cache-and-dynamic-rendering.md` — the cache adapter, `cached` and `invalidate`, and why every page renders dynamically.
- `docs/plan-review/findings-architect.md` — ARC-02 (`revalidateTag` variants) and ARC-03 (cached services outside a request).
- `docs/plan-review/findings-qa.md` — QA-12 (which writes clear which tags).
- `docs/adr/0014-one-price-per-tour.md`, `docs/adr/0013-user-dto-split-and-dto-rule.md`, `docs/adr/0016-adapters-selected-by-app-env.md`, `docs/adr/0017-required-access-and-error-mapping.md` — price, DTOs, adapters and API access rules.

### Seed and credits
- `seed/README.md` and `docs/adr/0023-seed-rolls-forward-only-passed-start-dates.md` — the seed rules the seed script must check afterwards.
- `seed/CREDITS.md` and `seed/data/tours.json` (`photoCredits`) — author, licence and source for every photo.
- `seed/data/{tours,users,reviews,bookings}.json` and `seed/img/tours/` — the real content; no placeholder content anywhere.

### Maps and design
- `docs/adr/0028-map-tile-provider-and-boundary-compliance.md` — Leaflet with the Survey of India boundary and no third-party tile host.
- `docs/design/direction.md` and `docs/design/copy.md` — approved design direction and approved wording.
- `.planning/phases/03-design-system-and-app-shell/03-CONTEXT.md` and the 03-0x SUMMARY files — the `ui/` component APIs and their known limits.

No other external specs — the discussion decisions above cover the rest.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/`: `tour-row`, `facts-strip`, `itinerary`, `pagination`, `photo-credits`, `map-frame`, `booking-panel`, `review-item`, `guide-item`, `empty-state`, `skeleton`, `select`, `text-field`, `button`, `link`, `price`, `difficulty-symbol`, `star-rating` and `start-date-select`. The list and tour pages are assembled from these.
- `src/server/adapters/cache.ts` and `real-cache.ts`: the `cached(fn, keyParts, tags)` and `invalidate(...tags)` interface, with a fake that records invalidated tags for tests.
- `src/server/api/`: `with-api.ts` (access declaration, fails closed), `parse-query.ts`, `responses.ts`, `origin.ts`.
- `src/server/modules/tours/`: `model.ts`, `dto.ts`, `slug.ts` already exist. There is no tours service yet.
- `src/lib/format.ts` and `ist.ts`: `formatPrice`, `formatDate`, and IST calendar-day helpers.
- `src/server/clock.ts`: the one `now()`; `APP_NOW` pins it in development and tests.

### Established Patterns
- Services are shared by Server Components, Server Actions and Route Handlers (B13); DTOs, never models, cross the boundary (ADR 0013).
- Every page renders dynamically; only public data is cached, tagged, and never anything per-user (R5).
- Adapters are selected by `APP_ENV`; local development uses fakes (ADR 0016).
- Client Components are small and carry a `// client:` reason; the JavaScript budget is measured with Lighthouse CI (ADR 0018, R9).
- Prices come only from `formatPrice`; dates from `formatDate`, in IST; distances in kilometres; Indian English.

### Integration Points
- `src/app/page.tsx` becomes the tour list; `src/app/tour/[slug]/page.tsx`, `src/app/credits/page.tsx`, `src/app/sitemap.ts` and `src/app/robots.ts` are new.
- `src/app/api/v1/tours/**` and `scripts/seed.ts` are new.
- `src/app/styleguide/page.tsx` stays as it is.

</code_context>

<specifics>
## Specific Ideas

- Real data drives every choice: tours run 3 to 8 days; prices ₹12,999 to ₹42,999; departures run Nov 2026 to Oct 2027 with no May 2027 departure; every tour has 4 photos and exactly 4 reviews.
- The core value is a traveller on a phone choosing a tour by fitness, dates and budget, so filters and the booking panel are placed for a 375px screen first.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 4-Browse tours*
*Context gathered: 2026-11-16*
