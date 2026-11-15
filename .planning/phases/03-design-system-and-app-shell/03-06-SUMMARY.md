---
phase: 03-design-system-and-app-shell
plan: 06
subsystem: ui
tags: [server-components, client-component, price, difficulty, avatar, alert, toast, aria-live, reduced-motion, playwright, vitest]

requires:
  - phase: 03-design-system-and-app-shell
    provides: tokens, five-layer CSS, Button, styleguide gate (plan 03-01); shell and MobileMenu Client Component (plan 03-02)
provides:
  - ui/price (formatPrice only), ui/difficulty-symbol (peaks plus word), ui/avatar (photo or initials), ui/alert (tone and role per variant), ui/toast (timed, dismissable Client Component)
  - Styleguide sections for each of the five atoms
affects: [03-03 to 03-09 ui components, 03-10 styleguide assembly, Phase 4 tour rows and booking panel]

actuals:
  tokens: 9800
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - "Server Components render through react-dom/server in Vitest (renderToStaticMarkup) without jsdom or Testing Library"
    - "A Client Component composes a Server Component (Toast renders Alert) instead of duplicating its styling"
    - "Client file header: 'use client';' on line 1, '// client: <reason>' on line 2 (two lines, as the checker reads them)"

key-files:
  created:
    - src/components/ui/price.tsx
    - src/components/ui/price.module.css
    - src/components/ui/difficulty-symbol.tsx
    - src/components/ui/difficulty-symbol.module.css
    - src/components/ui/avatar.tsx
    - src/components/ui/avatar.module.css
    - src/components/ui/alert.tsx
    - src/components/ui/alert.module.css
    - src/components/ui/toast.tsx
    - src/components/ui/toast.module.css
    - src/app/styleguide/sections/price-section.tsx
    - src/app/styleguide/sections/difficulty-symbol-section.tsx
    - src/app/styleguide/sections/avatar-section.tsx
    - src/app/styleguide/sections/alert-section.tsx
    - src/app/styleguide/sections/toast-section.tsx
    - test/components/ui/price.test.ts
    - test/components/ui/difficulty-symbol.test.ts
    - test/components/ui/avatar.test.ts
    - test/components/ui/alert.test.ts
  modified:
    - src/app/styleguide/page.tsx
    - test/app/toast.spec.ts

key-decisions:
  - "Price builds its string only from formatPrice; the per person suffix is appended to that string, so no rupee text is hand-built"
  - "DifficultySymbol marks the peak glyphs aria-hidden; the word beside them is what assistive technology reads (U22)"
  - "Avatar initials invert the page colours (--color-text background, --color-bg text), so no new token was added"
  - "Alert takes an optional role override (alert or status); the default follows urgency, and Toast passes status to keep its polite region"
  - "Toast auto-dismisses after 5000 ms by default, clears its timer on manual close, and calls onDismiss once on either path"
  - "The toast entrance uses --duration-fast (150 ms), under the 200 ms cap, and is removed under prefers-reduced-motion"

requirements-completed: []
requirements-partial: [U4]

coverage:
  - id: D1
    description: "Price renders every amount through formatPrice with Indian grouping and an optional per person suffix"
    requirement: "U4"
    verification:
      - kind: unit
        ref: "test/components/ui/price.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "DifficultySymbol shows one, two or three peaks together with the word Easy, Medium or Difficult"
    requirement: "U4"
    verification:
      - kind: unit
        ref: "test/components/ui/difficulty-symbol.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Avatar shows initials without a photo, and a photo with next/image when one is given; a blank photoUrl falls back to initials"
    requirement: "U4"
    verification:
      - kind: unit
        ref: "test/components/ui/avatar.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Alert role follows urgency (error alert, success and info status) and renders caller copy verbatim"
    requirement: "U4"
    verification:
      - kind: unit
        ref: "test/components/ui/alert.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Toast auto-dismisses, closes early, sits in a polite live region, and its entrance is at most 200 ms and absent under reduced motion"
    requirement: "U25"
    verification:
      - kind: e2e
        ref: "test/app/toast.spec.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "Visual judgement of the five atoms in both themes and at both widths"
    requirement: "U4"
    verification: []
    human_judgment: true
    rationale: "Glyph weight, the Alert tone edge and the avatar colour inversion need the design gate; the styleguide shows them."

duration: about 40 min
completed: 2026-11-15
status: complete
commits: 7
plan_head_before: 3e8f9fff96f00ff1d62e68d9f7da9abf2e2b1a79
plan_head_after: 86a074b
---

# Phase 3 Plan 06: Display atoms Summary

**Price (formatPrice only), DifficultySymbol (peaks always with the word), Avatar (photo or initials), Alert (tone and role per variant) and Toast (5 s timed, dismissable, polite, reduced-motion aware), each with its styleguide section.**

## Performance

- **Duration:** about 40 min
- **Tasks:** 3, each with a RED and GREEN commit
- **Commits:** 7 (measured from the ledger base `3e8f9ff`)

## Accomplishments

- `Price` takes `{ rupees, perPerson? }` and renders the string from `formatPrice`, so `₹24,999` and `₹18,999 per person` come from one source.
- `DifficultySymbol` maps easy, medium and difficult to one, two and three peaks, and always renders the word in the same element.
- `Avatar` takes `{ name, photoUrl?, size? }`. A non-blank `photoUrl` renders through `next/image` with a `sizes` hint; otherwise it renders the first letter of up to two words. The wrapper is `role="img"` labelled with the name.
- `Alert` takes `{ variant, children, role? }`. Error is `role="alert"`; success and info are `role="status"`. It never writes message text itself.
- `Toast` is the project's second Client Component. It auto-dismisses after 5000 ms, a Dismiss button closes it early, and both paths clear the timer and call `onDismiss` once. It sits in an `aria-live="polite"` region and composes `Alert`.
- Five styleguide sections show each atom with real seed names, tours and prices.

