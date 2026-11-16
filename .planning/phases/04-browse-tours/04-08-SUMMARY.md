---
phase: 04-browse-tours
plan: 08
subsystem: ui
tags: [leaflet, route-map, survey-of-india, boundary, cascade-layers, intersection-observer, next-dynamic, playwright]

# Dependency graph
requires:
  - phase: 04-06
    provides: "TourRoute with the server-rendered MapFrame in a fixed 5:3 slot, FRAME_TOKENS and the still variant"
  - phase: 04-01
    provides: "The D14 decision (Option B, no tile host, Survey of India outline) and the recorded mapshaper legitimacy approval"
provides:
  - "RouteMapSlot: the static route stays in the slot until a Leaflet map is ready, then the map replaces it in the same box"
  - "A non-interactive Leaflet route map that draws the route once and outlines India from /data/india-soi.geojson on our origin, with the approved attribution"
  - "One shared projection (toPlanar, nudgeCoincident) used by MapFrame and the Leaflet map"
  - "The vendor cascade layer, declared first, for third-party CSS"
  - "The boundary file at public/data/india-soi.geojson, at the 2% default"
affects:
  - "04-09 (applies the user's Task 3 boundary choice; keep-2 means no file swap)"

# Actuals (#2632): estimate was 110000 tokens over 3 tasks.
# Measured as chars/4 over the realized diff 6ef2813..HEAD (131,808 characters, 18 files, including the 84 KB boundary file and the lockfile).
actuals:
  tokens: 32952
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added:
    - "leaflet@1.9.4 (exact pin)"
    - "@types/leaflet@1.9.22 (devDependency, exact pin)"
  patterns:
    - "Leaflet loaded through next/dynamic with ssr false, mounted only after an IntersectionObserver with a 192px root margin fires once"
    - "Static drawing kept until onReady; any failure unmounts the map and leaves the static route with no message"
    - "One projection (x = lng times cos(mean latitude), y = lat) shared by the SVG and Leaflet renderers; drawing constants read the tokens"
    - "Third-party CSS imported with layer(vendor); the vendor layer is declared first in reset.css"

key-files:
  created:
    - src/lib/route-projection.ts
    - src/components/features/route-map-slot.tsx
    - src/components/features/route-map.tsx
    - src/components/features/route-map.module.css
    - src/components/features/leaflet-vendor.css
    - public/data/india-soi.geojson
    - test/lib/route-projection.test.ts
    - test/app/route-map.spec.ts
    - docs/adr/0034-route-map-fallback-and-boundary-file.md
    - docs/adr/0035-vendor-cascade-layer.md
  modified:
    - package.json
    - package-lock.json
    - src/components/ui/map-frame.tsx
    - src/components/features/tour-route.tsx
    - src/styles/reset.css
    - .prettierignore
    - docs/adr/0028-map-tile-provider-and-boundary-compliance.md
    - docs/adr/README.md

key-decisions:
  - "Leaflet 1.9.4 and @types/leaflet 1.9.22 are pinned exactly (no caret); the commit body gives the one-line reason"
  - "rootMargin is 12rem converted to 192px, because IntersectionObserver accepts only px or % (the literal 12rem throws and breaks the page)"
  - "The Leaflet route is fitted with --space-5 padding, and the bottom also reserves the attribution's height, so no stop is drawn under the attribution text"
  - "The boundary is at public/data/india-soi.geojson (ADR 0028 suggested src/data/); recorded in ADR 0034"
  - "The map is non-interactive and has no tile layer; markers are built with textContent; the attribution is the approved copy.md wording with the Leaflet prefix off"
  - "The user chose keep-2 at Task 3: the 2% boundary file stays exactly as committed"

patterns-established:
  - "Leaflet's overlay SVG keeps its own size: the tour route's SVG-fills-the-slot rule is overridden with a more specific selector in the map's module"
  - "Pre-scroll tests run at a 480px viewport, because at 900px the slot is already inside the 12rem margin and the map correctly loads at once"

requirements-completed: []  # Left empty on purpose: the boundary choice is keep-2 (no file change), but R8 closure is for the orchestrator to confirm after 04-09.

# Metrics
duration: "not measured (plan start time was not recorded)"
completed: 2026-11-16
status: complete

