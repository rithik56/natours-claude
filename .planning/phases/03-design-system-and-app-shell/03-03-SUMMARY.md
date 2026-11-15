---
phase: 03-design-system-and-app-shell
plan: 03
subsystem: ui
tags: [error-pages, not-found, error-boundary, global-error, server-components, client-component, security, playwright]
requires:
  - phase: 03-design-system-and-app-shell
    provides: five-layer CSS, tokens.css, Button, the app shell (plans 03-01 and 03-02)
provides:
  - not-found.tsx, a Server Component in the new design, linking back to the tours
  - error.tsx, a Client Component that shows the fixed INTERNAL copy and the digest only
  - global-error.tsx, a self-contained root error boundary with the same treatment
  - Playwright check that an unknown URL returns 404 and renders the new not-found page
affects: [03-10 styleguide assembly, Phase 4 (point the not-found link at /tours)]

actuals:
  tokens: 1661
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Error boundaries render a fixed copy string and error.digest only; the error's own text is never read"
    - "global-error.tsx imports no layout, CSS module or shared component, because it replaces the root layout"
    - "Client file header: 'use client'; alone on line 1, then '// client: <reason>' on line 2"

key-files:
  created:
    - src/app/not-found.tsx
    - src/app/not-found.module.css
    - src/app/error.tsx
    - src/app/error.module.css
    - src/app/global-error.tsx
    - test/examples/error-pages.test.ts
    - test/app/error-pages.spec.ts
  modified: []

key-decisions:
  - "The not-found link reuses Button's classes on next/link, so no href support is added to Button before Plan 03-04 builds ui/link.tsx"
  - "error.tsx and global-error.tsx never contain the text error.message, not even in comments, so the plan's grep check stays meaningful"
  - "global-error.tsx carries a viewport meta tag and a title, because replacing the root layout drops the layout's metadata"
  - "The error-page unit tests live in test/examples/error-pages.test.ts, the path the plan's verify command names"

requirements-completed: [U18, S19]

coverage:
  - id: D1
    description: "Unknown URL returns 404 and renders the new not-found page with copy.md's wording and a link to /"
    requirement: "U18"
    verification:
      - kind: e2e
        ref: "test/app/error-pages.spec.ts#[U18] an unknown URL renders the new not-found page with a link back to the tours"
        status: pass
      - kind: unit
        ref: "test/examples/error-pages.test.ts#not-found page"
        status: pass
    human_judgment: true
    rationale: "The centred layout and the button-styled link are visual choices for the design gate in both themes."
  - id: D2
    description: "error.tsx renders the INTERNAL copy and error.digest only, never the error's message"
    requirement: "S19"
    verification:
      - kind: unit
        ref: "test/examples/error-pages.test.ts#error pages"
        status: pass
    human_judgment: false
  - id: D3
    description: "global-error.tsx renders its own html and body with the same fixed copy and digest only"
    requirement: "S19"
    verification:
      - kind: unit
        ref: "test/examples/error-pages.test.ts#error pages"
        status: pass
    human_judgment: false
  - id: D4
    description: "error.tsx and global-error.tsx pass the client-boundary check and never reference error.message"
    requirement: "S19"
    verification:
      - kind: unit
        ref: "npm run check:client (3 client files) and grep -L error.message"
        status: pass
    human_judgment: false

duration: about 30 min (start time not recorded)
completed: 2026-11-15
status: complete
commits: 2
plan_head_before: 3e8f9fff96f00ff1d62e68d9f7da9abf2e2b1a79
plan_head_after: 0ac6c107cc31fcc3be94ecd122eeef9c2441198b
---

# Phase 3 Plan 03: Error pages Summary

**New-design not-found page that links back to the tours, and error boundaries that show a fixed generic message plus error.digest, with no error text and no stack trace.**

## Performance

- **Duration:** about 30 min (start time not recorded)
- **Completed:** 2026-11-15
- **Tasks:** 2 (both `tdd="true"`)
- **Files changed:** 7 (7 created, 0 modified)

## Accomplishments

- `not-found.tsx` is a Server Component. It renders "We couldn't find that page." and a "Back to the tours" link to `/`, styled with `Button`'s primary classes on `next/link`.
- `error.tsx` is a Client Component (`'use client';` then `// client:`). It renders the INTERNAL copy "Something went wrong on our side. Try again in a moment.", a `Reference: {digest}` line only when a digest exists, and a secondary "Try again" `Button` that calls `retry()`.
- `global-error.tsx` replaces the root layout, so it has its own `<html lang="en-IN">` and `<body>`. It imports no layout, CSS module or shared component, and uses a plain `<button>`. It shows the same copy and digest only.
- Neither error file contains the text `error.message`, and `npm run check:client` now counts 3 client files, including both error pages.
- A Playwright spec on the real app confirms that an unknown URL gets a 404 status, the new heading, and a link that returns to `/`.

## Task Commits

1. **Task 1: not-found page (Server Component)** - `60fdf17` (feat, `[U18] (03-03)`). Test first: the import failed (RED), then the page passed (GREEN).
2. **Task 2: error.tsx and global-error.tsx, digest only** - `0ac6c10` (feat, `[U18, S19] (03-03)`). Test first: the imports failed (RED), then 4 unit tests passed (GREEN). The Playwright spec ran after the code.

