---
phase: 02-design-direction-and-approval-gate
plan: 02
subsystem: design
tags: [design-direction, copy-governance, wcag-contrast, design-gate]

requires: []
provides:
  - "docs/design/direction.md: brief, palette + contrast, derived dark theme and status colours, type and scale, ASCII wireframes for all four pages (mobile + desktop), signature element, §9.3 self-review"
  - "docs/design/copy.md: glossary, voice rules, and wording for all 12 §4.2 error codes plus field-validation messages"
affects: [02-03, 02-04]

actuals:
  tokens: 21000
  tasks: 2
  commits: 2
  plan_head_before: d372aeb45ea12e86a87a07e9e8de8315e6164e32
  plan_head_after: 58d45f28be649d99a24feb3c79f82dccd9c98a3d

tech-stack:
  added: []
  patterns:
    - "Dark theme and new status (caution/error) colours derived by converting light-theme hex to HSL, keeping hue, adjusting lightness, and verifying contrast with the WCAG relative-luminance formula — cross-checked by reproducing §9.2's own six published ratios from their hex values before deriving new ones"
    - "copy.md documents wording only; src/lib/messages.ts is explicitly deferred to whichever later phase first throws a user-facing AppError"

key-files:
  created:
    - docs/design/direction.md
    - docs/design/copy.md
  modified: []

key-decisions:
  - "No deviation ADR written for direction.md's content, per D-01: it transcribes plan.md §9.2 faithfully; the only new content is the dark theme, a new caution/error status colour, the font config confirmation, two additional wireframe pages (My tours, account) and the self-review, all of which §9.2/CONTEXT.md explicitly leave to the designer's discretion."
  - "Added one new status colour not in §9.2 (caution/error, light #7E2C25, dark #D37269) because U16/U22 require a form-error state and none of the six named colours serves that role; kept it low-saturation and dark (like a roadside hazard sign) rather than a bright warning red, to avoid re-introducing the acid/bright-accent look §9.3 rejects."
  - "Dark-mode primary text reuses Whitewash's own hex value and dark-mode background/surface reuse Neel's hue at lower lightness, rather than inventing new hues — keeps the derived theme visibly built from the same six colours."
  - "copy.md's error-code wording table is specific per code (e.g. CONFLICT names the exact duplicate — email or tour name — rather than a generic 'Conflict' message), since DES-12's whole point is closing the gap where a generic or Zod-default string would otherwise reach a user."

requirements-completed: [U20]

coverage:
  - id: D1
    description: "direction.md contains every section plan.md §9.7 step 1 and §9.2/§9.3 require: brief, palette with measured contrast, derived dark/status colours, type and scale, wireframes for all four pages at mobile and desktop, signature element, and a self-review against every §9.3 item"
    requirement: U20
    verification:
      - kind: automated_ui
        ref: "grep -c '^## ' docs/design/direction.md -ge 7; grep -qi self-review; grep -q 1.25"
        status: pass
    human_judgment: false
  - id: D2
    description: "copy.md gives exact, non-Zod-default wording for all 12 §4.2 error codes plus field-validation rules"
    requirement: U20
    verification:
      - kind: automated_ui
        ref: "for-loop grep of all 12 §4.2 error codes against docs/design/copy.md"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-11-10
status: complete
---

# Phase 2 Plan 2: Design Direction and Copy Governance Summary

Wrote `docs/design/direction.md` (brief, palette with measured and newly-derived contrast ratios, type, breakpoints, ASCII wireframes for all four pages, signature element, and a full §9.3 self-review) and `docs/design/copy.md` (glossary, voice rules, and exact wording for every §4.2 error code and field-validation rule), the two narrative documents the user reads at the Phase 2 design gate.

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-11-10
- **Tasks:** 2/2 completed
- **Files created:** 2

## Accomplishments

- Transcribed plan.md §9.2's "Milestone" direction into `direction.md` without changing the palette, type, layout concept or signature element, per locked decision D-01.
- Derived the dark theme (background, surface, primary text, body text) and lightened the State-green status colour for dark backgrounds, computing every new contrast ratio with the WCAG relative-luminance formula and cross-checking the method against §9.2's own six published ratios first.
- Added one new status colour (caution/error) not present in §9.2, since forms need an error state (U16/U22) and none of the six named colours serves that role; documented both its light and derived dark values with computed contrast ratios.
- Recorded the confirmed `next/font/google` configuration for Anek Latin (`subsets: ['latin', 'latin-ext']`, `axes: ['wdth']`) per DES-13, and the 1.25-ratio, 8-step type scale verbatim from §9.2.
- Documented the one token-level breakpoint (64em) actually in use, distinguishing it from U23's four audit widths.
- Wrote ASCII wireframes, mobile and desktop, for all four pages: overview (adding "Show tours"/"Clear filters"/text pagination per DES-16), tour page (stacked, not tabbed, guide/review/credit sections and all four booking-panel states per DES-17), My tours (upcoming/past groups with start date, price paid, link and conditional "Write a review"), and account (details, photo, password, deactivation sections).
- Walked every bullet in §9.3 "Defaults to avoid" in a table, recording "not present" with a specific reason for each.
- Wrote `copy.md` with the glossary, the Indian English/formatting rules, button/message/empty-state wording rules, and a table giving exact user-facing wording for all 12 §4.2 error codes plus the field-validation rules plan.md already fixes (password length, duplicate email/tour name, required fields).
- Stated explicitly in `copy.md` that `src/lib/messages.ts` does not exist yet and is created by whichever later phase first throws a user-facing `AppError`.

## Task Commits

1. **Task 1: direction.md — brief, palette, type, wireframes, signature element, self-review** - `7706350` (feat)
2. **Task 2: copy.md — glossary, voice rules, every error code and validation message** - `58d45f2` (feat)

## Files Created/Modified

- `docs/design/direction.md` - Brief, palette + contrast (measured and derived), type and scale, breakpoints, four page wireframes (mobile + desktop), signature element, difficulty, §9.3 self-review
- `docs/design/copy.md` - Glossary, Indian English/formatting rules, wording rules, 12-error-code table, field-validation wording, credits wording shape

## Decisions Made

See `key-decisions` in frontmatter: no deviation ADR needed for direction.md's content (D-01 covers it); one new caution/error status colour added at the designer's discretion with a low-saturation, "hazard sign" rather than bright-warning treatment; dark-mode text/background hues reuse the existing six colours' hues rather than inventing new ones; copy.md's error wording is specific per conflict/cause rather than generic.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. Both documents are complete narrative/reference content with no placeholder sections; the signature element describes the inline-SVG implementation plan 02-01 already built in the mockups.

## Self-Check: PASSED

- FOUND: docs/design/direction.md
- FOUND: docs/design/copy.md
- FOUND commit 7706350 (Task 1, ancestor of HEAD)
- FOUND commit 58d45f2 (Task 2, HEAD)