## Task Commits

1. **Task 1: Price and DifficultySymbol**
   - RED: `e3a332e` test(ui): add failing price and difficulty symbol specs [U4] (03-06)
   - GREEN: `ab22fb1` feat(ui): add price and difficulty symbol atoms [U4] (03-06)
2. **Task 2: Avatar and Alert**
   - RED: `5c9c430` test(ui): add failing avatar and alert specs [U4] (03-06)
   - GREEN: `bc1c3ff` feat(ui): add avatar and alert atoms [U4] (03-06)
   - Format-only: `a81441e` style(ui): format avatar and alert specs [U4] (03-06)
3. **Task 3: Toast**
   - RED: `ee813b4` test(ui): add failing toast spec [U4, U25] (03-06)
   - GREEN: `86a074b` feat(ui): add the timed, dismissable toast [U4, U25] (03-06)

## Verification

- `npx vitest run`: 52 files, 711 tests pass (the 15 new component cases included).
- `npx playwright test --project=app` on a local dev server: 22 of 22 pass, including the 5 toast cases.
- `npx tsc --noEmit`, `npm run lint`, `npm run lint:css`, `npm run format:check`, `npm run check:conventions`, `npm run check:client` and `npm run knip` are clean.

## Deviations from Plan

### Environment

**1. `npm ci` in the worktree.** The worktree had no `node_modules`, so `npm ci` ran from the lockfile. No package was added or changed.

**2. Port 3100 for Playwright.** Port 3000 was held by a dev server from a sibling worktree (`agent-af4cb30a29d74d4ed`). Playwright's `reuseExistingServer` would have tested that code instead of this one. A temporary config on port 3100 ran the specs and was deleted afterward. The sibling's process was not touched.

**3. Shell skip-link spec failed in one window, then passed.** During one stretch of runs, `shell.spec.ts` "skip link is the first focusable element" failed 6 of 6 with focus `inactive`. A diagnostic showed the first Tab does focus the skip link. The same spec then passed 10 of 10 on three consecutive runs and in the final full run. The failure coincided with another agent's Playwright run on this machine. The skip-link markup and the home page are untouched by this plan, so this is treated as environmental. It is noted here rather than hidden.

**4. The toast RED run also used port 3000.** The first Playwright run for the toast was against the sibling server. Its failures ("element not found") are the expected result for a missing toast, and the GREEN run was repeated on 3100 against this worktree's code.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Styleguide page wiring.** `src/app/styleguide/page.tsx` was not in the plan's file list. The five sections were imported there so `npm run knip` does not flag them as unused. This follows 03-02's precedent.

**2. [Rule 2 - Missing] Alert role override.** A toast must stay in its polite region, but `Alert` derives `role="alert"` for errors, and that is assertive. `Alert` gained an optional `role` prop; the default is unchanged and Toast passes `status`.

**3. [Rule 1 - Bug] Two-line client header.** The plan's one-line `'use client' // client: ...` form is not recognised by `scripts/check-client-boundaries.ts`, so the header is `'use client';` on line 1 and the reason on line 2, as 03-02 found.

**4. [Rule 2 - Missing] Test files outside the plan list.** Four Vitest specs under `test/components/ui/` were added. The plan named only the Playwright spec, but its TDD cycle needed a failing test per component first.

## Design Decisions

- **Difficulty peaks are `aria-hidden`.** The plan's wording left this open. Announcing "black up-pointing triangle" three times adds noise, and the word already carries the rating in text.
- **Avatar colours reuse tokens.** The initials use `--color-text` as the background and `--color-bg` as the text. These invert between themes, so they read in both without a new token.
- **Avatar `sizes` values are rem.** `sizes` is `2.5rem` for `sm` and `3.5rem` for `md`, matching the CSS sizes.

## Known Limits

- **Live region mounts with the toast.** The `aria-live` region is the Toast's root, so it appears together with its message. Some screen readers do not announce content that mounts inside a new live region. A caller that needs a reliable announcement should keep a region mounted and place the toast inside it. The styleguide shows the component only.
- **Avatar photo load errors.** `Avatar` is a Server Component, so it cannot swap to initials when an image fails to load after render. A blank or missing `photoUrl` is handled; a broken URL is not.
- **No seed person has a photo.** `seed/README.md` says users show initials, so the styleguide shows initials only. The photo branch is covered by a unit test.

## Requirements

`requirements-partial: [U4]`. This plan adds five of the `ui/` set. The rest of the set is in plans 03-03 to 03-09, and 03-10 owns full styleguide coverage. U4 is not ticked complete here.

## Known Stubs

None.

## Threat Flags

None. `Alert` and `Toast` render only the string their caller passes, as JSX children. No network endpoint, auth path or file access was added.

## Self-Check

- [x] Created files exist: the 15 `src/` files listed in `key-files` and the 4 `test/components/ui/` specs.
- [x] Commits `e3a332e`, `ab22fb1`, `5c9c430`, `bc1c3ff`, `ee813b4`, `a81441e` and `86a074b` are ancestors of HEAD.
- [x] `npx vitest run`: 52 files, 711 tests pass.
- [x] `npx playwright test --project=app`: 22 of 22 pass.

## Self-Check: PASSED
