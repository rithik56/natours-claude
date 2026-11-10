# Phase 2: Design direction and approval gate - Research

**Researched:** 10 Nov 2026
**Domain:** Design-direction documentation, the D14 map-boundary-compliance decision, and static-mockup/screenshot tooling
**Confidence:** MEDIUM overall — HIGH on verified facts (fonts, CSP seam, boundary datasets, Playwright); the central D14 question is deliberately left open for the user, not resolved here.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Keep plan.md §9.2's "Milestone" starting direction as specified — no changes to the palette (Neel/Slate/Whitewash/Paper/Highway yellow/State green), type (Anek Latin semi-condensed + Anek Devanagari), layout concept (list-style overview, tour page with sticky booking panel) or signature element (the route drawn as milestone markers). `direction.md` documents this direction as the brief gave it; the self-review against §9.3 "defaults to avoid" still happens and is recorded, but no deviation ADR is expected for direction choices already in plan.md. — **Reversibility:** reversible — a later ADR can still change any token value; nothing is built on it yet.
- **D-02 (map-tile provider, D14) — not yet decided:** The user did not pick this up in discussion this round. It remains an **open decision requiring the user's input before the Phase 2 ADR can be written** — explicitly called out in plan.md §9.7 step 4 and review finding DES-08 as a decision that "isn't the lead's to make" (legal/compliance boundary-depiction call, not a technical one). DES-08 found the "zoom in on OSM" idea doesn't actually clear the Ladakh/Pangong Tso border and recommends **Option B: no third-party tile provider — Leaflet draws the route and day markers over a simple outline from an official-boundary dataset**, because it adds no CSP host, needs no network in CI or Lighthouse, no key (sidesteps the S18 `NEXT_PUBLIC_...KEY` name clash), themes through tokens, and fits the "quiet" direction. Options A (a confirmed India-compliant commercial provider) and C (locked-zoom OSM) are also on the table per DES-08, but C is flagged rejected-for-Ladakh. **Research/planning for this phase MUST re-surface this decision to the user before the ADR is written — do not default to Option B without asking.** — **Reversibility:** one-way — ships as a CSP host + rendering approach; changing providers later touches the map component, CSP config and the ADR.
- **D-03 (design-gate review process):** Not discussed this round. Default to plan.md §9.7: the user reads `direction.md` and the screenshots/mockup files directly, then responds "approve", "approve with changes" (only changed screens re-shown), or "rework". Record whichever changes the user asks for as an ADR per the phase's success criterion 5.
- **D-04 (copy & voice specifics):** Not discussed this round. `copy.md` follows plan.md §9.2's voice rules with no additional constraints. Per DES-12, it MUST also cover every §4.2 error code and field-validation message so schemas/services source wording from `src/lib/messages.ts` instead of Zod defaults.

### the agent's Discretion

