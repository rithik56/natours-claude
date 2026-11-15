---
phase: 03-design-system-and-app-shell
plan: 04
subsystem: ui
tags: [forms, aria, native-controls, css-layers, playwright, server-components]

requires:
  - phase: 03-design-system-and-app-shell
    provides: five-layer CSS, tokens, Button, the gated /styleguide and the Playwright app project (plan 03-01); the app shell (plan 03-02)
provides:
  - ui/link: typed Link that uses next/link for internal routes and a plain anchor with target="_blank" and rel="noopener noreferrer" for external URLs
  - ui/text-field: labelled input whose errorMessage is wired by aria-invalid and aria-describedby, with the error in a role="alert" paragraph
  - ui/checkbox: native checkbox whose whole label is the 44px target, styled from :checked, :focus-visible and :disabled
  - ui/select: native select with the same error contract as TextField
  - ui/field-error: the one shared field-error contract (fieldErrorProps), used by TextField and Select
  - Link, text field, checkbox and select sections on /styleguide
affects: [03-03 to 03-09 ui form components, 03-10 styleguide assembly, Phase 4 filters, Phase 5 auth forms, Phase 6 reviews]

actuals:
  tokens: 5912
  tasks: 2
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Field-error contract: errorMessage sets aria-invalid=true and aria-describedby to `${name}-error`; the error is a <p role=\"alert\"> rendered only when errorMessage is set. Every form control calls fieldErrorProps."
    - "Checkbox: a native input covers the whole label and a drawn box beside it follows :checked, :focus-visible and :disabled, so CSS alone shows every state"
    - "External links fix target and rel in the component type, so callers cannot override them"
    - "Component specs address fields by label within a section region, because each section has unique labels and names"

key-files:
  created:
    - src/components/ui/link.tsx
    - src/components/ui/link.module.css
    - src/components/ui/text-field.tsx
    - src/components/ui/text-field.module.css
    - src/components/ui/field-error.ts
    - src/components/ui/select.tsx
    - src/components/ui/select.module.css
    - src/components/ui/checkbox.tsx
    - src/components/ui/checkbox.module.css
    - src/app/styleguide/sections/link-section.tsx
    - src/app/styleguide/sections/text-field-section.tsx
    - src/app/styleguide/sections/checkbox-section.tsx
    - src/app/styleguide/sections/select-section.tsx
    - test/app/form-primitives.spec.ts
  modified:
    - src/app/styleguide/page.tsx

key-decisions:
  - "External links always open in a new tab with rel=\"noopener noreferrer\". target and rel are removed from the Link props type, so a caller cannot weaken them."
  - "fieldErrorProps lives in its own file so TextField and Select cannot drift. The helper is a small addition beyond the plan's file list."
  - "An invalid control keeps its readable colours and gets the error colour on its border. The message is always shown too, so colour is never the only cue."
  - "The text field has no hover border change. A hover rule outranked the error border, and stylelint's no-descending-specificity rejected the rule order."
  - "The checkbox input is typed as checkbox (Omit of type), so a caller cannot turn it into another input."
  - "name is also the DOM id, following the plan's contract. Two fields with the same name on one page will collide, so later forms must keep names unique per page."

requirements-completed: []
requirements-partial: [U4]

coverage:
  - id: D1
    description: "Link renders next/link for internal routes and a plain anchor with target=_blank and rel=noopener noreferrer for external URLs"
    requirement: "U4"
    verification:
      - kind: e2e
        ref: "test/app/form-primitives.spec.ts#[U4] an internal link goes to its route and an external link opens in a new tab"
        status: pass
    human_judgment: false
  - id: D2
    description: "A text field with an errorMessage is aria-invalid, described by its visible role=alert error, and a field without one has neither"
    requirement: "U4"
    verification:
      - kind: e2e
        ref: "test/app/form-primitives.spec.ts#[U16] a text field with an errorMessage is invalid and described by its visible error"
        status: pass
      - kind: e2e
        ref: "test/app/form-primitives.spec.ts#[U16] a text field with no errorMessage has no invalid or described state"
        status: pass
    human_judgment: false
  - id: D3
    description: "A checkbox is a native input that its label toggles, starts checked or disabled as its examples show, and has a target at least 44px square"
    requirement: "U4"
    verification:
      - kind: e2e
        ref: "test/app/form-primitives.spec.ts#[U4] a checkbox is a native checkbox that its label toggles"
        status: pass
      - kind: e2e
        ref: "test/app/form-primitives.spec.ts#[U4] the checkbox label is at least 44 pixels square"
        status: pass
    human_judgment: false
  - id: D4
    description: "A select lists the seed tours, takes a choice and, with an errorMessage, is aria-invalid and described by its visible error"
    requirement: "U4"
    verification:
      - kind: e2e
        ref: "test/app/form-primitives.spec.ts#[U4] a select lists the seed tours and takes a choice"
        status: pass
      - kind: e2e
        ref: "test/app/form-primitives.spec.ts#[U16] a select with an errorMessage is invalid and described by its visible error"
        status: pass
    human_judgment: false
  - id: D5
    description: "The default, focus, disabled and error states of the four controls, in both themes, and the focus-ring contrast"
    requirement: "U4"
    verification: []
    human_judgment: true
    rationale: "The specs prove the wiring and the touch target. Whether each state looks right in the light and dark themes is a visual judgement for the design gate."

