# Phase 2: Design direction and approval gate - Pattern Map

**Mapped:** 10 Nov 2026
**Files analyzed:** 8 (2 narrative docs, 1 ADR + its index, 2 mockup pages × shared CSS, 1 screenshot-capture test, 1 config)
**Analogs found:** 4 exact/role-match / 8 total — the rest have **no analog**, which is expected: this phase is almost entirely new documentation and static assets, and Phase 1 deliberately shipped no styling (01-CONTEXT.md D-09).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `docs/design/direction.md` | config (narrative design doc) | batch (write-once document) | `plan.md` §9.2–9.3 (content source, not code) + `docs/adr/0019-…md` (house prose style) | partial — no prior `docs/design/*` file exists |
| `docs/design/copy.md` | config (glossary/wording doc) | batch | `docs/contracts.md` §1 (house style for a rules/governance doc) | partial |
| `docs/adr/00NN-map-tile-provider-and-boundary-compliance.md` | config (ADR) | batch | `docs/adr/0019-deploy-on-aws-instead-of-render.md` and `docs/adr/0011-csp-style-attributes-for-next-image.md` | **exact** — same document type, same house format |
| `docs/adr/README.md` (edit) | config (index) | batch | itself (existing table + "Adding an ADR" steps) | **exact** |
| `docs/design/mockups/overview.html` + `.css` | component (static markup) | request-response (static file, no runtime) | `src/app/page.tsx` (only existing page, unstyled) | weak — no styled page exists anywhere to copy from |
| `docs/design/mockups/tour.html` + `.css` | component (static markup) | request-response | same as above | weak |
| `docs/design/screens/*.png` | test (generated artifact) | batch | none (generated output, not hand-written) | n/a |
| `test/design/*.spec.ts` (Playwright screenshot capture) + `playwright.config.ts` | test | event-driven (test runner) | `vitest.config.mts` (config shape) and `test/global-setup.ts`/`test/setup.ts` (test-infra conventions) | role-match only — no Playwright file exists yet; `docs/adr/0024` already names `playwright.config.ts` as a file a later phase adds |

## Pattern Assignments

### `docs/design/direction.md` (config, batch)

**No code analog** — this is the first file under `docs/design/`. Its *content* source is `plan.md` §9.2–9.3 (the "Milestone" brief, kept as-is per D-01), which must be copied faithfully, not reinterpreted. Its *document style* (prose ADR-like sections, concrete numbers, no filler) matches the house style visible in ADRs:

**House prose style** (`docs/adr/0019-deploy-on-aws-instead-of-render.md` lines 1-9):
```markdown
# 0019. Deploy on AWS instead of Render

Status: Accepted
Date: 9 Nov 2026
Requirements: D1, D12
Plan review: DEL-17; PROJECT.md Key Decision 3

## Context

`plan.md` D12 deploys the demo to Render...
```
`direction.md` is not an ADR (no Status/Date header), but should borrow the same plain, specific, numbers-cited prose — short paragraphs, named sources (`plan.md §9.2`), explicit "why" sentences.

