# 0034. The route map's fallback and the boundary file

Status: Accepted. The user chose keep-2 at plan 04-08, Task 3, on 16 Nov 2026: the 2% simplification stays, and `public/data/india-soi.geojson` is unchanged. On 16 Nov 2026 the user chose option (a) for the tour route's map chunk, which is budgeted once, under the lazy allowance (see The JavaScript budget).
Date: 16 Nov 2026
Requirements: R8, U11, D14
Plan review: DES-05, DES-11

## Context

`plan.md` R8 and R11 say that the itinerary list is the route map's fallback: with no map, the list stands in for it. Under the amended D-07, the server-rendered stand-in is the static route drawing, in the same 5:3 slot the Leaflet map later takes over, and the day-by-day itinerary list is always shown beside or below it. The static route is what the page shows with JavaScript off, before Leaflet loads, and when Leaflet or the boundary fails.

ADR 0028 decided that India's boundary comes from the Survey of India outline, read from our own origin, and it suggested `src/data/` for the file. A static file in `public/` is served from our origin without being bundled, so the boundary does not enlarge the page's script budget (ADR 0018).

## Decision

**The fallback.** With JavaScript off, before Leaflet loads, and when Leaflet or the boundary fails, the static route stays in the slot with no message, and the itinerary list is unchanged. This departs from R8 and R11's wording, which makes the list the fallback. The list is never hidden, collapsed or re-rendered by the map.

**The boundary file.** It lives at `public/data/india-soi.geojson`, not `src/data/`, so the browser fetches it from `/data/india-soi.geojson` on our origin. `public/data/` is ignored by Prettier (`.prettierignore`), because the file is generated data, not source.

**Provenance.**

- Source: `https://raw.githubusercontent.com/datameet/maps/master/Country/india-soi.geojson` (datameet/maps, `Country/india-soi.geojson`; ADR 0028 chose this file over the OSM-derived and composite files).
- Licence: CC-BY-SA 2.5 / ODbL. The derived file is share-alike under the same licence, and the attribution "India boundary: Survey of India, via DataMeet Maps, CC BY-SA 2.5 / ODbL" is shown on the map wherever the outline is drawn (copy.md "Map attribution").
- Date: 16 Nov 2026.
- Command, run once with the approved one-off `npx mapshaper@0.6.121`, never added to `package.json`:

  ```sh
  npx mapshaper@0.6.121 india-soi.geojson -filter-islands min-area=50km2 remove-empty -simplify weighted 2% keep-shapes -o precision=0.001 india-soi-2pct.geojson format=geojson
  ```

  The percentage is 1%, 2% or 5% for the three candidates.
- Sizes of the candidates (raw / gzipped, bytes):

  | Simplification | Raw | Gzipped |
  | --- | --- | --- |
  | 1% | 45,631 | 15,402 |
  | 2% (the default) | 84,432 | 27,022 |
  | 5% | 197,464 | 58,591 |

  The source file is 12,330,591 bytes. Candidates are kept in the session scratch directory until the user chooses one.
