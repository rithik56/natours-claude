# 0028. Map-tile provider and boundary compliance

Status: Accepted
Date: 10 Nov 2026
Requirements: D14
Plan review: DEL-17, DES-08

## Context

`plan.md` D14 asks for a map-tile provider whose rendering of India's borders is checked before it is used, with the choice recorded in an ADR and the CSP's map hosts following it. Review finding DES-08 found that the "zoom in on OSM" idea does not actually clear the Ladakh/Pangong Tso border: the seed data's own Day-5 stop on `ladakh-high-passes` ("Along the Shyok river to Pangong Tso") sits at `[78.4573, 33.90719]` (`seed/data/tours.json:316-322`), and DES-08's own distance/zoom calculation puts the route box's needed zoom level into the range where OSM's default, on-the-ground rendering shows the Line of Actual Control rather than India's claimed boundary, not far from this exact coordinate. The OSM wiki itself confirms its default tiles are not India-compliant and that India-based implementers are expected to run a custom tileserver to show the boundary "as claimed by India."

This is a legal/compliance boundary-depiction call, not a technical one the team may make unilaterally (CONTEXT.md D-02). The three researched options were presented to the user directly as a checkpoint, rather than the team defaulting to DES-08's own recommendation.

## Decision

**The user chose Option B: no third-party tile host — Leaflet draws the route over a static boundary outline, with no extra constraints or alternative provider named.**

The outline is `datameet/maps`' **`Country/india-soi.geojson`** specifically — not the sibling `india-osm.geojson` (OSM-derived, the same non-compliant on-the-ground rendering DES-08 flags) or `india-composite.geojson` (a composite of LSIB/Natural-Earth/Pakistan sources under CC-0, representing a different, non-Indian-claim boundary). `india-soi.geojson` is sourced from the Survey of India via the Census of India Districts 2011 dataset and is licensed **CC-BY-SA 2.5 / ODbL**, which requires attribution but applies to the data, not the application's own code — Leaflet drawing a styled, re-projected rendering of it does not require releasing the app's source.

The file is read from the app's own origin (fetched once at build time or vendored under `src/data/`), so:

- No CSP host is added — not to `img-src`, `connect-src`, or any other directive in `src/proxy.ts`.
- No account, browser-exposed key or `NEXT_PUBLIC_*` env var is needed, so S18's ban on the literal substring "KEY" in a `NEXT_PUBLIC_` name never comes into play for this decision.
- No network dependency exists in CI or Lighthouse runs.
- The outline themes through CSS like any other project asset, consistent with the "quiet" Milestone direction.

Option A (a commercial India-compliant provider, e.g. Mappls/MapmyIndia) and Option C (OSM tiles, locked zoom) were not chosen. Option C is rejected outright: it is the option DES-08 and this phase's own coordinate check found does not clear the Ladakh/Pangong Tso border. Option A was not rejected on compliance grounds — a genuinely India-compliant commercial provider was plausible — but its free-tier terms and exact CSP hosts were unverified this research session, and the user's recorded choice went to Option B without needing to resolve that uncertainty.

## Consequences

- `src/proxy.ts`'s CSP is **unchanged by this decision**. ADR 0011's reserved map-tile seam in `img-src`/`connect-src` stays empty; no wildcard character is introduced anywhere in the policy.
- Vendoring `india-soi.geojson` itself, adding Leaflet as a dependency, and building the actual route-drawing map component are out of this phase's scope — **Phase 4** builds the map component against this choice.
- The attribution the CC-BY-SA 2.5/ODbL licence requires for `india-soi.geojson` must appear wherever the outline is rendered, consistent with U27's existing photo-credit pattern.
- Because no commercial provider is in use, there is no pricing, quota or key-rotation concern to track for this decision, and Phase 8's deployment work has no AWS- or CSP-related dependency arising from D14.
