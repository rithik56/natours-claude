// U25, C3, C6: the static route can hold its slot still (no draw animation), and its drawing constants are the
// token values, so a Leaflet map that replaces it at the same size matches it (UI-SPEC "Route map").
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FRAME_TOKENS, MapFrame } from '@/components/ui/map-frame';

const stops = [
  { day: 1, lat: 34.16, lng: 77.58 },
  { day: 5, lat: 34.2, lng: 77.7 },
  { day: 8, lat: 34.16, lng: 77.58 },
];

/** A token's value in CSS pixels, read from tokens.css (rem is 16px). */
function tokenPx(name: string): number {
  const css = readFileSync(
    join(process.cwd(), 'src/styles/tokens.css'),
    'utf8',
  );
  const match = new RegExp(`${name}:\\s*([\\d.]+)(px|rem)\\s*;`).exec(css);
  if (!match) throw new Error(`${name} is not a length in tokens.css`);
  const value = Number(match[1]);
  return match[2] === 'rem' ? value * 16 : value;
}

describe('[U25] MapFrame', () => {
  it('[U25] with animate={false} the route is drawn still, with the still class on the drawing', () => {
    const html = renderToStaticMarkup(
      createElement(MapFrame, { locations: stops, animate: false }),
    );

    expect(html).toMatch(/class="[^"]*still/);
  });

  it('[U25] by default the route still animates, so the styleguide keeps its draw', () => {
    const html = renderToStaticMarkup(
      createElement(MapFrame, { locations: stops }),
    );

    expect(html).not.toMatch(/class="[^"]*still/);
  });
});

describe('[C6] MapFrame drawing constants match the tokens', () => {
  it('[C6] the padding and the nudge are --space-5 and --space-3', () => {
    expect(FRAME_TOKENS.padding).toBe(tokenPx('--space-5'));
    expect(FRAME_TOKENS.nudge).toBe(tokenPx('--space-3'));
  });

  it('[C6] the marker is 1.5rem by 1.25rem and the outline is 8 units', () => {
    expect(FRAME_TOKENS.markerWidth).toBe(24);
    expect(FRAME_TOKENS.markerHeight).toBe(20);
    expect(FRAME_TOKENS.outlineWidth).toBe(8);
    expect(FRAME_TOKENS.lineWidth).toBe(4);
  });
});
