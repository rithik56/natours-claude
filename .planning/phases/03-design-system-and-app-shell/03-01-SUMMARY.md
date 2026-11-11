---
phase: 03-design-system-and-app-shell
plan: 01
subsystem: ui
tags: [css-layers, design-tokens, next-font, stylelint, playwright, css-modules]

requires:
  - phase: 01-foundation-and-contracts
    provides: getConfig().APP_ENV accessor, ADR 0016 APP_ENV-not-NODE_ENV rule, kebab-case and client-boundary checks
  - phase: 02-design-direction-and-approval-gate
    provides: approved palette, dark theme, type scale and 64em breakpoint in docs/design/direction.md
provides:
  - Five-layer CSS system (reset, tokens, base, components, utilities) imported once from the root layout
  - tokens.css with colour, type, spacing, radius, elevation and motion tokens and a prefers-color-scheme dark theme
  - Anek Latin loaded through next/font as --font-anek-latin
  - Button, the first finished ui/ component (primary, secondary, quiet)
  - /styleguide gated by a pure loadStyleguidePage(appEnv) function, with a Button section
  - stylelint rules enforcing U1 and U3, with their own Vitest tests
  - Playwright app project and webServer for real-route specs, plus test:design:app
affects: [03-02 app shell, 03-03 to 03-09 ui components, 03-10 styleguide assembly]

actuals:
  tokens: 6750
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Global layer order declared once in reset.css; component CSS Modules open with @layer components"
    - "Dark theme redefines the same custom-property names inside prefers-color-scheme, no data-theme"
    - "Dev-only route gating as a pure function, unit-tested with the digestOf/failureOf shape"
    - "Interactive components are tested as Playwright specs in test/app against /styleguide"
    - "Component class names are single kebab-case words (stylelint-config-standard rejects camelCase)"

key-files:
  created:
    - src/styles/reset.css
    - src/styles/tokens.css
    - src/styles/base.css
    - src/styles/fonts.ts
    - src/components/ui/button.tsx
    - src/components/ui/button.module.css
    - src/app/styleguide/gate.ts
    - src/app/styleguide/page.tsx
    - src/app/styleguide/styleguide.module.css
    - src/app/styleguide/sections/button-section.tsx
    - test/examples/styleguide-gate.test.ts
    - test/styles/stylelint-rules.test.ts
    - test/app/styleguide.spec.ts
  modified:
    - src/app/layout.tsx
    - stylelint.config.mjs
    - playwright.config.ts
    - package.json
    - vitest.config.mts

key-decisions:
  - "Body text reads --color-text-muted (Slate) and headings read --color-text (Neel), matching the approved mockup"
  - "Heading levels h1 to h3 take --step-4, --step-2 and --step-1; later plans may refine them"
  - "Button defaults to type=button and variant=primary; callers pass type=submit when they mean it"
  - "The reduced-motion baseline sits in @layer utilities, not base, so it beats component animations without !important"
  - "Playwright webServer supplies test-only APP_ENV=ci, APP_URL, MONGODB_URI and SESSION_SECRET when the shell sets none"

requirements-completed: [S2, U1, U2, U3, U6]
requirements-partial: [U4, U5]

coverage:
  - id: D1
    description: "Cascade layers, tokens, light and dark themes and next/font are wired through the root layout"
    requirement: "U1"
    verification:
      - kind: e2e
        ref: "test/app/styleguide.spec.ts#[U2] the dark theme swaps token values with no theme attribute"
        status: pass
    human_judgment: false
  - id: D2
    description: "/styleguide is a 404 when APP_ENV is production and renders in every other environment"
    requirement: "S2"
    verification:
      - kind: unit
        ref: "test/examples/styleguide-gate.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "stylelint fails raw hex and px outside tokens.css, ids, !important and ui rules outside @layer components"
    requirement: "U3"
    verification:
      - kind: unit
        ref: "test/styles/stylelint-rules.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Button renders in three variants and five labelled states with a 44px touch target, in both themes"
    requirement: "U5"
    verification:
      - kind: e2e
        ref: "test/app/styleguide.spec.ts#[U5] the Button section names every variant and state"
        status: pass
    human_judgment: true
    rationale: "Whether the hover, active and focus states look right is a visual judgement; the end-of-phase checkpoint covers it."

duration: 40min
completed: 2026-11-11
status: complete
commits: 4
plan_head_before: c91272bb5b0ebe08a7bab149f991e6343ecc35c7
plan_head_after: 697da206524488186e3405b6e65b4692cc910c16
---

# Phase 3 Plan 01: Design system foundation Summary

**Five-layer CSS architecture with light and dark design tokens, Anek Latin through next/font, stylelint rules that enforce them, a finished Button, a production-gated /styleguide and a Playwright harness that drives the real app.**

## Performance

- **Duration:** about 40 min
- **Completed:** 2026-11-11
- **Tasks:** 3
- **Files modified:** 18

## Accomplishments

- `reset.css` declares `@layer reset, tokens, base, components, utilities;` once, and `layout.tsx` imports reset, tokens and base in that order. The dev server's compiled CSS keeps the same layer rank, with Turbopack splitting the statement into two.
- `tokens.css` holds the only raw hex and px values in `src/`. The dark theme redefines the same names under `prefers-color-scheme: dark`; no `[data-theme]` exists.
- `Button` (primary, secondary, quiet) styles every state from tokens inside `@layer components`, with a 44px minimum target.
- `/styleguide` calls `loadStyleguidePage(getConfig().APP_ENV)`. Unit tests cover all five `APP_ENV` values. A real `next dev` run with `APP_ENV=production` returned 404 for `/styleguide` and 200 for `/healthz`.
- Five stylelint rules enforce U1 and U3, with nine Vitest cases written first and seen failing (6 of 9) before the config was changed.
- `npm run test:design:app` starts `next dev`, waits for `/healthz` and passes 7 specs at 375 and 1280px; `npm run test:design` still passes its 4 mockup screenshots.

