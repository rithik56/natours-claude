---
phase: 03-design-system-and-app-shell
plan: 261115-tjm
subsystem: ui
tags: [copy, facts-strip, css-grid, playwright, design-gate]
requires:
  - phase: 03-design-system-and-app-shell
    provides: ui/ component set, styleguide and the design-gate screenshots (03-10)
provides:
  - docs/design/copy.md carries the component wording approved at the Phase 3 design gate
  - FactsStrip lays out in two aligned columns below 64em, one row from 64em
  - test/app/facts-strip.spec.ts geometry checks at 360, 375, 414, 768 and 1280px
  - re-captured 375px styleguide screenshots
affects: [phase-04 pages built from ui/ components, U20 copy governance]
tech-stack:
  added: []
  patterns: ["CSS grid of two minmax(0, 1fr) columns below 64em, flex row from 64em"]
key-files:
  created: [test/app/facts-strip.spec.ts]
  modified:
    - docs/design/copy.md
    - src/components/ui/facts-strip.tsx
    - src/components/ui/facts-strip.module.css
    - docs/design/screens/styleguide-375-light.png
    - docs/design/screens/styleguide-375-dark.png
key-decisions:
  - "Facts strip below 64em is a two-column grid with the rating spanning both columns, rather than tweaking gaps on the old wrapping flex row."
  - "The typographic apostrophe in You’re is recorded as rendered; the mismatch with copy.md's straight apostrophes is left for the user to decide."
requirements-completed: [U4, U5, U20]
status: complete
duration: about 35 min
completed: 2026-11-15
actuals:
  tokens: 9000
  tasks: 3
  commits: 5
plan_head_before: 318cc0e421b0d6992c37ef42afde96dfe7a89642
plan_head_after: 6fd9184dedb167f83d27cc6adf1b6b6195a14793
---

# Phase 03 Quick 261115-tjm: Design gate follow-ups Summary

**copy.md now holds every component string from the 03-10 design-gate list, and the facts strip sits in two aligned columns at 375px, with the four-way geometry spec and refreshed screenshots to prove it.**

## What was done

### Task 1: component wording in docs/design/copy.md

All 26 strings were added, each checked character for character against the component or styleguide section that renders it. No existing line of copy.md changed (67 lines added, 0 removed).

- Field-validation table, two new rows after "Required field left blank": "Start date is required." and "Review is required."
- New H2 "Component wording" with H3 groups and two-column "Where | Wording" tables:
  - Booking panel and price: "You’re booked for {date}." plus link "My tours"; "No upcoming start dates for this tour." plus link "See other tours"; "{price} per person".
  - Empty states: "No upcoming tours yet." and "No past tours yet.", each plus link "See all tours".
  - Reviews: "Rate this tour", "Your review", "Post review", "Edit review", "Delete review".
  - Guides: "Lead guide", "Guide".
  - Forms and account: "Tour photo", "No photo chosen", "Tour already booked", "Deactivate account".
  - Alerts and toasts: "Your changes are saved.", "Start dates are shown in India Standard Time.", "Review posted for {tour name}.", "Dismiss".
  - Tour page, pagination and footer: "Up to {n} people", "Page {n} of {total}", "© {year} Natours.", "Read the photo credits".
- No styleguide dev notes or state labels were added.

**Decision for the user: apostrophe.** "You’re booked for" is rendered by `booking-panel.tsx` with the typographic apostrophe (U+2019). Every other apostrophe in copy.md is straight ("You don't have access to this.", "That file type isn't supported."). It was written as rendered and the new section's intro says so. Either the booking panel moves to a straight apostrophe or copy.md moves to typographic ones throughout. Not changed here.

### Found, not added

Product-facing strings that a ui/ component renders and copy.md still lacks, not in the 03-10 list. Not added, for the user to decide:

