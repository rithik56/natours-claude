# Phase 4: Browse tours - Research

**Researched:** 2026-11-16
**Domain:** Next.js 16.4.5 App Router catalogue (server-rendered list and detail pages, tagged data cache), Mongoose 9 geo and aggregation queries, idempotent seeding, multipart image upload with sharp, Leaflet route map, SEO metadata
**Confidence:** HIGH for the stack, caching, rendering, seed and API mechanics (each verified by running code in this session or by reading the installed Next 16.4.5 docs). MEDIUM for four product decisions that need user confirmation (see Open Questions 1 to 4).

## Summary

Phase 4 builds on a complete data layer, request pipeline and design system (Phases 1 to 3). Almost everything it needs already exists as an interface: `withApi`, `parseQuery`, the `Cache` adapter, the DTO mappers, `formatPrice`/`formatDate`/`istMonthBounds`, and 27 finished `ui/` components. The work is to add the **tours, reviews and bookings services**, the **seed script**, the **pages**, the **API routes**, and four pieces of infrastructure that the earlier phases deliberately left open: a **persistent local storage adapter plus a `/media` route** (the in-memory fake cannot be shared between the seed process and the web server), **multipart parsing with byte-counted limits in `withApi`**, an **`images.normalize` sharp pipeline**, and a **Leaflet route map loaded lazily with a layered vendor stylesheet**.