## Task Commits

1. **Task 1: tokens, themes, layers, fonts, Button and gated styleguide (tracer)** - `1c9799c`
2. **Task 2 RED: failing stylelint rule tests** - `bf2c019`
3. **Task 2 GREEN: stylelint U1 and U3 rules** - `d5cecad`
4. **Task 3: Playwright app project and webServer** - `697da20`

## Verification

- `npx tsc --noEmit`, `npx eslint . --max-warnings=0`, `npm run lint:css`, `npm run format:check`, `npm run check:conventions`, `npm run check:client` and `npm run knip` are clean.
- `npx vitest run`: 48 files, 696 tests pass.
- Tracer gate (interactive, end-of-phase mode, automated-only verify): Task 1's verify re-run before expanding passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] rule-nesting-at-rule-required-list matches the at-rule name, not its prelude**
- **Found during:** Task 2
- **Issue:** the plan's `['components']` would flag every rule, because the at-rule name in `@layer components` is `layer`.
- **Fix:** `rule-nesting-at-rule-required-list: ['layer']` plus `layer-name-pattern: '^components$'` in the ui override, which together pin the layer to `components`.
- **Files modified:** stylelint.config.mjs
- **Commit:** d5cecad

**2. [Rule 1 - Bug] Primary button focus ring**
- **Found during:** Task 1
- **Issue:** the plan asked the yellow-filled primary button to use `--color-focus-on-accent`, but that token is Highway yellow. In the light theme a yellow ring on the Whitewash page is 1.6:1.
- **Fix:** the ring sits outside the button with a gap, so it never meets the fill. It uses `--color-focus` (Neel in light, Highway yellow in dark). `--color-focus-on-accent` is kept for Neel surfaces such as the header and footer.
- **Files modified:** src/components/ui/button.module.css
- **Commit:** 1c9799c

**3. [Rule 1 - Bug] `!important` in the reduced-motion baseline**
- **Found during:** Task 1
- **Issue:** the usual global reduced-motion rule needs `!important`, which U3 and Task 2 ban.
- **Fix:** the rule lives in `@layer utilities`, the last layer, so it outranks component animations without `!important`. Durations are set to `0s`.
- **Files modified:** src/styles/base.css
- **Commit:** 1c9799c

**4. [Rule 3 - Blocking] AppConfig is exported from config-schema, not config**
- **Issue:** the plan imports `AppConfig` from `@/server/config`, which exports `Config` and not `AppConfig`.
- **Fix:** `gate.ts` imports the type from `@/server/config-schema`.
- **Commit:** 1c9799c

**5. [Rule 3 - Blocking] Vitest would pick up the new Playwright spec**
- **Issue:** `test/app` holds Vitest `*.test.ts` files, and Vitest's default include also matches `*.spec.ts`. Playwright's default match would likewise pick up the Vitest tests.
- **Fix:** `testMatch: '**/*.spec.ts'` on both Playwright projects, and `test/app/**/*.spec.ts` added to Vitest's `exclude`.
- **Files modified:** playwright.config.ts, vitest.config.mts
- **Commit:** 697da20

**6. [Rule 2 - Missing] Extra tokens and files the Button needed**
- `--border-width-hairline` (moved into Task 1 because the secondary button's border needs it), `--focus-ring-width`, `--touch-target`, `--color-border`, `--color-accent-hover`, `--color-accent-active`, `--color-disabled-bg` and `--color-disabled-text`. All raw values are in `tokens.css`. The accent hover and active values keep Neel text at 6.1:1 and 5.1:1.
- `src/app/styleguide/styleguide.module.css`: a small layout module so the section is readable. It uses tokens only.
- `test/styles/stylelint-rules.test.ts`: Task 2 is `tdd="true"`, so the rules got a permanent test file instead of a scratch file.
- `Playwright webServer.env` supplies test-only config values and `PORT`, because the worktree and CI have no `.env.local`.

**7. [Environment] node_modules and Chromium**
- The worktree had no usable `node_modules`, so `npm ci` ran from the lockfile (no package added or changed). Chromium build 1254 was installed with `npx playwright install chromium`, a browser download that CLAUDE.md already lists as required.

### Interpretation notes

- direction.md lists eight type steps numbered 1 to 8; they are `--step-0` to `--step-7`, so the body size is `--step-1`.
- The states a pointer or keyboard produces (hover, focus, active) are pseudo-classes and cannot be forced from the styleguide without JS. Each state is a live button with a visible label saying how to reach it (for example "Primary button, hover. Point at the button.").

## Requirements

`requirements-completed` lists S2, U1, U2, U3 and U6. U4 (the whole `ui/` set) and U5 (every component in every state, both themes, both widths) are only started here: one component of about 27 exists, and Plan 03-10 owns the full styleguide coverage. They are listed under `requirements-partial` so they are not ticked off early.

## Known Stubs

None.

## Threat Flags

None. `/styleguide` is the one debug surface and is covered by T-03-01; `stylelint.config.mjs` by T-03-02. No package was added (T-03-SC).

## Notes for later plans

- Class names in CSS Modules must be kebab-case (`stylelint-config-standard`); single words such as `.primary` work well.
- Add a section file for your component under `src/app/styleguide/sections/`; only Plan 03-10 edits `styleguide/page.tsx`.
- A dev server left running on port 3000 is reused by the Playwright `app` project (`reuseExistingServer: true`), and `next dev` refuses a second server in the same folder.

## Self-Check: PASSED

All 13 created files exist and the four task commits (1c9799c, bf2c019, d5cecad, 697da20) are ancestors of HEAD.
