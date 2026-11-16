// R8, D-07: MapFrame and the Leaflet route map project through one helper, so their drawings have the same
// shape. These tests use the real Ladakh High Passes stops from seed/data/tours.json (no placeholder content).
import { describe, expect, it } from 'vitest';
import {
  longitudeScale,
  nudgeCoincident,
  type RouteStop,
  toPlanar,
} from '@/lib/route-projection';

// [lng, lat] in seed order, converted to the { day, lat, lng } shape the projection takes.
const ladakh: RouteStop[] = [
  [77.57726, 34.15287],
  [77.6665, 34.05567],
  [77.60417, 34.27833],
  [77.49482, 34.57584],
  [78.4573, 33.90719],
  [77.93054, 34.04704],
  [77.70283, 33.91248],
  [77.57726, 34.15287],
].map(([lng, lat], index) => ({
  day: index + 1,
  lat: lat ?? 0,
  lng: lng ?? 0,
}));

describe('[R8] toPlanar', () => {
  it('[R8] x is longitude times cos(mean latitude) and y is latitude', () => {
    const meanLat =
      ladakh.reduce((sum, stop) => sum + stop.lat, 0) / ladakh.length;
    const cos = Math.cos((meanLat * Math.PI) / 180);
    const planar = toPlanar(ladakh);

    expect(longitudeScale(ladakh)).toBeCloseTo(cos, 12);
    expect(planar[0]?.x).toBeCloseTo(77.57726 * cos, 9);
    expect(planar[0]?.y).toBeCloseTo(34.15287, 9);
  });

  it('[R8] the same stops give identical output whether MapFrame or Leaflet asks', () => {
    expect(toPlanar(ladakh)).toEqual(toPlanar([...ladakh]));
  });

  it('[R8] day order is restored from a shuffled input', () => {
    const shuffled = [
      ladakh[4],
      ladakh[0],
      ladakh[7],
      ladakh[2],
      ladakh[1],
      ladakh[6],
      ladakh[3],
      ladakh[5],
    ];
    const days = toPlanar(shuffled as RouteStop[]).map((stop) => stop.day);

    expect(days).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('[R8] an empty route projects to nothing and uses a longitude scale of 1', () => {
    expect(toPlanar([])).toEqual([]);
    expect(longitudeScale([])).toBe(1);
  });
});

describe('[R8] nudgeCoincident', () => {
  it('[R8] Leh on day 1 and day 8 are drawn 12 units apart on both axes', () => {
    const points = toPlanar(ladakh).map((stop) => ({
      day: stop.day,
      x: stop.x,
      y: stop.y,
    }));
    const nudged = nudgeCoincident(points, 12);
    const day1 = nudged.find((point) => point.day === 1);
    const day8 = nudged.find((point) => point.day === 8);

    expect((day8?.x ?? 0) - (day1?.x ?? 0)).toBeCloseTo(12, 9);
    expect((day8?.y ?? 0) - (day1?.y ?? 0)).toBeCloseTo(12, 9);
  });

  it('[R8] a point that is not repeated is left where it is', () => {
    const points = [
      { day: 1, x: 10, y: 20 },
      { day: 2, x: 30, y: 40 },
    ];

    expect(nudgeCoincident(points, 12)).toEqual(points);
  });
});