The cache design (CONTEXT Claude's Discretion, ARC-02, QA-12) is settled in this research. **Cache one thing per concern, keyed only by ids that exist, and do all filtering, sorting and paging in memory.** The whole public catalogue is 13 small summaries, so one cached entry `catalogue` (tag `tours`) feeds the list page, the month options, the `/credits` page, the sitemap and the API list; per-tour detail, guides and the full review list are cached per tour id (tags `tour:<id>`, `reviews:<tourId>`). No cache key ever contains a value the visitor typed, so arbitrary filter, sort, page or slug combinations cannot create new cache entries. Nothing that depends on who is logged in is cached. A write-to-tags table is in "Architecture Patterns".

Two findings change plan shape and must be handled first. (1) `/tour/[slug]` **must not have a `loading.tsx`**: I reproduced on Next 16.4.5 that a segment `loading.tsx` turns a missing slug into HTTP 200 (with `noindex`), while the same page without it returns 404. Success criterion 3 therefore wins over R4's "route segments have `loading.tsx`" for this one segment, and that needs an ADR. (2) The seed cannot "upload through the storage adapter" while the only adapter is an in-memory `Map`; Phase 4 must add a disk-backed adapter for development and ci and serve it from `/media/<key>` (ARC-15 option A), which also removes any need for `remotePatterns` or `dangerouslyAllowLocalIP`.

**Primary recommendation:** Build in D-11 order (seed + services, list, tour page, credits + SEO, API reads, API writes). Add `tsx` to run the seed (`tsx --conditions=react-server`), cache the whole catalogue as one entry and filter in memory, add a disk storage adapter plus `/media/[...key]`, drop `loading.tsx` on the tour segment, and treat the two product questions on tour creation (`imageCover` is required but images must never travel in JSON) and on the images endpoint semantics as decisions to confirm before planning the API write plan.

## Project Constraints (from CLAUDE.md)

Extracted from `/Users/rithikagarwal/CLAUDE.md`, `/Users/rithikagarwal/Desktop/natours-claude/CLAUDE.md` and `.claude/CLAUDE.md`. The planner verifies compliance; these carry the same authority as locked decisions.

- `plan.md` is the specification and is never edited. Any deviation is an ADR in `docs/adr/` (this phase needs several; see "Required ADRs").
- Work goes through GSD plans. Commits follow Conventional Commits with requirement IDs in square brackets and the plan number in brackets, e.g. `feat(session): pin HS256 and reject stale tokens [S14, B14] (01-09)`. A commit that adds a dependency gives a one-line reason in its body.
- Real seed content only (`seed/`): no placeholder text, names or images anywhere (product, styleguide, mockups, emails, test fixtures a person might see).
- Indian conventions: prices in ₹ with Indian grouping through `formatPrice`; dates in IST through `formatDate`; distances in kilometres; Indian English with British spelling.
- `.env.example` lists every config key with comments; secret values stay empty (`npm run check:env` enforces).
- Design gate: no styling outside the approved Milestone direction; `04-UI-SPEC.md` is the contract. Plain CSS Modules in `@layer components`, tokens only, no raw hex or px, no IDs, no `!important`, one breakpoint `width >= 64em`.
- Tracking in the user's global CLAUDE.md is `bd` (beads); this project's GSD workflow is the planning surface, so no markdown TODO lists are produced here.
- Do not commit or push unless asked. (This research file is written but not committed.)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Claude's Discretion
- **Cache tags (ARC-02, QA-12):** the real adapter already calls `revalidateTag(tag, { expire: 0 })` (ADR 0012), which works in actions and Route Handlers. Planning must still write the table of which writes clear which tags (`tours`, `tour:<id>`, `reviews:<tourId>`). A rating change must also clear `tours`, because the list sorts and filters by rating. Never cache anything that depends on who is logged in (R5). Settle which functions are cached and how listing queries are keyed so arbitrary filter combinations do not create unbounded cache entries.
- **Query parameter names** for filters, sort and paging, and their fallbacks (an invalid `sort`, `page` or `limit` falls back to a default instead of crashing). These are a shared-URL contract, so name them once.
- Image delivery: sizes, formats and the `sizes` attribute for the list row, the gallery, the cover and the `/credits` thumbnails, plus the social-preview image from the cover photo (U7). Seed images are at most 1920px wide JPEGs (about 31 MB in total).
- Internals of the seed script (D10, D2, ADR 0023): `--today`, `--reset`, idempotency, the production refusal, and uploading through the storage adapter.
- Which sections stream behind same-sized skeletons (the booking panel depends on the user, so it is a candidate) and the exact skeleton sizes.
- The site base URL for canonical links, the sitemap and the social preview.
- The label of the filter submit button and every new string. Any string that is not yet in `docs/design/copy.md` must be added there with the wording approved, as at the Phase 3 design gate.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F1 | Anyone can see tour statistics (`GET /api/v1/tours/stats`) | Aggregation over the cached catalogue or `$group` in Mongo; response shape in "API surface". Single cache key, tag `tours`. |
| F2 | Guides, lead guides and admins read a year's monthly plan | `$unwind startDates` + `$month`/`$year` with `timezone: 'Asia/Kolkata'` (verified, QA-10); access `{ roles: ['guide','lead-guide','admin'] }`. |
| F6 | Admins and lead guides create, update, delete tours and replace images; 409 if bookings, else reviews deleted | Load-set-save updates (QA-04), `bookings.countForTour`, `reviews.deleteForTour`, images endpoint with slot semantics. Open Questions 1 and 2 must be settled first. |
| S4 | No mass assignment; strict input schemas | `z.strictObject` PATCH/POST schemas that omit `slug`, `images`, `imageCover`, `photoCredits`, `ratings*`; strict query schemas via `withApi`. |
| S7 | No injection; tour filters built from an allowlist of fields and operators | Filters evaluated in memory from an allowlisted parser, so no request key ever reaches a Mongo operator. |
| S16 | Uploads: 5 MB per file, JPEG/PNG/WebP only, sharp re-encode, random keys; 400, 413 or 415 | `readBodyLimited` byte counter, magic bytes, `images.normalize` with `limitInputPixels: 40_000_000` (bomb rejected, verified), random `tours/<uuid>.webp` keys. |
| B1 | `sort` comma list, allowlist, default `-createdAt` | One allowlist, `_id`/name final tie-break; `createdAt` must be added to the catalogue entry (see Pitfall 11). |
| B2 | `top-5-cheap` alias sets the validated query the builder reads | Route builds a validated query object (limit 5, sort `price,-ratingsAverage`) and calls the same `toursService.list`. |
| B3 | Geo endpoints return documents; coordinates range-checked | `$geoNear` and `$geoWithin $centerSphere` verified on the `startLocation` 2dsphere index; out-of-range centre raises a Mongo `BadValue` (verified), so Zod must reject first. |
| B4 | Images only via their own endpoint; JSON PATCH never touches them | Strict PATCH schema (unknown key = 400); `PUT /tours/[id]/images` multipart. |
| B11 | `page` ≥ 1, `limit` 1 to 100 default 20, `meta.total`, pagination control | `parseQuery` falls back per field; list page uses limit 12; clamp page to last page. |
| B12 | List queries populate nothing; tour page populates guides (name, photo, role); reviews separate | Catalogue has no guides; `getGuides(id)` and `listForTour` are separate reads. |
| R3 | Pages call services directly; parallel loads; `cache()` dedupe | `cache()` wrappers shared by `generateMetadata` and the page; sibling Suspense sections load in parallel. |
| R4 | Slower sections stream behind same-size skeletons; route segments have `loading.tsx` | Booking panel, guides, reviews stream. **`/tour/[slug]` must not have `loading.tsx`** (404 status); `/` and `/credits` may. |
| R8 | Route map via `next/dynamic` `ssr:false` from a Client Component; Leaflet only on tour pages | Verified at runtime: Leaflet JS and its layered CSS load only after the slot nears the viewport. |
| R10 | `generateMetadata` on every page; OG cover on tour pages; sitemap; robots | `sitemap.ts` and `robots.ts` need `export const dynamic = 'force-dynamic'` (build fails without; verified). `metadataBase` must not be set at module scope. |
| D2 | Uploads go through the storage adapter; filesystem treated as read-only | Disk adapter for development/ci (dir outside the container image), S3 stays Phase 8; `/media` route. |
| D10 | `npm run seed`: idempotent, `--reset`, refuses production, passwords from env, uploads photos, forward-only date roll, `--today` | Full design in "Seed script". |
| U7 | `next/image` everywhere with correct `sizes`; priority only on first visible photo | `sizes` table; use `preload` (`priority` is a deprecated alias in 16.4.5, verified in source). |
| U10 | Overview: GET filters, sorts, result count, empty state, pagination above 12 | Query contract and page structure below. |
| U11 | Tour page: map + itinerary, facts, description, guides, paginated reviews, booking panel | Streaming layout, booking panel state logic (upcoming paid booking, QA-07). |
| U27 | Every tour page credits each photo; `/credits` lists all; a test checks coverage | `listCredits()` cached read; test over seed file and over the service. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Filter, sort, paginate the catalogue | API / Backend (service, in memory over the cached catalogue) | Frontend Server (page parses `searchParams`) | One pure function shared by the page and `GET /api/v1/tours` (B13). No client JavaScript (D-05). |
| Public catalogue, detail, guides, review list | Database / Storage via the tagged cache | API / Backend (service + `cached()`) | Public, not per user, so cacheable (R5). Keys are ids only. |
| Booking panel state (logged out / booked / bookable / no dates) | Frontend Server (streamed Server Component) | API / Backend (`bookings.findUpcomingPaid`) | Depends on the user, so never cached and streamed behind a skeleton. |
| Photo storage and delivery | API / Backend (`Storage` adapter + `/media/[...key]` route) | CDN / Static (`next/image` optimizer cache) | Same-origin delivery keeps CSP `img-src 'self'` and avoids the local-IP image block. |
| Image validation and re-encode | API / Backend (`images.normalize`, sharp) | — | Untrusted bytes are checked and re-encoded on the server only (S16). |
| Route map | Browser / Client (Leaflet, IntersectionObserver) | Frontend Server (static `MapFrame` + itinerary list in the HTML) | Needs the DOM; the server-rendered fallback is the whole feature with JavaScript off. |
| India boundary outline | CDN / Static (`public/data/*.geojson`) | Browser (fetch on scroll-in) | Simplified, vendored once; same-origin so `connect-src 'self'` suffices. |
| Metadata, sitemap, robots | Frontend Server (`generateMetadata`, `sitemap.ts`, `robots.ts`) | API / Backend (catalogue read) | Origin comes from `APP_URL` only (SEC-12). |
| Seed | CLI (`tsx` script) → API / Backend models and storage adapter | Database | Loads fixed-id documents; runs outside Next, so no Next cache calls. |
| Geo, stats, monthly plan | API / Backend (Mongo aggregation) | Database | Needs the 2dsphere index; arguments are user-supplied, so these reads are not cached except `stats`. |

## Standard Stack

### Core (already installed, versions read from `package.json` this session)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.4.5 | App Router, `next/image`, metadata routes, `next/dynamic` | Locked by plan.md §2 / ADR 0001. Installed docs at `node_modules/next/dist/docs` are the authority. |
| react / react-dom | 19.3.1 | Server Components, Suspense, `cache()` | Locked. |
| mongoose | 9.12.0 | Models, aggregation, `$geoNear` | Locked. Verified `$geoNear`, `$geoWithin`, `$month` with timezone against Mongo 8.0.34. |
| zod | 4.6.7 (via `@/server/validation`) | Strict query/body schemas | Locked; import only from `@/server/validation` (ADR 0009). |
| sharp | 0.35.5 | Image re-encode | Already installed transitively by Next (`optional` in the lockfile); becomes a **direct dependency** in this phase because `images.normalize` imports it. Linux binaries are present in the lockfile (24 `sharp-linux*` entries). |
| vitest | 5.1.0 + mongodb-memory-server 11.3.0 | Service, route and seed tests | Already the project standard (Mongo 8.0.34 binary cached locally). |
| @playwright/test | 1.65.0 | No-JavaScript, streaming and map behaviour | Already configured (`test/app`). |

### New dependencies this phase
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| leaflet | 1.9.4 (npm `latest`; 2.0 is alpha/beta only) | Route map | Locked by ADR 0028. Gzip: 42,661 bytes JS + 3,558 bytes CSS (measured). |
| @types/leaflet | 1.9.22 (devDependency) | Types | Only types for Leaflet 1.9. |
| tsx | 4.23.15 (devDependency) | Run `scripts/seed.ts` | The seed imports `src/server/**`, which uses `@/` aliases, extensionless relative imports and `server-only`. Verified: `tsx --tsconfig tsconfig.json --conditions=react-server script.ts` imports `Tour` and `getDeps` correctly; without the condition it throws on `server-only`. Plain `node` cannot resolve the aliases or extensionless imports. |

One-off, **not** installed: `mapshaper@0.6.121`, used once to simplify the boundary file (see "India boundary file").

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cache the whole catalogue, filter in memory | Build Mongo queries from the filters and key `unstable_cache` by the canonical query | Unbounded or very large key space, and request-derived values reach Mongo. In memory is exact for 13 tours and stays inside the 2 MB `unstable_cache` item limit for roughly a thousand summaries [ASSUMED limit]. Revisit with an ADR if the catalogue passes ~500 tours. |
| Disk storage adapter + `/media` route | MinIO in compose (DEL-16 option a) | MinIO adds an S3 client and compose service before Phase 8 and needs `dangerouslyAllowLocalIP`. Disk is enough for Phases 4 to 7. |
| `tsx` for the seed | A Node resolve hook for `@/` and `server-only` | Hook must also add `.ts` to extensionless specifiers across all of `src/server`. More code than one devDependency. |
| Leaflet with `L.CRS.Simple` and the shared projection | Leaflet default Web Mercator | Mercator reshapes the route slightly compared with the static `MapFrame` (equirectangular scaled by cos(mean latitude)), so the swap visibly shifts. See Pitfall 14. |

**Installation (each in the commit that first uses it, ADR 0004):**
```bash
npm install leaflet@1.9.4 sharp@0.35.5          # reasons: route map (ADR 0028); S16 image re-encode
npm install -D @types/leaflet@1.9.22 tsx@4.23.15 # reasons: Leaflet types; run the seed script
```

**Version verification:** `npm view leaflet version` → 1.9.4; `@types/leaflet` → 1.9.22; `tsx` → 4.23.15; `sharp` → 0.35.5 (all 16 Nov 2026). `npm view <pkg> scripts.postinstall` returned nothing for all four. [VERIFIED: npm registry, gsd package-legitimacy]

## Package Legitimacy Audit

Ran `gsd-tools query package-legitimacy check --ecosystem npm leaflet @types/leaflet tsx sharp mapshaper`.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| leaflet | npm | latest 1.9.4 published 2023-05 (project since 2011) | ~11.6M/wk | github.com/Leaflet/Leaflet | OK | Approved (ADR 0028 names it) |
| @types/leaflet | npm | 1.9.22 published 2026-08 | ~9.7M/wk | github.com/DefinitelyTyped/DefinitelyTyped | OK | Approved |
| tsx | npm | 4.23.15 published 2026-09 | ~140M/wk | github.com/privatenumber/tsx | OK | Approved |
| sharp | npm | 0.35.5 published 2026-09 | ~166M/wk | github.com/lovell/sharp | OK | Approved (already in lockfile as a Next optional dependency) |
| mapshaper | npm | latest published 2026-11-16 (today) | ~143K/wk | github.com/mbloch/mapshaper | SUS ("too-new") | **Flagged.** One-off data preparation only, never a project dependency. The planner adds a `checkpoint:human-verify` before running it, pins the version in the command, and commits only the output file. |

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious [SUS]:** `mapshaper` (one-off use; `npx mapshaper@0.6.121 ...`, output reviewed by eye on the Ladakh and Meghalaya route extents).

Note: names above came from ADR 0028 (leaflet) and this codebase's own docs; `tsx` is named in `docs/plan-review/findings-architect.md` ARC-04 and confirmed by running it. [VERIFIED: ran probe; npm registry]

## Architecture Patterns

### System Architecture Diagram

```
                    Browser (375px phone first; JavaScript optional)
                      │  GET /?difficulty=&length=&month=&maxPrice=&sort=&page=
                      │  GET /tour/<slug>?reviewPage=2#reviews     GET /credits
                      │  GET /sitemap.xml  /robots.txt   GET /media/<key> (via /_next/image)
                      ▼
 proxy.ts (nonce CSP, x-request-id) ──► root layout (await connection(); generateMetadata → metadataBase = APP_URL)
                      │
        ┌─────────────┼───────────────────────────────┬───────────────────────────────┐
        ▼             ▼                               ▼                               ▼
   app/page.tsx   app/tour/[slug]/page.tsx       app/credits/page.tsx      app/sitemap.ts, robots.ts
   parseQuery()   await getTourPage(slug)         listCredits()             (force-dynamic)
        │         ── notFound() BEFORE any Suspense ──►404
        │              │  first response: cover, h1, facts, itinerary + static MapFrame, description, gallery, credits
        │              ├─ <Suspense booking-panel> → getCurrentUser + bookings.findUpcomingPaid   (never cached)
        │              ├─ <Suspense guide-item ×2> → tours.getGuides(id)                          (cached tour:<id>)
        │              └─ <Suspense review-item ×4> → reviews.listForTour(id, page)               (cached reviews:<id>)
        ▼
   src/server/modules/{tours,reviews,bookings}/service.ts   ◄── same functions ──►  app/api/v1/tours/** (withApi)
        │   cache.cached(...)  ──►  Next data cache (unstable_cache, per instance)  tags: tours | tour:<id> | reviews:<id>
        │   models (Mongo)      storage.get/put/urlFor ──► disk adapter (dev, ci)  |  fake Map (test)  |  S3 (Phase 8)
        ▼
   MongoDB 8 (2dsphere on startLocation)                 public/data/india-soi.geojson (static, ~85 KB)

   Browser only, tour page:  RouteMapSlot (client) ── IntersectionObserver(12rem) ─► next/dynamic(ssr:false) ─► Leaflet + vendor-layer CSS
                                                      fetch('/data/india-soi.geojson')  (connect-src 'self')
   CLI:  npm run seed → tsx --conditions=react-server scripts/seed.ts → models + storage adapter (no Next cache calls)
```

### Recommended Project Structure
```
scripts/
├── seed.ts                      # CLI entry: parse flags, guards, call runSeed (guarded main, like ci-mongo.ts)
└── seed/                        # pure helpers, unit-tested: dates.ts, rules.ts, load.ts, run.ts
public/data/india-soi.geojson    # simplified boundary (+ provenance note)
src/
├── app/
│   ├── page.tsx                 # list (replaces the Phase 1 placeholder)
│   ├── loading.tsx              # optional for / and /credits; NEVER under tour/[slug]
│   ├── tour/[slug]/page.tsx     # no loading.tsx here (404 status)
│   ├── credits/page.tsx
│   ├── sitemap.ts  robots.ts    # export const dynamic = 'force-dynamic'
│   ├── media/[...key]/route.ts  # GET, access 'public', streams from storage
│   └── api/v1/tours/
│       ├── route.ts                              # GET list, POST create
│       ├── top-5-cheap/route.ts  stats/route.ts
│       ├── monthly-plan/[year]/route.ts
│       ├── within/[distance]/center/[latlng]/unit/[unit]/route.ts
│       ├── distances/[latlng]/unit/[unit]/route.ts
│       └── [id]/route.ts  [id]/images/route.ts   # use [id] everywhere (ARC-06, DEL-27)
├── components/features/         # tour-filters, route-map (+ route-map-slot), tour-gallery, credits-group,
│                                #   booking-section, guides-section, reviews-section
├── lib/                         # format.ts gains formatMonth (C5); route-projection.ts shared by MapFrame and RouteMap
└── server/
    ├── images.ts                # normalize(): magic bytes, sharp limits, WebP, random key helper
    ├── api/body.ts              # readBodyLimited, multipart parse (used by withApi)
    ├── adapters/                # storage.ts gains get(); local-disk-storage.ts; cache.ts gains optional TTL
    └── modules/
        ├── tours/   service.ts schemas.ts catalogue-query.ts (pure) credits.ts
        ├── reviews/ service.ts   (listForTour, deleteForTour)
        └── bookings/ service.ts  (countForTour, findUpcomingPaid)
```

### Pattern 1: One cached catalogue, filtered in memory (settles ARC-02 / QA-12 keys)

**What:** `cached(loadCatalogue, ['catalogue'], ['tours'])` returns every tour as a JSON-safe `TourSummary` (plus `createdAt`), sorted by name. `toursService.list(query)` calls it and runs a pure `applyCatalogueQuery(entries, query, today)` for filters, sort, paging and total. `unstable_cache` serialises with JSON, so a cached function must return DTOs (it already does: `toTourSummary` emits IST day strings and string ids).

**Rules (all verified against the installed docs or by experiment):**
- Cache keys come only from ids that exist. The slug in the URL is **never** a cache key: `getBySlug` looks the slug up in the cached catalogue and only then builds `cached(loadDetail, ['tour-detail', id], [`tour:${id}`])(id)`. A missing slug therefore creates no cache entry. `unstable_cache` may be created per call; its tags are fixed at wrap time, which is why the id must be known first. [CITED: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md]
- Cached functions return **every** start date; "upcoming" is computed per request from `now()` (QA-13). `isBookable(date, now)` is "IST day strictly after today" (`src/lib/ist.ts:54`).
- The reviews cache holds one whole list per tour (`['reviews', tourId]`, tag `reviews:<tourId>`) and paging slices it in memory, so `reviewPage=999999` creates no entry. Newest first.
- Not cached: `getCurrentUser`, anything in `bookings`, month options (derived from the catalogue plus `now()`), geo, distances and the monthly plan (their arguments are user-supplied).
- `cached()` runs inside a request only. The seed script must not call any service that calls `cached` or `invalidate` (ARC-03: `unstable_cache` and `revalidateTag` throw outside a Next request). The seed uses models and the storage adapter directly.
- Wrap the page-level lookups in React `cache()` so `generateMetadata` and the page share one read (R3).
- Add an optional fourth argument `{ revalidate?: number }` to `Cache.cached` and pass it to `unstable_cache`, with `revalidate: 3600` on the catalogue, as a safety net: the seed CLI cannot invalidate a running server's cache, and the data cache is per instance (ARC-21). Document "after `npm run seed`, restart `next dev` or wait up to an hour".

### Pattern 2: Write → tags table (ARC-02, QA-12; goes into `docs/contracts.md`)

Services clear tags **after** the write has finished and **awaited**, through `getDeps().cache.invalidate(...)`, which calls `revalidateTag(tag, { expire: 0 })`. Never `updateTag` (throws in Route Handlers) and never the `'max'` profile (serves the old list to the writer). [CITED: revalidateTag.md: "`{ expire: 0 }`: Stale content is never served ... Use it when ... you cannot use `updateTag`"]

| Write | Phase | Tags to clear |
|-------|-------|---------------|
| Tour create | 4 | `tours` |
| Tour update (JSON PATCH) | 4 | `tours`, `tour:<id>` |
| Tour images replaced | 4 | `tours`, `tour:<id>` |
| Tour delete (after the 409 check, reviews deleted) | 4 | `tours`, `tour:<id>`, `reviews:<id>` |
| Review create, update, delete (`setRatings` changes the tour) | 6 | `reviews:<tourId>`, `tour:<tourId>`, `tours` |
| Booking create or refund | 6 | none (bookings are never cached) |
| User name, photo, role or active change (guides and review authors are shown by name) | 5 | `tour:<id>` for every tour the user guides, `reviews:<tourId>` for every tour they reviewed |
| Seed run | 4 | none from the CLI (cannot); the `revalidate` TTL and a restart cover it |

The Phase 4 tests assert `fakes.cache.invalidated` for each Phase 4 row. The Phase 5 and 6 rows are recorded now so those phases cannot forget them.

### Pattern 3: Query contract (shared URL; name once)

Page `/` (lenient, `parseQuery` falls back per field; unknown keys such as `utm_*` dropped):

| Param | Values | Default / fallback |
|-------|--------|--------------------|
| `difficulty` | `easy`, `medium`, `difficult` | absent |
| `length` | `3-4`, `5-6`, `7-8` (bands from D-02, duration ≥ lo and ≤ hi) | absent |
| `month` | `YYYY-MM`, **only a month in the derived option list** | absent (a valid-format month with no upcoming departure is treated as invalid, otherwise the select shows "Any month" while a filter is silently active) |
| `maxPrice` | `20000`, `30000`, `40000` | absent |
| `sort` | the API's own tokens: `-ratingsAverage`, `price`, `-price`, `duration`, `-duration` | `-ratingsAverage` (ties by name, D-03) |
| `page` | integer ≥ 1 | 1; a page past the end is clamped to the last page |
| `limit` | integer 1 to 100 | 12 (an out-of-range value falls back, it is not clamped) |

Reviews: `reviewPage` (integer ≥ 1, default 1, clamped), links carry `#reviews`. Links are built from the **validated** query and omit defaults and empty values. Canonical URL of the list is always `${APP_URL}/` (UI-SPEC Open item 13). The GET form submits empty selects (`?difficulty=&length=…`), which `parseQuery` drops; the visible URL is therefore not minimal, which is acceptable.

API `GET /api/v1/tours` (strict through `withApi`; unknown key = 400):
- Filter fields `difficulty` (enum, equality), and `price`, `duration`, `ratingsAverage`, `maxGroupSize` as plain equality or with `[gte]`, `[gt]`, `[lte]`, `[lt]` (the bracket key arrives as a literal key, `searchParamsToRecord` keeps it). Build the Zod shape programmatically from two constant lists so the allowlist exists once.
- `month=YYYY-MM` (tours with at least one start date in that IST month, per plan.md; use `istMonthBounds`), `sort` (comma list, at most 5 tokens, each from `price, ratingsAverage, duration, maxGroupSize, name, createdAt`, optional `-`), `fields` (comma list from the `TourSummary` keys; `id` always kept), `page`, `limit` (default 20).
- Sort always ends with `name` then `id`, so pages never repeat or skip a tour (QA-11).

### Pattern 4: Seed script (D10, D2, ADR 0023)

- **Run:** `"seed": "tsx --conditions=react-server scripts/seed.ts"`. Load `.env.local` explicitly with `process.loadEnvFile('.env.local')` inside a `try` (Node 24 API) instead of relying on `--env-file-if-exists` being forwarded by tsx [ASSUMED]. `scripts/**` may import models (ESLint override, ADR 0009).
- **Entry shape:** `scripts/seed.ts` exports `parseSeedArgs`, `rollStartDates`, `checkRules`, `runSeed({ today, reset, storage })` and runs `main()` only when it is the entry file (same guard as `scripts/ci-mongo.ts`), so Vitest tests it against the in-memory Mongo.
- **Guards:** refuse unless `APP_ENV` is `development`, `test`, `ci` or `staging` (SEC-16; `ci` is needed by Playwright and Lighthouse per QA-21). Production exits non-zero before connecting. `--reset` is additionally limited to `development`, `test` and `ci` (Open Question 5).
- **Passwords (SEC-27):** `SEED_USER_PASSWORD` for everyone and `SEED_ADMIN_PASSWORD` (≥16 characters) for the one admin, both required, both added to `config-schema.ts` as optional keys and to `.env.example` with empty values (`check:env` requires secret-named keys to be empty). Hash only through `User.save()`.
- **Idempotency ("changes nothing", verified):** for each fixed `_id`, `findById`, `doc.set(desired)`, `save()` only if `doc.isModified()`. I confirmed that `set()` with deep-equal dates, ObjectId arrays, subdocument arrays and GeoJSON leaves `modifiedPaths()` empty. Passwords are the exception: `save()` re-hashes and stamps `passwordChangedAt` whenever `password` is modified, so on re-run compare with `bcrypt.compare` and skip when it already matches.
- **Timestamps:** Mongoose keeps an explicit `createdAt` on create (verified), and sets `updatedAt` equal to it when only `createdAt` is given. Pass each review and booking `createdAt` from the seed file (past records never move). Tours and users have no `createdAt` in the seed; give each tour a **fixed** instant derived from its position in `tours.json` (constant base + index minutes). That keeps "run twice changes nothing" true on different days, gives the API default sort a stable order, and gives `/credits` the seed order.
- **Ids and keys:** `_id` as `ObjectId`. Store the **full storage key** `tours/<file>` in `imageCover`, `images[]` and `photoCredits[].file` (QA-03), prefixing in the loader so `seed/data/*.json` stays byte-for-byte. Upload the JPEGs unchanged with content type `image/jpeg`. (`createTour` in `test/helpers/factories.ts` copies bare file names and needs the same prefix.)
- **Date roll (ADR 0023; the ADR leaves "how many years" to this plan):** for each start date `d`, while `!(d > today)` add one year to the `YYYY-MM-DD` string (a Feb 29 source falls back to Feb 28; the seed has none, checked). A date is "passed" when it is not bookable (IST day ≤ today), so every tour always keeps a date the booking panel accepts. After rolling, a Golden Triangle departure whose day 4 (`start + 3 days`) is a Friday moves one day earlier (`addIstDays(d, -1)`), then re-check `d > today`. Use `new Date(`${d}T00:00:00Z`).getUTCDay()` for the IST weekday of a day string. Sort the result ascending.
- **Bookings and reviews never move.** An upcoming booking whose date passes simply becomes a past trip.
- **Post-checks (throw, exit 1, name the rule):** (1) every tour has ≥1 start date after `today`; (2) every review's author has a `paid` booking for that tour whose `tripStatus(...)` is `past` at `today`; (3) each (tour, user) reviews at most once; (4) no Golden Triangle departure has day 4 on a Friday; (5) every upcoming booking's `startDate` is one of its tour's `startDates`; (6) stored `ratingsQuantity` and `ratingsAverage` equal the values recomputed from the reviews (rounded to 1 decimal); (7) review text names only guides assigned to that tour (a text heuristic over the 14 guide first names; implement as a data test over the files and as a post-check only if it has no false positives); (8) 13 tours, 35 users, 52 reviews, 58 bookings, 52 photo credits each matching an uploaded key.
- **Indexes (QA-18):** call `syncIndexes()` for the four models after connecting, so `2dsphere` and the unique indexes exist before the first `$geoNear`.
- **`--reset`:** deletes the four collections' documents and the `tours/` storage keys, then loads. `--today=YYYY-MM-DD` validated with `fromIstDay` (throws `RangeError` on a bad day); default is `toIstDay(now())`, so `APP_NOW` also pins it.

### Pattern 5: Storage and `/media` (ARC-15 option A, DEL-16)

The shipped contract is:
```ts
// src/server/adapters/storage.ts:5-9
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  urlFor(key: string): string;
}
```
and `deps.ts:48` makes staging and production throw `noRealAdapter('storage', 'Phase 4 or 8')`, while `fakeDeps` always uses the in-memory `createFakeStorage()`. A `Map` in the seed process is invisible to `next dev`, so the seed's "uploaded through the storage adapter" is impossible with it. Change:
- Add `get(key): Promise<{ body: Buffer; contentType: string } | null>`.
- `urlFor(key)` returns the root-relative path `/media/<key>` in every adapter (the current fake returns `${appOrigin}/storage/...`, an absolute URL that `next/image` would treat as remote and that the 16.x local-IP block rejects). Absolute URLs (Open Graph, later Stripe, B8) are `new URL(urlFor(key), getConfig().appOrigin)`, never built from request headers (SEC-12).
- New `local-disk-storage.ts` for `development` and `ci`; the in-memory fake stays for `test`. Directory from a new optional config key (for example `STORAGE_DIR`, default `.storage`, gitignored, listed in `.env.example`). Normalise and confine every key to the directory (reject `..`, absolute paths, backslashes, empty segments); the ESLint `security/detect-non-literal-fs-filename` rule is on for `src/`, so the single `fs` call site needs a justified disable comment. Content type from a fixed extension map.
- `src/app/media/[...key]/route.ts`: `GET`, `withApi(..., { access: 'public' })`, validates each segment against `^[a-z0-9][a-z0-9._-]*$` (≤4 segments), returns the bytes with the stored content type and `Cache-Control: public, max-age=86400`. A missing key is 404 `AppError('NOT_FOUND')`. The global `X-Content-Type-Options: nosniff` header already applies (`next.config.ts`).
- `next.config.ts`: `images.localPatterns: [{ pathname: '/media/**', search: '' }]`. With `localPatterns` unset Next allows every local path ([VERIFIED: match-local-pattern.js, "if the user didn't define localPatterns, we allow all local images"]); defining it narrows the optimizer to `/media` only. No `remotePatterns` and no `dangerouslyAllowLocalIP`: the optimizer fetches local sources through `fetchInternalImage` (an in-process request, not an HTTP call, so the private-IP check never applies) [VERIFIED: image-optimizer.js:747-775].
- CSP is unchanged: images are same-origin (`img-src 'self' blob: data:`, `src/proxy.ts:14`). This resolves the roadmap note "add the tile host and the storage host to the CSP": both are none.
- `src/proxy.ts` matcher currently runs for `/media` requests; adding `media` to its exclusion list saves a nonce and request-id per image. Optional, but `test/proxy.test.ts` compares the matcher literally, so update both.

### Pattern 6: Tour page rendering, status code and streaming (R3, R4, U11)

```tsx
// src/app/tour/[slug]/page.tsx  (no loading.tsx beside it)
export default async function TourPage(props: PageProps<'/tour/[slug]'>) {
  const { slug } = await props.params;
  const search = await props.searchParams;
  const tour = await getTourPage(slug);          // React cache(): shared with generateMetadata
  if (!tour) notFound();                          // before any Suspense boundary → real 404
  const reviewPage = parseQuery(reviewQuery, search).reviewPage;
  return (
    <>
      {/* cover, h1, facts, booking slot, itinerary + RouteMapSlot, description, gallery, credits: from `tour` */}
      <Suspense fallback={<Skeleton variant="booking-panel" />}><BookingSection tour={tour} /></Suspense>
      <h2>Your guides</h2>
      <Suspense fallback={<GuideSkeletons />}><GuidesSection tourId={tour.id} /></Suspense>
      <h2 id="reviews">Reviews</h2>
      <Suspense fallback={<ReviewSkeletons />}><ReviewsSection tourId={tour.id} page={reviewPage} /></Suspense>
    </>
  );
}
```
- **Verified on Next 16.4.5 (scratch app, `next start`):** page with `await params`, a cached lookup, `notFound()` before a `<Suspense>`, a root layout that `await connection()`s, and `generateMetadata` that also calls `notFound()`: missing slug returned **404** with `noindex`; found slug **200**. The identical page with a sibling `loading.tsx` returned **200** with `noindex` for the missing slug. Docs say the same: "Starting the stream sends the response headers and fixes the status code" (`loading.md`, `streaming.md`). A `facebookexternalhit` user agent also got 404.
- Extend `scripts/smoke.ts` (it already runs the built app) to assert `GET /tour/does-not-exist` is 404 and a real slug is 200. Vitest cannot see the HTTP status.
- Headings for guides and reviews render **outside** their Suspense boundary (UI-SPEC), so only the lists stream.
- Booking panel state, from the user and the paid bookings (never cached): no bookable date (`isBookable` against `now()`) → `no-dates`; signed in with a paid booking whose `tripStatus(...)` is `upcoming` → `booked` with that booking's IST day (QA-07, SEC-07); signed out → `logged-out` with `tourHref` (`/tour/<slug>`); otherwise `bookable`. A traveller whose only booking is past sees `bookable` and may rebook (the seed has a traveller with a past review and an upcoming booking for the same tour to test both). Add `bookings.findUpcomingPaid(userId, tourId): Promise<IstDay | null>` and `bookings.countForTour(tourId)`.
- Guides: split the cached reads so the guides section truly streams. `getBySlug` returns the tour without populating guides; `getGuides(tourId)` loads `User.find({ _id: { $in: ids }, active: { $ne: false } })`, orders the lead guide first, and omits a missing or deactivated guide (the DTO currently throws on an unpopulated or null guide, so a service decision was left open there). The API `GET /tours/[id]` composes both so its payload still "populates guides (name, photo, role)" (B12). This needs a small DTO split (`TourDetail` without `guides` plus `guides`).
- Reviews: `reviews.listForTour(tourId, page)` populates author `name photo role` only (`toReview` needs a populated author and goes through `toPublicUser`, so no email), newest first, 5 per page. A review whose author populates as `null` is skipped and logged, never thrown (deactivation is soft, so this should not occur through the app).

### Pattern 7: Metadata, sitemap, robots (R10, U7, SEC-12)

- **Root layout:** change `export const metadata = { title: 'Natours' }` to `export async function generateMetadata()` returning `metadataBase: new URL(getConfig().appOrigin)` and `title: { default: 'Natours', template: '%s | Natours' }`. **Do not** call `getConfig()` at module scope: `next build` runs with an empty environment in CI on purpose (ARC-07, ADR 0010), so a module-scope `metadataBase` would fail the build.
- Per page `generateMetadata`: `alternates.canonical` as an absolute `${origin}/tour/${slug}` (list: always `/`), `openGraph` with `type: 'website'`, `siteName: 'Natours'`, `locale: 'en_IN'`, and on tour pages `images: [{ url, alt, width: 1200 }]` and `twitter.card: 'summary_large_image'`. For the image URL use `${origin}/_next/image?url=${encodeURIComponent(urlFor(cover))}&w=1200&q=75` (1200 is in the default `deviceSizes`, 75 in the default `qualities`) or the direct `${origin}/media/<key>` (a 1920px JPEG, about 0.4 to 1 MB). Pick one in the plan and test the URL returns 200 with an image content type. Bots that cannot run JavaScript get blocking metadata in `<head>` ([CITED: generate-metadata.md "Streaming metadata"]).
- Tour description string: `` `${summary} ${duration} days, ${formatPrice(price)} per person.` `` (UI-SPEC), using `1 day` for one.
- `sitemap.ts` and `robots.ts` **must** set `export const dynamic = 'force-dynamic'`. Verified: without it `next build` prerenders `/sitemap.xml`, runs the function with no database or environment and fails with "Error occurred prerendering page /sitemap.xml"; with it the route shows as dynamic (ƒ). Sitemap lists `/`, `/credits` and the 13 tours (omit `lastModified` rather than invent it). Robots: `disallow: ['/me', '/my-tours', '/styleguide']` and `sitemap: ${origin}/sitemap.xml`.
- Optional DES-22: a default Open Graph image for non-tour pages.

### Pattern 8: Leaflet route map (R8, D-07, ADR 0028, DES-05, DES-11)

- **Structure:** a server-rendered `RouteMapSlot` (Client Component, `// client: IntersectionObserver and Leaflet need the DOM`) receives the static `<MapFrame animate={false} />` as `children`. It renders the children until the observer (`rootMargin: '12rem'`) fires once, then renders a `next/dynamic(() => import('./leaflet-route'), { ssr: false })` component in the same slot box. The itinerary list is a sibling rendered once on the server and never touched.
- **Verified at runtime** (scratch Next 16.4.5 app, Chromium via the project's Playwright, `next start`): before scrolling, no Leaflet chunk and no vendor CSS was requested; after scrolling the slot near the viewport the requests were exactly the Leaflet JS chunks plus `27-bssa0_42-a.css`; the Leaflet container then computed `position: relative; overflow: hidden`. So Leaflet code and CSS are route-lazy and viewport-lazy.
- **Layered vendor CSS (DES-05):** a CSS file containing only `@import 'leaflet/dist/leaflet.css' layer(vendor);` imported by the lazy component compiles under Turbopack to `@layer vendor { ... }` in its own chunk (verified in the build output). Then declare `vendor` **first** in the single layer-order line in `src/styles/reset.css:6`: `@layer vendor, reset, tokens, base, components, utilities;`. Without that, an undeclared `vendor` layer sorts after `utilities` and would beat `components`. Our attribution-control and container rules in `@layer components` then override Leaflet without `!important`.
- **Options:** `zoomControl: false`, `attributionControl: false` (then add `L.control.attribution({ prefix: false })` with the UI-SPEC text), `dragging`, `scrollWheelZoom`, `doubleClickZoom`, `boxZoom`, `keyboard`, `touchZoom: false`, `zoomSnap: 0`, all animations off. Markers are `L.divIcon` built from DOM nodes with `textContent` (never `innerHTML` with data) and `interactive: false, keyboard: false`. Container gets `role="img"` and the same label as `MapFrame`. `map.remove()` in the effect cleanup (React Strict Mode runs effects twice in development).
- **No tile layer, no third-party host** (ADR 0028). CSP stays unchanged: Leaflet applies positions through `element.style` (CSSOM), and `style-src-attr 'unsafe-inline'` is already present for `next/image` (ADR 0011).
- **Pitfall 14 (projection):** the static `MapFrame` projects with x = lng·cos(meanLat), y = lat; Leaflet's default Web Mercator would reshape the route when it replaces the drawing. Use `L.CRS.Simple` and feed Leaflet `L.latLng(lat, lng·cos(meanLat))` from a shared `src/lib/route-projection.ts` that `MapFrame` also uses (also for the boundary through `coordsToLatLng`). Add a unit test that both consumers get identical planar coordinates.
- **Draw animation:** give the two polylines CSS-module classes through the `className` option (SVG renderer only, applied at creation) and set `pathLength="1"` on each path element after adding; the CSS draw from `map-frame.module.css` is reused. Skip the draw under `prefers-reduced-motion` (base.css already zeroes durations) [A5: attribute-on-path approach not run in this session].
- **JS budget (R9, ADR 0018):** Leaflet costs 42,661 bytes gzip JS + 3,558 CSS. Because it loads on scroll, the Lighthouse run (which does not scroll) will not include it, so record the tour route in `lighthouserc.cjs` and `docs/bundle-baseline.json` with floor + 40,960 + a Leaflet allowance of about 46,000 bytes and say so in ADR 0018's table. `scripts/measure-bundle.ts` currently handles one route; extend it to a route list.

### Pattern 9: API surface

All routes `withApi`, strict query/params/body, `access` declared. List responses follow plan.md §4.1 (`data: { tours: [...] }`, item `data: { tour }`); `responses.list(data: unknown[], meta)` currently puts the array in `data`, and `docs/contracts.md` §2.1 says Phase 4 decides and records the shape, so change the helper to accept the key and update contracts (Open Question 6).

| Route | Access | Notes |
|-------|--------|-------|
| `GET /api/v1/tours` | public | Pattern 3; `meta: { page, limit, total }`. |
| `GET /api/v1/tours/top-5-cheap` | public | Builds a validated query `{ sort: 'price,-ratingsAverage', limit: 5, page: 1 }` and calls the same `toursService.list`; the route's own query schema is empty-strict so no caller value can override it. |
| `GET /api/v1/tours/stats` | public | `$group` by difficulty: `numTours`, `numRatings`, `avgRating`, `avgPrice`, `minPrice`, `maxPrice`, rounded to whole rupees / 1 decimal; cached `['stats']` tag `tours`. |
| `GET /api/v1/tours/monthly-plan/[year]` | `{ roles: ['guide','lead-guide','admin'] }` | `year` integer 2000 to 2100; `$unwind: '$startDates'`, `$match` on `istMonthBounds` of Jan and Dec, `$group` by `{ $month: { date: '$startDates', timezone: 'Asia/Kolkata' } }`, `$push` names, sorted by month. Roles match exactly (no hierarchy). |
| `GET .../within/[distance]/center/[latlng]/unit/[unit]` | public | `latlng` = `lat,lng` (note Mongo wants `[lng, lat]`); radius radians = `distance / 3963.2` (mi) or `/ 6378.1` (km); `$geoWithin: { $centerSphere }`. |
| `GET .../distances/[latlng]/unit/[unit]` | public | `$geoNear` first stage on `startLocation`, `spherical: true`, `distanceMultiplier` 0.001 (km) or 0.000621371 (mi); return `{ id, name, slug, distance }` rounded to 2 decimals. |
| `GET /api/v1/tours/[id]` | public | Detail + guides; malformed id → 400, unknown → 404 (contracts §2.3). |
| `POST /api/v1/tours` | `{ roles: ['lead-guide','admin'] }` | JSON. See Open Question 1. |
| `PATCH /api/v1/tours/[id]` | same | JSON only, `z.strictObject` of editable fields; load, `set`, `save()` so validators and the slug hook run (QA-04). |
| `PUT /api/v1/tours/[id]/images` | same | multipart; Pattern 10. |
| `DELETE /api/v1/tours/[id]` | same | 409 `CONFLICT` if `bookings.countForTour(id) > 0`; else delete the tour, then `reviews.deleteForTour(id)`, delete stored photos best-effort, clear tags. |

Geo parameter schema: `latlng` matches `^-?\d+(\.\d+)?,-?\d+(\.\d+)?$`, then `lat ∈ [-90, 90]`, `lng ∈ [-180, 180]`, `distance` finite and > 0 (cap, for example ≤ 20,000 km, so a nonsense radius is rejected as 400), `unit ∈ {mi, km}`. **Verified:** a centre of `[200, 28]` or `[77, 95]` makes Mongo throw `BadValue`, which `toAppError` would turn into a 500 INTERNAL, so Zod must reject first (B3, QA-17, QA-18). A radius, however large, did not error.

`withApi` does not parse multipart and has no body limit today (`with-api.ts:55,71-72` accept only `application/json`; ADR 0017 says "Phase 4's upload work sets the limits"). Add:
- a byte-counted body reader used by both JSON and multipart: reject on `Content-Length` over the limit before reading, then count bytes while reading `request.body` (a chunked body has no length) and abort over the limit with `PAYLOAD_TOO_LARGE`. JSON limit 1 MB; images route 21 MB total (4 × 5 MB + overhead) (SEC-17).
- an `upload` option that requires `multipart/form-data` (else 415), reads the bytes through the counter, then parses with `new Response(bytes, { headers: { 'content-type': original } }).formData()`. **Verified:** that round trip preserves file name, type and size on Node 24.
- order stays access → params → query → body → rate limit → handler, so an anonymous caller never makes the server buffer 21 MB.
- Update ADR 0017's "Bodies are JSON only" line and `docs/contracts.md` §3.4 in the same plan.

### Pattern 10: Images endpoint and `images.normalize` (S16, B4, DES-07, SEC-17)

Pipeline per file: size ≤ 5 MB (413) → magic bytes JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF....WEBP` (else 415; never trust the client `file.type`) → `sharp(buffer, { limitInputPixels: 40_000_000, failOn: 'error', pages: 1 }).rotate().resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 80 })` → store at a random key `tours/<crypto.randomUUID()>.webp` with `image/webp`. **Verified with the installed sharp 0.35.5:** a 16,000 × 16,000 PNG of 776,180 bytes is rejected with "Input image exceeds pixel limit"; a 434,943-byte, 1920 × 1080 seed JPEG re-encodes to a 369,502-byte WebP in 128 ms. Call `sharp.concurrency(1)` once. Pixel-limit rejection maps to 413 `PAYLOAD_TOO_LARGE`; a file sharp cannot decode maps to 415.
- Counts: `imageCover` 0 or 1 file, `images` 0 to 3 files; more is 400. At least one file is required.
- Credits travel with the files (DES-07, U27): a `credits` JSON part, `{ "imageCover": { title, author, license, licenseUrl, sourceUrl }, "images": [ {…}, … ] }`, validated with `z.strictObject`; the service rewrites `photoCredits` in the same `save()` and drops the credits of replaced keys. The U27 test is "every key in `imageCover` and `images` has exactly one credit". The model has no "own photo" flag and the company has no photos of its own, so Phase 4 does not add an `own` exemption (A10).
- After a successful save: clear `tours` and `tour:<id>`, then delete the replaced keys from storage best-effort (log, never fail the request). Rate limit the route per user (SEC-05: 20 per hour) through the `rateLimit` option; staging and production answer 500 until Phase 5 adds the real limiter (ADR 0016), which is the intended failure mode.

### Anti-Patterns to Avoid
- **A `loading.tsx` under `tour/[slug]`**: turns a missing slug into HTTP 200 (verified).
- **`export const metadata = { metadataBase: new URL(getConfig()...) }`** or any `getConfig()` at module scope: breaks `next build` with no environment (ARC-07).
- **Keying `unstable_cache` by a URL value** (slug, filter combination, page number): unbounded entries and a cache-flooding vector.
- **Calling a cached or invalidating service from the seed**: throws outside a Next request (ARC-03).
- **Passing request `sort`, `fields` or filter keys into Mongo** or using `Model.find(req.query)`: S7. The in-memory allowlist makes it impossible.
- **`findByIdAndUpdate` for tour edits**: skips the slug hook and validators (QA-04); use load, set, save. (`refuseValidatorBypass` blocks `replaceOne`, `findOneAndReplace`, `bulkWrite` and pipeline updates on these models.)
- **Reading `searchParams` or `params` synchronously**: both are Promises in this Next version.
- **Hand-typed prices, dates or months** in JSX or metadata: always `formatPrice`, `formatDate`, `formatMonth` (C5).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image decode, resize, re-encode, EXIF rotate, pixel limit | A custom decoder or ImageMagick shell-out | `sharp` with `limitInputPixels`, `failOn`, `.rotate()` | Bomb rejection and orientation handling are verified above. |
| Multipart parsing | A boundary parser | `Response.prototype.formData()` over the already-counted bytes | Built into Node 24; verified round trip. |
| Geo distance and radius search | Haversine in JS over all tours | MongoDB `$geoNear` / `$geoWithin $centerSphere` on the existing `2dsphere` index | Index exists (`model.ts:223`); verified results and units. |
| Month and year grouping in IST | `getUTCMonth()` arithmetic | `$month`/`$year` with `timezone: 'Asia/Kolkata'`, and `istMonthBounds` for filters | The UTC form puts 1 Jan into December (reproduced: groups 7, 8, 12). |
| IST day arithmetic, weekday, "upcoming" | New date helpers | `toIstDay`, `fromIstDay`, `addIstDays`, `isBookable`, `tripStatus`, `istMonthBounds` from `src/lib/ist.ts` | Already tested with the server on UTC (B19). |
| Boundary simplification | A custom Douglas-Peucker | One-off `mapshaper` run, output committed | Measured below; no runtime dependency. |
| Cache keys and invalidation | A custom in-process Map cache | The `Cache` adapter over `unstable_cache` / `revalidateTag` | Shared across requests and testable with the fake. |
| Map rendering | A bespoke pan/zoom SVG map | Leaflet (ADR 0028) with a non-interactive configuration | Locked decision. |
| Query validation and error envelopes | Ad hoc `if` chains | `withApi`, `parseQuery`, `z.strictObject`, `toAppError` | Fixed pipeline, fails closed (ADR 0017). |

**Key insight:** every hard part of this phase (cache coherence, status codes, upload safety, IST months, idempotent seed) already has a verified primitive in the stack or the codebase; the risk is wiring them in the wrong order, not missing a library.

## Common Pitfalls

### Pitfall 1: `loading.tsx` on the tour segment hides the 404
**What goes wrong:** `/tour/missing-slug` returns 200 (with `noindex`), failing roadmap criterion 3 and search hygiene.
**Why:** a `loading.tsx` fallback renders before the page resolves, so headers are already sent.
**How to avoid:** no `loading.tsx` under `tour/[slug]`; use in-page Suspense; resolve the tour and call `notFound()` before any boundary; record the R4 deviation in an ADR; assert 404 in `scripts/smoke.ts`.
**Warning signs:** a `curl -I /tour/x` showing 200; a `loading.tsx` file appearing under that folder.

### Pitfall 2: Seed uploads vanish (in-memory storage)
**What goes wrong:** every image is a 404 after seeding because the seed process held the only copy in a `Map`.
**How to avoid:** disk adapter in `development`/`ci`, `get()` + `/media`; the seed writes through `getDeps().storage` and a test asserts 52 keys exist after `runSeed`.

### Pitfall 3: Seed re-hashes passwords on every run
**What goes wrong:** "running it twice changes nothing" fails: `password` and `passwordChangedAt` change on each `save()`.
**How to avoid:** `bcrypt.compare` first; only set the password for new users or when it no longer matches. The idempotency test snapshots all four collections including `updatedAt` and the password hashes.

### Pitfall 4: Seed date roll breaks README rules
**What goes wrong:** shifting every date by one year (the old README rule) moves past bookings into the future (ADR 0023). Shifting a Golden Triangle departure puts the Taj Mahal day on a Friday.
**How to avoid:** roll only start dates, per date, with `d > today`; apply the Friday rule after rolling; run the post-checks; test with `--today` at 2026-11-08, 2026-11-21 (Meghalaya departs that day, so it rolls), 2027-06-01 and 2027-12-01 (a two-year roll puts the Golden Triangle 28 Nov departure on Tuesday 28 Nov 2028, so day 4 is a Friday and the departure moves to 27 Nov 2028; computed with Python's calendar).

### Pitfall 5: `getConfig()` at module scope fails the build
`metadataBase`, sitemap origin or robots origin evaluated at import time needs `APP_URL` during `next build`, which CI runs with no environment. Use `generateMetadata`/function bodies only.

### Pitfall 6: `sitemap.ts` prerenders and needs a database at build time
Reproduced. Add `export const dynamic = 'force-dynamic'` to `sitemap.ts` and `robots.ts`.

### Pitfall 7: Leaflet CSS beats component CSS
Unlayered vendor CSS wins over every `@layer`. Import it with `layer(vendor)` and declare `vendor` first in `reset.css`. Test in dark theme that the attribution control uses `--color-surface` and `--color-text-muted`.

### Pitfall 8: Month filter and monthly plan use UTC
1 Jan 2027 is stored as `2026-12-31T18:30Z`; `$month` without a timezone returns 12 (reproduced). The seed has no departure on the 1st, so seed-only tests hide this. Tests create a tour with a 1 January departure (QA-10).

### Pitfall 9: Unstable page boundaries with ties
Ratings tie 8 times at 4.5 and 4 times at 4.8; durations and prices tie too. Always end the sort with `name` then `id`. A test sorts by every allowed key and asserts that pages 1 and 2 concatenated contain all 13 tours exactly once.

### Pitfall 10: Cached start dates go stale as time passes
Filtering to "future" dates inside a cached function freezes the answer (QA-13). Cache all dates; filter per request with `now()`.

### Pitfall 11: The DTO has no `createdAt`
`TourSummary` (`dto.ts:41-59`) has no `createdAt`, but B1's API default sort is `-createdAt` and `/credits` needs the seed order. Add `createdAt: string` (ISO) to the summary and update `test/server/modules/tours/dto.test.ts`.

### Pitfall 12: `imageCover` is required but images must not travel in JSON
`model.ts` declares `imageCover: requiredText`, while B4 and S4 say a JSON body never touches images, so `POST /api/v1/tours` as specified cannot create a valid tour. See Open Question 1; do not paper over it by letting JSON set `imageCover`.

### Pitfall 13: A `details` that stays closed or can never open
`::details-content` and `content-visibility` support is recent [A7]. Keep the UI-SPEC `@supports not selector(::details-content)` fallback so the form is reachable at every width, and render `open` on the server when any filter is active.

### Pitfall 14: Static route and Leaflet route do not match
Different projections reshape the route; padding in CSS pixels versus SVG units scales differently at 375px. Share one projection helper and accept a small tolerance, checked by a Playwright screenshot diff threshold rather than pixel equality.

### Pitfall 15: Next 16 deprecates `priority`
`priority` still works as an alias for `preload` in 16.4.5 (`get-img-props.js` throws if both are passed, and treats `priority` as `preload`). Implement UI-SPEC C2 with `preload` (or `loading="eager"` plus `fetchPriority="high"`), on the first list row and the tour cover only.

### Pitfall 16: Zod fallback hides invalid-but-valid-looking input
`parseQuery` only validates fields individually. A `month` that parses as `YYYY-MM` but is not an offered month must be rejected by building the schema from the derived option list (or by a second pass), or the form shows "Any month" while filtering silently.

### Pitfall 17: Lighthouse and Playwright need seeded data and storage
The CI `build` job starts an empty Mongo. `bundle:check` and `smoke` now hit `/` and `/tour/<slug>`, so the job must run `npm run seed` first with a CI-only `SEED_USER_PASSWORD`/`SEED_ADMIN_PASSWORD` (generated like `SESSION_SECRET`), `APP_ENV=ci` and a storage directory; Playwright's web server needs `APP_NOW=2026-11-08T10:00:00+05:30` and the same seed (`--today=2026-11-08`, QA-20). Existing design-gate specs must keep passing with `APP_NOW` set.

### Pitfall 18: `Link` and `TourRow` details
`TourRow` requires `startDate` (no no-dates state, DES-17). A tour with no future departure (possible later without a reseed) would crash or show nothing. Add an optional `startDate` with an approved copy line (recommended change C8); until then the page must not pass `undefined`.

## Code Examples

### Cached catalogue and the pure query (the shape of Pattern 1)
```ts
// src/server/modules/tours/service.ts  (illustrative; names are the planner's)
import { cache as reactCache } from 'react';
import { getDeps } from '@/server/deps';
import { now } from '@/server/clock';
import { toTourSummary, type TourSummary } from './dto';
import { Tour } from './model';