duration: "about 30 min (start time not recorded; commits from 19:47 to 19:55 IST)"
completed: 2026-11-15
status: complete
commits: 5
plan_head_before: 3e8f9fff96f00ff1d62e68d9f7da9abf2e2b1a79
plan_head_after: f8097e7089965168b685a0b238aecfadc565e58d
---

# Phase 3 Plan 04: Form and navigation primitives Summary

**Link, text field, checkbox and select, with one field-error contract (aria-invalid and aria-describedby to a visible role="alert" message) shared by the text field and the select.**

## Performance

- **Duration:** about 30 min (start time not recorded)
- **Completed:** 2026-11-15
- **Tasks:** 2 (each run as a RED, GREEN cycle, with one refactor commit)
- **Files modified:** 15 (14 created, 1 modified)

## Accomplishments

- `Link` renders `next/link` for internal routes. External `http(s)://` hrefs get a plain anchor with `target="_blank"` and `rel="noopener noreferrer"`, and callers cannot override either.
- `TextField` takes an optional `errorMessage`. When set, the input gets `aria-invalid="true"` and `aria-describedby` pointing at `${name}-error`, and the message appears in a `<p role="alert">`. The component renders the caller's string as JSX text only.
- `Checkbox` is a native `input[type=checkbox]` that covers its whole label, so the clickable area is the real control and is at least 44px square. A drawn box beside it follows `:checked`, `:focus-visible` and `:disabled`, so no JavaScript is needed.
- `Select` takes the same error props as `TextField`, through the shared `fieldErrorProps` helper, so the two controls wire errors identically.
- Link, text field, checkbox and select each have a styleguide section. `/styleguide` imports them, which keeps knip clean.
- All four components are Server Components. None uses `'use client'`, and the CSS uses tokens only, inside `@layer components`.

## Task Commits

1. **Task 1 RED: failing link and text field specs:** `12255a9` (test)
2. **Task 1 GREEN: link and text field:** `fda5735` (feat)
3. **Task 2 RED: failing checkbox and select specs:** `bd7467f` (test)
4. **Task 2 GREEN: checkbox and select on a shared field-error contract:** `44f8798` (feat)
5. **Task 2 REFACTOR: text field uses the shared field-error helper:** `f8097e7` (refactor)

**Plan metadata:** recorded in the docs commit that adds this file.

## Files Created/Modified

- `src/components/ui/link.tsx`, `link.module.css` - typed link, internal and external branches, shared focus ring
- `src/components/ui/text-field.tsx`, `text-field.module.css` - labelled input with the error contract and default, filled, focus and disabled states
- `src/components/ui/field-error.ts` - `fieldErrorProps`, the shared aria wiring for every form control
- `src/components/ui/select.tsx`, `select.module.css` - labelled select with the error contract
- `src/components/ui/checkbox.tsx`, `checkbox.module.css` - native checkbox with a drawn box and a whole-label target
- `src/app/styleguide/sections/link-section.tsx`, `text-field-section.tsx`, `checkbox-section.tsx`, `select-section.tsx` - the four styleguide sections, with examples for each state
- `src/app/styleguide/page.tsx` - imports and renders the four sections
- `test/app/form-primitives.spec.ts` - sixteen Playwright cases at 375px and 1280px

## Decisions Made

- External links are fixed to `target="_blank"` and `rel="noopener noreferrer"`. Both are removed from the Link props type.
- `fieldErrorProps` sits in its own file, so every control shares one error contract.
- An invalid control keeps readable colours and gets the error colour on its border. The message is always visible.
- The text field has no hover border change, because a hover rule outranked the error border.
- Checkbox `type` is fixed by omitting it from the props, so the input is always a checkbox.
- `name` also sets the DOM `id`, as the plan specifies. Later forms on the same page must keep their names unique.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Styleguide page edited outside the plan's file list**
- **Found during:** Task 1 and Task 2
- **Issue:** knip fails on section files that nothing imports. The plan's `files_modified` does not list `src/app/styleguide/page.tsx`.
- **Fix:** `page.tsx` imports and renders the four new sections. This is the same change plan 03-02 made for its shell section.
- **Files modified:** `src/app/styleguide/page.tsx`
- **Verification:** `npm run knip` is clean. The merge with sibling plans that also edit `page.tsx` is for the orchestrator and plan 03-10.
- **Committed in:** `fda5735`, `44f8798`

