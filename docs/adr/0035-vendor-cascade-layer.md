# 0035. A vendor cascade layer for third-party CSS

Status: Accepted
Date: 16 Nov 2026
Requirements: U3, R8
Plan review: DES-05

## Context

U3 asks for one declared cascade layer order, so that a later stylesheet wins over an earlier one whatever the selector specificity, and so that no `!important` is needed. The order is declared once in `src/styles/reset.css`, and every component CSS Module sits in layer `components`.

Leaflet (plan 04-08, ADR 0028's route map) ships its own stylesheet, `leaflet/dist/leaflet.css`. Unlayered, its rules would sit outside every layer, and unlayered rules beat every layered rule. A component could then not restyle the map's container, controls or paths without `!important`, which the project's stylelint config forbids (`declaration-no-important`). Review finding DES-05 asked for the third-party CSS to be contained before the first third-party stylesheet arrived.

## Decision

The layer order line in `src/styles/reset.css` becomes:

```css
@layer vendor, reset, tokens, base, components, utilities;
```

`vendor` is declared first, so it has the lowest rank. Third-party CSS is imported into it, and only into it. Leaflet's stylesheet is imported from `src/components/features/leaflet-vendor.css`, which holds nothing else:

```css
@import url("leaflet/dist/leaflet.css") layer(vendor);
```

The route map's own rules (`src/components/features/route-map.module.css`) are in layer `components`, so they override Leaflet's defaults (the grey container background, the marker and attribution styles) without `!important`.

## Consequences

- Any future third-party stylesheet is imported with `layer(vendor)`, so it can never beat a component rule.
- The layer order is still one line, in one file (U3).
- Leaflet's CSS is loaded only with the route map, from the dynamic import in `route-map.tsx`, so `/` and `/credits` do not load it (R8).
- Nothing is removed from the existing layers. `reset`, `tokens`, `base`, `components` and `utilities` keep their meanings.
