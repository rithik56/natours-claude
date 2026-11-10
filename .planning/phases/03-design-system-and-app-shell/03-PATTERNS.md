# Phase 3: Design system and app shell - Pattern Map

**Mapped:** 2026-11-10
**Files analyzed:** 36 (4 global styles, 5 app-shell routes, 1 config, ~26 `ui/` components + their CSS Modules counted as pairs, 1 stylelint config edit, test files)
**Analogs found:** 9 / 36 — this is the first phase writing real `src/` component/CSS code (Phase 1 shipped only an unstyled `/`; Phase 2 built static standalone mockup HTML, not Next.js components). Most `ui/` files have **no code analog**; the mockups are a visual/structural reference only, not a pattern to copy verbatim (CONTEXT.md is explicit: "Phase 3 builds proper CSS Modules under `@layer components`, not a copy of the mockup CSS").

## ⚠️ Critical cross-cutting convention: kebab-case file names (Q3)

`scripts/check-conventions.ts`'s `checkFileName` (lines 33–46) enforces kebab-case on **every** file under `src/`, `scripts/`, `test/` — folders and file stems alike, including `.tsx`/`.module.css`/`.test.tsx` compound extensions. A component file named `Button.tsx` or `StarRatingInput.tsx` **fails CI** (`npm run check:conventions`). Every `ui/` component in this phase must use a kebab-case file name:

| Component (PascalCase export) | Required file names |
|---|---|
| `Button` | `button.tsx`, `button.module.css` |
| `StarRatingInput` | `star-rating-input.tsx`, `star-rating-input.module.css` |
| `ConfirmDialog` | `confirm-dialog.tsx`, `confirm-dialog.module.css` |
| `BookingPanel` | `booking-panel.tsx`, `booking-panel.module.css` |

