---
phase: 03-design-system-and-app-shell
plan: 02
subsystem: ui
tags: [server-components, client-component, skip-link, header, footer, mobile-menu, playwright, css-layers]

requires:
  - phase: 03-design-system-and-app-shell
    provides: five-layer CSS, tokens.css, base.css, Button, the gated /styleguide (plan 03-01)
provides:
  - Skip link, header with mobile menu disclosure, and footer, all in ui/
  - MobileMenu, the project's first Client Component (aria-expanded disclosure, no-JS fallback)
  - Root layout with one main landmark, a skip link as the first focusable element and the shell around children
  - Shell section on /styleguide (header and footer, logged out)
  - Playwright shell spec at 375 and 1280px, plus a no-JS case
affects: [03-03 to 03-09 ui components, 03-10 styleguide assembly, Phase 4 feature pages, Phase 5 session wiring of isLoggedIn]

actuals:
  tokens: 5536
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Client Component disclosure: the button renders only after hydration (useSyncExternalStore), so the server HTML and the no-JS page show the plain nav list"
    - "One shared shell link list (ShellNavLinks) rendered by both header and footer, so their nav cannot drift apart"
    - "Header and footer colours come from tokens: a Neel band (--color-header-bg) with Highway yellow focus rings, the footer on the surface colour"
    - "Client file header: 'use client'; alone on line 1, then '// client: <reason>' on line 2, as scripts/check-client-boundaries.ts reads it"

key-files:
  created:
    - src/components/ui/skip-link.tsx
    - src/components/ui/skip-link.module.css
    - src/components/ui/shell-nav-links.tsx
    - src/components/ui/footer.tsx
    - src/components/ui/footer.module.css
    - src/components/ui/header.tsx
    - src/components/ui/header.module.css
    - src/components/ui/mobile-menu.tsx
    - src/components/ui/mobile-menu.module.css
    - src/app/styleguide/sections/shell-section.tsx
    - test/app/shell.spec.ts
  modified:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/styleguide/page.tsx
    - src/styles/tokens.css
    - src/styles/base.css
    - src/components/ui/footer.module.css
    - test/app/styleguide.spec.ts

key-decisions:
  - "Header band is Neel in both themes (--color-header-bg, --color-header-text added to tokens.css); there was no theme-independent Neel token"
  - "MobileMenu's button is rendered only after hydration; the server HTML and the no-JS page show the nav as a plain list, which satisfies U19 without a CSS-only hide"
  - "Footer uses the surface and text tokens (per the plan), not the Neel band; its focus ring is the default Neel ring"
  - "Account nav item links to /me when logged in; Log in and Sign up link to /login and /signup when logged out, per plan.md section 7 routes"
  - "Tours links to / (the tour overview), My tours to /my-tours, Photo credits to /credits; those pages do not exist yet"
  - "Main is a 72rem column with token padding in base.css, so page content has gutters; components may override it"
  - "The skip link target gets no focus ring (main:focus outline none), because it is a programmatic target, not a control"

requirements-completed: [U9, U19]
requirements-partial: [U4]

coverage:
  - id: D1
    description: "Skip link is the first focusable element and moves focus to main"
    requirement: "U9"
    verification:
      - kind: e2e
        ref: "test/app/shell.spec.ts#[U9] the skip link is the first focusable element and moves focus to main"
        status: pass
    human_judgment: false
  - id: D2
    description: "Home page has exactly one h1 and header, main, footer and nav landmarks"
    requirement: "U9"
    verification:
      - kind: e2e
        ref: "test/app/shell.spec.ts#[U9] the home page has one h1 and the header, main and footer landmarks"
        status: pass
    human_judgment: false
  - id: D3
    description: "Header nav with a Menu button that toggles aria-expanded below 64em; the nav is a plain list without JavaScript"
    requirement: "U19"
    verification:
      - kind: e2e
        ref: "test/app/shell.spec.ts#[U19] the menu button toggles aria-expanded and shows the nav"
        status: pass
      - kind: e2e
        ref: "test/app/shell.spec.ts#[U19] the nav links render as a plain list with no menu button"
        status: pass
    human_judgment: true
    rationale: "The Neel header band, its focus ring and the open mobile layout are visual judgements for the design gate in both themes."
  - id: D4
    description: "Footer repeats the header nav, links to /credits and shows the copyright line"
    requirement: "U4"
    verification:
      - kind: e2e
        ref: "test/app/shell.spec.ts#[U4] the footer repeats the header nav and links to the photo credits"
        status: pass
    human_judgment: false

