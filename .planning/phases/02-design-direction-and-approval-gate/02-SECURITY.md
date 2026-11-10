---
phase: "02"
slug: "design-direction-and-approval-gate"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "10 Nov 2026"
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry → repository | `@playwright/test` installed as a new devDependency | Package code (build-time only) |
| Static mockup files → anyone who opens them | Plain HTML/CSS files, not served by the running app | Read-only seed content (no secrets) |
| plan.md content → direction.md/copy.md | These docs transcribe and extend plan.md's design brief | Documentation prose only, no untrusted input |
| Browser ↔ app (CSP) | `src/proxy.ts`'s Content-Security-Policy controls which external hosts the browser may load from | HTTP response headers |
| Third-party map-tile/dataset provider ↔ app | D14 decision point: Option A would add a commercial host, Option B vendors a static dataset | N/A — Option B chosen, no external host added |
| Human gate decision ↔ project state | The user's recorded answer is the one control gating whether `src/` styling work may begin | Verbatim user response |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-SC | Tampering | `npm install @playwright/test` | high | mitigate | Package legitimacy audit in 02-RESEARCH.md (verdict OK, Approved — ~6-year-old package, github.com/microsoft/playwright, matching repo metadata); exact version `^1.65.0` committed in package.json and package-lock.json | closed |
| T-02-01 | Information Disclosure | docs/design/mockups/*.html, mockup.css | low | accept | Content sourced only from seed/data/tours.json and seed/CREDITS.md, which already exclude secrets and use the reserved example.com domain | closed |
| T-02-02 | Tampering | docs/design/screens/*.png (generated locally) | low | accept | Screenshots are for the one-time design gate, not a CI-enforced baseline (U26 is Phase 7's job) | closed |
| T-02-03 | Information Disclosure | docs/design/direction.md, docs/design/copy.md | medium | mitigate | Verified: no real secret/password/env values present — docs document config *keys* and error *codes* only | closed |
| T-02-04 | Tampering | docs/design/direction.md self-review section | low | mitigate | Verified: "Self-review against §9.3" section exists and covers every defaults-to-avoid item; design gate (plan 02-04) was the final backstop | closed |
| T-02-05 | Tampering | `src/proxy.ts` `buildPolicy()` | high | mitigate | Verified: `img-src`/`connect-src` contain no wildcard character; Option B (chosen) made no CSP change at all | closed |
| T-02-06 | Information Disclosure | `.env` / `NEXT_PUBLIC_*` naming | high | mitigate | N/A — Option B chosen, no account/key/env var needed; ADR 0028 explicitly records no `NEXT_PUBLIC_*` var is required | closed |
| T-02-07 | Tampering | Dataset/provider selection (Option B) | medium | mitigate | Verified: ADR 0028 names `india-soi.geojson` by exact filename, distinguishing it from the non-compliant sibling files `india-osm.geojson`/`india-composite.geojson` | closed |
| T-02-08 | Repudiation | The gate decision itself | high | mitigate | Verified: 02-04-SUMMARY.md quotes the user's verbatim "approve" response | closed |
| T-02-09 | Tampering | Rework/approve-with-changes loop | medium | mitigate | N/A this run — user gave a plain approve, no rework/changes requested, so no ADR was needed; the requirement (ADR before any applied change) is recorded in 02-04-PLAN.md Task 2 for future invocations of this loop | closed |

*Status: open · closed · open — below {block_on} threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-02-01 | T-02-01 | Mockup HTML/CSS files are static, read-only artifacts sourced entirely from seed content; no secrets or untrusted input involved | GSD secure-phase (L1 grep-depth, asvs_level 1) | 10 Nov 2026 |
| R-02-02 | T-02-02 | Locally-generated screenshots are one-time design-gate artifacts, not CI-enforced baselines | GSD secure-phase (L1 grep-depth, asvs_level 1) | 10 Nov 2026 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 10 Nov 2026 | 11 | 11 | 0 | GSD secure-phase (L1 grep-depth; threats_open:0 AND register_authored_at_plan_time:true AND asvs_level==1 short-circuit — all evidence independently re-verified in the live codebase, auditor spawn skipped per the documented short-circuit rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-10