- Confirm dialog (as used by review-item): title "Delete your review?", description "Your rating and comment will be removed from this tour. This cannot be undone.", confirm button "Delete my review", and the dialog's "Cancel" button (confirm-dialog.tsx).
- Pagination: "Previous", "Next", and the default nav label "Pagination".
- Star input: radio labels "1 star" to "5 stars", the radiogroup aria-label "Rating", and the read-only star display's "Rated {value} out of {max}".
- Difficulty labels: "Easy", "Medium", "Difficult".
- Shell: "Skip to main content", "Menu", "Natours" (brand link), nav labels "Main" and "Footer", links "Tours", "My tours", "Account", "Log in", "Sign up", and the footer link "Photo credits" (the styleguide's "Read the photo credits" is the one in the list).
- Booking panel: "Start date" label and its `aria-label` "Book this tour" (the button text "Book this tour" is already in copy.md).
- Itinerary: "Day {n}".
- Photo credits: "Photo by {author}, {licence}" shape is in copy.md already.
- Map frame: aria-label "Route map: {n} stops, days {first} to {last}".
- Start date select default label "Start date" (start-date-select.tsx).

### Task 2: facts strip at 375px (spec first)

- RED: `test/app/facts-strip.spec.ts` failed 6 of 13 on the old CSS: "the location shares a line with another fact" at 360 and 375px, and "the facts line up in at most two columns" at 360, 375, 414 and 768px (3, 4 and 5 distinct left edges). The "nothing passes the strip edge" checks and the 1280px one-row check passed.
- GREEN: below 64em `.strip` is `display: grid` with `repeat(2, minmax(0, 1fr))` and the existing gaps. `.fact` gains `min-width: 0`. The rating `<li>` carries `styles.rating` (`grid-column: 1 / -1`), so the stars have a row of their own. From 64em `.strip` is a nowrap flex row with the wider gap, exactly as before. Tokens only, inside `@layer components`, no new breakpoint, no animation, `--touch-target` untouched.
- Why a grid: at 375px the location and the stars need about 323px against a 311px strip, so a gap tweak could never put them on one line, and it would break again at 360px. Two fixed columns with the stars on their own row hold at every narrow width. The mockup and direction.md allow "columns or separate lines".
- Visual check at 375px (throwaway element screenshot, since deleted): both strips show Medium/6 days, Up to 14 people/Rishikesh, Uttarakhand (wraps inside its column), then the stars on their own row; nothing clipped.
- After: all 13 spec tests pass (360, 375, 414, 768 and 1280px). Vitest `facts-strip.test.ts` passes untouched.

### Task 3: screenshots and sweep

- Only `styleguide-375-light.png` and `styleguide-375-dark.png` changed; the two 1280px captures came out byte-identical, which is expected because the 64em-and-up layout is unchanged. Committed alone. The styleguide nav and everything under `src/app/styleguide/` are untouched.
- Full `app` Playwright project, `--workers=1`, final run: 134 passed.

## Verification results

| Command | Result |
|---|---|
| Task 1 grep check (28 copy.md needles, 29 src needles, dev-only leak check, additions-only) | pass, `67 0 docs/design/copy.md` |
| `npx playwright test --project=app --workers=1 test/app/facts-strip.spec.ts` | RED 6 failed / 7 passed before the CSS; GREEN 13 passed after |
| `npx vitest run test/components/ui/facts-strip.test.ts` | 2 passed |
| `npx stylelint "src/**/*.css" --allow-empty-input` | pass |
| `npx playwright test --project=app --workers=1` (full) | 134 passed on the final run (see flake note) |
| `npx tsc --noEmit` | pass |
| `npx eslint src test --max-warnings=0` | pass |
| `npm run check:conventions` | pass, 241 files |
| `npm run knip` | pass, no findings |
| `npx vitest run --exclude '.claude/**'` | 59 files, 741 tests passed |
| `npx prettier --check src test` | pass |
| `git diff --stat main -- plan.md playwright.config.ts src/app/styleguide` | empty |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Type error in the new spec under noUncheckedIndexedAccess**
- **Found during:** Task 3 static sweep (`tsc --noEmit`)
- **Issue:** `items[LOCATION]` is `Box | undefined`, which `overlapsVertically` rejected. The spec had already been committed in Task 2's RED step (Playwright does not type-check).
- **Fix:** added a guard that throws a clear error when the location fact is missing.
- **Files modified:** test/app/facts-strip.spec.ts
- **Commit:** 97a5821

### Intermittent test, not changed

`test/app/file-input.spec.ts` "[U15] choosing a photo shows its preview before any upload" failed once in each of the first two full runs (at 1280px, then at 375px: `img.naturalWidth` stayed 0 for 5 seconds on the blob-URL preview). It passed in isolation, in 5 repeats of the whole spec (30 of 30), in combination with the facts strip spec three times and with the confirm-dialog spec three times, and in the third full run (134 of 134). It is unrelated to the facts strip, which neither file touches. Nothing was loosened. If it recurs, it is worth a separate look at that spec (it asserts on image decode of a blob URL against a dev server). The other `next-server` on port 3000 may also have added load.

No other deviations. No package was added or changed.

## Dev server handling

Port 3000 was held by a next-server (PID 83347, started from the main checkout) that I did not start; it was left running and was still listening at the end. I started my own `next dev` on port 3100 (listener PID 16035, with wrapper parents 16029 `next dev` and 16025 `sh -c next dev | pino-pretty`), with the same test-only environment values the default Playwright config sets, and ran every Playwright command through the temporary untracked `playwright.config.local-261115.ts` (`app` project base URL on 3100, `webServer` unset). I stopped only 16035 with a plain `kill`; the wrappers exited with it, and `lsof` confirmed nothing listens on 3100. The temporary config and my log file are deleted and `git status` shows no stray file.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path, file access or schema change.

## Commits

| Commit | Message |
|---|---|
| 9bde631 | docs(design): record the component wording approved at the design gate [U20] (261115-tjm) |
| a7ff7c4 | test(ui): add a geometry check for the facts strip at narrow widths [U4, U5] (261115-tjm) |
| 3af6ad3 | fix(ui): lay the facts strip out in two aligned columns below 64em [U4, U5] (261115-tjm) |
| 97a5821 | test(ui): narrow the location box type in the facts strip spec [U4, U5] (261115-tjm) |
| 6fd9184 | docs(design): re-capture the styleguide screenshots after the facts strip fix [U4, U5] (261115-tjm) |

## Self-Check: PASSED

- docs/design/copy.md, test/app/facts-strip.spec.ts, src/components/ui/facts-strip.tsx, src/components/ui/facts-strip.module.css, docs/design/screens/styleguide-375-light.png and styleguide-375-dark.png exist and are committed.
- All five commit hashes above are ancestors of HEAD.
