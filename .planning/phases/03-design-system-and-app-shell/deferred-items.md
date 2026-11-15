# Deferred items: phase 03

Out-of-scope discoveries logged during execution. Each one is outside the plan that found it and was not fixed there.

## From plan 03-07

- **Dev-only CSP console errors (pre-existing, not from 03-07).** In `npm run dev`, every page logs about 33 `Applying inline style violates the following Content Security Policy directive 'style-src-elem'` errors, including `/`, which renders only the existing shell. The CSP sends a nonce, and Next dev's injected style elements do not carry it. The styles still apply: the computed body font and the component layout both render correctly. Found by a headless Chromium check on 2026-11-15. Suggested owner: a later plan that touches the CSP or the dev setup (for example the security headers work in `next.config.ts` or the proxy), or a check that production builds show no such errors.
