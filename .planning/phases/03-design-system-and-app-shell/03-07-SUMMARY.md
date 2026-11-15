---
phase: 03-design-system-and-app-shell
plan: 07
subsystem: ui
tags: [server-components, composition, css-modules, styleguide, des-15, pagination, photo-credits, itinerary]

requires:
  - phase: 03-design-system-and-app-shell
    provides: five-layer CSS, tokens.css, base.css, Button and the gated /styleguide (plan 03-01)
provides:
  - TourRow, FactsStrip, Itinerary, Pagination and PhotoCredits in src/components/ui/
  - Five styleguide section files for them, using real seed tours and photo credits
affects: [03-10 styleguide assembly (must import the five sections into styleguide/page.tsx), Phase 4 overview, tour and list pages]

actuals:
  tokens: 3818
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Composition: ui/ components render other ui/ atoms (Link, Price, DifficultySymbol, StarRating) and call formatDate or formatPrice, never format inline"
    - "The DES-15 numbered-marker rule is enforced in CSS as well as markup: the ordered list's own counter is hidden, so the Day labels are the only numbers"
    - "Seed photos reach next/image through a static import's .src, because styleguide props take a string URL"

key-files:
  created:
    - src/components/ui/tour-row.tsx
    - src/components/ui/tour-row.module.css
    - src/components/ui/facts-strip.tsx
    - src/components/ui/facts-strip.module.css
    - src/components/ui/itinerary.tsx
    - src/components/ui/itinerary.module.css
    - src/components/ui/pagination.tsx
    - src/components/ui/pagination.module.css
    - src/components/ui/photo-credits.tsx
    - src/components/ui/photo-credits.module.css
    - src/app/styleguide/sections/tour-row-section.tsx
    - src/app/styleguide/sections/facts-strip-section.tsx
    - src/app/styleguide/sections/itinerary-section.tsx
    - src/app/styleguide/sections/pagination-section.tsx
    - src/app/styleguide/sections/photo-credits-section.tsx
  modified: []

key-decisions:
  - "TourRow's whole row is the link: Link wraps the row's contents inside the li, so the li stays valid HTML and the photo credit (which is itself a link) never nests inside it"
  - "TourRow's photo has alt=\"\": the props carry no alt text, and the name beside the photo already labels the link"
  - "Pagination shows an end-of-list control as a disabled span with aria-disabled=\"true\", not as a Link, because Link requires an href"
  - "Itinerary sets list-style none on the ol and the li, so the browser's decimal counter cannot add a second number beside each Day label"
  - "PhotoCredits keys each item on authorUrl, the Wikimedia source page, which is unique per photo"
  - "Stylelint's media-feature notation is (width >= 64em), the form header.module.css already uses"

requirements-completed: []
requirements-partial: [U4]

coverage:
  - id: D1
    description: "TourRow composes Price, DifficultySymbol and formatDate with no inline formatting; the date is a time element with a machine-readable dateTime"
    requirement: "U4"
    verification:
      - kind: manual
        ref: "smoke check (not committed): both tour rows render at 375 and 1280px with the seed cover photos loaded"
        status: pass
    human_judgment: true
    rationale: "The row layout at 375 and 1280px is a visual judgement for the design gate."
  - id: D2
    description: "FactsStrip renders the five facts as list items, one row at 64em and up"
    requirement: "U4"
    verification:
      - kind: manual
        ref: "npx tsc --noEmit and npx stylelint (both pass); the desktop single-row layout is checked by eye in the design gate"
        status: pass
    human_judgment: true
    rationale: "The single-line wireframe shape is a visual judgement."
  - id: D3
    description: "Itinerary's Day labels are the only numbers: the ordered list's counter is suppressed in CSS"
    requirement: "U4"
    verification:
      - kind: manual
        ref: "smoke check (not committed): computed list-style-type is none on the ol and li at 375 and 1280px; six Day labels render"
        status: pass
    human_judgment: false
  - id: D4
    description: "Pagination renders Previous, Next and Page N of M as text, never a numbered marker (DES-15); end-of-list controls are disabled"
    requirement: "U4"
    verification:
      - kind: manual
        ref: "smoke check (not committed): first page renders Previous as aria-disabled span and Next as link; last page the reverse; no numbered buttons in the markup"
        status: pass
    human_judgment: false
  - id: D5
    description: "PhotoCredits renders copy.md's wording with the author and licence as separate outbound links, each with rel=\"noopener noreferrer\""
    requirement: "U4"
    verification:
      - kind: manual
        ref: "smoke check (not committed): six external links, target=_blank and rel=\"noopener noreferrer\", across the three real credits"
        status: pass
    human_judgment: false