type CatalogueEntry = TourSummary & { createdAt: string };

async function loadCatalogue(): Promise<CatalogueEntry[]> {
  await connectDb();
  const docs = await Tour.find().sort({ name: 1 }).lean();      // B12: nothing populated
  return docs.map((d) => ({ ...toTourSummary(d), createdAt: d.createdAt.toISOString() }));
}

const catalogue = reactCache(() =>
  getDeps().cache.cached(loadCatalogue, ['catalogue'], ['tours'], { revalidate: 3600 })(),
);

export async function list(query: TourListQuery) {
  const entries = await catalogue();
  return applyCatalogueQuery(entries, query, toIstDay(now()));  // pure: filter → sort(+name,id) → total → slice
}

export async function getBySlug(slug: string) {
  const entry = (await catalogue()).find((e) => e.slug === slug);   // slug never reaches the cache key
  if (!entry) return null;
  return getDeps().cache.cached(loadDetailCore, ['tour-detail', entry.id], [`tour:${entry.id}`])(entry.id);
}
```
Source: pattern derived from `src/server/adapters/cache.ts` (`cached<A, R>(fn, keyParts, tags)`) and the `unstable_cache` docs; the per-call wrapper with a dynamic tag follows the docs' own example. The fourth `{ revalidate }` argument is a proposed adapter extension.

### Roll one start date forward (ADR 0023)
```ts
// scripts/seed/dates.ts
import { addIstDays } from '@/lib/ist';           // path alias works under tsx
export function rollStartDate(day: string, today: string, goldenTriangle: boolean): string {
  let d = day;
  while (!(d > today)) d = addYears(d, 1);          // YYYY-MM-DD strings compare lexically; Feb 29 → Feb 28
  if (goldenTriangle && fridayOnDay4(d)) {
    d = addIstDays(d, -1);
    while (!(d > today)) d = addYears(d, 1);        // only if the earlier day fell on or before today
  }
  return d;
}
const fridayOnDay4 = (d: string) => new Date(`${addIstDays(d, 3)}T00:00:00Z`).getUTCDay() === 5;
```

### IST monthly plan (verified against Mongo 8.0.34)
```ts
const { start } = istMonthBounds(`${year}-01`);
const { end } = istMonthBounds(`${year}-12`);
await Tour.aggregate([
  { $unwind: '$startDates' },
  { $match: { startDates: { $gte: start, $lt: end } } },
  { $group: { _id: { $month: { date: '$startDates', timezone: 'Asia/Kolkata' } },
              numTourStarts: { $sum: 1 }, tours: { $push: '$name' } } },
  { $sort: { _id: 1 } },
]);
```
Reproduced result for a 1 Jan 2027 departure: month 1 with the IST form, month 12 without a timezone.

### Geo (verified)
```ts
// distances: $geoNear must be the first stage; startLocation has the only 2dsphere index
Tour.aggregate([{ $geoNear: { near: { type: 'Point', coordinates: [lng, lat] },
  distanceField: 'distance', distanceMultiplier: unit === 'km' ? 0.001 : 0.000621371, spherical: true } },
  { $project: { name: 1, slug: 1, distance: { $round: ['$distance', 2] } } }]);
