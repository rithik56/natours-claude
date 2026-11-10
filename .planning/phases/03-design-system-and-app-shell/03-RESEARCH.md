# Phase 3: Design system and app shell - Research

**Researched:** 2026-11-10
**Domain:** CSS architecture (cascade layers, design tokens), Next.js 16 App Router shell conventions (error/not-found), native accessible components (`<dialog>`, star rating), `next/font`, and dark-theme/motion media queries.
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

**Key locked constraint (from the orchestrator's upstream_input, confirmed in `03-CONTEXT.md`):** plain CSS Modules only, no CSS framework, no component library or headless UI dependency (`plan.md` §2; the user explicitly confirmed this after considering and rejecting shadcn/ui and headless libraries). Components are native HTML wherever possible — the confirm dialog uses the native `<dialog>` element per `plan.md`.

### Locked Decisions
- **D-01 (footer content):** The footer contains the same nav links as the header (Tours, My tours, Account — or Log in/Sign up when logged out), a `/credits` link, and a copyright line. No social links. — Reversibility: reversible.

### the agent's Discretion
*(not discussed — user deselected these areas; defaults/technical judgment below are informational, not locked decisions)*
- **Error page tone:** stay purely minimal/functional (generic message + digest, no stack trace in production) — no particular "Milestone" visual flourish beyond standard token/component styling.
- **Account menu behaviour:** a simple nav item swap (Account when logged in, Log in/Sign up when logged out) rather than a dropdown.
- **Styleguide organization:** per-component sections with in-page navigation.
- **Component ownership pattern (DEL-12):** `ui/` holds presentational components only (typed props, no data fetching, no Server Actions called directly); wrappers that bind data/actions belong to whichever later phase first needs them.
- **Focus ring on Neel surfaces (DES-20):** `--color-focus` is Highway yellow wherever the surrounding surface is Neel (the header), and Neel elsewhere on light surfaces.
- **Touch targets (DES-21):** 44×44px minimum (a house rule beyond WCAG AA's 24px), except inline text links.
- **Default social-preview image (DES-22):** non-tour public pages use the Valley of Flowers cover photo as their Open Graph image.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| S2 | No debug endpoints; `/styleguide` is a 404 in production. | "Architecture Patterns → `/styleguide` gating" below; reuses the existing `APP_ENV` accessor in [config-schema.ts](../../../src/server/config-schema.ts) — no new mechanism. |
| S19 | Production errors never show stack traces; `error.tsx` shows a generic message and the digest. | "Next.js error/not-found conventions" below — `error.message` is auto-redacted server-side by Next.js in production; `error.digest` is the only safe identifier to show. |
| U1 | `tokens.css` defines all design values; stylelint enforces no raw hex/px outside it. | "CSS cascade layers and stylelint enforcement" — built-in stylelint rules, no plugin needed. |
| U2 | Light/dark themes follow `prefers-color-scheme`, swapping token values only. | "`prefers-color-scheme` token-swap pattern" below. |
| U3 | `@layer reset, tokens, base, components, utilities`; single-class selectors, no IDs, no `!important`. | "CSS cascade layers" + stylelint rule table. |
| U4 | `ui/` component set, Server Components by default, incl. native `<dialog>` confirm dialog and keyboard star rating. | "`<dialog>` accessibility" and "Accessible star-rating pattern" below. |
| U5 | `/styleguide` shows every state, both themes, both widths, dev/test only. | "`/styleguide` gating" below. |
| U6 | Fonts load through `next/font` with only the weights/subsets used. | "`next/font/google` axes/subsets" below. |
| U9 | Every page has one `<h1>`, landmarks, a skip link. | Standard HTML landmark pattern — no new research needed; captured in "Architecture Patterns" for completeness. |
| U18 | `not-found.tsx`/`error.tsx` in the new design, no stack traces. | "Next.js error/not-found conventions" below. |
| U19 | Header nav + mobile menu with `aria-expanded`; plain list without JS. | "Architecture Patterns → header/mobile menu" below. |
| U25 | One self-playing motion (route line, ≤1.2s); everything else ≤200ms, user-triggered, respects `prefers-reduced-motion`. | "`prefers-reduced-motion`" below. |
</phase_requirements>

## Summary

This phase has no new runtime dependencies to add — every requirement is satisfied by the browser platform (cascade layers, `<dialog>`, media queries), by `next/font` (already installed, Next.js 16.4.5), or by stylelint's own built-in rules (stylelint 18.0.0, already installed). No new npm package is needed for the CSS linting rules in U1/U3, the confirm dialog, or the star rating — all three are native-platform features, consistent with the locked "no component library" constraint.

The main risks are conventions, not libraries: (1) `error.tsx` and `global-error.tsx` **must** be Client Components (Next.js requirement, not a choice), while `not-found.tsx` is a Server Component; (2) Next.js already redacts the real error message from Server Components in production and exposes only `error.digest` — U18/S19 just need to render that digest, not invent new redaction logic; (3) cascade layers are Baseline-widely-available (no fallback needed) but the `@layer reset, tokens, base, components, utilities` statement must be declared exactly once, before any rules, to fix the precedence order; (4) stylelint can enforce U1/U3's four bans (no raw hex, no raw px, no IDs, no `!important`) and the "component rules live inside `@layer components`" rule **entirely with built-in rules** — no `stylelint-declaration-strict-value`-style plugin is required, though one exists if finer per-property control is wanted later.

**Primary recommendation:** Build U1–U3 entirely on stylelint's built-in `color-no-hex`, `unit-disallowed-list`, `selector-max-id`, `declaration-no-important`, and `rule-nesting-at-rule-required-list` rules (scoped to `src/styles/**` and `src/components/ui/**/*.module.css` respectively), use `<dialog>` + `showModal()` natively for the confirm dialog, and use the W3C APG's own "Rating Radio Group" pattern (a `radiogroup` of native radio inputs) for the star-rating input.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Design tokens, theme switching | CDN/Static (compiled CSS) | Browser (media-query evaluation) | `tokens.css` ships as a static asset; `prefers-color-scheme`/`prefers-reduced-motion` are evaluated client-side with no JS. |
| `ui/` component library | Browser / Client (rendering) | Frontend Server (SSR) | Components are Server Components by default (R1); only the few interactive ones (`StarRatingInput`, `MobileMenu`, confirm-dialog trigger) cross into the Client tier. |
| `/styleguide` gating | Frontend Server (SSR) | — | `notFound()` call reads `getConfig().APP_ENV` server-side; no client logic involved. |
| Error/not-found pages | Frontend Server (SSR) for `not-found.tsx`; Browser/Client for `error.tsx`/`global-error.tsx` | — | Next.js file-convention requirement: `error.js` and `global-error.js` must be Client Components; `not-found.js` is a Server Component by default. |
| App shell (header/footer/skip link/landmarks) | Frontend Server (SSR) | Browser/Client (mobile menu toggle only) | Rendered in the root layout on the server; only the menu's open/close state is a Client Component. |
| Route-line signature animation | Browser/Client | — | CSS-only animation inside an SVG, gated by `prefers-reduced-motion`; no server involvement. |

## Standard Stack

### Core
No new runtime packages. Everything below is already installed or is a browser platform feature.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `next` | 16.4.5 `[VERIFIED: package.json]` | App Router conventions (`error.tsx`, `not-found.tsx`, `next/font/google`) | Already the project's framework version. |
| `stylelint` | 18.0.0 `[VERIFIED: package.json]` | Enforces U1/U3's token/layer rules | Already installed; built-in rules cover every U1/U3 ban without a plugin. |
| `stylelint-config-standard` | 41.0.0 `[VERIFIED: package.json]` | Base stylelint config | Already extended in [stylelint.config.mjs](../../../stylelint.config.mjs). |

### Supporting
None required. The three interactive widgets this phase needs (confirm dialog, star-rating input, mobile menu disclosure) are all buildable with native HTML/ARIA and a few lines of vanilla client-side JS — no npm package is appropriate given the locked "no component library" constraint.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<dialog>` + `showModal()` | A headless dialog library (Radix, Headless UI, `react-aria`) | Rejected by the locked constraint; also unnecessary — `<dialog>` already gives focus trapping, `Esc`-to-close, and `aria-modal` for free (see "Pitfalls" below for the one gap: backdrop click). |
| Built-in stylelint rules | `stylelint-declaration-strict-value` (a plugin that forces `var()` usage) | Not needed for U1's four specific bans (hex, px, IDs, `!important`), which built-in rules already cover one-for-one. Worth revisiting only if the team later wants to ban *all* literal values (not just hex/px) in one rule. |
| Native `radiogroup` of radio inputs for star rating | A custom `role="slider"` widget | APG itself ships a "Rating Radio Group Example" using native radios — simpler, keyboard-correct out of the box, and consistent with "native HTML wherever possible." A slider pattern needs hand-rolled arrow-key handling that radio inputs give for free. |

**Installation:** None — no new packages for this phase.

## Package Legitimacy Audit

**Not applicable.** This phase installs no new npm packages. All four areas researched (cascade layers, `<dialog>`, star rating, `next/font`) are satisfied by the browser platform or by already-installed dependencies (`next`, `stylelint`). If a future phase wants `stylelint-declaration-strict-value` for finer-grained token enforcement, run the Package Legitimacy Gate at that time — it was reviewed here only informationally (see "Alternatives Considered") and is version 1.12.1, published 3 months ago, 770,435 weekly downloads, repo at `github.com/AndyOGo/stylelint-declaration-strict-value` `[CITED: npmjs.com/package/stylelint-declaration-strict-value]` — not adopted this phase.

## Architecture Patterns

### System Architecture Diagram

```mermaid
flowchart TD
    A[Browser request] --> B[proxy.ts: CSP nonce, request ID]
    B --> C[Root layout: next/font vars, header, footer, skip link]
    C --> D{Route segment}
    D -->|matches| E[page.tsx: Server Component, ui/* composition]
    D -->|no match| F[not-found.tsx: Server Component]
    D -->|throws| G[error.tsx: Client Component, shows error.digest only]
    E --> H[ui/* components: CSS Modules inside @layer components]
    H --> I[tokens.css: @layer tokens — swapped by prefers-color-scheme]
    E --> J{Dev/test only?}
    J -->|APP_ENV != production| K[/styleguide: every ui/* state, both themes]
    J -->|APP_ENV == production| F
```

### Recommended Project Structure
Matches `plan.md` §3.3 exactly — no deviation needed:
```
src/
├── styles/
│   ├── reset.css        # @layer reset
│   ├── tokens.css        # @layer tokens — only file allowed raw hex/px (U1)
│   ├── base.css          # @layer base
│   └── fonts.ts          # next/font/google definitions, exposed as CSS vars
├── components/
│   ├── ui/                # each component: Component.tsx + Component.module.css (@layer components)
│   └── features/          # page-level wrappers (Phase 4+ binds data here)
└── app/
    ├── layout.tsx          # imports reset.css, tokens.css, base.css once
    ├── not-found.tsx        # Server Component
    ├── error.tsx             # 'use client' — required by Next.js
    ├── global-error.tsx       # 'use client' — required by Next.js
    └── styleguide/page.tsx    # notFound() when getConfig().APP_ENV === 'production'
```

### Pattern 1: Cascade-layer declaration order fixes precedence once, globally
**What:** A single `@layer reset, tokens, base, components, utilities;` statement (no rules attached) declares the five layers' relative priority before any of them are populated. Later `@layer utilities { … }` blocks that re-open the `utilities` name just *append* to it — they don't move its priority.
**When to use:** Once, at the very top of the first global CSS file loaded (`reset.css`, imported first in the root layout).
**Example:**
```css
/* Source: MDN https://developer.mozilla.org/en-US/docs/Web/CSS/@layer */
@layer reset, tokens, base, components, utilities;
```
`[VERIFIED: developer.mozilla.org/en-US/docs/Web/CSS/@layer]` — "This is useful because the initial order in which layers are declared indicates which layer has precedence... the last layer to be listed will win if declarations are found in multiple layers." Browser support is Baseline "Widely available" — Chrome/Edge 99+, Firefox 97+ (dev builds back to 97, stable long since), Safari 15.4+ `[VERIFIED: developer.mozilla.org/en-US/docs/Web/CSS/@layer#browser_compatibility]`. caniuse confirms 97.09% global usage and Baseline "Widely available" status `[VERIFIED: caniuse.com/css-cascade-layers]`. No fallback or `@supports` gate is needed.

### Pattern 2: Component CSS Modules append to the `components` layer
**What:** Each `ui/*.module.css` file wraps its rules in `@layer components { ... }` so they stay subordinate to any later, unlayered override and so `!important`-free component rules can still be overridden deliberately via the `utilities` layer.
**When to use:** Every file under `src/components/ui/**/*.module.css`.
**Example:**
```css
/* Source: MDN @layer — "Assigning rules to existing layers" */
@layer components {
  .button {
    background: var(--color-accent);
    color: var(--color-text-on-accent);
  }
}
```
`[VERIFIED: developer.mozilla.org/en-US/docs/Web/CSS/@layer]`

### Pattern 3: Native `<dialog>` for the confirm dialog (U4)
**What:** `dialog.showModal()` renders the dialog in the top layer with a `::backdrop`, makes the rest of the document `inert` automatically, sets `aria-modal="true"` implicitly, and closes on `Esc` by default.
**When to use:** The U15 deactivate-account confirm dialog and any other U4 confirm dialog.
**Example:**
```html
<!-- Source: MDN https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog -->
<dialog id="confirm-deactivate">
  <form method="dialog">
    <p>Deactivating removes access to My tours and future logins. This can't be undone from the site.</p>
    <button value="cancel">Cancel</button>
    <button autofocus value="confirm">Deactivate account</button>
  </form>
</dialog>
```
```js
document.getElementById('confirm-deactivate').showModal();
```
`[VERIFIED: developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog]` — "Modal dialog boxes block interaction with other UI elements, making the rest of the page inert." `[VERIFIED: developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog#accessibility]` — "focus is set on the first nested focusable element... By default, a dialog invoked by the showModal() method can be dismissed by pressing the Esc key." Browser support: Chrome 37+, Edge 79+, Firefox 98+, Safari 15.4+, all mobile equivalents — Baseline "Widely available" `[VERIFIED: developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog#browser_compatibility]`.

### Pattern 4: Accessible star rating — APG's Rating Radio Group, not `role="slider"`
**What:** A `radiogroup` (or native `<fieldset>`) of five radio inputs, one per star value, each labelled by its own rating level. This is the **official W3C APG example** for exactly this widget — "Rating Radio Group Example: Radio group that provides input for a five-star rating scale" `[VERIFIED: w3.org/WAI/ARIA/apg/patterns/radio/]`.
**When to use:** `StarRatingInput` (U4's keyboard-usable rating input).
**Keyboard behavior (from the pattern, applies automatically to native radio inputs):** Tab/Shift+Tab move focus into/out of the group (landing on the checked button, or the first if none checked); Space checks the focused button; Left/Right and Up/Down Arrow move focus to the adjacent button, unchecking the previous and checking the new one, wrapping at the ends `[VERIFIED: w3.org/WAI/ARIA/apg/patterns/radio/]`.
**Read-only display variant:** render the same five-peak glyph set as plain text/SVG with an `aria-label` ("Rated 4.5 out of 5") and no interactive controls — do not reuse `radiogroup` semantics for a non-interactive display, since `radiogroup`/`radio` roles imply operability.
**Example:**
```html
<!-- Source: W3C APG Rating Radio Group pattern, https://www.w3.org/WAI/ARIA/apg/patterns/radio/examples/radio-rating/ -->
<fieldset>
  <legend>Rate this tour</legend>
  <div role="radiogroup" aria-label="Rating">
    <input type="radio" id="r1" name="rating" value="1" />
    <label for="r1">1 star</label>
    <!-- ...through 5 stars -->
  </div>
</fieldset>
```
`[VERIFIED: w3.org/WAI/ARIA/apg/patterns/radio/]`

### Pattern 5: `/styleguide` production gate reuses the existing `APP_ENV` accessor
**What:** `/styleguide` calls `notFound()` when `getConfig().APP_ENV === 'production'`, the same accessor `deps.ts` already uses (ARC-10/SEC-16/QA-21 resolution carried from Phase 1 — see `03-CONTEXT.md` canonical refs). No `NODE_ENV` check — `NODE_ENV` is `'production'` for every non-`next dev` command including `test`/`staging`, which would make `/styleguide` unreachable in CI screenshot runs (this was DES-10's finding, closed by Phase 1's `APP_ENV` switch).
**Example:**
```ts
// src/app/styleguide/page.tsx
import { notFound } from 'next/navigation';
import { getConfig } from '@/server/deps'; // or wherever getConfig is re-exported

export default function StyleguidePage() {
  if (getConfig().APP_ENV === 'production') notFound();
  return /* ... */;
}
```
`[VERIFIED: src/server/config-schema.ts:36-38]` — `APP_ENV: z.enum(['development', 'test', 'ci', 'staging', 'production'], ...)`.

### Anti-Patterns to Avoid
- **Gating `/styleguide` on `NODE_ENV`:** `NODE_ENV` is `'production'` for `next build`/`next start` regardless of `APP_ENV`, which would 404 the styleguide in staging/CI/test runs that need it. Already resolved project-wide by the `APP_ENV` pattern — do not reintroduce a `NODE_ENV` check.
- **Rebuilding `<dialog>`'s focus trap or Esc-handling by hand:** the native element already does both; adding a custom `keydown` listener for `Escape` or a manual `inert` toggle duplicates behavior the browser provides for free and risks double-handling.
- **Using `role="slider"` for the star rating:** APG ships a dedicated radio-group example for ratings specifically; a slider pattern needs more custom keyboard code and doesn't match "five discrete named options," which radios model directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal focus trap / inert background / Esc-to-close | A custom `KeyboardEvent` listener + manual `tabindex` cycling + manual `aria-hidden` toggling on siblings | `<dialog>.showModal()` | The browser already implements all three; see Pattern 3 above `[VERIFIED: MDN]`. |
| Keyboard-navigable 5-option rating | A custom `div` with `role="slider"` and hand-rolled Arrow-key math | Native `radiogroup` of radio inputs (APG's own rating example) | Zero custom keyboard code needed; radios are natively operable `[VERIFIED: w3.org APG]`. |
| "No raw hex/px outside tokens.css" enforcement | A custom PostCSS/ESLint AST walker | stylelint's built-in `color-no-hex` + `unit-disallowed-list` rules, scoped by `overrides` to exclude `tokens.css` | Already-installed stylelint 18.0.0 ships both rules; no plugin needed `[VERIFIED: stylelint.io/user-guide/rules]`. |
| "Component rules must be inside `@layer components`" enforcement | A custom stylelint plugin | Built-in `rule-nesting-at-rule-required-list: ["components"]` | Stylelint's own docs give this exact use case: "require every rule to be inside a layer at-rule, as unlayered normal declarations always beat layered ones" `[VERIFIED: stylelint.io/user-guide/rules/rule-nesting-at-rule-required-list]`. |

**Key insight:** Every "hard" interaction in this phase (dialog, rating input) has a native-HTML/ARIA answer that is both simpler and more correct than a hand-rolled one — which is exactly what the locked "no component library" constraint is betting on. The same is true for the CSS linting: all four U1/U3 bans map 1:1 onto existing stylelint rule names, so no new tooling dependency is justified.

## Common Pitfalls

### Pitfall 1: Gating `/styleguide` on `NODE_ENV` instead of `APP_ENV`
**What goes wrong:** The styleguide 404s during `test`/`ci`/`staging` runs (anything that isn't literally `next dev`), including the very CI/Playwright runs meant to screenshot it for U5/U26.
**Why it happens:** `NODE_ENV` is set to `'production'` by Next.js for every command other than `next dev`, per Next.js's own docs `[CITED: raw.githubusercontent.com/vercel/next.js — environment-variables.mdx, as quoted in docs/plan-review/findings-design.md DES-10]`.
**How to avoid:** Use `getConfig().APP_ENV` (already validated by Zod in `config-schema.ts`) — reject only when it equals `'production'`.
**Warning signs:** Playwright or Vitest screenshot tests against the styleguide return 404 unexpectedly outside local `next dev`.

### Pitfall 2: Forgetting `error.tsx` must be a Client Component
**What goes wrong:** Build fails or the error boundary silently doesn't catch, because Next.js requires `error.js`/`global-error.js` to start with `'use client'`.
**Why it happens:** It's easy to default to Server Components per R1's "Server Components by default" rule, forgetting this file is special-cased.
**How to avoid:** Always start `error.tsx` and `global-error.tsx` with `'use client' // client: Next.js requires error boundaries to be Client Components` (satisfies R2's reason-comment convention too).
**Warning signs:** `scripts/check-client-boundaries.ts` flags a missing reason comment, or Next.js throws a build error naming `error.js`.

### Pitfall 3: Showing `error.message` instead of `error.digest` in production
**What goes wrong:** S19 ("production errors never show stack traces") is violated if the component renders `error.message` directly for a Server Component error, because Next.js's message substitution is about *not leaking* the original message — but a naive implementation might still try to read and render whatever string comes through, and for Client Component errors the *original* message (not sanitized) is passed through unchanged.
**Why it happens:** Next.js's docs note the behavior differs by error source: "Errors forwarded from Client Components show the original Error message. Errors forwarded from Server Components show a generic message with an identifier" `[VERIFIED: nextjs.org/docs/app/api-reference/file-conventions/error]`. A developer testing only with a Client Component throw might not notice Server Component errors need the `digest`-only treatment, or might accidentally surface a raw Client-side exception message that does contain sensitive details.
**How to avoid:** `error.tsx` should render a fixed, product-chosen generic message (`copy.md`'s `INTERNAL` wording: "Something went wrong on our side. Try again in a moment.") plus `error.digest` as the only variable part — never interpolate `error.message` into the UI, regardless of source.
**Warning signs:** A Playwright test that throws inside a Client Component and inspects the rendered error page sees the original exception text.

### Pitfall 4: Declaring `@layer` order more than once, inconsistently
**What goes wrong:** If a second, differently-ordered `@layer a, b, c;` statement appears later (e.g. in a component file), the layers' priority order is **not** what either statement alone implies — first declaration wins for ordering, and re-declaring doesn't reorder, but mixing an unexpected new layer name into a later statement can silently insert it with lower priority than intended.
**Why it happens:** CSS Modules compile independently; a second file re-stating `@layer` with a typo'd or reordered list looks harmless but changes precedence.
**How to avoid:** Declare the five-layer order exactly once, in `reset.css` (the first global import), and never repeat the full statement elsewhere — component files only use `@layer components { ... }` (an append, not a re-declaration of order).
**Warning signs:** A component's CSS unexpectedly loses to `base.css` even though `components` should out-rank `base`.

### Pitfall 5: Treating `<dialog>`'s light-dismiss (backdrop click) as free
**What goes wrong:** `showModal()` alone does **not** close the dialog when the user clicks the backdrop — that is "light dismiss," which only applies to popover-based non-modal dialogs (`popover` attribute) or dialogs with `closedby="any"`.
**Why it happens:** Developers sometimes assume all native dialogs behave like a typical JS modal library's backdrop-click-to-close default.
**How to avoid:** If backdrop-click-to-close is wanted, add an explicit `closedby="any"` attribute `[VERIFIED: developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog — closedby support: Chrome/Edge 134+, Firefox 141+, Safari preview-only as of this research]`, or handle it manually with a `click` listener checking `event.target === dialogElement`. Do not assume the default.
**Warning signs:** Manual QA clicking outside the confirm dialog finds it doesn't close; this is correct native behavior unless `closedby="any"` is set.

## Code Examples

### Dark-theme token swap via `prefers-color-scheme` (U2)
```css
/* Source: MDN https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme */
@layer tokens {
  :root {
    --color-bg: #EEF1F5;      /* Whitewash */
    --color-text: #1F2B4D;    /* Neel */
    --color-focus: #1F2B4D;   /* Neel, light surfaces */
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --color-bg: #0D1221;
      --color-text: #EEF1F5;
      --color-focus: #F2B705; /* Highway yellow on dark */
    }
  }
}
```
This is the "swaps token values only" shape U2 requires — the same custom-property names are redefined inside the media query, never a `[data-theme]` attribute selector. `[VERIFIED: developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme]` confirms the media-feature syntax (`light` | `dark`) and that it's Baseline "Widely available" (Chrome 76+, Firefox 67+, Safari 12.1+).

> **Note on scope:** `direction.md`'s derived dark-theme table (already approved at the design gate) is the source of the actual hex values above — this code example only demonstrates the mechanism, not a re-derivation of the palette.

### Respecting `prefers-reduced-motion` for the one self-playing animation (U25)
```css
/* Source: MDN https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion */
@layer components {
  .routeLine {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: draw 1.2s ease-out forwards;
  }

  @media (prefers-reduced-motion: reduce) {
    .routeLine {
      animation: none;
      stroke-dashoffset: 0; /* appears already drawn, per direction.md */
    }
  }
}
```
`[VERIFIED: developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion]` — syntax confirmed (`reduce` | `no-preference`), Baseline "Widely available" (Chrome 74+, Firefox 63+, Safari 10.1+).

### `next/font/google` for Anek Latin with the width axis (U6)
```ts
// src/styles/fonts.ts
// Source: nextjs.org/docs/app/api-reference/components/font ("axes", "subsets")
import { Anek_Latin } from 'next/font/google';

export const anekLatin = Anek_Latin({
  subsets: ['latin', 'latin-ext'], // latin-ext carries U+20B9 (₹) — direction.md, DES-13
  axes: ['wdth'],                   // width axis for the semi-condensed display style
  variable: '--font-anek-latin',
  display: 'swap',
});
```
`[VERIFIED: nextjs.org/docs/app/api-reference/components/font]` confirms `axes` and `subsets` are both valid `next/font/google`-only options, and that `axes` "depend on the specific font" (consistent with `direction.md`'s DES-13-sourced claim that Anek Latin exposes `wdth`). This matches `direction.md`'s already-recorded configuration exactly — no change needed, and the Next.js version (16.4.5) supports this unchanged (the font API page carries no version-gated changes to `axes`/`subsets` in its Version Changes table `[VERIFIED: nextjs.org/docs/app/api-reference/components/font — Version Changes table]`).

### `error.tsx` showing only the digest (S19/U18)
```tsx
// Source: nextjs.org/docs/app/api-reference/file-conventions/error
'use client' // client: Next.js requires error boundaries to be Client Components

export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
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
`[VERIFIED: nextjs.org/docs/app/api-reference/file-conventions/error]` — `error.digest` is "An automatically generated hash of the error thrown. It can be used to match the corresponding error in server-side logs." The heading text is `copy.md`'s exact `INTERNAL` wording `[VERIFIED: docs/design/copy.md:46]`.

> Note: `retry` (stable since Next.js v16.3.0) replaces the older `reset()` for re-fetching/re-rendering the boundary's children; `reset()` remains available for clearing state without re-fetching `[VERIFIED: nextjs.org/docs/app/api-reference/file-conventions/error — Version History table]`. Since the project is on 16.4.5, prefer `retry`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `error.reset()` as the only recovery function | `error.retry()` (re-fetches and re-renders children) | Next.js v16.3.0 (stable) `[VERIFIED: nextjs.org/docs/app/api-reference/file-conventions/error]` | Use `retry` for the "Try again" button; `reset` is now the narrower "clear state without re-fetch" tool. |
| Gating `/styleguide` with `NODE_ENV` | Gating with `APP_ENV` (a project-specific config key) | Already resolved in Phase 1 (ADR 0010/0016) | No action — just don't regress to `NODE_ENV`. |
| Headless/JS dialog libraries for modals | Native `<dialog>` + `showModal()` | Baseline since ~2022 (Chrome 37/Firefox 98/Safari 15.4, broadly interoperable since 2022) `[VERIFIED: developer.mozilla.org — dialog browser_compatibility]` | Consistent with the locked "no component library" constraint; no polyfill needed for any evergreen browser. |

**Deprecated/outdated:** None encountered that's relevant to this phase's scope.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `rule-nesting-at-rule-required-list` can be scoped via stylelint's standard `overrides` glob mechanism to apply only to `src/components/ui/**/*.module.css` (not `tokens.css`/`reset.css`/`base.css`) without also needing `files`/`ignoreFiles` keys beyond what `stylelint.config.mjs`'s existing structure already supports. | "Don't Hand-Roll" / "Architecture Patterns" | Low — `overrides` is a documented, standard stylelint config mechanism; if the exact glob shape needs adjustment, it's a config-only fix the planner/executor can make without new research. |
| A2 | The Thar/Kedarkantha-style `color-no-hex`/`unit-disallowed-list` combination won't also need to special-case `::backdrop`, `@font-face`, or vendor-prefixed values for this project's CSS, since no third-party CSS is imported in this phase (Leaflet's CSS import is a Phase-4 concern per `03-CONTEXT.md`'s "Not in this phase" list). | "Don't Hand-Roll" | Low — if a later phase re-opens stylelint config, vendor CSS exceptions can be added via `ignoreFiles`/`overrides` at that time; no retroactive rework of this phase's rules is implied. |

## Open Questions

1. **Exact glob/`overrides` syntax for the stylelint rule set in `stylelint.config.mjs`**
   - What we know: the five rules needed (`color-no-hex`, `unit-disallowed-list`, `selector-max-id`, `declaration-no-important`, `rule-nesting-at-rule-required-list`) all exist as built-ins in stylelint 18.0.0, and stylelint supports file-glob `overrides` to exempt `tokens.css` from the hex/px bans.
   - What's unclear: the precise `unit-disallowed-list` value list (likely `['px']`, but some components may legitimately need `px` for 1px hairline borders not expressible as a token) and whether that needs its own token (e.g. `--border-width-hairline: 1px` in `tokens.css`) rather than a blanket exception.
   - Recommendation: the planner should task "write/extend `stylelint.config.mjs`" as its own step, and have the executor verify the rule set against a handful of real component CSS Modules before locking the final rule list — this is a config-tuning detail, not a research gap.

2. **`closedby="any"` vs. manual backdrop-click handling for the confirm dialog**
   - What we know: Safari's `closedby` support is "Preview support (TP)" only as of this research `[VERIFIED: developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog#browser_compatibility]`, while Chrome/Edge/Firefox/Samsung Internet already ship it.
   - What's unclear: whether the product wants backdrop-click-to-close at all for the deactivate-confirm dialog (arguably *undesirable* for a destructive confirmation — accidental backdrop clicks shouldn't silently cancel a deactivation the user meant to think about, though cancelling is the safe direction here so the risk is low).
   - Recommendation: default to **not** setting `closedby="any"` (leave the default `closerequest` behavior — Esc and the explicit Cancel/Deactivate buttons only) for the confirm dialog, since an accidental close is harmless (it just cancels), and document this as a one-line decision in the plan rather than treating it as a new research question.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Next.js (App Router conventions) | U18, S19, U4, U5 | ✓ | 16.4.5 `[VERIFIED: package.json]` | — |
| stylelint + stylelint-config-standard | U1, U3 | ✓ | 18.0.0 / 41.0.0 `[VERIFIED: package.json]` | — |
| `next/font/google` build-time font download | U6 | ✓ (network required at `next build`/`next dev` time — already a known project constraint, see `CLAUDE.md` "Network for local development and CI") | n/a | — |
| Chromium (Playwright) for styleguide/component screenshots | U5, U26 (later phase) | ✓ — already installed in this session (`npx playwright install chromium` ran successfully per terminal history) | — | — |
| Browser support for `@layer`, `<dialog>`, `prefers-color-scheme`, `prefers-reduced-motion` | U1–U3, U4, U2, U25 | ✓ (all Baseline "Widely available" per MDN/caniuse checks above) | — | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None — all dependencies for this phase are already satisfied.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Out of scope for this phase (Phase 5). |
| V3 Session Management | No | Out of scope for this phase (Phase 5). |
| V4 Access Control | Yes | `/styleguide`'s production gate (S2) — `getConfig().APP_ENV` check, reusing the existing Zod-validated config accessor; no new access-control surface introduced. |
| V5 Input Validation | No | This phase renders presentational components with typed props; no user input is accepted or parsed here (forms/actions are Phase 4+). |
| V6 Cryptography | No | Not applicable. |
| V7 Error Handling and Logging | Yes | S19 — `error.tsx` must never render `error.message` for Server Component errors (Next.js already redacts it) and must only surface `error.digest`, matching `docs/contracts.md`'s error-response philosophy of never leaking internals to the client. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Information disclosure via verbose error pages (stack traces, internal messages) leaking to the client in production | Information Disclosure | Render only `error.digest` + a fixed generic message in `error.tsx`/`global-error.tsx`; never interpolate `error.message` (see Pitfall 3). This is Next.js's own default behavior for Server Component errors — the risk is a developer accidentally working around it (e.g. for a Client Component error) rather than Next.js leaking it unprompted. |
| Debug/dev-only surface reachable in production (`/styleguide`) | Elevation of Privilege / Information Disclosure | `notFound()` gated on `getConfig().APP_ENV === 'production'` (S2) — already the established pattern from Phase 1; this phase just needs to apply it, not invent it. |
| CSP violations from inline styles (`next/image`'s `style="color:transparent"`) breaking Best Practices/console-clean requirements | Tampering (CSP bypass risk if loosened incorrectly) | Already resolved: `src/proxy.ts` sets `style-src-attr 'unsafe-inline'` with an inline comment citing ADR 0011 specifically for this reason — no action needed this phase, but component CSS must not *also* rely on inline `style` attributes for anything `next/image` doesn't already require, to avoid needing a broader CSP loosening. |

## Sources

### Primary (HIGH confidence)
- `nextjs.org/docs/app/api-reference/file-conventions/error` — error.js props (`error`, `error.message`, `error.digest`, `retry`, `reset`), Client Component requirement, Version History.
- `nextjs.org/docs/app/api-reference/file-conventions/not-found` — not-found.js is a Server Component by default, status-code/robots behavior.
- `nextjs.org/docs/app/getting-started/error-handling` — expected-vs-uncaught error handling guidance.
- `nextjs.org/docs/app/api-reference/components/font` — `next/font/google` `axes`/`subsets` reference and Version Changes table.
- `developer.mozilla.org/en-US/docs/Web/CSS/@layer` — syntax, declaration-order semantics, nesting, browser compatibility.
- `developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog` and `.../HTMLDialogElement/showModal` — modal semantics, accessibility notes, `closedby`, browser compatibility.
- `developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme` and `.../prefers-reduced-motion` — syntax and browser compatibility.
- `w3.org/WAI/ARIA/apg/patterns/radio/` — the official "Rating Radio Group Example" and keyboard-interaction spec.
- `stylelint.io/user-guide/rules` and `stylelint.io/user-guide/rules/rule-nesting-at-rule-required-list` — confirms `color-no-hex`, `unit-disallowed-list`, `selector-max-id`, `declaration-no-important`, and `rule-nesting-at-rule-required-list` are all built-in (no plugin).
- `caniuse.com/css-cascade-layers` — Baseline/usage-share confirmation for `@layer`.
- `src/server/config-schema.ts`, `src/proxy.ts`, `package.json`, `next.config.ts`, `stylelint.config.mjs` (read this session) — current installed versions and existing patterns (`APP_ENV`, CSP nonce, ADR 0011).

### Secondary (MEDIUM confidence)
- `docs/plan-review/findings-design.md` (DES-05, DES-09, DES-10, DES-13, DES-19, DES-20, DES-21) — project-internal review findings already resolved or captured as discretion items in `03-CONTEXT.md`; cited for continuity, not independently re-verified against external sources in this session.

### Tertiary (LOW confidence)
- None — every external claim in this document was checked against an official/authoritative source this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; every tool/API verified against official docs or already-installed `package.json` versions.
- Architecture: HIGH — cascade-layer semantics, `<dialog>` behavior, and the APG rating pattern are all confirmed against primary sources (MDN, W3C, Next.js docs).
- Pitfalls: HIGH — each pitfall traces to a specific, quoted line from an official source (Next.js docs, MDN) or an already-resolved project finding (DES-10).

**Research date:** 2026-11-10
**Valid until:** 30 days (stable web-platform APIs and an already-pinned Next.js version; re-check if `package.json`'s `next` version changes before planning).
