# 0012. Tagged data cache and dynamic rendering

Status: Accepted
Date: 9 Nov 2026
Requirements: S11
Plan review: ARC-01, ARC-02, ARC-03
Key Decision: PROJECT.md Key Decisions, row 7

## Context

Next.js 16 offers two caching models: the older `unstable_cache` and route-segment options, and Cache Components with `use cache`. Cache Components also brings partial prerendering, which serves a static shell and streams the rest. The project needs two things from caching and rendering:

- Tour listings and tour details read often and change rarely, so they need a cache that can be invalidated by tag when an admin edit or a booking changes them (ARC-01).
- The nonce-based CSP (ADR 0011) works only on pages rendered per request. A statically rendered page receives the nonce header but no nonce attributes on its scripts, so the browser blocks every script (RESEARCH Pitfall 1).

## Decision

- **Data caching uses `unstable_cache(fn, keys, { tags })`,** wrapped in one adapter, `src/server/cache.ts` (plan 01-10). Services call the adapter's `cached` and `invalidate`, never Next's functions directly.
- **Invalidation uses `revalidateTag(tag, { expire: 0 })`.** The one-argument form is deprecated, and `{ expire: 0 }` is the documented form from route handlers and webhooks. Tests and the fake adapter record invalidated tags instead of calling Next.
- **`cacheComponents` and partial prefetching stay off.** The app is scaffolded with `--no-cache-components` (RESEARCH Pitfall 4). `next.config.ts` does not enable either, and `serverActions.allowedOrigins` stays unset so the same-origin default applies (S9).
- **Every page renders dynamically.** The root layout calls `await connection()` before anything else, which opts the whole tree into per-request rendering. That runs before any page reads the session, so the nonce reaches each script tag. `npm run smoke` proves it on the production build: it fetches `/` twice, checks that every `<script` tag carries the nonce from that response's policy, and that the two nonces differ.
- **`unstable_cache` is documented as superseded by `use cache`,** but it remains available in Next 16.4.5. The adapter is the single place to change if a later phase moves to Cache Components.

## Consequences

- Pages are never served from a build-time static cache. Speed comes from the data cache, an efficient database and small bundles, not from static HTML.
- Moving to Cache Components later means a new ADR, because it changes how nonces reach scripts. A page that renders statically would fail the smoke check, so the failure is caught before release.
- Every cached read needs explicit tags, and every write path that changes cached data must call `invalidate` with the same tags. Phase 4, which adds the first cached services, applies this rule.
- A new page needs no extra step to stay dynamic, because the root layout already does it. Removing `await connection()` from the layout breaks the smoke check, which is intended.
