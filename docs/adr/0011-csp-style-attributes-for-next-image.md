# 0011. Inline style attributes in the Content-Security-Policy, for next/image

Status: Accepted
Date: 9 Nov 2026
Requirements: S11
Plan review: ARC-20, DES-11, SEC-14

## Context

`plan.md` S11 asks for a Content-Security-Policy with a per-request nonce and no `'unsafe-inline'`, and requires an ADR for any inline-style allowance. Two facts collide with that:

- `next/image` always writes inline `style` attributes, for example to reserve space and position the image. A nonce can only cover `<script>` and `<style>` elements. It cannot cover a style attribute.
- A strict `style-src` without `'unsafe-inline'` therefore blocks every `next/image`, and the redesigned pages are built around photographs.

CSP level 3 splits style control into `style-src-elem` (style elements and stylesheets) and `style-src-attr` (style attributes). That split lets the two be decided separately (ARC-20, DES-11).

## Decision

- **`style-src-attr 'unsafe-inline'` is allowed.** This is the only inline allowance in the policy.
- **`style-src-elem` stays `'self'` plus the request's nonce.** Style elements and stylesheets get no `'unsafe-inline'`.
- **`script-src` never gets `'unsafe-inline'`.** It is `'self'`, the request's nonce and `'strict-dynamic'`. `'unsafe-eval'` is added only when `NODE_ENV` is development, because the development server needs it.
- **`form-action` is `'self' https://checkout.stripe.com`.** Phase 6's no-JavaScript booking path posts a form that Stripe Checkout redirects from, and the browser checks the redirect target against `form-action` (SEC-14). The host is fixed, not configurable, and no wildcard appears anywhere in the policy.
- **Map-tile and storage hosts are not added now.** Phase 4 adds them to `img-src` after the D14 ADR chooses the providers, so the policy stays in one place, `src/proxy.ts`.
- `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'` and `default-src 'self'` are fixed. `upgrade-insecure-requests` is added only when `APP_ENV` is staging or production, so local and CI runs over http keep working.

## Consequences

- The residual risk is CSS injection through a style attribute: an attacker who can inject markup could restyle or hide elements, or use CSS selectors to probe attribute values. It does not allow script execution, because scripts still need the nonce or a `'strict-dynamic'` parent. The risk is accepted (threat T-01-21).
- Templates must never build a `style` attribute from user input. Phase 2 onwards uses CSS Modules classes for all styling the product controls.
- Every page must render per request, because Next applies the nonce only at render time. ADR 0012 and the root layout's `await connection()` cover that, and `npm run smoke` checks on the built app that each script tag carries the nonce from its own response's policy.
- `src/proxy.ts` reads `process.env` directly and imports nothing from `src/server/` (ARC-26, ADR 0010).
