---
phase: "04"
slug: "browse-tours"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-16"
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry → developer machine | Packages installed (tsx, leaflet, sharp) and mapshaper run once through npx | Third-party code |
| Seed CLI → MongoDB | A developer-run script with write access to every collection | Seed documents, seed passwords |
| Developer machine → local MongoDB | Playwright setup resets seed collections | Seed documents |
| CI runner → seed passwords | Generated per run and masked | Secrets |
| Seed content → every visitor | Credits and alt text are shown on every tour page and `/credits` | Public text, licence obligations |
| Seed credit links → visitors | External links to Wikimedia and licence pages | Outbound navigation |
| Seed data → Leaflet DOM | Stop descriptions and day numbers become marker content | Public text |
| Remote GeoJSON download → repository | Third-party data becomes a committed public file | Map boundary data |
| Browser → `/media/[...key]` | A visitor-chosen path selects a file on the server's disk | File paths |
| Next image optimiser → image source | The optimiser fetches the source named in the `url` query | URLs |
| Browser and API client → `/` and GET /api/v1/tours | Untrusted query strings select filters, sort, fields and pages | Query parameters |
| Browser → `/tour/[slug]`, API client → GET /api/v1/tours/[id] | An untrusted slug or id selects a tour | Identifiers |
| Browser → reviewPage | Untrusted page number | Query parameter |
| API client → geo and monthly-plan params | Untrusted path segments become query arguments | Coordinates, distances, years |
| Request → data cache; data cache → many visitors | Cache keys and cached values shared across visitors | Catalogue data |
| Session cookie → booking panel | The signed-in user decides which bookings are read | Personal booking data |
| Session → monthly plan | Only staff roles may read the plan | Operational data |
| Server → crawlers and social crawlers | Sitemap, robots, canonical and og:image URLs | Absolute URLs |
| Build output → budget script | The script reads files the build produced | Build artefacts |
| Staff session → tour writes | Lead guides and admins change public data | Tour fields |
| Request body → server memory / tour document | Untrusted JSON and multipart bodies | Request bodies |
| Staff client → images endpoint; upload bytes → sharp | Untrusted file bytes and form parts decoded by native code | Image files, credits |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-04-01 | Repudiation | photo credits in seed data and CREDITS.md | medium | mitigate | `test/scripts/seed-data.test.ts` fails on a missing credit or an author mismatch | closed |
| T-04-02 | Tampering | mapshaper@0.6.121 one-off run (04-08) | high | mitigate | blocking-human legitimacy check, approval recorded in 04-01-SUMMARY; not in package.json | closed |
| T-04-SC (04-01) | Tampering | npm installs | high | mitigate | package-legitimacy gate; no manifest change in 04-01 | closed |
| T-04-03 | Information Disclosure | `/media/[...key]`, local disk storage | high | mitigate | segment regex in route; `resolveKey` refuses traversal and out-of-root paths; tested | closed |
| T-04-04 | Elevation of Privilege | `assertSeedAllowed` | high | mitigate | environment allowlist, `--reset` only in development/test/ci, called before connect; tested | closed |
| T-04-05 | Information Disclosure | SEED_USER_PASSWORD, SEED_ADMIN_PASSWORD | medium | mitigate | read from config, never echoed; empty in `.env.example`; `check-env` refuses values | closed |
| T-04-06 | Information Disclosure (SSRF) | next/image optimiser | medium | mitigate | `localPatterns` `/media/**` only, no `remotePatterns`; asserted in `test/next-config.test.ts` | closed |
| T-04-07 | Denial of Service | `/media` reads | low | accept | see accepted risks | closed |
| T-04-SC (04-02) | Tampering | tsx@4.23.15 | high | mitigate | exact pin, audit verdict in 04-RESEARCH, reason in commit body | closed |
| T-04-08 | Information Disclosure | CI seed passwords | medium | mitigate | generated with `openssl rand`, `::add-mask::`, passed as step outputs | closed |
| T-04-09 | Tampering | Playwright `--reset` against the dev database | low | accept | see accepted risks | closed |
| T-04-10 | Tampering | seed data integrity rules | medium | mitigate | rules checked after every load, non-zero exit on failure; tested | closed |
| T-04-SC (04-03) | Tampering | npm installs | high | accept | see accepted risks | closed |
| T-04-11 | Tampering (injection) | `apiListQuerySchema`, `buildPageQuerySchema` | high | mitigate | strict allowlisted schemas, in-memory filtering; `$`-operators and unknown keys give 400 | closed |
| T-04-12 | Denial of Service | data cache | medium | mitigate | fixed cache keys, no URL value enters a key (structural, no dedicated test) | closed |
| T-04-13 | Denial of Service | `limit` | low | mitigate | digits-only, `MAX_LIMIT = 100`; tested | closed |
| T-04-14 | Information Disclosure | `fields` projection | low | mitigate | allowlisted fields over a field-by-field DTO; tested | closed |
| T-04-SC (04-04) | Tampering | npm installs | high | accept | see accepted risks | closed |
| T-04-15 | Tampering | `/` searchParams | medium | mitigate | `parseQuery` keeps only schema keys whose values pass; tested | closed |
| T-04-16 | Tampering (reflected content) | `listHref`, select defaults | low | mitigate | hrefs built with `URLSearchParams` from validated query; no raw HTML sinks in `src/` | closed |
| T-04-SC (04-05) | Tampering | npm installs | high | accept | see accepted risks | closed |
| T-04-17 | Denial of Service | `getBySlug`, `getById` | medium | mitigate | slug checked against cached catalogue before any per-tour cache entry; tested | closed |
| T-04-18 | Spoofing | canonical and og:image URLs | medium | mitigate | built from `appOrigin` config only, no Host reads; tested | closed |
| T-04-19 | Information Disclosure | guides in the detail API | medium | mitigate | `select('name photo role')` and `toPublicUser`; tested | closed |
| T-04-SC (04-06) | Tampering | npm installs | high | accept | see accepted risks | closed |
| T-04-20 | Information Disclosure | `BookingSection`, `findUpcomingPaid` | high | mitigate | per-request uncached read filtered on the session user id; tested with two travellers | closed |
| T-04-21 | Information Disclosure | review authors | medium | mitigate | populate with public fields only, mapped through `toPublicUser`; tested | closed |
| T-04-22 | Denial of Service | `reviewPage` | low | mitigate | digits only, page clamped, list cached per tour; tested | closed |
| T-04-SC (04-07) | Tampering | npm installs | high | accept | see accepted risks | closed |
| T-04-23 | Tampering (XSS) | Leaflet markers and attribution | medium | mitigate | markers built with `textContent`; fixed attribution constant | closed |
| T-04-24 | Tampering | downloaded india-soi.geojson | medium | mitigate | only the 84 KB simplified file is committed, data-only, loaded as JSON; provenance in ADR 0034 | closed |
| T-04-25 | Information Disclosure / third-party request | map tiles | high | mitigate | no tile layer; same-origin GeoJSON; CSP `connect-src 'self'`; e2e asserts localhost-only requests | closed |
| T-04-SC (04-08) | Tampering | leaflet@1.9.4, @types/leaflet@1.9.22, npx mapshaper | high | mitigate | exact pins, reason in commit body, mapshaper approval recorded and not installed | closed |
| T-04-26 | Denial of Service (perf regression) | tour page JavaScript | low | mitigate | `bundle:check` (Lighthouse CI + lazy allowance) runs in CI without `continue-on-error` | closed |
| T-04-SC (04-09) | Tampering | npx mapshaper (conditional) | high | mitigate | not run (2% kept); not in package.json | closed |
| T-04-27 | Spoofing | sitemap, robots, canonical URLs | medium | mitigate | built from `appOrigin` only; tested | closed |
| T-04-28 | Tampering (reverse tabnabbing) | external credit links | low | mitigate | `Link` forces `rel="noopener noreferrer"` on external targets; asserted | closed |
| T-04-SC (04-10) | Tampering | npm installs | high | accept | see accepted risks | closed |
| T-04-29 | Denial of Service / error disclosure | geo params | medium | mitigate | bounded lat/lng, distance ≤ 20000, unit enum, strict objects; 400 before Mongo; tested | closed |
| T-04-30 | Elevation of Privilege | monthly plan | medium | mitigate | `access.roles` guide/lead-guide/admin with exact match; tested | closed |
| T-04-31 | Tampering | top-5-cheap query | low | mitigate | `z.strictObject({})`, hard-coded sort and limit; tested | closed |
| T-04-SC (04-11) | Tampering | npm installs | high | accept | see accepted risks | closed |
| T-04-32 | Tampering (mass assignment) | PATCH and POST bodies | high | mitigate | strict create/update schemas exclude ratings, slug, images, credits; tested | closed |
| T-04-33 | Elevation of Privilege | POST, PATCH, DELETE | high | mitigate | lead-guide/admin access plus Origin check on writes; tested (401/403/cross-origin) | closed |
| T-04-34 | Tampering (integrity) | tour delete | medium | mitigate | booking count gives CONFLICT before removal, then reviews and photos cleared; race in ADR 0036; tested | closed |
| T-04-35 | Tampering (validator bypass) | `updateTour` | medium | mitigate | load, set, save; `refuseValidatorBypass` on the model; no raw update calls in `src/` | closed |
| T-04-SC (04-12) | Tampering | npm installs | high | accept | see accepted risks | closed |
| T-04-36 | Denial of Service | `readBodyLimited`, `withApi` | high | mitigate | Content-Length then streamed byte count; 1 MB JSON, 21 MiB upload; access checked before any body read; tested | closed |
| T-04-37 | Denial of Service (decompression bomb) | `images.normalize` | high | mitigate | `limitInputPixels` 40 MP, first page only, concurrency 1, 5 MB per file; tested | closed |
| T-04-38 | Spoofing (MIME) | uploaded files | high | mitigate | type by magic bytes, re-encoded to WebP, metadata not kept, global `nosniff`; tested | closed |
| T-04-39 | Elevation of Privilege / abuse | images route | medium | mitigate | lead-guide/admin access, Origin check on PUT, 20 uploads per user per hour; tested | closed |
| T-04-40 | Tampering (path) | stored image keys | medium | mitigate | `<prefix>/<uuid>.webp` keys, client file names never read; tested | closed |
| T-04-SC (04-13) | Tampering | sharp@0.35.5 | high | mitigate | exact pin, lockfile integrity hash, reason in commit body | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-07 | `/media` reads are bounded: seed JPEGs are at most 1920 px, uploads are re-encoded to at most 2000 px, responses carry `max-age=86400` and the image optimiser caches | Plan 04-02 threat model | 2026-11-16 |
| AR-04-02 | T-04-09 | Playwright `--reset` targets the local development database only; the seed guard (T-04-04) refuses other environments and the README warns about it | Plan 04-03 threat model | 2026-11-16 |
| AR-04-03 | T-04-SC (04-03, 04-04, 04-05, 04-06, 04-07, 04-10, 04-11, 04-12) | These plans install no package; confirmed by the absence of any dependency-manifest commit for them | Plan threat models 04-03 to 04-12 | 2026-11-16 |
| AR-04-04 | Threat flag, 04-02-SUMMARY | `tsx` brings in `esbuild@0.28.2` (dev-only, transitive) with an install script that the research check did not cover. The lockfile pins it with an integrity hash. Review it at the next dependency update | Security audit, phase 04 | 2026-11-16 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-16 | 53 | 53 | 0 | gsd-security-auditor (ASVS L1, block_on high) |

Informational observations from the audit (not counted as open):

- `test/app/e2e-env.ts` commits local-only Playwright defaults for the seed passwords and `SESSION_SECRET`. CI does not run Playwright.
- T-04-12 holds structurally; no test pins the cache-key set.
- T-04-24's scratch-directory isolation step is process evidence only. The committed output is verified.
- EXIF removal on uploads (T-04-38) relies on sharp's default of not keeping metadata. No test asserts it.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-16
