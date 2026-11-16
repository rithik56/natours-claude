# 0029. Disk storage in development and ci, and the media route

Status: Accepted
Date: 16 Nov 2026
Requirements: D2, U7, D10
Plan review: ARC-15, DEL-16, ARC-18, QA-03

## Context

`plan.md` D2 names `images.remotePatterns` for the photo host, and D10 says the seed uploads its photos through the storage adapter. Development used the in-memory fake storage (ADR 0016). That fake lives in one process, so `npm run seed` would write to a `Map` and exit, and `next dev` would read its own empty `Map`. Every seeded photo would be a 404 (RESEARCH Pitfall 2). Photos also need an address that `next/image` can optimise. ARC-15 and DEL-16 chose option A: a disk-backed adapter for development and ci, with a media route in front of it, and no MinIO.

Photos are same-origin, so the optimiser never needs a remote host. D2's list of hosts is therefore empty, and the Content Security Policy does not change.

## Decision

- **The storage contract.** `Storage` gains `get(key)`, which returns the stored bytes and content type, or `null`. `urlFor(key)` returns the root-relative path `/media/<key>` in every adapter, with each segment encoded. Absolute URLs (Open Graph, and later Stripe return URLs) are built as `new URL(urlFor(key), APP_URL)`, never from request headers (SEC-12).
- **Adapter by APP_ENV (amends ADR 0016).** `test` keeps the in-memory fake. `development` and `ci` use `createLocalDiskStorage(STORAGE_DIR)`, which keeps files under the directory named by `STORAGE_DIR` (default `.storage`, gitignored). `staging` and `production` still throw, and the message now names Phase 8, the phase that adds S3 behind the same interface.
- **Keys are confined.** A key is one to four segments, each matching `^[a-z0-9][a-z0-9._-]*$`. The disk adapter refuses an empty key or segment, a backslash, `..`, and any path that does not resolve under the storage directory. Its errors name the rule and never echo the key. The content type comes from a fixed map: `jpg` and `jpeg` are `image/jpeg`, `png` is `image/png` and `webp` is `image/webp`. `put` refuses any other extension, and a content type that disagrees with the extension.
- **The media route.** `GET /media/[...key]` is a public Route Handler built with `withApi`. Its params are a strict Zod object, so a malformed path answers 400 before storage is read. A well-formed key that is not stored answers 404 `NOT_FOUND`. A stored file answers with its content type and `cache-control: public, max-age=86400`. The global `X-Content-Type-Options: nosniff` header applies.
- **Image optimisation: a deviation from D2.** `next.config.ts` sets `images.localPatterns: [{ pathname: '/media/**', search: '' }]` in place of D2's `remotePatterns`. The optimiser reads local sources in-process, so it makes no network request. No remote host is allowed, and no local-IP allowance is set.
- **CSP unchanged.** `img-src 'self' blob: data:` already covers same-origin photos, so no host is added.
- **The proxy skips `/media`.** The matcher excludes `media` beside `healthz` and `readyz`, so an image request gets no nonce and no request ID.

## Consequences

- Development and ci write uploaded files to disk. Staging and production never do, and they keep throwing until Phase 8 adds S3 behind the same `Storage` interface.
- The seed process and the web server share the photos through the disk, so `npm run seed` and `next dev` see the same files.
- A photo is served only through `/media`, so a new storage location needs no CSP change.
- `.storage` is local state. Deleting it removes the photos, and `npm run seed -- --reset` uploads them again.
- The route serves seed JPEGs and, later, re-encoded uploads. The one-day cache lets the optimiser keep each photo.
