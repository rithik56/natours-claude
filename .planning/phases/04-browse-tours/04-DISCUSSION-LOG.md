# Phase 4: Browse tours - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-16
**Phase:** 4-Browse tours
**Areas discussed:** Filters on a phone, Tour page on a phone, Photos and credits, Build order for this phase

---

## Filters on a phone

### Where the filter form sits on a 375px phone

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible "Filters" | Native details disclosure above the list, closed by default, shows active-filter count, works without JavaScript | ✓ |
| Always visible | Form open above the list; pushes the first tour below the fold | |
| Open on desktop, collapsed on phone | Two layouts to build and test | |

**User's choice:** Collapsible "Filters" (recommended)

### How length and maximum price are entered

| Option | Description | Selected |
|--------|-------------|----------|
| Preset choices in selects | Length bands and max-price bands via formatPrice; no typing | ✓ |
| Free number inputs | Min and max days, typed price | |
| Presets for length, number input for price | Typed budget, banded length | |

**User's choice:** Preset choices in selects (recommended)

### Default order and the start-month list

| Option | Description | Selected |
|--------|-------------|----------|
| Highest rated first; months with departures | Ties by name; only months with an upcoming departure | ✓ |
| Cheapest first; months with departures | Price low to high by default | |
| A to Z by name; all twelve months | Neutral order; May returns the empty state | |

**User's choice:** Highest rated first; months with departures (recommended)

### How changes are applied

| Option | Description | Selected |
|--------|-------------|----------|
| One Apply button, no JavaScript | Identical with JavaScript on or off; keeps the R9 budget | ✓ |
| Apply button plus auto-apply on change | Client component submits on every change | |

**User's choice:** One Apply button, no JavaScript (recommended)
**Notes:** Moved on after four questions.

---

## Tour page on a phone

### Booking panel placement

| Option | Description | Selected |
|--------|-------------|----------|
| Right after the facts strip | Dates and price before the long content; sticky column on desktop | ✓ |
| After the itinerary, with a pinned Book bar | CSS-only anchor bar pinned to the bottom | |
| At the end, after the reviews | Article-like; booking is a long scroll away | |

**User's choice:** Right after the facts strip (recommended)

### When the Leaflet map loads

| Option | Description | Selected |
|--------|-------------|----------|
| When it scrolls into view | Script and boundary load near the screen; itinerary list holds the space | ✓ |
| As soon as the page loads | Always ready; every visit pays the download | |
| Only after a tap on "Show route map" | Lightest, but the route draw becomes tap-triggered | |

**User's choice:** When it scrolls into view (recommended)

### Review paging (every seed tour has exactly 4 reviews)

| Option | Description | Selected |
|--------|-------------|----------|
| 5 per page, newest first | All 4 seed reviews on one page; paging appears from the 6th review | ✓ |
| 3 per page, newest first | Seed reviews split across two pages | |
| 5 per page, highest rated first | Best reviews first | |

**User's choice:** 5 per page, newest first (recommended)
**Notes:** Moved on after three questions.

---

## Photos and credits

### Where the three extra photos appear

| Option | Description | Selected |
|--------|-------------|----------|
| Gallery after the description | Stacked on phone, row on desktop; one-line caption; no JavaScript | ✓ |
| Swipeable carousel | Needs a client component and carousel accessibility work | |
| Cover only; other photos on /credits | Extra photos would only appear on the credits page | |

**User's choice:** Gallery after the description (recommended)

### /credits presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped by tour, with small thumbnails | Thumbnail, linked title, author, linked licence | ✓ |
| Grouped by tour, text only | Lightest page | |
| One flat table, sorted by author | Loses the photo-to-tour link | |

**User's choice:** Grouped by tour, with small thumbnails (recommended)
**Notes:** Moved on after two questions.

---

## Build order for this phase

### First vertical slice

| Option | Description | Selected |
|--------|-------------|----------|
| Seed, then the tour list at / | All 13 real tours visible early | ✓ |
| Seed, then one complete tour page | Richest page first; no list to reach it | |
| Seed and the whole API first | Contract-first; nothing visible until late | |

**User's choice:** Seed, then the tour list at / (recommended)

### API timing

| Option | Description | Selected |
|--------|-------------|----------|
| Public GETs with each slice; admin CRUD last | Thin wrappers ship with their page; uploads and the 409 rule last | ✓ |
| The whole API as one plan at the end | Contract tests land late | |
| The whole API right after the list page | Delays the tour page | |

**User's choice:** Public GETs with each slice; admin CRUD last (recommended)

---

## Claude's Discretion

- Cache tag table and cached-function scope (ARC-02, QA-12), query parameter names, image sizes and formats, seed script internals, which sections stream behind skeletons, the site base URL, and the wording of new strings (to be added to `docs/design/copy.md`).

## Deferred Ideas

None — discussion stayed within phase scope.
