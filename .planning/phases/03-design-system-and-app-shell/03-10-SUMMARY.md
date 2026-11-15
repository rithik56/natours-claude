---
phase: 03-design-system-and-app-shell
plan: 10
subsystem: ui
tags: [styleguide, anchor-nav, playwright, screenshots, stylelint, acceptance-sweep, css-layers]

requires:
  - phase: 03-design-system-and-app-shell
    provides: every ui/ component and styleguide section from plans 03-01 to 03-09
provides:
  - the finished /styleguide, 27 sections with a no-JavaScript anchor nav (U4, U5)
  - test/app/styleguide-full.spec.ts, which checks every section at 375 and 1280 wide in both themes
  - four design-gate screenshots under docs/design/screens/
  - the Phase 3 acceptance sweep, with each ROADMAP success criterion traced to a named check
affects: [Phase 3 design gate and verification, Phase 4 tour page and overview (Link className, FactsStrip)]

status: complete
plan_head_before: f22dd6d180899d085b3bef0246d186a96756859e
plan_head_after: 1548faf88eaee8693da70d223fe54ba70df5a323
actuals:
  tokens: 40000
  tasks: 3
  commits: 5 # measured over f22dd6d..1548faf; the docs commit that adds this file is the sixth

tech-stack:
  added: []
  patterns:
    - "The styleguide page holds one list of {id, label, Section}. The nav and the rendered sections both come from it, so they cannot drift apart."
    - "A Playwright spec checks the page against its own hand-written id list, an independent source, and also runs the nav with JavaScript switched off."

key-files:
  created:
    - test/app/styleguide-full.spec.ts
    - test/components/ui/link.test.ts
    - test/components/ui/facts-strip.test.ts
    - docs/design/screens/styleguide-375-light.png
    - docs/design/screens/styleguide-1280-light.png
    - docs/design/screens/styleguide-375-dark.png
    - docs/design/screens/styleguide-1280-dark.png
  modified:
    - src/app/styleguide/page.tsx
    - src/app/styleguide/styleguide.module.css
    - src/app/styleguide/sections/tour-row-section.tsx
    - src/components/ui/link.tsx
    - src/components/ui/facts-strip.tsx
    - test/app/star-rating-input.spec.ts

key-decisions:
  - "Nav links point at the h2 ids the sections already carry (#styleguide-button and so on). The plan's wrapper section and heading would have doubled every heading."
  - "The Link merges a caller's className with its own instead of replacing it."

requirements-completed: [U4, U5]

duration: not recorded
completed: 2026-11-15
---

# Phase 3 Plan 10: Styleguide assembly and phase acceptance Summary

**The finished /styleguide has all 27 sections behind a no-JavaScript anchor nav, four screenshots (375 and 1280 wide, light and dark), and a clean full-tree sweep; two component bugs found in the assembled page are fixed.**

## What was built

- **Assembly (Task 1).** `src/app/styleguide/page.tsx` imports and renders all 27 sections, including the five from plan 03-07 (tour row, facts strip, itinerary, pagination, photo credits) that were not wired in, so `knip` now passes. The `loadStyleguidePage(getConfig().APP_ENV)` gate call is unchanged and still the first line of the page. A `<nav aria-label="Styleguide sections">` lists every section as a plain `#fragment` link. At 64em and up the nav sits beside the content and sticks; below that it is a wrapped row of links above the content. Every nav link is at least `--touch-target` high. Tokens only, inside `@layer components`.
- **Full-page spec (Task 2).** `test/app/styleguide-full.spec.ts` has six tests. Four visit `/styleguide` at 375 and 1280 wide with the light and dark scheme, check all 27 section headings are visible and that there is exactly one `<h1>`, check the dark theme swaps `--color-bg` with no attribute, and write the four screenshots. One checks the nav hrefs equal the section list. One runs with JavaScript off and follows the Skeleton link.
- **Acceptance sweep (Task 3).** Run on the final code. See the table below.

## Phase 3 ROADMAP success criteria