// within: radius in radians
Tour.find({ startLocation: { $geoWithin: { $centerSphere: [[lng, lat], distance / (unit === 'km' ? 6378.1 : 3963.2)] } } });
```
Result for Delhi `[77.209, 28.6139]`: Golden Triangle Heritage 4.7 km, then Valley of Flowers Trek and Rishikesh Ganga Rafting 197 km; `within` 300 km returned 4 tours.

### Metadata routes
```ts
// src/app/sitemap.ts
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getConfig().appOrigin;                      // APP_URL only (SEC-12)
  const tours = await toursService.list({ page: 1, limit: 100, sort: 'name' });
  return [{ url: `${origin}/` }, { url: `${origin}/credits` },
          ...tours.items.map((t) => ({ url: `${origin}/tour/${t.slug}` }))];
}
```

### India boundary file (measured)
`datameet/maps` `Country/india-soi.geojson` is a single MultiPolygon of 618 polygons and 281,810 vertices, **12,330,591 bytes**, licensed CC-BY-SA 2.5 / ODbL. One-off, with `mapshaper@0.6.121`:
`mapshaper india-soi.geojson -filter-islands min-area=50km2 remove-empty -simplify weighted 2% keep-shapes -o precision=0.001 india-soi.geojson format=geojson`
gave 84,432 bytes (26,970 gzipped); 5% gave 197,464 bytes (58,344 gzipped); an aggressive 0.5% / 100 km² gave 23,385 bytes. Choose the percentage by eye at the **Ladakh** and **Meghalaya** route extents (the finest zoom on the site), commit `public/data/india-soi.geojson` with a provenance note (source URL, licence, command, date) and keep the ODbL share-alike obligation in mind: the simplified file is a derived database and stays under the same licence.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `revalidateTag(tag)` one argument | `revalidateTag(tag, { expire: 0 })`, `updateTag` in Server Actions only | Next 16 | The adapter already uses the 2-argument form. |
| `unstable_cache` | `use cache` with Cache Components | Next 16 (docs say `unstable_cache` is "replaced") | ADR 0012 keeps `unstable_cache` because Cache Components conflicts with the nonce CSP; still available in 16.4.5. |
| `priority` on `next/image` | `preload` (or `loading="eager"`/`fetchPriority`) | Next 16 | `priority` still works as an alias. |
| `middleware.ts` | `proxy.ts` | Next 16 | Already in use. |
| Unrestricted local images | `images.localPatterns`, `qualities` required, local-IP block | Next 16 | Same-origin `/media` needs only `localPatterns`. |
| Page `params`/`searchParams` objects | Promises, `PageProps<'/route'>` global helper | Next 15/16 | Use `await props.params`; types come from `next typegen`/build. |
| Streaming 404 | Status fixed at first flush; `noindex` injected after | Next 15+ | No `loading.tsx` on the tour page. |

**Deprecated/outdated:** `unstable_cache` docs banner, `priority`, `NextRequest.ip`. Leaflet 2.0 is alpha/beta only; stay on 1.9.4.

## Required ADRs (CLAUDE.md: record each deviation)

1. **No `loading.tsx` on `/tour/[slug]`** (departs from R4's "route segments have `loading.tsx`"; evidence above).
2. **No pinned bottom bar** (UI-SPEC Open item 2: D-06 departs from plan.md §9.2; same plan as component change C1).
3. **Storage adapter for development and ci is disk-backed, `urlFor` returns `/media/<key>`, `get()` added** (amends ADR 0016; resolves ARC-15; no CSP host added).
4. **Catalogue cache design** (one cached catalogue, in-memory query, id-only keys, TTL safety net, write→tag table; amends ADR 0012 only by adding the optional TTL argument).
5. **`withApi` gains multipart and byte limits** (amends ADR 0017's "JSON only, no size limit").
6. **List responses nest under a key** (`data: { tours }`), or the chosen alternative (updates `docs/contracts.md` §2.1).
7. **Tour creation versus required `imageCover`** and **images endpoint semantics** (Open Questions 1 and 2).
8. **Layer order gains `vendor`** (changes `reset.css`'s one declaration; DES-05).
9. **`SEED_*` keys and the seed's environment guards** (SEC-16, SEC-27); also records the seed date-roll algorithm details left open by ADR 0023.

## Runtime State Inventory

Not a rename or migration phase. Omitted. The seed introduces data (13 tours, 35 users, 52 reviews, 58 bookings, 52 stored photos) into an empty database; the only existing runtime state is the local Mongo on 127.0.0.1:27017 (open now) which Phase 4 tests do not touch because Vitest gives each file its own in-memory database.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | ✓ | v24.22.2 (`.nvmrc` 24, engines `>=24.15 <25`) | — |
| npm | installs | ✓ | 11.19.1 | — |
| MongoDB test binary (mongodb-memory-server) | Vitest, geo/aggregation tests, seed tests | ✓ | `mongod-arm64-darwin-8.0.34` cached | — |
| MongoDB server on 127.0.0.1:27017 | `next dev`, Playwright, `next start` smoke | ✓ (port open) | docker `mongo:8.0` per `docker-compose.yml` | `npm run ci:mongo` starts the same binary |
| Docker | `docker compose up mongo` | ✓ | Client 28.5.1 | `ci:mongo` |
| Playwright Chromium | no-JS, streaming, map specs | ✓ | `chromium-1254` cached, Playwright 1.65.0 | — |
| sharp native binary | image tests, seed, `next/image` | ✓ | 0.35.5, libvips 8.18.7 (darwin-arm64); Linux entries in the lockfile | — |
| `tsx` | `npm run seed` | ✗ (to install) | 4.23.15 | none needed |
| `leaflet`, `@types/leaflet` | route map | ✗ (to install) | 1.9.4 / 1.9.22 | — |
| `mapshaper` | one-off boundary simplification | ✗ (not installed; `npx` once) | 0.6.121 | simplify any other way and commit the output |
| Network | `next/font/google` build, Playwright, mongodb binary | ✓ | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none blocking; all missing items install with one command.

## Validation Architecture

> `.planning/config.json` has `workflow.nyquist_validation: false`. The spawning prompt asked for this section anyway, so it is included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.1.0 (+ mongodb-memory-server 11.3.0), Playwright 1.65.0 (`app` project) |
| Config file | `vitest.config.mts`, `playwright.config.ts` |
| Quick run command | `npx vitest run test/server/modules/tours test/scripts/seed.test.ts` |
| Full suite command | `npm run test:coverage` (thresholds: 75% lines; 85% per `service.ts`, so each new service needs its own tests), then `npm run test:design:app`, `npm run smoke`, `npm run bundle:check` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D10 | seed loads 13/35/52/58/52; second run changes nothing (full snapshot equality); `--reset` rebuilds; production refused before connect | unit + integration | `npx vitest run test/scripts/seed.test.ts` | ❌ Wave 0 |
| D10 | roll with `--today` 2026-11-08 / 2026-11-21 / 2027-06-01 / 2027-12-01: only passed dates move, bookings/reviews unmoved, README rules pass, Friday rule | unit | same | ❌ Wave 0 |
| D2 | photos stored under `tours/<file>`; `/media` serves them; traversal keys refused | integration | `npx vitest run test/server/adapters/local-disk-storage.test.ts test/app/media-route.test.ts` | ❌ Wave 0 |
| U10, B1, B11 | filter × sort × page matrix; invalid `sort`/`page`/`limit` fall back; 13 tours = 12 + 1 with no repeats; result count; clamp | unit | `npx vitest run test/server/modules/tours/catalogue-query.test.ts` | ❌ Wave 0 |
| U10, R11 | filters, paging and the disclosure work with JavaScript off; URL shareable | e2e (JS disabled) | `npx playwright test --project=app browse-list` | ❌ Wave 0 |
| S7 | `price[$gt]`, `__proto__`, unknown key → 400; no operator reaches Mongo | integration (route) | `npx vitest run test/app/api/tours-list.test.ts` | ❌ Wave 0 |
| U11, R3, B12 | page data: detail, guides lead-first, reviews newest-first and 5 per page (test adds reviews) | integration | `npx vitest run test/server/modules/reviews/service.test.ts` | ❌ Wave 0 |
| R4 | missing slug is HTTP 404; found slug 200 on the production build | smoke | `npm run smoke` (extend `scripts/smoke.ts`) | ✅ extend |
| R4 | skeleton boxes equal content boxes (CLS under 0.1) | e2e | `npx playwright test --project=app tour-streaming` | ❌ Wave 0 |
| U11 | booking panel: no dates / booked (upcoming only) / logged-out / bookable; past booking allows rebooking; two users see their own state | integration | `npx vitest run test/server/modules/bookings/service.test.ts` | ❌ Wave 0 |
| R8 | Leaflet requested only after the slot nears the viewport; none on `/`; itinerary list always present; JS off shows the static route | e2e | `npx playwright test --project=app route-map` | ❌ Wave 0 |
| R10, U7 | every page title, description, canonical; tour OG image URL returns an image; sitemap lists 13; robots excludes three paths; build succeeds with no env | integration + smoke | `npx vitest run test/app/metadata.test.ts` and `npm run build` | ❌ Wave 0 |
| U27 | every key in `imageCover` + `images` has exactly one credit (seed file and service); `/credits` has 52 rows | unit + e2e | `npx vitest run test/server/modules/tours/credits.test.ts` | ❌ Wave 0 |
| F1 | stats shape and values on the seed | integration | `npx vitest run test/app/api/tours-stats.test.ts` | ❌ Wave 0 |
| F2 | monthly plan IST: a 1 Jan departure counts in January; roles guide, lead-guide, admin allowed, user 403, anonymous 401 | integration | `npx vitest run test/app/api/tours-monthly-plan.test.ts` | ❌ Wave 0 |
| B2 | top-5-cheap returns 5 cheapest, caller `limit` cannot change it | integration | `npx vitest run test/app/api/tours-top5.test.ts` | ❌ Wave 0 |
| B3 | within/distances return documents; swapped lat/lng, 200/95 coordinates, 0 or negative distance, unit `ft` → 400 | integration | `npx vitest run test/app/api/tours-geo.test.ts` | ❌ Wave 0 |
| F6, S4, B4 | create/update/delete; PATCH with `images`/`ratingsAverage`/`slug` → 400; rename regenerates slug; delete with a booking → 409, without → reviews gone; tags cleared per table | integration | `npx vitest run test/app/api/tours-write.test.ts` | ❌ Wave 0 |
| S16, B4 | 413 oversize, 415 wrong type (magic bytes beat `Content-Type`), pixel bomb rejected, subset replace, credits rewritten, random `.webp` keys, old keys deleted | integration | `npx vitest run test/app/api/tours-images.test.ts` | ❌ Wave 0 |
| R5 (table) | each Phase 4 write records exactly its tags in `fakes.cache.invalidated` | integration | in the write tests | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the quick run for the touched module (under 30 s).
- **Per wave merge:** `npx vitest run` plus `npm run typecheck && npm run lint`.
- **Phase gate:** full suite green, `npm run build` with no environment, `npm run smoke`, `npm run bundle:check`, the three Playwright specs, then `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `test/scripts/seed.test.ts`, `test/server/modules/{tours,reviews,bookings}/*.test.ts`, `test/server/adapters/local-disk-storage.test.ts`, API route tests under `test/app/api/` (names are suggestions).
- [ ] Test helper to build a tour with a 1 January departure and a tour with more than 5 reviews, and `createReview` support for explicit `createdAt`.
- [ ] `test/helpers/call-route.ts` already sends multipart `FormData`; confirm it passes `Content-Length` for the limit tests.
- [ ] Playwright: `javaScriptEnabled: false` project, seeded server with `APP_NOW`, `globalSetup` seeding.
- [ ] Framework install: `npm install -D tsx` (the seed test calls the exported functions directly, so Vitest itself does not need `tsx`).