- Deriving the dark theme and status colours from the light palette.
- Confirming Anek Latin + Anek Devanagari availability/subsets through `next/font/google` (`subsets: ['latin', 'latin-ext']` for ₹, don't preload Devanagari yet) and recording the result in `direction.md`.
- Exact wireframe layout details beyond what plan.md §9.2 already sketches, informed by DES-16 (add "Show tours"/"Clear filters"/pagination to the overview; stack guides/reviews/credits; show logged-in/booked/no-dates panel states per DES-17) and DES-15 (pagination uses "Previous"/"Next"/"Page N of M" text, not the milestone marker).
- Which 4-6 real seed tours/photos to feature in the mockups.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| D14 | The map-tile provider is chosen for how it shows India's boundaries, with its terms and pricing checked, and the choice is recorded in an ADR. The CSP's map hosts follow it. | See "Map-Tile Provider (D14)" below: boundary-dataset evidence, OSM/India compliance evidence, CSP-seam confirmation (ADR 0011), and the three-option comparison table the planner hands to the human at the gate. |
| U20 | `docs/design/copy.md` holds the glossary, the button and message wording, and the Indian English rules. Pages use exactly that wording. | See "Copy Governance (U20 / DES-12)" below: confirms `src/lib/messages.ts` does not exist yet (Phase 1 did not create it) and that Zod 4.6.7's English defaults are the thing `copy.md` and `messages.ts` must override. |
</phase_requirements>

## Summary

Phase 2 is almost entirely a documentation and static-asset phase — no production code, no new runtime dependency on Leaflet, no server logic. The two things an AI agent could get wrong without research are (1) treating D14 as a technical decision to just make, and (2) under-specifying what "official-boundary dataset" (DES-08's Option B) actually is. This research confirms, with primary sources read this session, that a genuine India-law-compliant free boundary dataset exists (`datameet/maps`, CC-BY-SA 2.5/ODbL, sourced from Survey of India), that OSM's standard tiles do **not** meet Indian requirements and that the project's own Day-5 seed coordinate for Pangong Tso corroborates DES-08's finding that locked-zoom OSM still shows the LAC. It also confirms the CSP seam where a chosen provider's host gets added (ADR 0011: `img-src` in `src/proxy.ts`, deliberately left empty pending this ADR), confirms Anek Latin/Devanagari's current Google Fonts variable-axis shape, and confirms the `next/font/google` self-hosting mechanics DES-13 already relied on. Commercial Option A is real (Mappls/MapmyIndia is the standard answer for "renders India's claimed boundary, run by an Indian company") but its free-tier terms could not be confirmed from its marketing site this session — this is flagged as an open item the planner must have the human (or a follow-up fetch) confirm before the ADR locks in Option A.

**Primary recommendation:** Do not pre-select a D14 option in the plan. Research supports presenting the user, at the design gate, with the three-option comparison below (this research materially sharpens Option B with a concrete, licensed dataset) and let them choose; write the ADR after that choice, per D-02.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Map/route rendering (signature element) | Browser / Client | — | Leaflet runs client-side; this phase only decides the data source, Phase 4 builds the component (CONTEXT.md "Not in this phase"). |
| Boundary/outline dataset (if Option B) | CDN / Static | Browser / Client | A static GeoJSON file shipped with the app and fetched once, not a live third-party host — this is the entire point of Option B (no CSP host, no network dependency in CI). |
| Commercial tile host (if Option A) | CDN / Static (third party) | Browser / Client | An external image/vector tile host added to `img-src`/`connect-src` in the CSP (ADR 0011 reserves this slot). |
| Font loading (Anek Latin/Devanagari) | Frontend Server (SSR) | — | `next/font/google` self-hosts and serves font files from the app's own origin at build time; no browser request to Google ever happens (confirmed below). |
| Copy/message governance (`copy.md`, `messages.ts`) | API / Backend | Frontend Server (SSR) | `AppError` and Zod messages are constructed in `src/server/**` and rendered server-side; `messages.ts` is the single source both tiers read from (DES-12). |
| Mockup + screenshot tooling | Build-time / CI | — | Plain HTML/CSS files are not part of the Next.js app; Playwright runs against static files, not a tier in the running product. |

## Standard Stack

### Core
No new runtime dependency is added by this phase. Mockups are static HTML/CSS under `docs/design/mockups/`, not Next.js routes (01-CONTEXT.md confirms `/` is still unstyled from Phase 1).

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@playwright/test` | 1.65.0 [VERIFIED: npm registry, checked this session via `npm view @playwright/test version`] | Screenshot capture of the static mockups into `docs/design/screens/` (plan.md §9.7 step 3) | Dev-only; not a production dependency |
| `datameet/maps` `Country/india-soi.geojson` | n/a (static data file, not an npm package) | The India outline for D14 Option B — sourced from Survey of India shapefiles | Only if Option B is chosen; fetched/vendored once, not installed via a package manager |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `datameet/maps` india-soi.geojson (Option B) | A commercial India-compliant tile provider, e.g. Mappls/MapmyIndia (Option A) | Needs an account, a key (S18 allowlist exception), unverified free-tier terms, and a CSP host; shows real street-level detail the static outline doesn't |
| `datameet/maps` india-soi.geojson (Option B) | OSM standard tiles, locked zoom (Option C) | Rejected for Ladakh per DES-08 and this session's coordinate check — see below |

**Installation (only if the planner proceeds with Option B):**
```bash
# Vendor the file once; it is static project data, not an npm dependency.
curl -o src/data/india-boundary.geojson \
  https://raw.githubusercontent.com/datameet/maps/master/Country/india-soi.geojson
```

**Version verification:** `@playwright/test` and `@axe-core/playwright` versions above were checked with `npm view <pkg> version` this session (10 Nov 2026 run). `@axe-core/playwright` is 4.14.0 — relevant to Phase 3 (U22), not installed in this phase, listed here only because it is the same tooling family as the Playwright screenshot harness this phase sets up.

## Package Legitimacy Audit

> This phase does not add Playwright to `package.json` (that happens whenever the first Playwright test/screenshot is written, per ADR 0004 "install dependencies when first used" — likely this phase or Phase 3). The audit below covers the packages this phase's deliverables depend on, for the planner's benefit.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@playwright/test` | npm | created 2020-09-24 (~6 yrs) [VERIFIED: npm registry, `npm view @playwright/test time.created`] | very high (industry-standard; not independently re-queried this session) | github.com/microsoft/playwright [VERIFIED: npm registry, `npm view @playwright/test repository.url`] | OK | Approved |
| `@axe-core/playwright` | npm | created 2021-06-02 (~5.5 yrs) [VERIFIED: npm registry, `npm view @axe-core/playwright time.created`] | high | github.com/dequelabs/axe-core-npm [VERIFIED: npm registry] | OK | Approved (Phase 3 scope, noted here for continuity) |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

*Package names themselves (`@playwright/test`, `@axe-core/playwright`) were supplied from training knowledge, not from an official docs lookup in this session — per the provenance rule they are tagged `[ASSUMED]` at the name level even though registry metadata (age, maintainer org) was independently confirmed. The automated `gsd-tools query package-legitimacy check` seam was not available in this session's toolset; the planner should gate the first `npm install @playwright/test` behind a `checkpoint:human-verify` if that seam is available when planning runs.*

## Map-Tile Provider (D14) — the open decision

**This is not a recommendation to lock. It is the comparison the planner must hand to the human at the design gate, per D-02.**

### Why this is a real geometry problem, not a hypothetical one

The seed data's own coordinates confirm DES-08's finding. Day 5 of `ladakh-high-passes` ("Along the Shyok river to Pangong Tso") is at:

```json
{ "coordinates": [78.4573, 33.90719], "description": "Along the Shyok river to Pangong Tso", "day": 5 }
```
[VERIFIED: seed/data/tours.json:316-322 — read this session]

This matches DES-08's cited figure (78.46°E, 33.91°N) almost exactly [VERIFIED: docs/plan-review/findings-design.md:84-85, read this session]. DES-08's own distance/zoom calculation (an ~89×74 km route box needing zoom 8 on a 343px phone map, which reaches ~78.9°E — into or past the lake, where Wikipedia says the Line of Actual Control runs) is that document's own finding, tagged "likely" by its author; this research does not re-derive it independently but confirms the input coordinate is real, current seed data, not a hypothetical. **[CITED: docs/plan-review/findings-design.md DES-08]**

### Option B: no third-party tile host — a licensed, India-compliant static outline exists

The DataMeet India community's `maps` repository (a long-running, India-focused open-geodata project) ships exactly the dataset DES-08 called for:

- **`Country/india-soi.geojson`** — "Dissolved shapefiles from the official Indian shapefile data available," sourced from the Survey of India via the Census of India Districts 2011 dataset, licensed **CC-BY-SA 2.5 / ODbL** [VERIFIED: github.com/datameet/maps/tree/master/Country README, fetched this session].
- The repository's description of the `Country` directory as a whole: "Single feature shapefile for the land area of India including disputed territories in accordance with the Official boundary of India as per the Survey of India" [VERIFIED: same page, fetched this session], citing `http://www.surveyofindia.gov.in/pages/display/190-public-awareness`.
- The repository overall carries an MIT licence for code, with "Unless explicitly stated, all datasets in this repository is shared under CC BY 4.0 license" as the default and per-dataset licences (like `india-soi.geojson`'s CC-BY-SA 2.5/ODbL) overriding that default [VERIFIED: github.com/datameet/maps README, fetched this session].
- Two sibling files in the same directory are **not** suitable for Option B's compliance goal: `india-osm.geojson` is OSM-derived (same on-the-ground rendering DES-08 flags as non-compliant) and `india-composite.geojson` is a composite of LSIB/Natural-Earth/Pakistan sources under CC-0 that represents a different (non-Indian-claim) boundary, not the Survey of India line. **Use `india-soi.geojson` specifically, not the other two files in that directory.**

This confirms DES-08's "dataset's licence is unverified" caveat can be closed: a usable, attributable, share-alike-licensed dataset exists and is free. CC-BY-SA/ODbL's share-alike term applies to the *data*, not to the application's own code — Leaflet drawing a styled, re-projected rendering of this GeoJSON (with attribution in the credits/footer, consistent with U27's existing photo-credit pattern) does not require releasing the app's source.

**What "no CSP host" means concretely:** the file is read at build time or fetched once from the app's own origin (`/data/india-boundary.geojson` or bundled), so no entry is needed in `img-src`, `connect-src` or anywhere else in `src/proxy.ts`'s CSP (ADR 0011 explicitly reserves this slot and currently adds nothing: "Map-tile and storage hosts are not added now") [VERIFIED: docs/adr/0011-csp-style-attributes-for-next-image.md, read this session]. Leaflet itself still needs to be added as a devDependency when the map component is built (Phase 4), but Option B needs no *tile* host at all — only the base Leaflet library (self-hosted or npm-installed, same-origin).

### Option A: a commercial India-compliant provider

**Mappls (formerly MapmyIndia)**, run by CE Info Systems Ltd (an Indian company), is the standard commercial answer to "a map that shows India's claimed boundary correctly, legally, for an Indian audience" — its developer portal advertises "200,000+ developers" and a "Start for free" signup flow [CITED: about.mappls.com/api/, fetched this session]. However:
- **No public self-serve pricing page or quota table was found this session.** The pricing/plans pages redirect back to the marketing homepage, and specific free-tier request limits, which map styles are available (dark theme support), and CSP host names for their tile/style endpoints were not confirmed. **[ASSUMED — flagged, not verified]**
- Using it needs an account and a browser-exposed API key. Per DES-08 point 4, a key named e.g. `NEXT_PUBLIC_MAP_TILES_KEY` collides with S18's CI rule banning `KEY` in `NEXT_PUBLIC_*` names — this needs either a differently-named variable or an explicit allowlist exception recorded in the same ADR as the D14 choice. **[VERIFIED: plan.md:578 (S18 text), read this session]**
- Global commercial tile providers built on OpenStreetMap or similar "on-the-ground" data (the kind most Western SaaS map vendors use) render the Kashmir region the same way OSM's default does, not the Survey-of-India line — DES-08's problem is specifically about *Indian-law-compliant* rendering, which rules out most Western commercial providers as drop-in fixes unless one specifically confirms India-compliant rendering (as Mappls is built to provide). **[ASSUMED — this is general knowledge about how global map vendors typically source boundary data, not independently re-verified against each vendor's current map this session; the planner should not accept any commercial provider for D14 without confirming its India boundary rendering specifically.]**

**If the human picks Option A, the ADR must record:** the provider's confirmed free-tier quota and pricing (re-verified at ADR-writing time, not from this research), the exact CSP host(s) added to `img-src`/`connect-src`/`style-src` as needed, the key's env var name and its S18 allowlist exception, and confirmation (screenshot or docs citation) that the provider's map actually draws India's boundary per Indian requirements — not merely that the vendor is India-based.

### Option C: OSM tiles, locked zoom and bounds

**Rejected for the Ladakh route specifically**, consistent with DES-08: the seed coordinate for Day 5 (verified above) sits close enough to Pangong Tso that the zoom level needed to fit the ~89×74 km route box on a phone screen reaches into the zone where OSM's default (on-the-ground) rendering shows the Line of Actual Control rather than India's claimed boundary. This research does not independently recompute the zoom/bounding-box geometry (that is DES-08's own calculation, tagged "likely" there); it confirms only that the underlying coordinate is real current seed data and that OSM's own wiki explicitly tells India-based implementers to use a custom tileserver "to comply with Indian law" [VERIFIED: wiki.openstreetmap.org/wiki/India/Rendering_server, fetched this session] rather than the default tiles. Additionally:
- OSM's tile usage policy (operations.osmfoundation.org/policies/tiles/) requires a valid `Referer` header from web pages and explicitly forbids a restrictive `Referrer-Policy` that would block it [VERIFIED: fetched this session] — this confirms DES-08 point 5 independently.
- The OSM wiki's own Disputed Territories page states plainly: "The OSM community in India has instructions for setting up a custom tile server to show the borders with Pakistan and China as claimed by India" — i.e. the OSM project itself acknowledges its default tiles do not show India's claimed borders [VERIFIED: wiki.openstreetmap.org/wiki/Disputed_territories, fetched this session].
- Other tours' borders (e.g. Bangladesh near Dawki on the Meghalaya tour) are not disputed and are unaffected by this issue — only Ladakh/Pangong Tso is implicated.

### Comparison table for the design gate

| | Option A: commercial India-compliant provider (e.g. Mappls) | Option B: no third-party tiles, Leaflet + `india-soi.geojson` outline | Option C: OSM tiles, locked zoom (rejected) |
|---|---|---|---|
| CSP hosts added | Yes — tile/style host(s), TBD per provider | None | `tile.openstreetmap.org` (img-src) |
| Needs an account/key | Yes (S18 allowlist exception needed) | No | No |
| Cost at zero spend | Free tier exists but terms unverified this session | Free (CC-BY-SA 2.5/ODbL data, attribution required) | Free, but policy-constrained (Referrer, caching, no bulk download) |
| Shows India's claimed boundary correctly | Likely, if genuinely India-compliant (unverified this session) | Yes — sourced directly from Survey of India | **No** — shows on-the-ground/LAC line near Pangong Tso |
| Network dependency in CI/Lighthouse | Yes, unless faked | None | Yes, unless faked |
| Dark theme | Depends on provider's style options (unverified) | Yes — themes through CSS/tokens like any SVG/vector layer | Needs a separate dark tile style (not confirmed to exist) |
| Visual richness | Full street-level map | Simple outline + route line (fits the "quiet" Milestone direction) | Full street-level map |

## Fonts (Anek Latin / Anek Devanagari via `next/font/google`)

- Both families are current on Google Fonts as of this session: Anek Latin and Anek Devanagari each expose a variable **Weight axis 100–800** and are presented with a **Width axis** control on their specimen pages [VERIFIED: fonts.google.com/specimen/Anek+Latin and fonts.google.com/specimen/Anek+Devanagari, fetched this session] — consistent with DES-13's and DES-08 point in findings-design.md's `wdth` 75–125 / `wght` 100–800 claim.
- `next/font/google` self-hosts: "You can automatically self-host any Google Font... no requests are sent to Google by the browser when the user visits your site" [VERIFIED: nextjs.org/docs/app/getting-started/fonts, fetched this session]. This directly supports U6 ("fonts load through `next/font`") and means font loading never appears as a CSP `font-src`/`connect-src` concern for Google's own domains.
- DES-13's specific finding — that ₹ (U+20B9) is in Anek Latin's `latin-ext` subset, not `latin`, so `direction.md` must record `subsets: ['latin', 'latin-ext']` — was not independently re-verified at the glyph level this session (that would need inspecting the served font files, which the project review already did). **[CITED: docs/plan-review/findings-design.md DES-13 — treat as already-verified prior art for this phase, not re-derived here.]**
- Recommendation for `direction.md`: record exactly DES-13's fix verbatim — `axes: ['wdth']`, `subsets: ['latin', 'latin-ext']`, Anek Devanagari not loaded until Hindi ships — since this is already a verified, specific, and approved finding in the project's own review trail.

## Static Mockup + Screenshot Tooling

- Mockups are plain HTML and CSS files under `docs/design/mockups/` (plan.md §9.7 step 3) — not Next.js pages, so none of the project's CSS-Modules/cascade-layer machinery (U3) applies here; standalone `<style>` or a shared stylesheet is fine for a throwaway mockup.
- **Do not render a live Leaflet map in the mockup.** DES-09's proposed fix — adopted here as the practical approach, since the alternative (a grey box) is explicitly forbidden by plan.md's "no placeholder content" rule — is to draw the route as **inline SVG built directly from the seed coordinates**, animated with CSS only (no JS dependency, no network tile fetch, screenshot-stable). This sidesteps DES-09's finding that "a static mockup can't render a real map" and also sidesteps needing Leaflet/tiles at all for this phase's deliverable. **[CITED: docs/plan-review/findings-design.md DES-09 proposed fix (a)]**
- **Screenshot determinism pitfalls (DES-10), still applicable to this phase's static mockups even though they aren't server-rendered:**
  - Playwright names baselines per-platform (`…-chromium-darwin.png` vs `-linux.png`); screenshots taken on a Mac will not match ones taken in CI. Generate and compare in the same environment (Docker/CI), not ad hoc locally, if baselines must be reproducible. **[CITED: docs/plan-review/findings-design.md DES-10, citing playwright.dev/docs/test-snapshots]**
  - Because mockups are static files with hand-chosen seed content, the clock-dependent pitfall (next start date, upcoming vs. past) is **less severe** here than for the live app (Phase 3+) — the mockup can simply pick tours/dates that read naturally as of the mockup's creation date, since it is not testing real date logic. Still, don't hand-type a date string: mirror `formatDate`'s actual output (3-letter months, year always shown per 01-CONTEXT.md D-01) so the mockup matches what the real app will later render (DES-14).
  - Use `reducedMotion: 'reduce'` in the Playwright config for the screenshot pass, since the signature route-line animation should not be mid-draw when the screenshot is taken.
- **`@playwright/test` 1.65.0** [VERIFIED: npm registry, checked this session] is the current version; install it only when this phase actually writes its first screenshot script (ADR 0004's "install dependencies when first used" pattern already followed elsewhere in the repo).

## Copy Governance (U20 / DES-12)

- `src/lib/messages.ts` does not exist yet — Phase 1 did not create it [VERIFIED: grep of `src/lib/` for `messages.ts` and `formatDate`/`formatPrice`-only mention in 01-CONTEXT.md, checked this session]. This phase's `copy.md` is the wording source; a later phase (per DES-12's fix, likely folded into this phase's task list or Phase 1 cleanup) must add `src/lib/messages.ts` so schemas and `AppError` calls stop using Zod's English defaults.
- Zod 4.6.7 (the pinned version in `package.json`) ships English default messages like "Too small: expected ... to have >=... " and "Invalid input: expected ..." — these must never reach a user per DES-12's DoD addition. **[CITED: docs/plan-review/findings-design.md DES-12, citing `zod/v4/locales/en.js`]**
- `copy.md` must enumerate wording for **every §4.2 error code and every field-validation rule**, not just the general voice rules in plan.md §9.2.

## ADR Format (for the D14 ADR)

Confirmed from `docs/adr/README.md` and existing ADRs (e.g. 0019), read this session:
- One file per decision: `docs/adr/NNNN-kebab-title.md`, numbered from 0001 with no gaps. **Next free number is 0028** [VERIFIED: `docs/adr/` directory listing, read this session — highest existing file is `0027-model-operations-that-skip-validators-are-refused.md`].
- File starts with `# NNNN. Title`, then header lines `Status:`, `Date:` (India Standard Time, e.g. "9 Nov 2026"), `Requirements:`, `Plan review:`.
- Sections, in order: `## Context`, `## Decision`, `## Consequences` — all filled in (see ADR 0019 for the house style: plain prose, specific and reversible-aware).
- Add a row to the table in `docs/adr/README.md`, in numeric order, when the ADR is written.
- The D14 ADR's `Requirements:` line should read `D14`; `Plan review:` should cite `DEL-17, DES-08`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| India-compliant boundary geometry | A hand-traced or AI-guessed outline of India's borders | `datameet/maps` `Country/india-soi.geojson` (Survey of India-sourced, CC-BY-SA 2.5/ODbL) | Getting India's claimed boundary wrong is a legal/compliance risk, not a styling bug — use the one dataset in evidence this session that's explicitly sourced from Survey of India shapefiles. |
| Screenshot baseline management | Custom diffing scripts | Playwright's built-in snapshot comparison (`toHaveScreenshot`) | Already the project's planned tool (U26); per-platform naming and CI-only generation are documented, known constraints — don't invent a parallel system. |

**Key insight:** the map-tile question looks like a frontend styling choice but is a compliance/legal boundary-depiction decision (DES-08's core point) — resist the urge to "just pick one" during planning or execution; the plan must route this to the human.

## Common Pitfalls

### Pitfall 1: Treating D14 as already decided
**What goes wrong:** A planner or executor defaults to Option B (or any option) because it's "the recommended one" in review findings.
**Why it happens:** DES-08 does recommend Option B, and it's the cleanest technically — but CONTEXT.md D-02 explicitly says this is a legal/compliance call for the human, not a technical one the team makes unilaterally.
**How to avoid:** The Phase 2 plan must include a human-checkpoint task that presents the three-option table above (with this research's dataset/licence findings for Option B, and the open unknowns for Option A) and waits for the user's choice before the ADR is drafted.
**Warning signs:** A plan or ADR draft for D14 that doesn't cite a specific user decision/message approving the option chosen.

### Pitfall 2: Using the wrong `datameet/maps` file
**What goes wrong:** Vendoring `india-osm.geojson` or `india-composite.geojson` instead of `india-soi.geojson`, reintroducing the exact non-compliant (OSM-sourced) or non-Indian-claim (composite) boundary DES-08 flags.
**Why it happens:** All three files live in the same `Country/` directory and have similar names.
**How to avoid:** Only `india-soi.geojson` is sourced from Survey of India data; the ADR and any code comment should name the file explicitly.
**Warning signs:** A CSP/dataset reference that doesn't specify `india-soi.geojson` by name.

### Pitfall 3: Grey box or "map coming soon" placeholder in the mockup
**What goes wrong:** The tour-page mockup ships without a map because "the real map isn't built until Phase 4."
**Why it happens:** It's tempting to defer the whole signature element to Phase 4 since that's when Leaflet is actually wired up.
**How to avoid:** Follow DES-09's fix: draw the route as inline SVG from real seed coordinates in the mockup. This is real content (plan.md's "no placeholder content" rule applies to mockups too) and lets the human actually judge the signature element at the gate.
**Warning signs:** Mockup HTML containing a literal grey `<div>` or an unstyled placeholder image where the map should be.

## Code Examples

### Reading the India outline dataset (Option B, if chosen)
```bash
# Source: github.com/datameet/maps, Country/india-soi.geojson
# Licence: CC-BY-SA 2.5 / ODbL — attribution required, e.g. in docs/design/copy.md's
# credits section alongside the existing seed-photo credits (U27 pattern).
curl -o src/data/india-boundary.geojson \
  https://raw.githubusercontent.com/datameet/maps/master/Country/india-soi.geojson
```

### next/font/google, matching DES-13's fix
```tsx
// Source: nextjs.org/docs/app/getting-started/fonts (fetched this session) + DES-13
import { Anek_Latin } from 'next/font/google';

const anekLatin = Anek_Latin({
  subsets: ['latin', 'latin-ext'], // latin-ext carries U+20B9 (₹)
  axes: ['wdth'],                   // semi-condensed via the width axis
});
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Mappls (or any commercial provider) has a usable free tier with specific, confirmed quota/terms | Map-Tile Provider, Option A | The ADR locks in a provider whose free tier doesn't actually cover the project's traffic, or that requires a credit card, violating the zero-spend constraint |
| A2 | Global commercial map vendors (Mapbox, MapTiler, Stadia, etc.) generally do not render India's claimed boundary out of the box, unless specifically built for the Indian market | Map-Tile Provider, Option A | If some mainstream vendor does offer India-compliant rendering, Option A's field narrows unnecessarily; if the assumption is wrong the other way (an "India view" vendor doesn't actually comply), the ADR could pick a non-compliant provider |
| A3 | `@playwright/test` and `@axe-core/playwright` package names are legitimate (not slopsquatted) | Package Legitimacy Audit | Low risk in practice (both are famous, long-established packages with matching maintainer-org repos), but the formal legitimacy seam was not run this session |

**If this table is empty:** N/A — see above; everything else in this research (boundary dataset provenance and licence, the seed coordinate, OSM's own policy text, Anek font axes, next/font self-hosting, ADR format, CSP seam) was read directly from a primary source this session.

## Open Questions

1. **What are Mappls's (or any other India-compliant provider's) actual current free-tier terms, request quota, and whether its map styles include a dark theme?**
   - What we know: It exists, is run by an Indian company, and offers a self-serve signup ("Start for free").
   - What's unclear: Exact quota, pricing beyond the free tier, dark-style availability, and the exact CSP host names for its tile/script endpoints.
   - Recommendation: If the human leans toward Option A at the design gate, the lead should do a dedicated, narrower fetch of Mappls's developer console/docs (requires a free signup to see actual plan details) before writing the ADR — don't let the ADR cite this research's unverified pricing guess.

2. **Does any mainstream Western commercial tile vendor (Mapbox, MapTiler, Stadia, Thunderforest, Geoapify) offer an India-compliant boundary rendering as a configurable style?**
   - What we know: Their base styles generally follow OSM-style on-the-ground conventions for disputed borders (same category of issue as Option C), based on general industry knowledge, not independently checked against each vendor's current map this session.
   - What's unclear: Whether any of them has added an India-specific style variant since.
   - Recommendation: Not required for this phase — Option A's leading real candidate is Mappls specifically because it's built for this purpose; don't spend further research budget broadening the commercial-provider search unless the human asks for alternatives to Mappls.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@playwright/test` (for screenshots) | plan.md §9.7 step 3, U26 | ✗ (not yet installed) | 1.65.0 current on npm | Install when first screenshot script is written (ADR 0004 pattern) |
| Network access to github.com / raw.githubusercontent.com | Vendoring `india-soi.geojson` if Option B chosen | ✓ (used this session) | — | — |
| Docker (for CI-matching screenshot baselines, per DES-10) | U26 baseline generation | Not probed this session (no docker-compose service listed for Playwright) | — | DES-10's fix: use the pinned `mcr.microsoft.com/playwright:<version>-noble` image locally and in CI |

**Missing dependencies with no fallback:** none — Playwright has a clear install path when needed.
**Missing dependencies with fallback:** Playwright itself (install on first use, per project convention).

## Sources

### Primary (HIGH confidence)
- `seed/data/tours.json` — read directly this session for the Ladakh/Pangong Tso Day 5 coordinate.
- `docs/adr/0011-csp-style-attributes-for-next-image.md` — read directly this session for the CSP map-host seam.
- `docs/adr/README.md`, `docs/adr/0019-deploy-on-aws-instead-of-render.md` — read directly this session for ADR format.
- `wiki.openstreetmap.org/wiki/India/Rendering_server` and `wiki.openstreetmap.org/wiki/Disputed_territories` — fetched this session.
- `operations.osmfoundation.org/policies/tiles/` — fetched this session.
- `github.com/datameet/maps` (README, `Country/` directory listing and README, `Survey-of-India-Index-Maps/` README) — fetched this session.
- `fonts.google.com/specimen/Anek+Latin`, `fonts.google.com/specimen/Anek+Devanagari` — fetched this session.
- `nextjs.org/docs/app/getting-started/fonts` — fetched this session.
- `npm view @playwright/test`, `npm view @axe-core/playwright` (version, time.created, repository.url) — run this session.

### Secondary (MEDIUM confidence)
- `about.mappls.com/api/` — fetched this session; confirms Mappls exists and has a signup flow, but no pricing/quota page was reachable.

### Tertiary (LOW confidence)
- General knowledge about Western commercial tile vendors' default boundary rendering (not independently checked per-vendor this session) — see Open Question 2.
- DES-08's own zoom/bounding-box geometry calculation (tagged "likely" by its own author) — cited, not re-derived.

## Metadata

**Confidence breakdown:**
- D14 option framing: HIGH for Option B's dataset/licence and Option C's rejection (primary sources read); LOW for Option A's specific commercial terms (unverified this session, explicitly flagged).
- Fonts: HIGH — current Google Fonts specimen pages and Next.js docs confirm the project's existing DES-13 finding.
- ADR format / CSP seam: HIGH — read directly from the project's own repository.
- Copy governance: MEDIUM — confirmed `messages.ts` doesn't exist yet and Zod's default-message problem is real (DES-12 citation), but no new verification of Zod's exact current message strings was done this session.

**Research date:** 10 Nov 2026
**Valid until:** ~30 days for the ADR-format/CSP/font findings (stable project conventions); re-verify Option A's commercial terms at the time the human actually picks it, regardless of this date, since pricing pages change independently.