duration: not recorded (the plan's start time was not captured at spawn)
completed: 2026-11-15
status: complete
commits: 3
plan_head_before: 3e8f9fff96f00ff1d62e68d9f7da9abf2e2b1a79
plan_head_after: 2afe53c281cd03ed29eee15812271fcac849a110
---

# Phase 3 Plan 07: Tour content display components Summary

**TourRow, FactsStrip, Itinerary, Pagination and PhotoCredits compose the Phase 3 atoms into the overview row, the tour page's facts and itinerary, and the list pagination and credits, each with a styleguide section that uses real seed data.**

## Performance

- **Duration:** not recorded
- **Completed:** 2026-11-15
- **Tasks:** 3
- **Files:** 15 created, 0 modified

## Accomplishments

- `TourRow` is a Server Component. The whole row is one `Link`, its cover photo is a `next/image` with a correct `sizes` and no `priority`, its date goes through `formatDate` and its amount through `Price`. It composes `DifficultySymbol` and never formats a string inline.
- `FactsStrip` renders the five facts as list items in one row at 64em and up, and wraps below that. It composes `DifficultySymbol` and `StarRating`.
- `Itinerary` is an ordered list of "Day N" labels and summaries. The list's own counter is suppressed, so the Day labels are the only numbers, as DES-15 requires.
- `Pagination` shows Previous, Next and "Page N of M" as text. The end-of-list control stays in place as a disabled span.
- `PhotoCredits` uses copy.md's wording, "Photo by {author}, {licence}". Both names go through `Link`'s external branch.
- Five styleguide sections show these with real seed data: Valley of Flowers, Kerala Backwaters and Hills, the six Valley of Flowers itinerary days, and three real photo credits from `seed/CREDITS.md`. No placeholder text, names or images.

## Task Commits

1. **Task 1: TourRow and FactsStrip** - `e5faa2c` (feat)
2. **Task 2: Itinerary and Pagination** - `2c93269` (feat)
3. **Task 3: PhotoCredits** - `2afe53c` (feat)

## Verification

- `npx tsc --noEmit` exits 0 with the sibling atoms present (see deviation 1).
- `npm run lint:css` (the full stylelint pass) exits 0. `npx stylelint` on the new CSS modules exits 0.
- `npm run lint` (eslint with `--max-warnings=0`) exits 0.
- `npm run check:conventions` passes (152 files). Prettier passes on all 15 files.
- `npx playwright test --project=app`: 17 of 17 existing app specs pass. This run had the sibling atoms present as stand-ins, which no existing page imports.
- Headless Chromium smoke check at 375 and 1280px, run against a temporary, reverted wiring of the five sections into the styleguide page. The rendered page showed:
  - Both tour-row cover photos loaded. At 375px they measured 112 by 84px, and at 1280px 160 by 120px.
  - The itinerary's `ol` and `li` both have `list-style-type: none`. Six "Day N" labels render.
  - Six external credit links, each with `target="_blank"` and `rel="noopener noreferrer"`.
  - The first page shows a disabled Previous span, the middle page shows both links, and the last page shows a disabled Next span.
- Not run: `npm run knip` as a pass (see deviation 7), and `tsc` on this commit alone (see deviation 1).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Sibling atoms are not on this branch**
- **Found during:** Task 1
- **Issue:** The plan composes `ui/link.tsx` (plan 03-04), `ui/price.tsx` and `ui/difficulty-symbol.tsx` (plan 03-06), and `ui/star-rating.tsx` (plan 03-05). Those plans run in the same wave, in sibling worktrees, so their files are not on this branch.
- **Fix:** I wrote the new components against the APIs those plans specify: `Link` (named export, `href` plus anchor props), `Price({ rupees, perPerson? })`, `DifficultySymbol({ level })` and `StarRating({ value, max? })`. To type-check and smoke-test, I wrote minimal stand-ins for those four files as untracked files. I never staged them, and I deleted them before finishing, so the four files are not in any commit.
- **Result:** On this commit alone, `tsc` reports seven TS2307 errors, all for those four imports. They should resolve when the wave merges. The orchestrator should run `tsc` and the knip check after the merge.
- **Assumption to confirm at merge:** the sibling `Link` is a named export. If 03-04 exports it differently, the five imports change.

**2. [Rule 1 - Bug] Disabled pagination controls are spans, not Links**
- **Found during:** Task 2
- **Issue:** The plan says to render `ui/link.tsx` with no `href` when a control is disabled. `Link` requires `href: string`, so that cannot type-check.
- **Fix:** An end-of-list control renders as `<span aria-disabled="true">` with the same class. The text and position are unchanged.
- **Commit:** `2c93269`

**3. [Rule 2 - Missing] The itinerary's list counter**
- **Found during:** Task 2
- **Issue:** An `ol` gets browser-generated decimal markers by default. Next to "Day N" they would show a second number, which breaks DES-15's "only numbered markers are the day numbers".
- **Fix:** `list-style: none` on both the `ol` and the `li`.
- **Commit:** `2c93269`

**4. [Rule 2 - Missing] Tour rows need a bullet reset**
- **Found during:** Task 1
- **Issue:** The row is an `li`, and the styleguide's `ul` would show bullets.
- **Fix:** `list-style: none` on the row, so the component is correct wherever it renders.
- **Commit:** `e5faa2c`

### Interpretation notes

- **TourRow link placement:** the plan says the `li` is "wrapped in ui/link.tsx". An anchor cannot wrap an `li`, so `Link` wraps the row's contents inside the `li`.
- **TourRow photo alt:** the plan's props carry no alt text, so the photo is `alt=""` and the name beside it labels the link.
- **Styleguide photos:** the photo props take a string URL, and nothing serves `seed/img` yet. The sections use a static import of each seed file and pass its `.src`. The dev smoke check showed these resolve through `/_next/image` and load. Phase 4's storage will replace this.
- **Credit author text:** the Valley of Flowers credit uses the author string exactly as `seed/CREDITS.md` gives it, "Rohit Sharma (edited by UnpetitproleX)".
- **TDD flag:** the tasks are marked `tdd="true"`, but the plan names no test files and has no `<behavior>` block. No RED commit was written. The verification is the plan's own `tsc`, stylelint and grep checks, plus the smoke check above.

### Environment

- `npm ci` ran in the worktree from the lockfile. No package was added or changed.
- `npx next typegen` generated `next-env.d.ts`, which `.gitignore` excludes. It is needed for the `.jpg` imports to type-check.

### Left for the wave merge and later plans (not fixed here)

- **knip fails until plan 03-10.** `npm run knip` reports the five section files and the five components as unused. Nothing imports the sections until plan 03-10 imports them into `styleguide/page.tsx`. Plan 03-07 does not own that file, so I did not edit it. Run knip again after the wave merge and after 03-10.
- **Dev-only CSP console errors.** Every page in dev, including `/`, logs about 33 CSP `style-src-elem` errors. This predates plan 03-07, and the styles still apply. It is logged in `.planning/phases/03-design-system-and-app-shell/deferred-items.md`.

## Issues Encountered

- The worktree guard refused several compound commands because it could not verify they stayed in the worktree. I split them into plain commands and used absolute paths from then on. No work was lost.
- The `PIPESTATUS` and `pipestatus` variables are shell-specific. The shell is zsh, so one `tsc` exit code came back blank. I re-ran it with a plain exit code.

## Threat Flags

None beyond the plan's register. T-03-10 (reverse tabnabbing) is mitigated because both credit links go through `Link`'s external branch, which always sets `rel="noopener noreferrer"`. The smoke check confirmed this.

Residual note for Phase 4: `PhotoCredits` does not validate its URLs. It relies on the callers passing `https://` URLs, which the external branch of `Link` handles. A `javascript:` URL would not be caught here, so Phase 4 should validate credit URLs when it reads them from the database.

## Known Stubs

None in the rendered output. The tour links (`/tours/...`) point to pages that Phase 4 builds. They are not placeholder data.

## Next Phase Readiness

- Plan 03-10 must import the five new section files into `src/app/styleguide/page.tsx`. Without that import, knip keeps failing.
- Once the sibling plans merge, `Link`, `Price`, `DifficultySymbol` and `StarRating` resolve. If their props differ from the APIs above, the imports in these five components are the things to fix.

## Self-Check: PASSED

All 15 created files exist, and the three task commits (e5faa2c, 2c93269, 2afe53c) are ancestors of HEAD.