coverage:
  - id: D1
    description: "On a tour page the static route becomes a Leaflet map in the same box once the slot scrolls in, and the route draws once"
    requirement: R8
    verification:
      - kind: e2e
        ref: "test/app/route-map.spec.ts#[R8] once the slot scrolls in, Leaflet replaces the static route in the same box and the itinerary is unchanged"
        status: pass
      - kind: e2e
        ref: "test/app/route-map.spec.ts#[U25] the route line draws once, in 1.2 seconds"
        status: pass
    human_judgment: false
  - id: D2
    description: "/ and /credits never load Leaflet, its CSS or the boundary; a tour page does not load it before the slot nears the viewport"
    requirement: R8
    verification:
      - kind: e2e
        ref: "test/app/route-map.spec.ts#[R8] / never loads Leaflet, its CSS or the boundary"
        status: pass
      - kind: e2e
        ref: "test/app/route-map.spec.ts#[R8] before the slot nears the viewport, Leaflet is not loaded"
        status: pass
    human_judgment: false
  - id: D3
    description: "The Leaflet map is non-interactive, has role img with the MapFrame label, and nothing inside it can take focus"
    requirement: R8
    verification:
      - kind: e2e
        ref: "test/app/route-map.spec.ts#[R8] the map has role img and the MapFrame label, and nothing inside it can take focus"
        status: pass
    human_judgment: false
  - id: D4
    description: "The India boundary is drawn from our own origin, with the approved attribution visible, and no request leaves localhost"
    requirement: R8
    verification:
      - kind: e2e
        ref: "test/app/route-map.spec.ts#[R8] the boundary is drawn under the two route paths, and its attribution is visible"
        status: pass
      - kind: e2e
        ref: "test/app/route-map.spec.ts#[R8] every request the page makes goes to localhost, and the boundary comes from our own origin"
        status: pass
    human_judgment: false
  - id: D5
    description: "With the boundary failing, or JavaScript off, the static route stays in the slot with no message and the itinerary is unchanged"
    requirement: R8
    verification:
      - kind: e2e
        ref: "test/app/route-map.spec.ts#[R8] with the boundary answering 500, the static route stays with no message and the itinerary is unchanged"
        status: pass
      - kind: e2e
        ref: "test/app/route-map.spec.ts#[R8] the slot holds the static SVG, the itinerary is present, and no Leaflet loads"
        status: pass
    human_judgment: false
  - id: D6
    description: "MapFrame and the Leaflet map share one projection, and the drawing constants equal the tokens"
    requirement: R8
    verification:
      - kind: unit
        ref: "test/lib/route-projection.test.ts#[R8] Leh on day 1 and day 8 are drawn 12 units apart on both axes"
        status: pass
      - kind: unit
        ref: "test/components/ui/map-frame.test.ts#[C6] the padding and the nudge are --space-5 and --space-3"
        status: pass
    human_judgment: false
  - id: D7
    description: "The vendor cascade layer is declared first, and Leaflet's CSS is imported into it"
    requirement: U3
    verification:
      - kind: other
        ref: "npx stylelint \"src/**/*.css\" (layer order and import notation)"
        status: pass
    human_judgment: false
  - id: D8
    description: "The boundary simplification, by eye, at the Ladakh and Meghalaya extents"
    requirement: R8
    verification: []
    human_judgment: true
    rationale: "The user chose keep-2 (the 2% file) from the six screenshots. This is a visual, legal-weight judgement that no test can make. Recorded at Task 3, with no file change."

# Measured from the verified base: git rev-list --count plan_head_before..HEAD (#3968).
plan_head_before: 6ef281395007c2bcc87511a993a1e9e6b603e899
plan_head_after: 48a29778e79bb59d0197df5c76f14957a35c717c
---

# Phase 4 Plan 08: The Leaflet route map in the static slot, with the India boundary and its attribution

**A non-interactive Leaflet route map replaces the static route in the same 5:3 slot when it scrolls near, draws once, outlines India from the Survey of India file on our own origin, and falls back silently. The user kept the 2% boundary at Task 3 (keep-2).**

## Performance

- **Duration:** not measured (plan start time was not recorded)
- **Started:** not recorded
- **Completed:** 2026-11-16 (Task 3 resolved after the checkpoint, as keep-2)
- **Tasks:** 3 of 3 complete; Task 3 is a `checkpoint:decision` with `gate="blocking-human"`, resolved by the user as keep-2
- **Files changed:** 18 (see key-files)

