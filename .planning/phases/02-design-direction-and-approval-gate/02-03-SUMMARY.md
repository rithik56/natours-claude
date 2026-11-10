---
phase: 02-design-direction-and-approval-gate
plan: 03
subsystem: design-direction
tags: [adr, csp, d14, map-tiles, compliance]
dependency graph:
  requires: [ADR 0011 (CSP seam reserved for map-tile hosts)]
  provides: [ADR 0028 (D14 map-tile decision, Option B)]
  affects: [docs/adr/README.md, docs/contracts.md, Phase 4 (map component)]
tech-stack:
  added: []
  patterns: ["Human checkpoint for legal/compliance decisions the team cannot make unilaterally"]
key-files:
  created:
    - docs/adr/0028-map-tile-provider-and-boundary-compliance.md
  modified:
    - docs/adr/README.md
    - docs/contracts.md
decisions:
  - "D14 resolved: Option B — no third-party tile host, Leaflet + datameet/maps' Country/india-soi.geojson static boundary outline, chosen by the user directly"
  - "src/proxy.ts's CSP is left unchanged — ADR 0011's reserved map-tile seam stays empty, no wildcard introduced"
metrics:
  duration: 10min
  completed: 2026-11-10
status: complete
actuals:
  tokens: 14000
  tasks: 2
  commits: 1
plan_head_before: 2f5c2c2
plan_head_after: 3a4af37
---

# Phase 2 Plan 03: Map-tile Provider and Boundary Compliance (D14) Summary

Resolved D14 by presenting the user the three researched map-tile options as a human checkpoint and recording their choice — Option B (no third-party tiles) — in ADR 0028, with `src/proxy.ts`'s CSP left untouched since the chosen option adds no external host.

## What Was Built

**Task 1 (checkpoint:decision, pre-resolved by orchestrator):** The three options from `02-RESEARCH.md` — Option A (a commercial India-compliant provider, e.g. Mappls/MapmyIndia), Option B (no third-party tiles, Leaflet + a static boundary outline), and Option C (OSM tiles, locked zoom — rejected per DES-08) — were presented to the user along with DES-08's finding and the seed data's Day-5 Ladakh coordinate (`[78.4573, 33.90719]`, `seed/data/tours.json:316-322`). The user's verbatim recorded answer: **"Option B — no third-party tiles, static boundary outline" (Leaflet + datameet/maps' Country/india-soi.geojson)**, with no extra constraints or alternative provider named.

**Task 2:** Wrote [docs/adr/0028-map-tile-provider-and-boundary-compliance.md](../../../docs/adr/0028-map-tile-provider-and-boundary-compliance.md) in the house ADR format, recording:
- The D14 requirement and DES-08's finding, naming the Ladakh Day-5 coordinate as the concrete collision.
- The user's Option B choice, naming `datameet/maps`' `Country/india-soi.geojson` specifically (distinguished from the sibling `india-osm.geojson` and `india-composite.geojson` files, which don't meet the same compliance goal), its CC-BY-SA 2.5/ODbL licence, and that it needs no CSP host, account or key.
- Why Option C was rejected (doesn't clear the Ladakh/Pangong Tso border) and why Option A wasn't chosen (free-tier terms/CSP hosts unverified this session; not rejected on compliance grounds).
- Consequences: `src/proxy.ts`'s CSP is unchanged, Phase 4 builds the actual map component against this choice, and the CC-BY-SA 2.5/ODbL attribution requirement carries forward to wherever the outline renders.

Added ADR 0028's row to `docs/adr/README.md` in numeric order, and updated the CSP-referencing line in `docs/contracts.md` to cite ADR 0028 alongside ADR 0011.

`src/proxy.ts` itself required no edit — Option B adds no CSP host, consistent with the plan's "or confirmed unchanged for Option B" allowance.

## Verification

- `grep -q "0028" docs/adr/README.md` — passed
- `npx tsc --noEmit` — passed
- `grep -E "img-src[^;]*\*" src/proxy.ts` — no match (no wildcard introduced)

## Deviations from Plan

None - plan executed exactly as written. Task 1's checkpoint was already resolved by the orchestrator before this executor session began, per the `<completed_tasks>` instruction; its verbatim answer was recorded as specified and Task 2 proceeded without re-asking.

## Self-Check: PASSED

- FOUND: docs/adr/0028-map-tile-provider-and-boundary-compliance.md
- FOUND: commit 3a4af37 (docs(02-03): ADR 0028 — map-tile provider resolves D14 as Option B)