**2. [Scope addition] Shared field-error helper outside the plan's file list**
- **Found during:** Task 2
- **Issue:** the plan asks for the error pattern to be set up once so later controls follow it. Writing it twice would let TextField and Select drift.
- **Fix:** `src/components/ui/field-error.ts` holds `fieldErrorProps`. `Select` uses it from the start, and `TextField` moves to it in a separate refactor commit.
- **Files modified:** `src/components/ui/field-error.ts`, `src/components/ui/text-field.tsx`
- **Verification:** the sixteen specs pass before and after the refactor.
- **Committed in:** `44f8798`, `f8097e7`

**3. [Interpretation] Checkbox props omit `type`**
- **Issue:** the plan types the checkbox as `ComponentPropsWithoutRef<'input'>`. That would let a caller pass a different `type`.
- **Fix:** `Omit<ComponentPropsWithoutRef<'input'>, 'type'>`, so the input is always a checkbox.
- **Committed in:** `44f8798`

**4. [Interpretation] External links fix target and rel**
- **Issue:** the plan says external links always open in a new tab with `rel` set. Accepting caller overrides would weaken that.
- **Fix:** `target` and `rel` are removed from the Link props type, and the external branch sets both.
- **Committed in:** `fda5735`

**5. [Test adjustment] Checkbox toggle spec clicks the label element**
- **Issue:** the transparent input covers the label text. Playwright refuses to click the text span, because the input intercepts the pointer.
- **Fix:** the spec clicks the `label` element, which is the actual target. This is a test change, and the component behaviour is unchanged.
- **Committed in:** `44f8798`

**6. [Environment] Port 3000 and 3100 held by other worktrees**
- **Issue:** the committed Playwright config hard-codes port 3000 with `reuseExistingServer: true`. A dev server from another worktree (`agent-ad25c9418356dff80`) held port 3000, so the Playwright run was testing another checkout. Later, port 3100 was taken by a third worktree (`agent-a607e59b1c0b3769d`).
- **Fix:** I ran the specs with an untracked scratch config on port 3417 and set `reuseExistingServer: false`. The file was deleted before the last full run. No committed config changed, and I did not stop any other agent's server.
- **Note:** the first RED run (`12255a9`) used port 3000 and may have been served by the other worktree. Its failures were missing elements on `/styleguide`, which is the expected state for this worktree. The second RED run (`bd7467f`) used the scratch port.

**7. [Environment] node_modules and commit ledger**
- `npm ci` ran in the worktree from the lockfile. No package was added or changed.
- The commit ledger `gsd-plan-head-before-03-04` was written after the first commit, from the base SHA that the worktree guard had verified (`3e8f9ff`). The count is measured from that base.

### Requirements status (not a rule deviation)

The plan lists U4 in `requirements`. U4 covers the whole `ui/` set, and this plan builds four of its primitives. U4 is therefore left as `requirements-partial`, following plans 03-01 and 03-02, and `requirements-completed` is empty. The orchestrator should not mark U4 complete on this plan's account. `REQUIREMENTS.md` is not changed.

**Total deviations:** 2 out-of-list file changes (page and field-error helper), 2 interpretations (checkbox type, external link attributes), 1 test adjustment, and 2 environment notes.
**Impact on plan:** nothing in the plan's behaviour changed. The file additions are needed for knip and for a single error contract.

## Issues Encountered

- `test/tooling/eslint-rules.test.ts`, case `[S21] react/no-danger is an error, even with an empty string`, timed out at 5000ms in two full Vitest runs. It passes in isolation (10 of 10). The machine was loaded by other agents' dev servers. This plan did not change the ESLint config or that test, so I did not fix it. The other 695 Vitest tests pass.

## User Setup Required

None - no external service configuration required.

## Verification

- `npx tsc --noEmit`: clean
- `npx stylelint` on the four CSS modules: clean
- `npx eslint` on the new components and the styleguide: clean (`--max-warnings=0`)
- `npm run lint`, `npm run lint:css`, `npm run format:check`, `npm run check:conventions`, `npm run check:client`, `npm run knip`: clean
- `npx playwright test --project=app` (scratch port): 33 of 33 pass, including the sixteen form primitive cases at 375px and 1280px
- `npx vitest run`: 695 of 696 pass; the one failure is the timeout described above

## Known Stubs

None.

## Threat Flags

None. Every caller string (labels, error messages, option labels) is rendered as JSX text, and no `dangerouslySetInnerHTML` is used. `react/no-danger` remains enforced (T-03-07). No package was added (T-03-SC).

## Next Phase Readiness

- Plans 03-03 to 03-09 can build form-bearing components on `fieldErrorProps` and the text field and select patterns.
- Plan 03-10 assembles the styleguide page, which now imports the four new sections.
- For the design gate: the default, focus, disabled and error states in both themes need visual review. This is recorded as D5 with `human_judgment: true`.

## Self-Check: PASSED

- All 14 created files exist on disk.
- Commits `12255a9`, `fda5735`, `bd7467f`, `44f8798` and `f8097e7` are ancestors of HEAD.
- The commit ledger `gsd-plan-head-before-03-04` matches the base SHA verified at start (`3e8f9ff`).
