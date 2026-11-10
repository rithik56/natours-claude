# Phase 2: Design direction and approval gate - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 produces the design direction and gets the user's approval before any component or page styling starts. It delivers:
- `docs/design/direction.md`: the brief in the designer's own words, palette with measured contrast, dark-theme and status colours derived from it, type choices and scale, ASCII wireframes (overview, tour page, My tours, account — mobile and desktop), the signature element, and a self-review against the "defaults to avoid" list (plan.md §9.3).
- `docs/design/copy.md`: the glossary, button/message wording, Indian English and formatting rules — including every §4.2 error code and field-validation message (DES-12), so no Zod default message ever reaches a user.
- Static HTML/CSS mockups of the overview and a tour page, mobile and desktop, built from real seed content only (real tour names, credited photos, ₹ prices with Indian grouping, IST dates) — plus Playwright screenshots in `docs/design/screens/`.
- An ADR for the map-tile decision (D14): which provider (or no third-party provider) draws the Ladakh route without misrepresenting India's borders, its CSP hosts, and the chosen approach's cost/key implications.
- **Human checkpoint:** the user reviews `direction.md`, the mockups and the screenshots, and approves or asks for changes (recorded as an ADR, then shown again). No token, component or page styling exists until approved.

Requirements: D14, U20 (process-only deliverables — the direction, mockups and gate itself carry no requirement ID; ROADMAP.md L191).