| # | Criterion | Named passing check |
|---|-----------|---------------------|
| 1 | `/styleguide` shows every component in every state, both themes and widths, real seed content; 404 in production | `styleguide-full.spec.ts` (four theme and width tests, nav tests), the per-component specs in `test/app/` (button, form primitives, file input, star rating, start date, toast, booking panel, confirm dialog, map frame, review/guide, review form, empty state and skeleton), `test/examples/styleguide-gate.test.ts` ("[S2] is a 404 when APP_ENV is production", unchanged and passing after assembly, which is the T-03-14 mitigation) |
| 2 | Tokens only, stylelint rules, dark theme swaps token values and follows `prefers-color-scheme`, fonts via `next/font` | Full-tree `npx stylelint "src/**/*.css" "src/**/*.module.css"` with zero violations; `test/styles/stylelint-rules.test.ts` (U1 and U3 rules); `styleguide.spec.ts` "[U2] the dark theme swaps token values with no theme attribute"; the new spec's `--color-bg` check in both schemes |
| 3 | One shell: skip link, header, footer, landmarks, one `<h1>`; header links; mobile menu with `aria-expanded`, plain list without JavaScript | `test/app/shell.spec.ts` ("[U9] one h1 and the header, main and footer landmarks", "[U9] the skip link is the first focusable element", "[U19] the header nav lists Tours, My tours, Log in and Sign up", "[U19] the menu button toggles aria-expanded", "[U19] the nav links render as a plain list with no menu button") |
| 4 | New-design not-found and error pages, no stack trace in production | `test/app/error-pages.spec.ts` ("[U18]" not-found and link back), `test/examples/error-pages.test.ts` ([U18, S19], an error-message sentinel is never rendered); `grep -L "error.message"` lists `error.tsx`, `global-error.tsx` and `not-found.tsx`, and `grep -c` gives 0 for the first two |
| 5 | One self-playing route line of at most 1.2s; every other motion at most 200ms, never on scroll, reduced-motion aware | `test/app/map-frame.spec.ts` ("draws once, in 1.2 seconds or less", "[U25] under reduced motion the route line is already drawn and never animates"); `test/app/toast.spec.ts` ("[U25] the entrance animation lasts at most 200 milliseconds", "under reduced motion the toast has no entrance animation"). A grep of `animation`, `transition` and `@keyframes` across `src` outside `tokens.css` finds only `toast.module.css` (150ms), `map-frame.module.css` (1.2s signature) and `button.module.css` (150ms colour transition), plus the global reduced-motion override in `base.css` |

## Final check results (on commit 1548faf)

- `npx stylelint "src/**/*.css" "src/**/*.module.css"`: pass
- `npx tsc --noEmit`: pass
- `npx eslint src test --max-warnings=0`: pass
- `npm run check:client` (10 client files) and `npm run check:conventions` (240 files): pass
- `npm run knip`: pass
- `npx prettier --check src test docs/design`: pass
- `npx vitest run`: 59 files, 741 tests passed
- `npx playwright test --project=app --workers=1`: 121 passed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Link discarded the caller's className**
- **Found during:** Task 2, reviewing the 1280 screenshot. The tour rows rendered as a stacked column with a 800 by 600 photo and underlined text, and a probe showed the anchor carried only the Link's own class.
- **Issue:** `Link` spread the caller's props and then set `className={styles.link}` after them, so every caller's class was lost. This hit the tour row, the pagination controls, the booking panel action and the header brand.
- **Fix:** `Link` now joins its own class and the caller's. Both classes live in `@layer components`, and a component's own stylesheet loads after the Link's, so the caller's rules win ties.
- **Test:** new `test/components/ui/link.test.ts` (red first, then green).
- **Files modified:** `src/components/ui/link.tsx`, `test/components/ui/link.test.ts`
- **Commit:** d482d15

**2. [Rule 1 - Bug] Facts strip printed the rating twice**
- **Found during:** Task 2, screenshot review ("4.5 4.5").
- **Issue:** `StarRating` already prints the number beside the stars, and `FactsStrip` added a second `<span>` with the same number.
- **Fix:** removed the extra span. New `test/components/ui/facts-strip.test.ts` (red first).
- **Files modified:** `src/components/ui/facts-strip.tsx`, `test/components/ui/facts-strip.test.ts`
- **Commit:** ff0536d

**3. [Rule 1 - Bug] Tour row list indented in the styleguide**
- **Found during:** Task 2, screenshot review.
- **Fix:** a `.rows` class in `styleguide.module.css` removes the browser's list indent, applied in `tour-row-section.tsx`.
- **Commit:** e805515