## Security Domain

`security_enforcement` is on; `security_asvs_level` is 1.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (Phase 5); the booking panel only reads the session | `getCurrentUser()` |
| V3 Session Management | no (read-only use) | existing session helpers |
| V4 Access Control | yes | `withApi` `access` required and fails closed; roles exact (`{ roles: [...] }`); monthly plan and writes role-gated; Open Question 4 (SEC-24) |
| V5 Input Validation | yes | `z.strictObject`; allowlisted filter fields, operators and sort keys; geo range checks; `parseQuery` fallbacks on pages |
| V6 Cryptography | seed only | `bcryptjs` through `User.save()`; passwords from env, never committed |
| V8 Data Protection | yes | DTO mappers only (S3, R6); `fields` projects the DTO, never the document |
| V12 Files and Resources | yes | size cap, magic bytes, sharp pixel limit and re-encode, random keys, confined paths in the disk adapter and `/media` |
| V13 API | yes | strict envelope, 413/415/400, Origin check on writes (existing), rate limit on uploads |
| V14 Configuration | yes | CSP unchanged (same-origin images and boundary fetch); `APP_URL` is the only origin source (SEC-12) |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Operator injection through query keys (`price[$gt]`, `__proto__`) | Tampering | Closed allowlist parser, `searchParamsToRecord` keeps `__proto__` as data, in-memory evaluation |
| Mass assignment through PATCH (`ratingsAverage`, `images`, `slug`) | Tampering / Elevation | `z.strictObject` rejects unknown keys with 400 |
| Decompression bomb or oversize upload | Denial of service | Byte-counted reader (413), `limitInputPixels: 40_000_000` (verified), `sharp.concurrency(1)`, per-user rate limit |
| MIME spoofing (`image/jpeg` header on an HTML or SVG body) | Spoofing | Magic-byte check; re-encode to WebP; `nosniff` |
| Path traversal in `/media/[...key]` and the disk adapter | Information disclosure | Segment allowlist regex, resolve and confine to the storage directory |
| Cache flooding by varied URLs | Denial of service | Id-only cache keys; slug looked up in the cached catalogue |
| Stored XSS through review text or tour description | Tampering | JSX text only, `react/no-danger` is an ESLint error (S21); Leaflet marker text via `textContent` |
| Reset-link-style host spoofing in canonical, sitemap, OG URLs | Spoofing | Origin from `APP_URL` only |
| Seed run against production or with a shared admin password | Elevation | `APP_ENV` guard before connecting, separate `SEED_ADMIN_PASSWORD` (≥16 chars) |
| SSRF through the image optimizer | Information disclosure | `localPatterns` limited to `/media/**`, no `remotePatterns`, no `dangerouslyAllowLocalIP` |
| Booking state leaking between users through the data cache | Information disclosure | The booking read is outside every cached function; a two-user test (R5 closes in Phase 6, Phase 4 adds the first half) |