- The chosen file: the user chose 2% (keep-2) on 16 Nov 2026 IST. `public/data/india-soi.geojson` is the 2% candidate committed in 259d90c and has not changed since. Final sizes: 84,432 bytes raw and 26,955 bytes gzipped (Node's `zlib.gzipSync` at its default level, measured 16 Nov 2026). The gzipped figures in the table above and in the 04-08 summary (27,022, and 27,017 and 26,973 from the system gzip) come from other gzip implementations and headers, so they differ by a few dozen bytes. The raw size is exact.

**The map.** The Leaflet route map is non-interactive: no drag, zoom control, wheel, double-click, box or keyboard zoom, and its markers are not focusable. There is no tile layer and no third-party host. The CSP in `src/proxy.ts` is unchanged.

**The rendering rule.** `rootMargin` for the slot's observer is 12rem converted to pixels from the root font size (192px at 16px). `IntersectionObserver` accepts only pixels or percentages in `rootMargin`, so the literal `12rem` throws and the observer never fires.

**The JavaScript budget.** The tour page has its own entry in `docs/bundle-baseline.json`, and R9 as amended (ADR 0018) applies to it in two parts:

- **Eager.** The gzipped script transfer size that Lighthouse CI measures for `/tour/valley-of-flowers-trek`, less the marked map chunks that Lighthouse loaded (see the note below), must be at most the Phase 1 framework floor of 138,107 bytes plus 40,960 bytes. The floor is not re-measured for the tour page, because a fresh figure would hide the growth the delta allows.
- **Lazy.** The Leaflet map is checked from the production build. `scripts/measure-bundle.ts` sums the gzipped size of every `.js` and `.css` file under `.next/static` that contains the marker `leaflet-container`, and the sum must be at most 51,200 bytes. The allowance covers Leaflet 1.9.4's measured 42,661 bytes of gzipped JavaScript and 3,558 bytes of CSS (phase research), with room for the map component. The map is budgeted only here, whether or not Lighthouse loads it.

`npm run bundle:check` checks every route in the baseline and names the route that is over budget. The `/` entry is unchanged.

Measured on 16 Nov 2026 (`bundle:check` run with the production build, before the method change below): the lazy check passed at 46,567 bytes. The eager check for the tour route failed, at 197,870 bytes against 179,067. Lighthouse had loaded the Leaflet chunk (44,569 bytes) with no scroll, so the map's observer fired at load. That contradicted the assumption that the map never reaches Lighthouse.

**Note, 16 Nov 2026 (IST): the map chunk is budgeted once, under the lazy allowance.** The user chose option (a) at plan 04-09's checkpoint, verbatim: "a". Option (a) excludes the map chunk from the tour route's eager measure and budgets it only by the lazy allowance, so every byte sits under exactly one limit.

- **Method.** For a route with a lazy allowance, `scripts/measure-bundle.ts` takes out of the eager bytes the transfer size of each Script request in the Lighthouse report whose `/_next/static` file, under `.next/static`, contains the lazy marker. The lazy check then counts that file once, at its gzipped size. A marked chunk Lighthouse did not load is counted only by the lazy check. `lighthouserc.cjs` turns off the raw eager assertion for such routes, because asserting it there would count the map in both places. `npm run bundle:check` still enforces the eager limit, in `measure-bundle.ts --check`. `/` has no lazy marker and is measured exactly as before.
- **Measured numbers (16 Nov 2026, `npm run bundle:check`, mobile preset, three runs each, median).** `/`: 151,077 bytes against 179,067, ok. The tour route's eager bytes: 153,301 against 179,067, ok. The raw tour total was 197,870, less the 44,569-byte Leaflet chunk, which gives 153,301. The lazy allowance: 46,567 against 51,200, ok. `/` still carries the Phase 1 floor (138,107), which the measured 151,077 now exceeds. That floor is not re-recorded here: re-recording it moves every page's budget, so it is a separate, later decision for the user.
- **Where the map slot sits.** Measured with Playwright (Google Chrome) against this build's `next start`, at 412 x 823 CSS px with device pixel ratio 1.75, with no scroll and a five-second settle: the slot's top is 881 px from the top of the document, 58 px below the first screen. The observer fires once the slot's top is above 823 + 192 = 1,015 px, so the slot is 134 px inside the margin. The Leaflet chunk was requested about 100 ms after navigation and the map was mounted with `scrollY` at 0. This was a local browser measurement, not a Lighthouse run. The measuring script was not committed.
- **Why loading the map at once is correct.** The `rootMargin` exists so the map loads just before the slot scrolls into view. A slot whose top is 58 px below the fold is about to be seen, so the map appears at once rather than after the visitor reaches it. Deferring it further would show the static route and then swap it after a short scroll. The map's cost is the same either way, because the lazy allowance budgets its bytes whenever it loads.

## Consequences

- A boundary file that fails to load, or does not parse, leaves the static route and the itinerary in place, with no message.
- Changing the simplification later is a one-file swap of `public/data/india-soi.geojson`, with the provenance in this ADR updated.
- The boundary is share-alike data. Its attribution must stay wherever the outline is drawn.
- The static route is the first thing a visitor sees on every tour page, so it keeps its drawing and its size whether or not the map loads.