This is not visible anywhere in `docs/design/mockups/` (plain HTML/CSS has no file-name convention to inherit) — it comes entirely from `scripts/check-conventions.ts:9` (`KEBAB_WORD`/`isKebab`) and must be surfaced to the planner explicitly, since every other Next.js/React project convention defaults to PascalCase component file names.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/styles/reset.css` | config (global CSS) | transform (static asset) | none | no analog |
| `src/styles/tokens.css` | config (design tokens) | transform (static asset) | `docs/design/mockups/mockup.css` (values only, not structure) + `src/server/config-schema.ts` (single-source-of-truth philosophy) | partial (reference, not code) |
| `src/styles/base.css` | config (global CSS) | transform (static asset) | none | no analog |
| `src/styles/fonts.ts` | config/utility | transform | `docs/design/direction.md`'s `fonts.ts` code block (exact snippet already recorded) | exact (design doc, not code) |
| `src/app/layout.tsx` | provider (root layout) | request-response | itself (file already exists from Phase 1) | exact — modify in place |
| `src/app/not-found.tsx` | route (Server Component) | request-response | none in repo; Next.js file-convention is the analog | no analog |
| `src/app/error.tsx` | route (Client Component, boundary) | request-response | none in repo (first Client Component in the project) | no analog |
| `src/app/global-error.tsx` | route (Client Component, boundary) | request-response | none in repo | no analog |
| `src/app/styleguide/page.tsx` | route (Server Component, dev-gated) | request-response | `src/server/config-schema.ts` + `src/server/deps.ts` (`APP_ENV` read pattern) | role-match (gating logic only) |
| `src/components/ui/header.tsx` + `.module.css` | component (Server Component, composes Client mobile-menu) | request-response | `docs/design/mockups/overview.html` `<header class="site-header">` (structure reference only) | partial (HTML reference, no code) |
| `src/components/ui/mobile-menu.tsx` | component (Client Component) | event-driven | none | no analog |
| `src/components/ui/footer.tsx` + `.module.css` | component (Server Component) | request-response | `docs/design/mockups/tour.html` `<footer class="site-footer">` (structure reference only) | partial |
| `src/components/ui/skip-link.tsx` + `.module.css` | component (Server Component) | request-response | none | no analog |
| `src/components/ui/button.tsx` + `.module.css` | component (Server Component) | request-response | `docs/design/mockups/mockup.css` `.button`/`.button--primary` (values reference only) | partial |
| `src/components/ui/link.tsx` + `.module.css` | component (Server Component) | request-response | none | no analog |
| `src/components/ui/text-field.tsx` + `.module.css` | component (Server Component) | request-response | none (mockup uses bare `<label>`/`<select>`, no text input shown) | no analog |
| `src/components/ui/select.tsx` + `.module.css` | component (Server Component) | request-response | `docs/design/mockups/mockup.css` `.filters__field select` (values reference only) | partial |
| `src/components/ui/checkbox.tsx` + `.module.css` | component (Server Component) | request-response | none | no analog |
| `src/components/ui/file-input.tsx` + `.module.css` | component (Client Component — preview needs browser `FileReader`/object URL) | event-driven | none | no analog |
| `src/components/ui/star-rating.tsx` (display) + `.module.css` | component (Server Component) | request-response | `docs/design/mockups/tour.html` `.review__rating`/`.sr-only` pair (structure reference only) | partial |
| `src/components/ui/star-rating-input.tsx` (keyboard input) + `.module.css` | component (Client Component) | event-driven | APG Rating Radio Group pattern (RESEARCH.md Pattern 4 — external, not in-repo) | no in-repo analog |
| `src/components/ui/alert.tsx` + `.module.css` | component (Server Component) | request-response | none | no analog |
| `src/components/ui/toast.tsx` + `.module.css` | component (Client Component — timed dismissal) | event-driven | none | no analog |
| `src/components/ui/difficulty-symbol.tsx` + `.module.css` | component (Server Component) | request-response | `docs/design/mockups/mockup.css` `.difficulty`/`.difficulty__peaks` + `tour.html`'s `▲▲▲ Difficult` markup | partial (reference only) |
| `src/components/ui/price.tsx` + `.module.css` | component (Server Component) | transform | `src/lib/format.ts` (`formatPrice` — **must call, never format inline**) | role-match (data source, not JSX structure) |
| `src/components/ui/start-date-select.tsx` + `.module.css` | component (Server Component) | request-response | `tour.html`'s `.booking-panel__field` select (structure reference) + `src/lib/format.ts` (`formatDate` for option labels) | partial |
| `src/components/ui/tour-row.tsx` + `.module.css` | component (Server Component) | request-response | `docs/design/mockups/mockup.css` `.tour-row*` rules + `overview.html`'s `<li class="tour-row">` markup (structure/BEM-naming reference) | partial (reference only) |
| `src/components/ui/facts-strip.tsx` + `.module.css` | component (Server Component) | request-response | `mockup.css` `.facts-strip*` + `tour.html`'s `<ul class="facts-strip">` | partial |
| `src/components/ui/itinerary.tsx` + `.module.css` | component (Server Component) | request-response | `mockup.css` `.itinerary*` + `tour.html`'s `<ol class="itinerary">` | partial |
| `src/components/ui/map-frame.tsx` + `.module.css` | component (Server Component, static placeholder per ADR 0028) | request-response | `mockup.css` `.route-map*` SVG rules + `tour.html`'s inline SVG (structure reference, not the real Leaflet integration — that's Phase 4's `RouteMap`) | partial |
| `src/components/ui/booking-panel.tsx` + `.module.css` | component (Server Component, pure/prop-driven per DEL-12 discretion) | request-response | `mockup.css` `.booking-panel*` + `tour.html`'s `<aside class="booking-panel">` (four-state logic is new; no analog for the state switch itself) | partial |
| `src/components/ui/review-item.tsx` + `.module.css` | component (Server Component) | request-response | `mockup.css` `.review*` + `tour.html`'s `<li class="review">` | partial |
| `src/components/ui/review-form.tsx` + `.module.css` | component (Server Component shell around `star-rating-input`) | request-response | none (no form shown in mockups) | no analog |
| `src/components/ui/guide-item.tsx` + `.module.css` | component (Server Component) | request-response | `mockup.css` `.guide*` + `tour.html`'s `<li class="guide">` | partial |
| `src/components/ui/avatar.tsx` + `.module.css` | component (Server Component, photo-or-initials fallback) | request-response | none | no analog |
| `src/components/ui/photo-credits.tsx` + `.module.css` | component (Server Component) | request-response | `mockup.css` `.photo-credit`/`.credits-list` + `tour.html`'s `<figcaption class="photo-credit">` and `docs/design/copy.md`'s exact "Photo by {author}, {licence}" wording shape | partial (structure + exact copy wording) |
| `src/components/ui/pagination.tsx` + `.module.css` | component (Server Component) | request-response | `mockup.css` `.pagination*` + `tour.html`'s `<nav class="pagination">` (text-only Previous/Next/Page N of M, never numbered — DES-15) | partial |
| `src/components/ui/empty-state.tsx` + `.module.css` | component (Server Component) | request-response | `mockup.css` `.empty-state*` + `copy.md`'s "state the fact, then name the one action" wording rule | partial |
| `src/components/ui/confirm-dialog.tsx` + `.module.css` | component (Client Component, native `<dialog>`) | event-driven | RESEARCH.md Pattern 3 (external MDN example, not in-repo) | no in-repo analog |
| `src/components/ui/*-skeleton.tsx` (one per streamed section) | component (Server Component) | request-response | none | no analog |
| `stylelint.config.mjs` | config | transform | itself (existing file, extend not replace) | exact — modify in place |

## Pattern Assignments

### `src/app/layout.tsx` (provider, request-response) — MODIFY

**Analog:** itself — `src/app/layout.tsx` (current Phase-1 state)

**Current full content** (to extend, not replace):
```tsx
import type { Metadata } from 'next';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'Natours',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render every page per request so the CSP nonce can reach its scripts.
  await connection();
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
```
`[VERIFIED: src/app/layout.tsx]`

**What Phase 3 adds here, in this order (U3's "imported once" requirement):**
1. Import `reset.css`, `tokens.css`, `base.css` (global, unlayered imports — the layer declarations live *inside* those files per RESEARCH.md Pattern 1).
2. Import `fonts.ts`'s font objects and spread their `.variable` classes onto `<html>` or `<body>`.
3. Render `SkipLink`, `Header`, `{children}`, `Footer` around the existing `<body>{children}</body>` — keep the `await connection()` call and the `<html lang="en-IN">` attribute exactly as-is (CSP-nonce reasoning in the existing comment still applies).

### `src/app/styleguide/page.tsx` (route, request-response)

**Analog:** `src/server/config-schema.ts` + `src/server/deps.ts` (the `APP_ENV` read pattern, not the gating call itself — that's new)

**Config shape to read** (`src/server/config-schema.ts` lines 36–39):
```ts
APP_ENV: z.enum(
  ['development', 'test', 'ci', 'staging', 'production'],
  required('must be development, test, ci, staging or production'),
),
```
`[VERIFIED: src/server/config-schema.ts]`

**Existing "choose by `APP_ENV`, never `NODE_ENV`" precedent** (`src/server/deps.ts` lines 15, 66–75):
```ts
/** Chosen by APP_ENV, never NODE_ENV (QA-21). See ADR 0016. */
let deps: Deps | undefined;
// ...
export function getDeps(): Deps {
  if (!deps) {
    const config = getConfig();
    deps = config.isProductionLike
      ? productionLikeDeps()
      : fakeDeps(config.APP_ENV);
  }
  return deps;
}
```
`[VERIFIED: src/server/deps.ts]`

**Pattern to follow (new code, shape given by RESEARCH.md Pattern 5):**
```ts
import { notFound } from 'next/navigation';
import { getConfig } from '@/server/config'; // same accessor deps.ts uses