## Review findings disposition

How each Phase 4 finding is handled; the planner should map plans to these. "(m)" = minor.

| Finding | Disposition in this phase |
|---------|---------------------------|
| ARC-02, QA-12 (carry-over) | Settled: Pattern 2 table and `{ expire: 0 }`; Phase 5/6 rows recorded now. |
| ARC-03 | Fake cache in tests; seed avoids cached/invalidating services; TTL for the CLI gap. |
| ARC-04 | Done for Vitest in Phase 1; seed uses `tsx --conditions=react-server` (verified). |
| ARC-06, DEL-27 (m) | Use `[id]` for every dynamic folder under `api/v1/tours`; `[tourId]` appears only in the Phase 6 review routes as `[id]/reviews`. |
| ARC-07 | `sitemap.ts`/`robots.ts` force-dynamic; no module-scope `getConfig()`; CI `build` stays env-free. |
| ARC-08 | Add `bookings/service.ts` (`countForTour`, `findUpcomingPaid`), `reviews/service.ts` (`listForTour`, `deleteForTour`), `tours.setRatings` for Phase 6; services import each other only inside functions; models imported only in a module's own service and dto, `scripts/` and `test/` exempt. |
| ARC-10 | Done in Phase 1 (`APP_ENV`). Seed guard uses it. |
| ARC-14 | `sharp` becomes a direct dependency; lockfile already carries the Linux binaries; Docker details are Phase 8. |
| ARC-15, DEL-16 | Pattern 5 (disk adapter, `/media`, no `remotePatterns`). |
| ARC-18 | Proxy matcher already excludes `/api`; add `media`; uploads go through `/api` so the 10 MB proxy buffer never applies. |
| ARC-20 (m) | Done in ADR 0011 (`style-src-attr`). |
| DES-02, QA-02 | `startLocation.address` exists in the model and DTO; used as the row location. |
| DES-03, QA-11 | Limit 12 on the page, default 20 on the API; `name`, `id` tie-breaks; default page order is rating then name (D-03). |
| DES-04 | Superseded by D-06 and component change C1 (no pinned bar). |
| DES-05 | Layered vendor CSS, non-interactive map (Pattern 8). |
| DES-06 | Credits show title (on `/credits`) and licence links; author is plain text because the seed has no author URL; the two long author strings need the data fix (UI-SPEC Open item 4). Modification notice and copyright notices are not implemented here; flag to the user. |
| DES-07 | Credits travel with image uploads (Pattern 10). |
| DES-11 | Leaflet loads on scroll-in; CSP unchanged; Lighthouse needs seeded data (Pitfall 17). |
| DES-15 (m), DES-16 (m) | Pagination text-only; submit button and Clear filters in UI-SPEC. |
| DES-17 (m) | Panel `no-dates` exists; list row needs C8 (Pitfall 18). |
| DES-18 (m) | Itinerary shows only the days that have a stop; Kedarkantha has no Day 2. |
| DES-22 (m) | Optional default Open Graph image (Pattern 7). |
| QA-03 | Full keys `tours/<file>`; credits move with uploads. |
| QA-04 | Load, set, save for tour edits. |
| QA-06 | `findUpcomingPaid` counts only `paid`; the refund path itself is Phase 6. |
| QA-07 | "Booked" means an upcoming paid booking. |
| QA-08 | Seed tours all have 4 reviews; the 4.5 default for a tour with none is Phase 6's problem; note for FactsStrip (Open Question 7). |
| QA-10 | IST month bounds and `$month` timezone (verified). |
| QA-13 (m) | Cache all dates; filter at render. |
| QA-17, QA-18 | Strict API tests; `syncIndexes()` in seed and `useTestDatabase` already awaits `init()`. |
| QA-20, QA-21 | `now()` and `--today`; `APP_ENV=ci` for Playwright; seed step in CI. |
| SEC-05 | Per-user rate limit on the images route; the Redis limiter is Phase 5. |
| SEC-07 | `findUpcomingPaid` uses `tripStatus`. |
| SEC-12 | `APP_URL` for every absolute URL. |
| SEC-16 | `APP_ENV` allowlist for the seed (Open Question 5 on the database-name guard). |
| SEC-17 | Byte-counted body limits, magic bytes, pixel limit. |
| SEC-19 | Email change needs the current password: Phase 5, not here. |
| SEC-24 (m) | Open Question 4. |
| SEC-27 (m) | `SEED_ADMIN_PASSWORD`. |
| DEL-16 | Resolved by the disk adapter (no MinIO). |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `tsx` forwards Node's `--env-file-if-exists`; mitigated by `process.loadEnvFile` in the script | Pattern 4 | Seed ignores `.env.local`; trivial to adjust |
| A2 | `unstable_cache` items over about 2 MB are not cached (ceiling for catalogue size) | Alternatives | Catalogue silently uncached if it grew past it; far from the 13-tour size |
| A3 | Social crawlers fetch `/_next/image?...&w=1200&q=75` as an OG image | Pattern 7 | Preview missing; fall back to the direct `/media` URL |
| A4 | Next's image optimizer does not upscale beyond the 1920px source | Images | Larger srcset candidates waste bytes only |
| A5 | Setting `pathLength="1"` on Leaflet's SVG path elements and reusing the CSS dash draw works | Pattern 8 | Draw animation needs a different technique (stroke length measured in JS) |
| A6 | Tour start date "passed" means IST day ≤ today (not bookable), so each tour always keeps a bookable date | Pattern 4 | A departure exactly today would be kept by a `<` rule but is unbookable; the success criterion "every tour has an upcoming start date" favours `≤` |
| A7 | `::details-content` / `content-visibility` support across Chrome, Safari and Firefox is recent | Pitfall 13 | The `@supports` fallback keeps the form usable |
| A8 | `unstable_cache` persists per instance on the local filesystem in `next dev` and `next start`, and `{ revalidate }` expires entries as documented | Pattern 1 | Stale catalogue after a reseed lasts until restart |
| A9 | Deactivated guides should be hidden from the guides list and deactivated review authors' reviews stay visible | Pattern 6 | Product choice; easy to flip in the service |
| A10 | The company has no photos of its own, so no `own: true` exemption is needed (DES-07) | Pattern 10 | If the user supplies their own photos later, add an `own` flag to the credit schema |
| A11 | Mongo transactions are unavailable on the standalone test server, so tour delete is "delete tour, then reviews" rather than one transaction | Pattern 9 | A booking created between the 409 check and the delete (Phase 6 checkout checks the tour exists) |