Not in this phase:
- Any component styling, tokens or themed pages (Phase 3).
- Building the actual map component (Phase 4) — Phase 2 only decides and ADRs the tile provider.
- The full copy for every page (Phase 3+ pages pull wording from `copy.md` as they're built).

</domain>

<decisions>
## Implementation Decisions

### Direction adoption
- **D-01:** Keep plan.md §9.2's "Milestone" starting direction as specified — no changes to the palette (Neel/Slate/Whitewash/Paper/Highway yellow/State green), type (Anek Latin semi-condensed + Anek Devanagari), layout concept (list-style overview, tour page with sticky booking panel) or signature element (the route drawn as milestone markers). `direction.md` documents this direction as the brief gave it; the self-review against §9.3 "defaults to avoid" still happens and is recorded, but no deviation ADR is expected for direction choices already in plan.md. — **Reversibility:** reversible — a later ADR can still change any token value; nothing is built on it yet.

### Map-tile provider (D14) — not yet decided
- **D-02:** The user did not pick this up in discussion this round. It remains an **open decision requiring the user's input before the Phase 2 ADR can be written** — this is explicitly called out in plan.md §9.7 step 4 and review finding DES-08 as a decision that "isn't the lead's to make" (legal/compliance boundary-depiction call, not a technical one). DES-08 found the "zoom in on OSM" idea doesn't actually clear the Ladakh/Pangong Tso border and recommends **Option B: no third-party tile provider — Leaflet draws the route and day markers over a simple outline from an official-boundary dataset**, because it adds no CSP host, needs no network in CI/Lighthouse, no key (sidesteps the S18 `NEXT_PUBLIC_...KEY` name clash), themes through tokens, and fits the "quiet" direction. Options A (a confirmed India-compliant commercial provider) and C (locked-zoom OSM) are also on the table per DES-08 but C is flagged rejected-for-Ladakh. Research/planning for this phase MUST re-surface this decision to the user before the ADR is written — do not default to Option B without asking. — **Reversibility:** one-way — ships as a CSP host + rendering approach; changing providers later touches the map component, CSP config and the ADR.

### Design-gate review process
- **D-03:** Not discussed this round (deselected by user). Default to the process plan.md §9.7 already specifies: the user reads `direction.md` and the screenshots/mockup files directly (no scripted walkthrough assumed), then responds "approve", "approve with changes" (only changed screens re-shown — DES-09 fix (a)), or "rework". Record whichever changes the user asks for as an ADR per the phase's success criterion 5.

### Copy & voice specifics
- **D-04:** Not discussed this round (deselected by user). `copy.md` follows plan.md §9.2's voice rules (Indian English, British spelling, sentence case, buttons say exactly what happens, errors say what happened and how to fix it, empty states invite the next action) with no additional constraints from the user. Per DES-12, it MUST also cover every §4.2 error code and field-validation message so schemas/services source wording from `src/lib/messages.ts` instead of Zod defaults.

### the agent's Discretion
- Deriving the dark theme and status colours from the light palette (plan.md §9.2 says "the designer derives" these).
- Confirming Anek Latin + Anek Devanagari availability/subsets through `next/font/google` (note DES-13: use `subsets: ['latin', 'latin-ext']` for ₹, don't preload Devanagari yet) and recording the result in `direction.md`.
- Exact wireframe layout details beyond what plan.md §9.2 already sketches, informed by DES-16's fixes (add "Show tours"/"Clear filters"/pagination to the overview; stack guides/reviews/credits rather than implying client-state tabs; show logged-in/booked/no-dates panel states per DES-17) and DES-15 (pagination uses "Previous"/"Next"/"Page N of M" text, not the milestone marker — only overview rows and the tour-page itinerary use numbered/day markers).
- Which 4-6 real seed tours/photos to feature in the mockups (any are fine — all are real, credited content).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Specification
- `plan.md` §9 (whole section): the design brief, the "Milestone" starting direction (§9.2 — palette, type, layout, signature element), defaults to avoid (§9.3), design system requirements (§9.4), and the design process and gate (§9.7, steps 1–4).
- `plan.md` L833–L843: the design-gate process itself (direction → self-review → human approval, no styling before approval).
- `.planning/ROADMAP.md` ("Phase 2: Design direction and approval gate" section): the five success criteria and the review findings assigned to this phase.
- `.planning/REQUIREMENTS.md`: D14 and U20 wording.
- `.planning/PROJECT.md` → Constraints → "Design gate": the user approves the design direction before any component or page styling starts.

### Plan review findings for this phase
- `docs/plan-review/findings-design.md`: DES-08 (D14 mis-scoping and the recommended no-third-party-tile option), DES-09 (what the gate must show the human, and the approve/approve-with-changes/rework loop), DES-12 (copy.md must cover every error/validation message), DES-13 (font subsets), DES-14 (date formatting in wireframes — see Phase 1 D-01/D-02, already resolved), DES-15 (numbered markers only for day sequence and overview length, never pagination), DES-16 (wireframe omissions: submit/clear/pagination controls, stacked guide/review/credit sections), DES-17 (no-future-departures state).
- `docs/plan-review/findings-delivery.md`: DEL-17 (prerequisites this phase surfaces: GitHub repo + Actions enabled, a map-tile account/key if D14 picks a keyed provider; and the missing "ask for changes" rework loop, fixed per DES-09).

### Content and conventions
- `seed/README.md`, `seed/data/tours.json`, `seed/CREDITS.md`: real tour content, coordinates and photo credits for the mockups — no placeholder content anywhere (plan.md §9.1, CLAUDE.md).
- `CLAUDE.md` / `AGENTS.md` (root): the content rule and Indian conventions (₹ with Indian grouping, IST dates, kilometres, Indian English).

### Carried forward from Phase 1
- `.planning/phases/01-foundation-and-contracts/01-CONTEXT.md` D-01/D-02: `formatDate` always writes three-letter months ("4 Sep 2027") and always shows the year — there is no year-less short style yet. Mockups and `direction.md` must use `formatDate`'s actual output, never hand-typed date strings (resolves DES-14 for this phase).
- 01-CONTEXT.md "User-facing messages": `src/lib/messages.ts` is the one place Zod/`AppError` wording lives; Phase 2's `copy.md` rewords that file (DES-12).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — Phase 1 deliberately left `/` unstyled (01-CONTEXT.md D-09); there are no components, tokens or styles to reuse. This phase produces static mockup HTML/CSS files, not production components (those are Phase 3, built only after the gate).

### Established Patterns
- `formatDate` / `formatPrice` (Phase 1, `src/lib/format.ts`) are the only approved sources of date/price strings — mockups should mirror their exact output rather than inventing formatting.

### Integration Points
- None — this phase's outputs (`docs/design/direction.md`, `docs/design/copy.md`, mockup HTML/CSS, screenshots, the D14 ADR) are documentation and static files, not application code.

</code_context>

<specifics>
## Specific Ideas

No specific ideas beyond "keep plan.md §9.2 as specified" were raised.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 2-Design direction and approval gate*
*Context gathered: 2026-11-10*