export default function StyleguidePage() {
  if (getConfig().APP_ENV === 'production') notFound();
  // ...
}
```
Note: `getConfig` lives in `src/server/config.ts` (not `config-schema.ts`, which only defines/parses the schema) — confirm the exact export path when implementing; `deps.ts` imports it as `import { getConfig } from '@/server/config'`.

### `src/components/ui/price.tsx` (component, transform)

**Analog:** `src/lib/format.ts` — the only approved source of price strings

```ts
const priceFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** B20: whole rupees with Indian digit grouping, for example ₹1,24,999. */
export function formatPrice(rupees: number): string {
  assertWholeRupees(rupees);
  return priceFormat.format(rupees);
}
```
`[VERIFIED: src/lib/format.ts]`

`ui/price.tsx` and `ui/tour-row.tsx`/`ui/booking-panel.tsx`/`ui/start-date-select.tsx` must call `formatPrice`/`formatDate` from `@/lib/format` — **never** format a rupee amount or date inline (CONTEXT.md "Reusable Assets"; copy.md "Always produced by `formatPrice()`... never hand-typed").

### `src/components/ui/header.tsx` / `mobile-menu.tsx` (component, request-response / event-driven)

**Analog:** `docs/design/mockups/overview.html` (structure reference, not a code pattern — plain mockup HTML)

```html
<header class="site-header">
  <div class="site-header__inner">
    <a class="site-header__brand" href="#">Natours</a>
    <nav class="site-header__nav" aria-label="Main">
      <a href="#">Tours</a>
      <a href="#">My tours</a>
      <a href="#">Account</a>
    </nav>
  </div>
