---
phase: 02-design-direction-and-approval-gate
reviewed: 2026-11-10T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - docs/design/mockups/overview.html
  - docs/design/mockups/tour.html
  - docs/design/mockups/mockup.css
  - test/design/screenshots.spec.ts
  - playwright.config.ts
  - vitest.config.mts
  - docs/design/direction.md
  - docs/design/copy.md
  - docs/adr/0028-map-tile-provider-and-boundary-compliance.md
  - docs/adr/README.md
  - docs/contracts.md
  - package.json
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
  necessity: 0
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-11-10
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 2's output is almost entirely documentation, a static-HTML mockup pipeline, and one ADR. I verified the inline-SVG route scaling in [tour.html](../../../docs/design/mockups/tour.html) against the Ladakh High Passes tour's real `locations` lon/lat coordinates by hand (all 8 days), checked `overview.html`/`tour.html` for placeholder names, text or credits against `seed/data/users.json`, `seed/data/reviews.json` and `seed/data/tours.json`, checked [ADR 0028](../../../docs/adr/0028-map-tile-provider-and-boundary-compliance.md) against `src/proxy.ts`'s actual CSP, and read the new Playwright config/test and `package.json` entry.

**The coordinate-scaling math is correct** — x and y are both linearly scaled from the tour's own lon/lat extent into the `0 0 400 240` viewBox with a consistent 20px margin, y is correctly inverted (higher latitude → smaller y, so north is up), and there's no division-by-zero risk since the tour's lon/lat values aren't degenerate. All seed names, reviews, prices, dates and photo credits in both mockups trace to real `seed/data/*.json` records — no placeholder content.

Two real issues: one visual defect in the signature SVG element (Day 1's marker is exactly hidden by Day 8's, since both sit at the same real-world coordinate), and one ADR/CSP cross-reference gap (ADR 0028's `img-src` claim is check against `connect-src` too but no comment anchors the "seam" `src/proxy.ts` leaves for Phase 4, making future drift harder to catch). No security, data-loss or correctness-crashing issues found; nothing here blocks the design gate that already closed.

## Warnings

### WR-01: Day 1's route marker is completely hidden behind Day 8's marker

**File:** `docs/design/mockups/tour.html:68` and `docs/design/mockups/tour.html:94`
**Issue:** Day 1 ("Arrive in Leh and rest") and Day 8 ("Fly home from Leh") share the exact same seed coordinate (`[77.57726, 34.15287]`), so their scaled SVG positions are identical: `cx="50.8" cy="146.5"` for both the Day 1 `<g>` (line 68-71) and the Day 8 `<g>` (line 94-97). In SVG, later document-order elements paint over earlier ones with no z-index, so the Day 8 circle+text renders directly on top of the Day 1 circle+text — the "1" label is fully obscured and only "8" is ever visible at that spot in the rendered mockup/screenshot. This isn't a scaling bug (the math correctly maps both points to the same pixel because they really are the same place), but it is a real display defect: a viewer of the signature route element has no way to see where the route starts, only where it ends, even though both are itinerary stops described in the adjacent list.
**Fix:** Offset the two overlapping markers by a few px (e.g. render Day 1 slightly left/above and Day 8 slightly right/below of the shared point, with a short connecting stub), or draw them as one combined marker labelled "1 · 8" / "Start & end: Leh". Either approach keeps the data-driven coordinates but avoids total occlusion of one day marker:
```html
<g class="route-map__day">
  <circle cx="47.8" cy="143.5" r="9" />
  <text x="47.8" y="143.5">1</text>
</g>
<!-- ... -->
<g class="route-map__day">
  <circle cx="53.8" cy="149.5" r="9" />
  <text x="53.8" y="149.5">8</text>
</g>
```

### WR-02: No npm script runs the Playwright design-mockup screenshots

**File:** `package.json:5-19`
**Issue:** `@playwright/test` was added as a devDependency specifically to run `test/design/screenshots.spec.ts` (per `playwright.config.ts`'s `testDir`), but no script in `package.json` invokes `playwright test`. The only discoverable entry points are `npm run test` (which explicitly excludes `test/design/**` in `vitest.config.mts:24`) and remembering the raw `npx playwright test` command. Phase 3 and any later redesign will need to regenerate these screenshots, and there's nothing in `package.json` pointing at how.
**Fix:**
```json
"scripts": {
  "test:design": "playwright test",
  ...
}
```

## Info

### IN-01: Result count and pagination are static text, not derived from the row count

**File:** `docs/design/mockups/overview.html:72` and `docs/design/mockups/overview.html:252-256`
**Issue:** `<p class="result-count">13 tours</p>` and `<span class="pagination__status">Page 1 of 3</span>` are correct against the real seed data (13 tours total, matching `PROJECT.md`), but they're hand-typed strings with no visible relationship to the 6 `<li class="tour-row">` entries actually rendered on the page. This is expected for a throwaway static mockup (Phase 3 builds the real paginated page), so it's informational only — worth a one-line comment so a future reader doesn't assume the 6 rows shown are literally "page 1" by position.
**Fix:** A short HTML comment above `.tour-list` noting the 6 rows shown are a representative sample, not a literal first page, would remove any ambiguity for whoever next edits this file.

### IN-02: `path.join` builds the `file://` URL with the OS path separator

**File:** `test/design/screenshots.spec.ts:5-8`
**Issue:** `file://${path.join(mockupsDir, 'overview.html')}` uses `path.join`, which emits backslashes on Windows. A `file://C:\Users\...\overview.html` URL is malformed (mixed separators) and Playwright/Chromium may fail to load it. The project's `engines` field doesn't restrict to POSIX, and nothing else in this test guards against it.
**Fix:** Use `path.posix.join` or `url.pathToFileURL(...)` (Node's own URL constructor handles the OS-specific-to-`file://` conversion correctly on every platform):
```ts
import { pathToFileURL } from 'node:url';
const overviewUrl = pathToFileURL(path.join(mockupsDir, 'overview.html')).href;
```

---

_Reviewed: 2026-11-10_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