## Open Questions

1. **Creating a tour without images** (blocks the API write plan; needs the user).
   - Known: `model.ts` makes `imageCover` required; B4/S4 forbid JSON touching images; F6 and the API table say `POST /tours` is JSON.
   - Unclear: how a valid tour is ever created through JSON.
   - Recommendation: make `imageCover` optional in the model, and let the public catalogue skip tours that have no cover (no placeholder image is ever shown); the admin API still returns them. Alternative: `POST` accepts multipart (a `data` JSON part plus a required `imageCover` file), which departs from the plan's JSON table. Either needs an ADR.
2. **Images endpoint semantics.** plan.md names `imageCover` (optional) and `images` (up to 3, optional). Recommendation: `images` files replace the stored gallery by position (file n replaces slot n, others untouched); a clear `credits` part per file. Confirm.
3. **Alt text for 52 photos** (UI-SPEC Open item 3). Recommendation: add an optional `alt` to each `photoCredits` entry (model, seed data, DTO) and show the texts for approval; interim fallback is the tour name for covers and the cleaned photo title for gallery images. Changing `seed/data/tours.json` or the schema is a content decision.
4. **SEC-24:** may any lead guide change any tour, including its price, and create or delete tours? F6 as written says yes. Recommendation: follow F6 literally for now, record the decision in an ADR, and let the user choose the stricter option (own tours only, no price, admin-only create/delete).
5. **Seed guards beyond `APP_ENV`.** SEC-16 also proposed a database-name allowlist, but `.env.example` and CI use the database name `natours`. Recommendation: `APP_ENV` allowlist only, with `--reset` limited to development, test and ci; staging reset needs an explicit extra flag decided in Phase 8.
6. **List response shape.** Recommendation: follow plan.md §4.1 (`data: { tours }`), change `responses.list` to take the key, and record it in `docs/contracts.md` §2.1.
7. **Unrated tours and `FactsStrip`.** The model default is 4.5 with 0 reviews (QA-08). All seed tours have 4 reviews, so Phase 4 is unaffected; Phase 6 must decide. Note it in the Phase 6 plan, not here.
8. **Copy:** every string in UI-SPEC "New copy, needs approval" must be added to `docs/design/copy.md` before it is built, plus "No upcoming dates" if C8 is accepted.

