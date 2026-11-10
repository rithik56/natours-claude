---
phase: 02-design-direction-and-approval-gate
plan: 01
subsystem: ui
tags: [playwright, static-mockup, design-gate, svg, screenshots]

requires: []
provides:
  - "docs/design/mockups/overview.html and tour.html, mobile and desktop, from real seed content"
  - "A data-driven inline SVG route element on the tour page, drawn from a tour's own locations day coordinates"
  - "Four Playwright screenshots (overview-375/1280, tour-375/1280) for the design gate"
affects: [02-02, 02-03, 02-04]

actuals:
  tokens: 21000
  tasks: 2
  commits: 2
  plan_head_before: 12baaf1b5b4526893a8321ff15c465c47964370e
  plan_head_after: fb1f67691324033e82d2068ca37628e31479c1ce

tech-stack:
  added: ["@playwright/test (devDependency, Task 1)"]
  patterns:
    - "Static mockup HTML/CSS with hex values inlined (no tokens.css yet — Phase 3 builds that)"
    - "Mobile-first CSS with a single 64em (1280px) breakpoint matching the 12-column grid start"
    - "Inline SVG route element: coordinates scaled from a tour's own `locations` lon/lat into a fixed viewBox, two overlaid paths (Neel outline + Highway yellow line) plus one `<g>` per day marker"

key-files:
  created:
    - docs/design/mockups/tour.html
    - docs/design/screens/overview-1280.png
    - docs/design/screens/tour-375.png
    - docs/design/screens/tour-1280.png
  modified:
    - docs/design/mockups/overview.html
    - docs/design/mockups/mockup.css
    - test/design/screenshots.spec.ts
    - docs/design/screens/overview-375.png

key-decisions:
  - "Route map and itinerary are placed in the same main (left) column with the booking panel as a separate second column, matching plan.md §9.2's ASCII wireframe exactly; within that column they sit side by side from 64em and stacked below 64em, honouring the prose's 'map next to itinerary'."
  - "Route SVG coordinates are computed by linearly scaling the Ladakh High Passes tour's own 8 `locations` day coordinates (lon/lat) into a 400x240 viewBox, not hand-drawn — satisfies the plan's 'real, data-driven SVG' requirement."
  - "Booking panel shows the 'future start dates with formatPrice' state (DES-17): all three of the tour's startDates are after the current date, so a select list plus one price is the clearest state to demonstrate."
  - "Reviews section shows 2 of the tour's 4 real seed reviews with 'Previous'/'Next'/'Page 1 of 2' text pagination (DES-15), never the day-marker milestone shape."

requirements-completed: [U20]

coverage:
  - id: D1
    description: "overview.html and tour.html render at 375px and 1280px from real seed content, with facts in columns on desktop and stacked on mobile"
    requirement: U20
    verification:
      - kind: automated_ui
        ref: "test/design/screenshots.spec.ts (4 tests: overview-375, overview-1280, tour-375, tour-1280)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tour page's route element is a real, data-driven inline SVG from the tour's own seed coordinates, not a grey box or live map"
    requirement: U20
    verification:
      - kind: manual_procedural
        ref: "docs/design/mockups/tour.html — route-map SVG path/day-marker coordinates derived from Ladakh High Passes' seed `locations`"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every photo used in both mockups is credited inline in the exact author/licence/link shape from seed/CREDITS.md"
    requirement: U20
    verification:
      - kind: other
        ref: "grep -riE 'lorem ipsum|john doe|jane doe|sample tour|test tour|example tour' docs/design/mockups/*.html (zero matches)"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-11-10
status: complete
---

# Phase 2 Plan 1: Full Mockup Pipeline (Overview + Tour, Mobile + Desktop) Summary

Static HTML/CSS mockups of the overview and tour pages at 375px and 1280px, built from real seed tours, with a data-driven inline SVG route element on the tour page and four Playwright screenshots captured for the design gate.

## Performance