Each TDD task was committed as one commit containing its test and implementation, with no separate RED commit.

## Verification

- `npx vitest run test/examples/error-pages.test.ts`: 4 of 4 pass.
- `npx vitest run`: 49 files, 700 tests pass (before this plan: 48 files, 696 tests).
- `npx playwright test --project=app`: 19 of 19 pass when run serially, or in parallel against an already-running server. A cold parallel start intermittently fails with `ERR_CONNECTION_REFUSED` (see Issues Encountered).
- `npx tsc --noEmit`, `npm run check:client` (3 client files), `npm run check:conventions` (140 files), `npm run knip`: all clean.
- ESLint, stylelint and Prettier are clean on the new files.
- `grep -L "error.message" src/app/error.tsx src/app/global-error.tsx`: both files listed, so the string is absent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Error-page unit tests moved out of test/app**
- **Found during:** Task 2
- **Issue:** the Task 2 action asks for a unit test in `test/app/error-pages.spec.ts` that calls `renderToStaticMarkup`. Vitest excludes `test/app/**/*.spec.ts`, and Playwright cannot run a Vitest-style unit test, so that file could not run under either runner.
- **Fix:** the unit assertions for all three pages are in `test/examples/error-pages.test.ts`, which the plan's own verify command names. `test/app/error-pages.spec.ts` is a Playwright spec that visits an unknown URL, the real route for U18.
- **Files modified:** `test/examples/error-pages.test.ts`, `test/app/error-pages.spec.ts`
- **Commit:** `0ac6c10`

**2. [Rule 3 - Blocking] `'use client'` and the reason comment on separate lines**
- **Found during:** Task 2
- **Issue:** the plan's example writes `'use client' // client: ...` on one line. The checker's directive pattern only matches a bare `'use client'`, so the reason check would not run for that file.
- **Fix:** `'use client';` on line 1 and `// client: <reason>` on line 2 in `error.tsx` and `global-error.tsx`. This is the same fix plan 03-02 recorded.
- **Commit:** `0ac6c10`

**3. [Rule 2 - Missing] Viewport meta tag and title in global-error.tsx**
- **Found during:** Task 2
- **Issue:** when `global-error.tsx` renders, it replaces the root layout, which normally supplies the viewport and title metadata. Without a viewport tag, a phone would show this page at desktop width, and the product is phone-first (Core Value).
- **Fix:** `global-error.tsx` has a `<head>` with `width=device-width, initial-scale=1` and the title "Natours". It stays otherwise unstyled, as planned.
- **Commit:** `0ac6c10`

### Process notes (not code deviations)

- The Task 1 commit's test file imports only the not-found page. The error-page tests were added in Task 2, so each commit's test run passes on its own.
- The `not-found.tsx` test decodes React's `&#x27;` escape for the apostrophe before asserting the copy. The rendered page shows a plain `'`.

## Issues Encountered

- **Intermittent `ERR_CONNECTION_REFUSED` in the full app project.** A cold parallel run (5 workers, Playwright starting `next dev` itself) failed about two runs in three. Every failure was a `page.goto` to `localhost:3000`. The failing set included the shell specs from plan 03-02, and the new error-page specs were among them. Evidence that this is the test server's start-up, not the pages:
  - Serial runs (`--workers=1`) passed 2 of 2.
  - Parallel runs against a server started by hand and already answering `/healthz` passed 3 of 3, with zero refused connections.
  - The config is unchanged. The fix would be in `playwright.config.ts`'s `webServer` start-up, outside this plan.
- **Worktree dependencies.** `node_modules` was missing in this worktree, so `npm ci` ran from the lockfile. No package was added or changed. Playwright's Chromium was already present.

## User Setup Required

None.

## Known Stubs

None. The "Back to the tours" link points to `/` because `/tours` does not exist until Phase 4. That is a destination, not placeholder data. Phase 4 must change the `href` and the matching assertion in `test/examples/error-pages.test.ts` and `test/app/error-pages.spec.ts`.

## Threat Flags

None. The error pages add no endpoint, auth path or file access. Their only dynamic value is `error.digest`, and the error text is never rendered (T-03-05, T-03-06 mitigated as planned).

## Next Phase Readiness

- The Playwright cold-start flake above should be fixed before the phase's end-of-phase verification relies on a fully green app run.
- The design gate (03-10 styleguide) should review the not-found and error layouts in both themes, and the Neel focus ring on the secondary button.
- Phase 4 must update the not-found link to `/tours` and its assertions.

## Self-Check

- [x] Created files exist: `src/app/not-found.tsx`, `src/app/not-found.module.css`, `src/app/error.tsx`, `src/app/error.module.css`, `src/app/global-error.tsx`, `test/examples/error-pages.test.ts`, `test/app/error-pages.spec.ts`
- [x] Commits `60fdf17` and `0ac6c10` are ancestors of HEAD
- [x] `npx vitest run`: 49 files, 700 tests pass
- [x] `npx playwright test --project=app --workers=1`: 19 of 19 pass

## Self-Check: PASSED
