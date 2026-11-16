# 0031. One cached catalogue, queried in memory

Status: Accepted
Date: 16 Nov 2026
Requirements: R3, B1, B11, B12, S7, U10
Plan review: ARC-02, ARC-03, QA-12, QA-13, DES-03, QA-11

## Context

The list page `/` and `GET /api/v1/tours` both show the catalogue, with a difficulty, length, start month and maximum price filter, a sort, and pagination. Those values come from the URL, so each visitor can ask for a different combination. A cache key built from them would grow without bound, because each combination would store a new entry (T-04-12). The cache also has to stay correct about what is still bookable. A cached value that froze which departures were upcoming would keep offering a departure after it had passed (QA-13).

The catalogue is 13 summaries. That is far below the roughly 2 MB that `unstable_cache` is comfortable with (RESEARCH A2), so the whole catalogue can be one cache entry.

## Decision

1. **One cache entry for the public catalogue.** `loadCatalogue` reads every tour with no filter and no populate, so the catalogue holds no guides and no reviews (B12). It is cached under the key `['catalogue']`, the tag `tours` and `revalidate: 3600`. The `Cache.cached` adapter takes that revalidate as an optional fourth argument.
2. **Every query runs in memory.** `applyCatalogueQuery(entries, query, today)` filters, sorts, counts, pages and projects the cached array. No cache key contains a value from the URL, so no request can create an entry (QA-12, T-04-12).
3. **The cache holds every start date.** "Upcoming" is worked out on each request against today's IST day (QA-13, D-03). `nextBookableDate` and `monthOptionsFrom` take `today` as an argument, so the cached value never decides what is bookable.
4. **Planned per-tour entries.** Later plans of this phase add entries keyed only by ids that exist, never by a slug or a URL value: `['tour-detail', id]` and `['tour-guides', id]`, both tagged `tour:<id>`, and `['reviews', tourId]`, tagged `reviews:<tourId>`. A slug is looked up in the catalogue first. `['credits']` and `['stats']` are tagged `tours`.
5. **Nothing that depends on who is logged in is cached** (R5). Session and role reads stay uncached.
6. **Cached functions run only inside a request** (ARC-03). The seed CLI never calls them, and tests use the fake cache, which calls the function every time.
7. **The seed cannot reach a running server's cache.** The seed CLI cannot invalidate it. A reseed is seen after a restart of `next dev` or `next start`, or within an hour when the revalidate expires the entry (RESEARCH A8). `docs/contracts.md` section 11 states this for operators.
8. **Two default sorts, both ending in name then id.** `/` sorts by `-ratingsAverage`, highest rating first (D-03). The API's absent-sort default is `-createdAt` (B1). Name and then id always break ties, so pages never repeat or skip a tour (QA-11).
9. **The month filter means an upcoming departure in that IST month** (D-04). A month matches a tour with a start date after today's IST day that falls in that month. The same rule builds the month options on `/` and in the API.
10. **The list shape follows plan.md 4.1.** `responses.list(key, items, meta)` answers `{ status, data: { tours: [...] }, meta: { page, limit, total } }`. That is the spec's shape, so it needs no deviation record. `/` calls `list()` directly (R3), not the API.
11. **Revisit above about 500 tours** (RESEARCH A2). Past that size the entry, the in-memory query and the page size need a fresh decision.

### Write-to-tag table

Services clear tags after the write has finished and been awaited, through `getDeps().cache.invalidate(...)`, which calls `revalidateTag(tag, { expire: 0 })` (ADR 0012).

| Write | Phase | Tags to clear |
|-------|-------|---------------|
| Tour create | 4 | `tours` |
| Tour update (JSON PATCH) | 4 | `tours`, `tour:<id>` |
| Tour images replaced | 4 | `tours`, `tour:<id>` |
| Tour delete (after the 409 check, reviews deleted) | 4 | `tours`, `tour:<id>`, `reviews:<id>` |
| Review create, update or delete (`setRatings` changes the tour) | 6 | `reviews:<tourId>`, `tour:<tourId>`, `tours` |
| Booking create or refund | 6 | none (bookings are never cached) |
| User name, photo, role or active change | 5 | `tour:<id>` for each tour the user guides, `reviews:<tourId>` for each tour they reviewed |
| Seed run | 4 | none from the CLI, which cannot clear them; the `revalidate` time and a restart cover it |

## Consequences

- One cached read serves `/`, the API and, later, the credits page and the sitemap, so one write clears one tag.
- The first request after a clear or a revalidate reads the whole catalogue. At 13 tours that cost is negligible. It must be revisited above about 500 tours.
- Page size, sort and filters are free to vary, because none of them creates a cache entry.
- A reseed is seen after a restart or within an hour, not immediately.
- A tour's rating change must clear `tours`, because the list sorts and filters by rating.