**Content to transcribe verbatim from `plan.md` §9.2** (palette table, contrast ratios, type scale, the two ASCII wireframes shown, the signature-element paragraph) — see [plan.md](../../../plan.md#L688-L780). Do not invent new numbers; copy the hex values, ratios and scale exactly.

**Self-review requirement:** `plan.md` §9.3 "Defaults to avoid" (immediately following §9.2) is the checklist `direction.md` must run through and record findings against (CONTEXT.md D-01).

**Font recommendation to record verbatim** (from 02-RESEARCH.md "Code Examples"):
```tsx
import { Anek_Latin } from 'next/font/google';

const anekLatin = Anek_Latin({
  subsets: ['latin', 'latin-ext'], // latin-ext carries U+20B9 (₹)
  axes: ['wdth'],                   // semi-condensed via the width axis
});
```

**Date formatting — mirror `formatDate`'s actual output, never hand-type a date string** (`src/lib/format.ts` lines 44-61):
```ts
/**
 * B19: a calendar date in India Standard Time, such as "5 Dec 2026".
 * A YYYY-MM-DD string is an IST day; any other string is an ISO instant.
 */
export function formatDate(value: Date | string): string {
  // ...
  // ICU writes September as "Sept"; the product style is three letters (D-01).
  const month = parts.month === 'Sept' ? 'Sep' : parts.month;
  return `${parts.day} ${month} ${parts.year}`;
}
```
Any date written into a wireframe or mockup (e.g. "12 Jun 2027") must match this exact shape: day, three-letter month, four-digit year, no ordinal suffix.

**Price formatting — mirror `formatPrice`** (`src/lib/format.ts` lines 1-9, 30-33):
```ts
const priceFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
// ...
/** B20: whole rupees with Indian digit grouping, for example ₹1,24,999. */
export function formatPrice(rupees: number): string {
```
Mockup/wireframe prices must use Indian digit grouping (₹24,999, ₹1,24,999), not Western grouping.

---

### `docs/design/copy.md` (config, batch)

**No direct analog file** — no copy/glossary doc exists yet. Closest house-style reference is `docs/contracts.md`'s own governance style (a rules document with short named rules, each citing its source ID):

**Rules-document style** (`docs/contracts.md` lines 11-21):
```markdown
## 1. Conventions

- **Layering** follows `plan.md` section 3.2. Pages, Server Actions and Route Handlers go through services to the models. Business rules live in services only (B13).
- **`server-only`.** Every file under `src/server/` starts with `import 'server-only';` (R6, enforced by `npm run check:conventions`).
- **User-facing wording** comes only from `src/lib/messages.ts` (DES-12). Zod schemas and `AppError` take their text from it.
```
`copy.md` should follow this same "bolded rule name, then one or two sentences, source cited in parens" shape for its glossary and wording-rule entries.

**Content requirement (DES-12, non-negotiable):** `copy.md` must enumerate wording for every §4.2 error code and field-validation message, because `src/lib/messages.ts` does not exist yet (confirmed in `docs/contracts.md` line 19 and 02-RESEARCH.md "Copy Governance") — Zod 4.6.7's English defaults are what must never reach a user. Source the §4.2 error-code list directly from `plan.md`, not from memory.

**Voice rules to copy verbatim from `plan.md` §9.2** ("Voice and copy" paragraph, [plan.md L771-L776](../../../plan.md#L771-L776)): Indian English/British spelling, sentence case, buttons say exactly what happens, errors say what happened and how to fix it without apologising, empty states invite the next action.

---

### `docs/adr/00NN-map-tile-provider-and-boundary-compliance.md` (config, batch) — **exact analog**

**Analog:** `docs/adr/0019-deploy-on-aws-instead-of-render.md` (full house format) and `docs/adr/0011-csp-style-attributes-for-next-image.md` (same subject matter — the CSP seam this ADR must fill in).

**Next free number:** confirm at write time against `docs/adr/README.md`'s table (`0028` as of this research — re-check, since Phase 1/2 may have added entries since).

**Full header + section format** (`docs/adr/0019-…md` lines 1-7, and the format rule in `docs/adr/README.md`):
```markdown
# 0019. Deploy on AWS instead of Render

Status: Accepted
Date: 9 Nov 2026
Requirements: D1, D12
Plan review: DEL-17; PROJECT.md Key Decision 3

## Context

...

## Decision

...

## Consequences

...
```
For this ADR: `Requirements: D14`, `Plan review: DEL-17, DES-08` (per 02-RESEARCH.md "ADR Format" section).

**Context section pattern — name the colliding facts, cite requirement IDs and the plan-review finding** (`docs/adr/0011-…md` lines 7-11):
```markdown
`plan.md` S11 asks for a Content-Security-Policy with a per-request nonce and no `'unsafe-inline'`, and requires an ADR for any inline-style allowance. Two facts collide with that:

- `next/image` always writes inline `style` attributes...
```
Model the D14 ADR's Context on this: state the D14 requirement, then the DES-08 finding (the Ladakh/Pangong Tso coordinate problem) as the colliding fact, citing `seed/data/tours.json:316-322` and `docs/plan-review/findings-design.md` per 02-RESEARCH.md.

**Decision section pattern — a flat bullet list of concrete, numbered choices, each with its reasoning inline** (`docs/adr/0019-…md` lines 13-19 style, and `docs/adr/0011-…md` lines 13-18 style — bolded lead phrase, then the reasoning sentence).

**The CSP seam this ADR must close** — `docs/adr/0011-…md` line 20 reserves the exact slot:
```markdown
- **Map-tile and storage hosts are not added now.** Phase 4 adds them to `img-src` after the D14 ADR chooses the providers, so the policy stays in one place, `src/proxy.ts`.
```
The D14 ADR's Consequences section should reference this line directly: whichever option is chosen, state exactly which CSP directive(s) in `src/proxy.ts` Phase 4 will populate (none, for Option B; specific tile/style hosts, for Option A).

**Consequences section pattern — name what changes downstream and what a later phase must still do** (`docs/adr/0019-…md` lines 23-29): list the files/phases affected (Phase 4's map component, `src/proxy.ts`'s CSP) and any still-open item (e.g. Option A's unverified pricing, per 02-RESEARCH.md Open Question 1).

---

### `docs/adr/README.md` (edit) — **exact analog, self-referential**

**Analog:** the file's own existing table and "Adding an ADR" section.

**Table row pattern** (`docs/adr/README.md` line ~27):
```markdown
| 0027 | [Model operations that skip validators are refused](0027-model-operations-that-skip-validators-are-refused.md) | Accepted |
```
Add the new row in numeric order, same column shape: number, `[Title](NNNN-kebab-title.md)`, status.

**The steps to follow are already written in the same file** (`docs/adr/README.md` "Adding an ADR" section):
```markdown
1. Take the next free number and write the file in the format above. Name the requirement IDs and the plan-review findings it covers.
2. Add a row to the table above, in numeric order.
3. If it changes a contract, update `docs/contracts.md` in the same change.
4. Cite it in the commit message body when it explains the change.
```
Step 3 applies here: the D14 ADR changes the CSP contract's map-host slot (reserved in ADR 0011), so `docs/contracts.md` should get a one-line update if it documents the CSP shape — check whether `docs/contracts.md` currently has a CSP section before planning this edit.

---

### `docs/design/mockups/overview.html` / `tour.html` + shared CSS — **no real analog, documented explicitly**

**No analog exists.** The only page in the app, `src/app/page.tsx`, is deliberately unstyled (01-CONTEXT.md D-09):
```tsx
export default function HomePage() {
  return (
    <main>
      <h1>Natours</h1>
      <p>
        Small-group tours across India, from the high passes of Ladakh to the
        backwaters of Kerala.
      </p>
    </main>
  );
}
```
This confirms there is no CSS, no design tokens, and no component library anywhere in the repo yet (Phase 3 builds `src/components/ui/` — see `docs/contracts.md`'s "Where the code differs from plan.md" table, last row). The mockups are plain static HTML/CSS, not Next.js pages or CSS Modules, so none of that machinery applies even once Phase 3 exists.

**What the mockups must still source faithfully from the codebase (not from imagination):**

1. **Real seed content only** — pull tour names, regions, difficulty, length, prices and dates straight from `seed/data/tours.json`, formatted through the `formatDate`/`formatPrice` shapes above. 4-6 real tours are enough (agent's discretion per CONTEXT.md).
2. **Photo credits** — every photo used needs its credit, following the existing credit format in `seed/CREDITS.md`:
   ```markdown
   | `ladakh-high-passes-cover.jpg` | [Pangong Tso VM.JPG](https://commons.wikimedia.org/wiki/File:Pangong_Tso_VM.JPG) | Vishal Akki | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
   ```
3. **The signature element (route map) is inline SVG, not a live Leaflet map or a grey placeholder** — per 02-RESEARCH.md's DES-09 fix: build the route line and day markers as static SVG from the real coordinates in `seed/data/tours.json` (e.g. the Ladakh Day 5 Pangong Tso coordinate `[78.4573, 33.90719]`), animated with CSS only if at all — no JS dependency, no network tile fetch, screenshot-stable.
4. **Wireframe layout reference** — `plan.md` §9.2's two ASCII wireframes (overview and tour page, reproduced above) are the layout skeleton the HTML mockups should match, plus DES-16's additions (Show tours / Clear filters / pagination controls on the overview; stacked guides/reviews/credits; logged-in/booked/no-dates panel states) and DES-15 (pagination uses "Previous"/"Next"/"Page N of M" text — never the milestone marker).

---

### `playwright.config.ts` + `test/design/*.spec.ts` (screenshot capture) — role-match only, no exact analog

**No Playwright file exists in the repo yet.** `docs/adr/0024-folder-and-test-layout.md`'s Consequences section already names this as expected future work:
```markdown
- ARC-24's other missing files are added by the phases that build them: `playwright.config.ts`, the OpenAPI file and its lint step, `.dockerignore`, the media route, the worker's `src/worker/empty.ts` and the credits page.
```
This confirms Phase 2 is the first phase expected to add `playwright.config.ts` — there is nothing to copy from in-repo; follow Playwright's own `.dockerignore`/CI-matching guidance in 02-RESEARCH.md's "Static Mockup + Screenshot Tooling" section (per-platform snapshot naming, `reducedMotion: 'reduce'`, generate baselines in Docker/CI, not ad hoc locally — DES-10).

**Closest structural analog for a new test-infra config** is `vitest.config.mts` (config file shape, coexists with other root-level tool configs like `eslint.config.mjs`, `stylelint.config.mjs`, `lighthouserc.cjs`) — same "one config file per tool at repo root" convention, not a content pattern.

**Install-on-first-use convention** (`docs/adr/0004-install-dependencies-when-first-used.md` — title only, already followed elsewhere): `@playwright/test` is not a current dependency in `package.json`; add it only when this phase's screenshot script is actually written, per the project's established pattern, with a one-line reason in the commit body (`docs/contracts.md` commit-message rule, "a commit that adds a dependency gives a one-line reason").

## Shared Patterns

### ADR header + section format
**Source:** `docs/adr/README.md` "Format" section, instantiated by every file in `docs/adr/`
**Apply to:** the D14 ADR
```markdown
Status:
Date: (India Standard Time, e.g. "9 Nov 2026")
Requirements:
Plan review:

## Context
## Decision
## Consequences
```

### Formatting helpers are the only source of dates/prices anywhere content-facing
**Source:** `src/lib/format.ts`
**Apply to:** `direction.md`, `copy.md`, both mockup HTML files — every date and price string written by hand must match `formatDate`/`formatPrice`'s exact output shape (three-letter month, year always shown, Indian digit grouping), never an invented format.

### Real, credited content only
**Source:** `seed/README.md`, `seed/CREDITS.md`, `seed/data/tours.json`
**Apply to:** both mockup files — no placeholder names, text or images; every photo used carries its Commons credit in the same author/licence shape already used in `CREDITS.md`.

### Commit convention
**Source:** `docs/contracts.md` §1, last bullet
**Apply to:** every file in this phase
```
type(scope): summary [IDs] (NN-NN)
```
e.g. `docs(design): record the Milestone direction and self-review [D14, U20] (02-01)`. A commit that adds a dependency (e.g. `@playwright/test`) gives a one-line reason in its body.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `docs/design/direction.md` | config | batch | First file under `docs/design/`; no prior narrative design doc in the repo — content sourced from `plan.md` §9.2–9.3 instead, house prose style borrowed from ADRs |
| `docs/design/copy.md` | config | batch | First glossary/wording doc; closest is `docs/contracts.md`'s rules-list style, not a true analog |
| `docs/design/mockups/overview.html`, `tour.html`, shared CSS | component | request-response | No styled page exists anywhere in the repo (Phase 1 shipped `/` deliberately unstyled, ADR/01-CONTEXT D-09); Phase 3's `src/components/ui/` doesn't exist yet either |
| `docs/design/screens/*.png` | test (artifact) | batch | Generated output from the Playwright run, not a hand-written file |
| `playwright.config.ts`, `test/design/*.spec.ts` | test | event-driven | First Playwright file in the repo; `docs/adr/0024` only anticipates it, doesn't contain it |
| `src/data/india-boundary.geojson` (if Option B is chosen) | config (static data) | batch | Out of this phase's scope per 02-CONTEXT.md ("Not in this phase: Building the actual map component (Phase 4)") — the D14 ADR records the decision; vendoring the file is Phase 4's job |

## Metadata

**Analog search scope:** `docs/adr/`, `docs/`, `src/app/`, `src/lib/`, `test/`, `seed/`, root config files, `plan.md`
**Files scanned:** `docs/adr/0011,0019,0024,README.md`, `docs/contracts.md`, `src/lib/format.ts`, `src/app/page.tsx`, `seed/README.md`, `seed/CREDITS.md`, `package.json`, `plan.md` §9.2–9.3
**Pattern extraction date:** 10 Nov 2026