## Accomplishments

- The route map: `RouteMapSlot` keeps the static MapFrame until the Leaflet map is ready, and `route-map.tsx` (loaded with `next/dynamic`, `ssr: false`) replaces it in the same box. `/` and `/credits` never load Leaflet.
- One projection: `src/lib/route-projection.ts` (`toPlanar`, `nudgeCoincident`, `longitudeScale`) feeds both MapFrame and the Leaflet map, so the two drawings have the same shape. MapFrame's drawing constants equal the tokens (C6), and a unit test reads them from `tokens.css`.
- The India boundary: `public/data/india-soi.geojson` at the 2% default (84,432 bytes, 27,022 gzipped), read from our own origin, drawn as an unfilled hairline under the route, with the approved attribution "India boundary: Survey of India, via DataMeet Maps, CC BY-SA 2.5 / ODbL" on the surface colour.
- The fallback: a failed boundary fetch or Leaflet error removes the map and leaves the static route with no message. The itinerary list is never hidden or re-rendered.
- The vendor cascade layer: `@layer vendor, reset, tokens, base, components, utilities;` in `reset.css`, with Leaflet's CSS imported into `vendor` by `leaflet-vendor.css` (ADR 0035).
- ADRs 0034 (fallback deviation under amended D-07, boundary file location, provenance, the mapshaper command, sizes) and 0035 (vendor layer).

## Task Commits

1. **Task 1: Leaflet replaces the static route in the same slot when it scrolls into view** - `1056fcc` (feat, with the dependency reason in the body)
2. **Task 2: The Survey of India boundary, its attribution, candidate files and ADR 0034** - `259d90c` (feat)
3. **Task 3: Choose the boundary simplification by eye** - no task commit: the user chose keep-2, so the file is unchanged and there is nothing to commit. Recorded in "Boundary simplification" below.

**Plan metadata:** the halted-summary commit `48a2977` added this file; the completion commit that records keep-2 follows it.

_Note: this plan has no TDD tasks._

## Files Created/Modified

- `src/lib/route-projection.ts` - shared projection and coincident-point nudge (usable on the server and in the browser)
- `src/components/features/route-map-slot.tsx` - client slot: observer, `next/dynamic` Leaflet, static route until ready
- `src/components/features/route-map.tsx` - client Leaflet route map: route, markers, boundary, attribution, ready and error callbacks
- `src/components/features/route-map.module.css` - map, host, route, boundary, marker and attribution styles (layer `components`)
- `src/components/features/leaflet-vendor.css` - imports Leaflet's CSS into layer `vendor`, nothing else
- `src/components/ui/map-frame.tsx` - now uses the shared projection; exports `mapLabel`
- `src/components/features/tour-route.tsx` - wraps the static MapFrame in `RouteMapSlot`
- `src/styles/reset.css` - the one layer-order line now starts with `vendor`
- `public/data/india-soi.geojson` - the 2% boundary (generated, excluded from Prettier)
- `.prettierignore` - adds `public/data/`
- `test/lib/route-projection.test.ts` - projection, day order and nudge tests with the Ladakh seed stops
- `test/app/route-map.spec.ts` - 12 Playwright cases tagged `[R8]` and `[U25]`
- `docs/adr/0034-route-map-fallback-and-boundary-file.md`, `docs/adr/0035-vendor-cascade-layer.md` - new
- `docs/adr/0028-map-tile-provider-and-boundary-compliance.md` - status line now names ADR 0034
- `docs/adr/README.md` - rows 0034 and 0035; reserved numbers narrowed to 0036 to 0038
- `package.json`, `package-lock.json` - `leaflet@1.9.4`, `@types/leaflet@1.9.22` (exact pins)

## Decisions Made