</header>
```
`[VERIFIED: docs/design/mockups/overview.html]`

This mockup has **no mobile menu** (it's a static desktop-oriented HTML file) — `aria-expanded` disclosure behaviour (U19) and the Highway-yellow-on-Neel focus-ring exception (DES-20, CONTEXT.md discretion) are new for this phase, with no in-repo precedent. `MobileMenu` is the first Client Component in the project (see "No Analog Found" below).

### `src/components/ui/tour-row.tsx`, `facts-strip.tsx`, `itinerary.tsx`, `booking-panel.tsx`, `review-item.tsx`, `guide-item.tsx`, `photo-credits.tsx`, `pagination.tsx` (components, request-response)

**Analog:** `docs/design/mockups/mockup.css` (BEM-style class names and visual values) + the matching markup in `docs/design/mockups/overview.html`/`tour.html` — **reference for structure and naming conventions only**. CONTEXT.md is explicit these are not to be copied as CSS: Phase 3 writes real CSS Modules under `@layer components` (U3), using `tokens.css` custom properties instead of the mockup's raw hex (`--neel`, `--highway-yellow`, etc. become `var(--color-...)`).

Representative excerpt (`tour-row`, `mockup.css`):
```css
.tour-row {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 0.75rem 1rem;
  align-items: center;
  background: var(--paper);
  border-radius: 4px;
  padding: 1rem;
}

@media (min-width: 64em) {
  .tour-row {
    grid-template-columns: auto auto 1fr auto;
    grid-template-rows: auto auto;
  }
  /* ... */
}
```
`[VERIFIED: docs/design/mockups/mockup.css]` — the `64em` breakpoint is the single documented one (`docs/design/direction.md` "Breakpoints"); it is not a custom property (can't be used in media queries per U1), so it is hard-coded in each component's `.module.css` exactly as shown here.

Pagination wording must stay text-only, never a numbered marker (DES-15):
```html
<nav class="pagination" aria-label="Review pagination">
  <a class="pagination__prev" aria-disabled="true" href="#">Previous</a>
  <span class="pagination__status">Page 1 of 2</span>
  <a class="pagination__next" href="#">Next</a>
</nav>
```
`[VERIFIED: docs/design/mockups/tour.html]`

### `src/components/ui/photo-credits.tsx` (component, request-response)

**Analog:** `docs/design/copy.md` "Credits (attribution wording)" + `tour.html`'s `<figcaption class="photo-credit">`

```html
<figcaption class="photo-credit">
  Photo: <a href="https://commons.wikimedia.org/wiki/File:Pangong_Tso_VM.JPG">Vishal Akki</a>,
  <a href="https://creativecommons.org/licenses/by-sa/3.0">CC BY-SA 3.0</a>
</figcaption>
```
Exact wording shape from `copy.md`: **"Photo by {author}, {licence}"** with both author and licence as separate outbound links — must match verbatim, not the mockup's literal "Photo:" prefix (copy.md's wording table is the canonical source, the mockup predates it).

### `stylelint.config.mjs` (config) — MODIFY

**Analog:** itself (existing file, already annotated for this phase)

```js
// Phase 3 adds the U1 and U3 rules on top of the standard config.
const stylelintConfig = {
  extends: ['stylelint-config-standard'],
};