## Sources

### Primary (HIGH confidence)
- Installed Next.js 16.4.5 docs and source: `node_modules/next/dist/docs/01-app/...` (`unstable_cache.md`, `revalidateTag.md`, `loading.md`, `streaming.md`, `not-found.md`, `generate-metadata.md`, `sitemap.md`, `robots.md`, `image.md`, `upgrading/version-16.md`), `dist/server/image-optimizer.js`, `dist/shared/lib/get-img-props.js`, `dist/shared/lib/match-local-pattern.js`.
- Context7 `/leaflet/leaflet` (path `className`, `divIcon`, attribution control) and `/websites/mongoosejs` (`$geoNear`, `centerSphere`, 2dsphere).
- Verified by running code this session: Mongo 8.0.34 geo and aggregation (`$geoNear`, `$geoWithin`, IST `$month`, bad-coordinate `BadValue`), Mongoose `set()` idempotency and `createdAt` handling, sharp 0.35.5 bomb rejection and re-encode, `Response.formData()` round trip, `tsx --conditions=react-server` importing `src/server`, scratch Next 16.4.5 app for 404 status with and without `loading.tsx`, sitemap prerender failure and `force-dynamic` fix, Turbopack `@import ... layer(vendor)` output, runtime lazy loading of Leaflet and its CSS under Chromium.
- In-repo files read this session: `src/server/adapters/{cache,real-cache,storage}.ts`, `src/server/deps.ts`, `src/server/api/{with-api,parse-query,responses}.ts`, `src/server/modules/{tours,reviews,bookings}/{model,dto}.ts`, `src/lib/{format,ist}.ts`, `src/proxy.ts`, `src/app/layout.tsx`, `src/components/ui/*`, `docs/contracts.md`, ADRs 0009, 0010, 0012, 0016, 0017, 0018, 0023, 0024, 0028, `seed/README.md`, `seed/data/*.json`, `docs/plan-review/findings-*.md`.
- npm registry and `gsd-tools query package-legitimacy check` for the five packages.

### Secondary (MEDIUM confidence)
- `datameet/maps` `Country/README.md` and the 12,330,591-byte `india-soi.geojson` (downloaded and inspected in an isolated scratch folder).

### Tertiary (LOW confidence)
- Browser support statements for `::details-content` (A7) and crawler behaviour for `/_next/image` OG URLs (A3).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, each addition verified and legitimacy-checked; `mapshaper` flagged SUS for one-off use.
- Architecture: HIGH for cache, rendering, status code, seed, storage and upload mechanics (all reproduced); MEDIUM for the product decisions in Open Questions 1 to 4.
- Pitfalls: HIGH; 1, 3, 5, 6, 7, 8 reproduced directly.

**Research date:** 2026-11-16
**Valid until:** 2026-12-16 (Next 16.4.5 and the pinned stack are fixed in `package.json`; re-check only if versions change)