- Leaflet 1.9.4 and @types/leaflet 1.9.22, pinned exactly. Reason given in the commit body.
- The observer's margin is 12rem converted to 192px. `IntersectionObserver` accepts only px or % in `rootMargin`; the literal `'12rem'` throws, which broke the page (see deviations).
- The Leaflet route is fitted inside `--space-5` padding, and the bottom also reserves the attribution's height, so no stop is drawn under the attribution text.
- The boundary is at `public/data/`, not `src/data/` (ADR 0028 suggested `src/data/`); recorded in ADR 0034.
- The map is not interactive (no drag, zoom, wheel, double-click, box or keyboard zoom), and has no tile layer.
- 2% is kept: the user chose keep-2 at Task 3, so the committed file is the final boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `rootMargin: '12rem'` throws in the browser**
- **Found during:** Task 1 (Playwright run on the tour page: the page showed the error boundary)
- **Issue:** `IntersectionObserver` rejects `rem` in `rootMargin` ("must be specified in absolute length units or percent"), so the observer never started and the error boundary replaced the page.
- **Fix:** the margin is computed as `12 * rootFontSize` px (192px at 16px root), in `route-map-slot.tsx`. The plan's literal `rootMargin: '12rem'` acceptance string is therefore not present; the behaviour it specifies is met.
- **Files modified:** src/components/features/route-map-slot.tsx
- **Verification:** the tour page renders; the scroll test shows the map mounts once the slot nears the viewport.
- **Committed in:** 1056fcc

**2. [Rule 1 - Bug] Leaflet's overlay SVG collapsed to 0 height**
- **Found during:** Task 2 (screenshot verification of the three candidate boundaries; the route lines were missing)
- **Issue:** `tour-route.module.css` sets `.slot svg { height: 100% }` for the static drawing. Leaflet's overlay SVG sits in a zero-size pane, so its height resolved to 0 and everything it drew was clipped. The e2e tests checked for elements, not geometry, so they did not catch this.
- **Fix:** `.host .map svg { height: auto }` in `route-map.module.css`. The more specific selector wins inside the same layer, and the SVG keeps the size Leaflet sets from its attributes.
- **Files modified:** src/components/features/route-map.module.css
- **Verification:** the overlay SVG measures 394x224 with paths visible; screenshots show the route and the boundary.
- **Committed in:** 259d90c

**3. [Rule 2 - Missing critical] The attribution covered the lower-right stops**
- **Found during:** Task 2 (screenshots: stops 5, 7 and 8 sat under the attribution box)
- **Issue:** the approved attribution, in the bottom-right corner, hid stops, so part of the route was not readable.
- **Fix:** the fit reserves the attribution control's height at the bottom (`paddingBottomRight`), so the route sits clear of the text. The wording is unchanged.
- **Files modified:** src/components/features/route-map.tsx
- **Verification:** all eight day labels are visible in the Ladakh screenshot.
- **Committed in:** 259d90c

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 2 correctness). **Impact:** all three were needed to render the route correctly and to meet the attribution requirement; no scope was added.

### Other Changes (not deviations)

- `data-testid="route-map-slot"` on the slot host, a test hook used by the Playwright spec.
- `package.json` pins: installed with `--save-exact`, so the plan's exact versions are in the manifest (npm's default would have written carets).
- The Leaflet CSS import uses `@import url("leaflet/dist/leaflet.css") layer(vendor);`, the notation stylelint accepts.

## Issues Encountered

- **Pre-scroll tests need a short viewport.** At 1280x900 the slot starts about 735px down the page, which is already inside the 12rem margin, so Leaflet loads at once (the correct behaviour). The "before the slot nears the viewport" and scroll tests therefore run at 1280x480, where the slot is beyond the margin until scrolled.
- **Playwright port.** `playwright.config.ts` pins `E2E_PORT` to 3000, which the main checkout's server may hold. The specs ran against this worktree's dev server on port 3118 through a temporary config (`.pw-3118.config.ts`), which was deleted before any commit. Nothing was committed from it.
- **Dev-only console noise.** The dev server logs 33 "Applying inline style violates the following Content Security Policy" errors on both `/` and the tour page. They appear with or without this plan's code, are dev-only, and were not investigated (out of scope).
- **Sandbox refused two combined shell commands** (a multi-step worktree check and a heredoc). They were rerun as separate plain commands; results are unchanged.

## User Setup Required

None - no external service configuration required.

## Verification Results

- `npx vitest run test/lib test/components`: 22 files, 128 tests passing.
- `npx tsc --noEmit`: clean.
- `npm run lint` (eslint, max-warnings 0): clean. `npm run lint:css` and `npm run format:check`: clean.
- `node scripts/check-client-boundaries.ts`: 12 client files, no violations.
- `npx playwright test --project=app` on `test/app/route-map.spec.ts`: 12 passed. On `test/app/map-frame.spec.ts` and `test/app/tour-page.spec.ts`: 18 passed, 1 pre-existing skip.
- GeoJSON check: `FeatureCollection`, 84,432 bytes (under 400,000).
- `npm audit --audit-level=high`: no high-severity findings (7 moderate, all in existing typescript-eslint dependencies).