export default stylelintConfig;
```
`[VERIFIED: stylelint.config.mjs]` — the comment already anticipates this phase. Add `rules` + `overrides` for the five built-ins RESEARCH.md names (`color-no-hex`, `unit-disallowed-list`, `selector-max-id`, `declaration-no-important`, `rule-nesting-at-rule-required-list`), with an `overrides` glob exempting `src/styles/tokens.css` from the hex/px bans (RESEARCH.md Open Question 1). Compare against `eslint.config.mjs`'s existing `overrides`/`files`-glob shape for the *pattern* of scoping rules by path (not stylelint syntax directly, but the same "most rules apply everywhere, specific files get named exceptions" shape):

```js
{
  files: ['src/server/config-schema.ts', 'src/server/validation.ts'],
  rules: {
    'no-restricted-imports': restrictImports([nextCachePath]),
  },
},
```
`[VERIFIED: eslint.config.mjs]`

## Shared Patterns

### `APP_ENV`, not `NODE_ENV` (S2, U5)
**Source:** `src/server/config-schema.ts:36-39`, `src/server/deps.ts:15`
**Apply to:** `src/app/styleguide/page.tsx` only, in this phase
```ts
APP_ENV: z.enum(['development', 'test', 'ci', 'staging', 'production'], ...)
```
Already resolved project-wide (ADR 0010/0016) — Phase 3 reuses the accessor, doesn't invent a new check.

### `formatPrice`/`formatDate` are the only sources of price/date strings (B19, B20)
**Source:** `src/lib/format.ts`
**Apply to:** `ui/price.tsx`, `ui/tour-row.tsx`, `ui/start-date-select.tsx`, `ui/booking-panel.tsx`, anywhere a date or rupee amount is rendered.
```ts
export function formatPrice(rupees: number): string { /* ... */ }
export function formatDate(value: Date | string): string { /* ... */ }
```

### Kebab-case file names (Q3) — see callout above
**Source:** `scripts/check-conventions.ts:9-46` (`isKebab`, `checkFileName`)
**Apply to:** every new file under `src/components/ui/**`, `src/styles/**`, `src/app/**`.

### Client Component comment convention (R2) — no in-repo example yet, but enforced by CI
**Source:** `scripts/check-client-boundaries.ts:9-10`
```ts
const DIRECTIVE = /^\s*(['"])use client\1\s*;?\s*$/;
const CLIENT_COMMENT = /^\/\/ client: +\S/;
```
**Apply to:** `error.tsx`, `global-error.tsx` (Next.js requires these to be Client Components — RESEARCH.md Pitfall 2), `mobile-menu.tsx`, `star-rating-input.tsx`, `confirm-dialog.tsx`, `file-input.tsx`, `toast.tsx`. The very first line after `'use client'` must be `// client: <reason>` with a non-empty reason — `scripts/check-client-boundaries.ts`'s `reasonLine` check fails the build otherwise. Example shape (from RESEARCH.md, matching the checker's required format):
```tsx
'use client' // client: Next.js requires error boundaries to be Client Components

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? error.digest : undefined;
  return (
    <div>
      <h1>Something went wrong on our side. Try again in a moment.</h1>
      {digest && <p>Reference: {digest}</p>}
      <button onClick={() => retry()}>Try again</button>
    </div>
  );
}
```

### `@layer components` wrapping (U3)
**Source:** RESEARCH.md Pattern 2 (MDN-verified, no in-repo CSS exists yet to cite instead)
**Apply to:** every `ui/*.module.css` file.
```css
@layer components {
  .button {
    background: var(--color-accent);
    color: var(--color-text-on-accent);
  }
}
```

### Error/empty-state copy must match `docs/design/copy.md` verbatim (U20)
**Source:** `docs/design/copy.md` "Error code wording" and "Empty states invite the next action"
**Apply to:** `ui/alert.tsx`, `ui/toast.tsx`, `ui/empty-state.tsx`, `error.tsx`, `global-error.tsx`.
Example fixed string already locked for `error.tsx` (`INTERNAL` code): *"Something went wrong on our side. Try again in a moment."*

## No Analog Found

Files with no close in-repo match (planner should rely on RESEARCH.md's external patterns — MDN `<dialog>`, W3C APG rating radio group — and the mockup structure/copy references cited above, not invent new conventions):

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/styles/reset.css`, `base.css` | config | transform | No global CSS file exists in the project yet; first `@layer` declaration site (RESEARCH.md Pattern 1). |
| `src/app/not-found.tsx` | route | request-response | No not-found convention file exists yet; Next.js's own file-convention is the only "analog." |
| `src/app/error.tsx`, `global-error.tsx` | route (Client) | request-response | First Client Components in the project — no `'use client'` file exists anywhere in `src/` yet (confirmed by search). |
| `src/components/ui/mobile-menu.tsx`, `star-rating-input.tsx`, `confirm-dialog.tsx`, `file-input.tsx`, `toast.tsx` | component (Client) | event-driven | Same reason — no interactive/Client component precedent exists in `src/components` (the directory doesn't exist yet). |
| `src/components/ui/text-field.tsx`, `checkbox.tsx`, `link.tsx`, `alert.tsx`, `review-form.tsx`, `avatar.tsx`, `empty-state.tsx` (logic), `*-skeleton.tsx` | component | request-response | Not shown in either Phase-2 mockup (`overview.html`/`tour.html` cover only the overview and tour pages — no form fields, account page, or skeleton states exist anywhere yet). |

For these, the planner's action steps should cite **RESEARCH.md's "Code Examples" and "Architecture Patterns" sections** (cascade layers, `<dialog>`, APG rating pattern, `next/font` config) as the implementation reference instead of an in-repo analog, plus `docs/design/direction.md`'s token table for the exact colour/type/spacing values and `docs/design/copy.md` for exact wording.

## Test Pattern Notes

No component test exists yet, and **no `jsdom`/React Testing Library is installed** (`package.json` lists only `vitest`/`@vitest/coverage-v8`, no `@testing-library/react` or `jsdom` environment) — `vitest.config.mts` runs the default `node` environment. The closest existing test-structure analogs:

- **Route/page gating logic** (e.g. `/styleguide`'s `APP_ENV` check): `test/examples/page-data.test.ts`'s `digestOf`/`failureOf` helper pattern (lines 29–40) for asserting a `notFound()` call without actually rendering JSX — `notFound()` throws a `NEXT_HTTP_ERROR_FALLBACK;404`-shaped digest, inspectable the same way the example inspects `NEXT_REDIRECT`.
- **Styleguide/visual screenshot coverage** (U5's "every state, both themes, both widths"): `test/design/screenshots.spec.ts` is the existing Playwright screenshot pattern (`test.use({ viewport: ... })` per describe block, `page.screenshot({ path, fullPage: true })`) — already excluded from Vitest (`vitest.config.mts`: `exclude: ['**/node_modules/**', 'test/design/**']`) and run via `npm run test:design`. A new `/styleguide`-targeting spec in `test/design/` would follow this exact shape, swapping the `file://` mockup URL for the running app's `/styleguide` route.
- **Route handler tests** (if any new route handler were needed — none is, for this phase): `test/helpers/call-route.ts` + `test/app/healthz.test.ts` is the pattern, but out of scope here since `ui/` components are pure and `/styleguide` is a page, not a route handler.

If the plan calls for direct component unit tests (rendering a `ui/*` component in isolation rather than via Playwright), the planner must flag adding `@testing-library/react` + a `jsdom`/`happy-dom` Vitest environment as a prerequisite — no such capability currently exists in the project.

## Metadata

**Analog search scope:** `src/`, `test/`, `docs/design/`, `scripts/`, `plan.md`, `stylelint.config.mjs`, `eslint.config.mjs`, `package.json`, `vitest.config.mts`
**Files scanned:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/healthz/route.ts`, `src/lib/format.ts`, `src/server/config-schema.ts`, `src/server/deps.ts`, `src/proxy.ts`, `scripts/check-client-boundaries.ts`, `scripts/check-conventions.ts`, `stylelint.config.mjs`, `eslint.config.mjs`, `test/app/*.test.ts`, `test/lib/format.test.ts`, `test/examples/page-data.test.ts`, `test/design/screenshots.spec.ts`, `docs/design/direction.md`, `docs/design/copy.md`, `docs/design/mockups/{mockup.css,overview.html,tour.html}`, `plan.md` §3.3/§9.4/§9.5
**Pattern extraction date:** 2026-11-10