duration: about 5 min between the first task commit and this summary (the plan's start time was not recorded)
completed: 2026-11-11
status: complete
commits: 4
plan_head_before: a3fddc282d7d86c30fe0f9cf2d0a0b3e4cf42852
plan_head_after: b15f2a8e7371d079305669a831aacbfbe35fbee3
---

# Phase 3 Plan 02: App shell Summary

**Skip link, header with a no-JS-safe mobile menu disclosure, and footer wired into the root layout, so every page gets one main landmark, a skip link and working navigation.**

## Performance

- **Duration:** about 5 min between the first task commit and this summary (start time not recorded)
- **Completed:** 2026-11-11
- **Tasks:** 3 (plus a TDD spec commit that runs before them)
- **Files modified:** 18 (11 created, 7 modified)

## Accomplishments

- The root layout renders the skip link, the header, a single `<main id="main-content" tabIndex={-1}>` and the footer around `children`. `await connection()` and `<html lang="en-IN">` are unchanged.
- The skip link is the first focusable element. Pressing Tab once focuses it, and Enter moves focus to `<main>`.
- The header shows Tours, My tours, and Log in or Sign up (Account when logged in) as plain links. Below 64em a Menu button with `aria-expanded` toggles the list. With JavaScript off, the same links render as a plain list and there is no button.
- `MobileMenu` is the project's first Client Component, with `'use client';` and a `// client:` reason line that `scripts/check-client-boundaries.ts` accepts.
- The footer repeats the header's nav through one shared `ShellNavLinks` list, adds Photo credits and `© {year} Natours.`, and uses surface and text tokens only.
- `/` and `/styleguide` now render `div`s, so the page has one `<main>`. `/styleguide` gained a Shell section showing the header and footer.

## Task Commits

0. **TDD spec (RED):** `8a33172` test(ui): add failing shell spec. Ten Playwright cases failed before any component existed.
1. **Task 1: skip link and footer** - `aa131a9` (feat)
2. **Task 2: header and mobile menu** - `55d81fc` (feat, with the two header tokens)
3. **Task 3: layout wiring and test corrections** - `b15f2a8` (feat)

**Plan metadata:** recorded in the docs commit that adds this file.

_Note: the plan marks Tasks 1 and 2 `tdd="true"`, but its spec sat in Task 3. The spec was moved up and committed red first, then the components went green against it._

## Files Created/Modified

- `src/components/ui/skip-link.tsx` and `.module.css` - off-screen skip link, slides in on `:focus`
- `src/components/ui/shell-nav-links.tsx` - the shared Tours, My tours, Log in or Sign up or Account list
- `src/components/ui/footer.tsx` and `.module.css` - footer landmark, Footer nav, copyright line
- `src/components/ui/header.tsx` and `.module.css` - Neel header band, brand link, nav list
- `src/components/ui/mobile-menu.tsx` and `.module.css` - client disclosure with `aria-expanded` and `aria-controls`
- `src/app/layout.tsx` - the shell around `children`
- `src/app/page.tsx` - `main` changed to `div`, so there is one `<main>`
- `src/app/styleguide/page.tsx` and `sections/shell-section.tsx` - `main` changed to `div`, and the Shell section added
- `src/styles/tokens.css` - `--color-header-bg` and `--color-header-text`
- `src/styles/base.css` - the `main` column and `main:focus { outline: none }`
- `test/app/shell.spec.ts` - ten shell cases at 375 and 1280px, plus a no-JS case
- `test/app/styleguide.spec.ts` - the keyboard case focuses the button directly

## Decisions Made

- The header band is Neel in both themes, with Whitewash text. The dark theme's direction table does not specify the header, so this is a judgement call for the design gate.
- `ShellNavLinks` is a separate file that the plan did not list, so header and footer render the same links (D-01).
- The mobile button is rendered only after hydration, through `useSyncExternalStore` (server snapshot false, client snapshot true). That avoids a `setState`-in-effect and keeps the server HTML a plain list.
- `isLoggedIn` is hard-coded to `false` in the layout and the Shell section, as the plan says. Phase 5 wires the real value.

## Deviations from Plan

### Environment

**Worktree base fast-forwarded to main.** The worktree branch was at `c91272b`, before plan 03-01. It has no 03-01 output, and the working tree was clean, so it was fast-forwarded to `main` (`a3fddc2`) with `git merge --ff-only`. This is not a commit by this plan.

### Auto-fixed Issues

**1. [Rule 1 - Bug] Nested `<main>` landmarks**
- **Found during:** Task 3
- **Issue:** `src/app/page.tsx` and `src/app/styleguide/page.tsx` each rendered `<main>`, so the layout's `<main>` would contain a second one. That breaks the "exactly one main" truth.
- **Fix:** both pages render `div`. The styleguide page is named in the plan only for the section file, so this edit is outside the plan's file list.
- **Files modified:** `src/app/page.tsx`, `src/app/styleguide/page.tsx`
- **Verification:** `shell.spec.ts` counts `main` once at 375 and 1280px.
- **Committed in:** `b15f2a8`

**2. [Rule 3 - Blocking] Existing keyboard test broke under the skip link**
- **Found during:** Task 3
- **Issue:** `test/app/styleguide.spec.ts` pressed Tab once and expected the first button. The skip link now comes first, and the header links come before the styleguide, so the fixed count is fragile.
- **Fix:** the test focuses the first Book this tour button directly, then checks the focus ring.
- **Files modified:** `test/app/styleguide.spec.ts`
- **Verification:** 17 of 17 app specs pass.
- **Committed in:** `b15f2a8`

**3. [Rule 2 - Missing] Header colour tokens**
- **Found during:** Task 2
- **Issue:** the plan asks for a Neel header background, but no theme-independent Neel token exists. `--color-text` is Neel only in the light theme.
- **Fix:** added `--color-header-bg: #1f2b4d` and `--color-header-text: #eef1f5` to `:root`. The values are the approved Neel and Whitewash hex codes. Raw values stay in `tokens.css`.
- **Files modified:** `src/styles/tokens.css`
- **Verification:** stylelint's raw-value rules pass. Contrast is about 12.2:1 (Whitewash on Neel), in line with direction.md's 12.27:1.
- **Committed in:** `55d81fc`

**4. [Rule 3 - Blocking] `'use client'` on its own line**
- **Found during:** Task 2
- **Issue:** the plan writes `'use client' // client: ...` on one line. The checker's directive regex only matches a bare `'use client'`, so the one-line form is never recognised as a client file and the reason check never runs.
- **Fix:** `'use client';` on line 1 and `// client: <reason>` on line 2.
- **Verification:** `node scripts/check-client-boundaries.ts` reports `Checked 1 client files.`
- **Committed in:** `55d81fc`

**5. [Rule 1 - Bug] Footer and header edges did not line up**
- **Found during:** visual check after Task 3
- **Issue:** the footer's padding sat on the outer element, so its content started 16px left of the header's brand.
- **Fix:** the footer's horizontal padding moved to its inner column, matching the header.
- **Files modified:** `src/components/ui/footer.module.css`
- **Committed in:** `b15f2a8`

**6. [Rule 2 - Missing] Page content gutters**
- **Found during:** visual check after Task 3
- **Issue:** with no `main` styling, page content ran to the screen edge.
- **Fix:** `main` is a 72rem column with token padding in `base.css`. Components can override it.
- **Files modified:** `src/styles/base.css`
- **Committed in:** `b15f2a8`

**7. [Rule 2 - Missing] Skip-link target focus ring**
- **Found during:** Task 3
- **Issue:** after the skip link moves focus to `<main tabIndex={-1}>`, the base `:focus-visible` ring would outline the whole page.
- **Fix:** `main:focus { outline: none }`, because `main` is a programmatic target, not a control.
- **Files modified:** `src/styles/base.css`
- **Committed in:** `b15f2a8`

**8. [Rule 3 - Blocking] Unused section file under knip**
- **Found during:** Task 3
- **Issue:** the plan creates `shell-section.tsx` but leaves importing it to Plan 03-10. An unimported file fails `npm run knip`.
- **Fix:** `styleguide/page.tsx` imports and renders `ShellSection`, the only change to that page beyond `main` to `div`.
- **Committed in:** `b15f2a8`

**Total deviations:** 8 auto-fixed (2 Rule 1 bugs, 3 Rule 2 missing, 3 Rule 3 blocking).
**Impact on plan:** all eight are needed for correct landmarks, a working skip link, the no-JS requirement and lint or knip. One note for the design gate: the Neel band in dark mode and the gutter width are design choices, not plan text.

## Issues Encountered

- The Playwright shell spec first failed on two assertions that were mine, not the shell's. The header nav is `display: none` when collapsed below 64em, and role queries skip hidden nodes, so the markup assertions use `includeHidden`. The app spec then passed 17 of 17.
- `next dev` refuses a second server in the same folder. A temporary dev server on port 3100 for the screenshot check blocked the Playwright `webServer` until it was stopped.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 03-03 onward: the shell gives every ui component a Neel header, a surface footer, a skip link and a main column to sit in.
- Links to pages that do not exist yet: `/my-tours`, `/login`, `/signup`, `/credits`, and `/me` (logged-in Account only). They return 404 until Phase 4 and Phase 5 build them.
- `isLoggedIn={false}` is hard-coded in the layout and the Shell section. Phase 5 replaces it with a real session value.
- For the design gate: the dark-mode Neel header band, the open mobile menu, and the footer's surface treatment are not yet reviewed visually.

## Known Stubs

None in the rendered output. The links listed under Next Phase Readiness are destinations for pages not yet built. They are not placeholder data.

## Threat Flags

None. No new network endpoints, auth paths or file access. `MobileMenu` renders hard-coded text and link JSX only, and passes `react/no-danger`.

## Self-Check

- [x] Created files exist: `src/components/ui/{skip-link,shell-nav-links,footer,header,mobile-menu}.{tsx,module.css}`, `src/app/styleguide/sections/shell-section.tsx`, `test/app/shell.spec.ts`
- [x] Commits `8a33172`, `aa131a9`, `55d81fc` and `b15f2a8` are ancestors of HEAD
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run lint:css`, `npm run check:client`, `npm run check:conventions`, `npm run knip`, `npm run format:check` pass
- [x] `npx vitest run`: 48 files, 696 tests pass
- [x] `npx playwright test --project=app`: 17 of 17 pass (shell spec and styleguide spec)

## Self-Check: PASSED