## Boundary simplification

**Chosen: keep-2.** The user's reply, verbatim: `keep-2`. The 2% file committed in `259d90c` stays exactly as it is; it was not regenerated or modified (`git diff` against `259d90c` is empty).

Sizes of the kept file, measured on 16 Nov 2026 from `public/data/india-soi.geojson`: 84,432 bytes raw (`wc -c`); 27,017 bytes gzipped at `gzip -9` and 26,973 bytes at `gzip -6`. The gzipped figure of 27,022 bytes in ADR 0034 was taken at another setting; gzip output depends on the level and header, so it differs by a few bytes. The raw size is unchanged.

Candidates produced from the datameet `Country/india-soi.geojson` (mapshaper 0.6.121, `-simplify weighted P% keep-shapes`):

| Simplification | Raw bytes | Gzipped bytes | File |
| --- | --- | --- | --- |
| 1% | 45,631 | 15,402 | `/private/tmp/claude-501/-Users-rithikagarwal-Desktop-natours-claude/fb9187a9-3a4c-45c1-8e00-948e0bd1eb89/scratchpad/india-soi-1pct.geojson` |
| 2% (committed default) | 84,432 | 27,022 | `/private/tmp/claude-501/-Users-rithikagarwal-Desktop-natours-claude/fb9187a9-3a4c-45c1-8e00-948e0bd1eb89/scratchpad/india-soi-2pct.geojson` |
| 5% | 197,464 | 58,591 | `/private/tmp/claude-501/-Users-rithikagarwal-Desktop-natours-claude/fb9187a9-3a4c-45c1-8e00-948e0bd1eb89/scratchpad/india-soi-5pct.geojson` |

Screenshots of the slot at 1280px (captured after the layout fixes), in the scratch `shots` directory:

- `/private/tmp/claude-501/-Users-rithikagarwal-Desktop-natours-claude/fb9187a9-3a4c-45c1-8e00-948e0bd1eb89/scratchpad/shots/ladakh-high-passes-1pct.png`
- `/private/tmp/claude-501/-Users-rithikagarwal-Desktop-natours-claude/fb9187a9-3a4c-45c1-8e00-948e0bd1eb89/scratchpad/shots/ladakh-high-passes-2pct.png`
- `/private/tmp/claude-501/-Users-rithikagarwal-Desktop-natours-claude/fb9187a9-3a4c-45c1-8e00-948e0bd1eb89/scratchpad/shots/ladakh-high-passes-5pct.png`
- `/private/tmp/claude-501/-Users-rithikagarwal-Desktop-natours-claude/fb9187a9-3a4c-45c1-8e00-948e0bd1eb89/scratchpad/shots/meghalaya-living-root-bridges-1pct.png`
- `/private/tmp/claude-501/-Users-rithikagarwal-Desktop-natours-claude/fb9187a9-3a4c-45c1-8e00-948e0bd1eb89/scratchpad/shots/meghalaya-living-root-bridges-2pct.png`
- `/private/tmp/claude-501/-Users-rithikagarwal-Desktop-natours-claude/fb9187a9-3a4c-45c1-8e00-948e0bd1eb89/scratchpad/shots/meghalaya-living-root-bridges-5pct.png`

`public/data/india-soi.geojson` holds the 2% file, unchanged since `259d90c`, and that is the shipped boundary.

## Next Phase Readiness

- Plan 04-09 was waiting on this plan's completion. Its Task 3 step (a one-file swap, per ADR 0034) is a no-op for keep-2, because the file stays as committed. Whether 04-09 runs its other work is for the orchestrator to decide.
- No file changes are needed for the boundary. The choice is recorded above and in ADR 0034.
- No blockers.

## Self-Check: PASSED

- Files named in this summary exist on disk (checked with `[ -f ]`): all 11 created files, including this summary's `public/data/india-soi.geojson`.
- Commits `1056fcc` (Task 1) and `259d90c` (Task 2) are ancestors of HEAD.

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16 (Task 3 resolved as keep-2)*