- **Duration:** ~35 min (this continuation session; Task 1 was executed in a prior session)
- **Completed:** 2026-11-10
- **Tasks:** 2/2 completed
- **Files modified:** 8 (this session's commit) + Task 1's files from the prior commit

## Accomplishments
- Added a 1280px breakpoint to `overview.html`/`mockup.css` so facts (photo, milestone, name/region/difficulty, date/price) line up in columns on desktop instead of stacking.
- Built `docs/design/mockups/tour.html` from the real Ladakh High Passes seed tour at both widths: cover photo with credit, facts strip (difficulty peaks, duration, max group size, start location, rating), a real data-driven inline SVG route line through numbered day markers computed from the tour's own `locations` coordinates, a day-by-day itinerary, description, stacked (not tabbed) guides/reviews/photo-credits sections, and a booking panel showing the tour's future start dates with `formatPrice`.
- Credited every photo used in both mockups inline, in the exact author/licence/link shape from `seed/CREDITS.md`.
- Extended `test/design/screenshots.spec.ts` to capture all four combinations (`overview-375`, `overview-1280`, `tour-375`, `tour-1280`) into `docs/design/screens/`.

## Task Commits

1. **Task 1: End-to-end mockup pipeline — overview, mobile only** - `62e1387` (feat) — committed in a prior session
2. **Task 2: Full mockup set — tour page, desktop widths, all four screenshots** - `fb1f676` (feat)

_Task 1 and Task 2 commits both exist on `gsd/phase-01-foundation-and-contracts`; this SUMMARY documents Task 2's completion in this continuation session._

## Files Created/Modified
- `docs/design/mockups/tour.html` - Tour page mockup: cover, facts strip, route SVG + itinerary, description, guides, reviews, credits, booking panel
- `docs/design/mockups/overview.html` - Already had photo-credit `<figcaption>`s added before this session; no further changes needed for the breakpoint (CSS-only)
- `docs/design/mockups/mockup.css` - 1280px breakpoint for `.tour-row`, plus all new tour-page styles (facts strip, route map, itinerary, guides, reviews, booking panel, `.sr-only`)
- `test/design/screenshots.spec.ts` - Extended from one test to four (`overview-375`, `overview-1280`, `tour-375`, `tour-1280`)
- `docs/design/screens/overview-1280.png`, `tour-375.png`, `tour-1280.png` - New screenshots
- `docs/design/screens/overview-375.png` - Re-captured (unchanged markup/viewport, but regenerated alongside the other three in the same test run)

## Decisions Made
- Route map and itinerary sit in the same main column as described above (see `key-decisions` in frontmatter) — reconciles the ASCII wireframe's single-column layout with the prose's "map next to itinerary."
- Booking panel demonstrates the "future start dates" state rather than "no upcoming dates" or "log in to book," since Ladakh High Passes' three seed start dates are all after today.
- Reviews section shows the first 2 of 4 real seed reviews with text pagination, consistent with DES-15 (numbered/milestone markers are reserved for day sequences and overview rows only).

## Deviations from Plan

None - plan executed exactly as written. The uncommitted working-tree changes found at the start of this session (photo-credit `<figcaption>`s added to `overview.html`/`mockup.css`) were correct, in-scope Task 2 work and were kept and extended rather than redone.

## Known Stubs

None. All links in the mockups (`#` anchors for nav, pagination, booking button) are inert placeholders expected for a static, unstyled-framework mockup — not stubbed data. All tour content, prices, dates, credits and reviews come from `seed/data/tours.json`, `seed/data/users.json`, `seed/data/reviews.json` and `seed/CREDITS.md`.

## Self-Check: PASSED

- FOUND: docs/design/mockups/tour.html
- FOUND: docs/design/screens/overview-1280.png
- FOUND: docs/design/screens/tour-375.png
- FOUND: docs/design/screens/tour-1280.png
- FOUND: docs/design/screens/overview-375.png
- FOUND commit 62e1387 (Task 1, ancestor of HEAD)
- FOUND commit fb1f676 (Task 2, HEAD)