**4. [Rule 3 - Blocking] star rating display spec broke once the facts strip section was wired in**
- **Issue:** `star-rating-input.spec.ts` looked for `Rated 4.5 out of 5` across the whole page, and the facts strip sections now show two more of those.
- **Fix:** scoped the three locators to the Star rating section region.
- **Commit:** 1548faf

### Plan wording not followed

- **Section wrapper and ids.** The plan said to render each section under `<section id="<name>"><h2>`. Every section component already renders its own `<section aria-labelledby>` and an `<h2 id="styleguide-...">`, so wrapping would have doubled every heading and region. The nav uses the existing h2 ids instead. The spec checks `h2#styleguide-<name>` for all 27.
- **Task 3 grep.** The plan's `grep -rn "animation" src/components/ui/**/*.module.css` glob does not recurse in zsh. I grepped `animation`, `transition` and `@keyframes` across all of `src` instead.

### Environment notes (not code changes)

- `node_modules` was missing in the worktree, so `npm ci` ran from the lockfile and `npx next typegen` regenerated route types. No package was added or changed.
- Port 3000 was already held by a `next-server` running from the main checkout (not started by me, and left alone). I ran my own dev server on port 3100 with the same test environment values as `playwright.config.ts`, and pointed Playwright at it through a temporary untracked config, deleted before the commits. `playwright.config.ts` is unchanged. My server was stopped by its own PIDs; port 3100 is free and nothing of mine is left running.

## Items for the design gate

**Visual**
- Review the four screenshots in `docs/design/screens/` (375 and 1280 wide, light and dark). They are full-page captures, so the sticky desktop nav appears only beside the first screen.
- Photos in the Tour row section are the seed cover images shown at 10rem wide; they are small compressed seed files and look soft at that size.
- On a 375 wide screen the facts strip wraps unevenly (the location can sit on its own line before the stars). It is legible but not tidy. This is plan 03-07's layout and I did not change it.
- The 27 nav links wrap into a block of about 7 rows at 375 wide above the first section. It is usable without JavaScript but long. An alternative is a collapsed `<details>`, which I did not add without a design call.

**Copy**
- Dev-only explanatory prose on `/styleguide` (the section notes and state labels, such as "Three variants, each in five states.") is not product copy and is not in `copy.md`.
- These product-facing strings are rendered in sections but not found in `docs/design/copy.md`: "You’re booked for 17 Jul 2027. My tours", "No upcoming start dates for this tour. See other tours", "No upcoming tours yet. See all tours", "No past tours yet. See all tours", "Start date is required.", "Review is required." (the copy.md rule gives the "{Field name} is required." pattern, so these two follow it), "Post review", "Rate this tour", "Your review", "Edit review", "Delete review", "Deactivate account", "No photo chosen", "Tour photo", "Lead guide", "Guide", "Your changes are saved.", "Start dates are shown in India Standard Time.", "Review posted for Kerala Backwaters and Hills.", "Dismiss", "Page 1 of 3", "Up to 14 people", "per person", "Read the photo credits", "Tour already booked", "© 2026 Natours." Strings that do match copy.md: "Log in to book", "No tours match these filters.", "Clear filters", "Book this tour", "Check the highlighted fields and try again.", the photo credit wording.
- Seed content is real throughout: tour names, places, prices, dates, the Ladakh itinerary stops, guide names and review text come from `seed/`. No placeholder text, names or images were found in the four screenshots.

## Known Stubs

None. No hardcoded empty values reach the UI in the files changed here.

## Threat Flags

None. No new endpoint, auth path or file access. T-03-14 holds: the gate call is still the first statement of the page, and `styleguide-gate.test.ts` passes unchanged after assembly.

## Deferred issues

- The dev-only CSP `style-src-elem` console errors (about 33 per page in `next dev`) remain, as logged in `deferred-items.md` by plan 03-07. They are outside this plan.

## Self-Check: PASSED

- Files found: `src/app/styleguide/page.tsx`, `test/app/styleguide-full.spec.ts`, `test/components/ui/link.test.ts`, `test/components/ui/facts-strip.test.ts`, and the four `docs/design/screens/styleguide-*.png` files.
- Commits found in history: e0af1f5, d482d15, ff0536d, e805515, 1548faf.
