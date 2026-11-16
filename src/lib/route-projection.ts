// The one projection of a tour's route (R8, D-07, ADR 0034). The static MapFrame and the Leaflet route map
// both call these helpers, so the two drawings have the same shape. Usable on the server and in the browser:
// it has no imports and touches no DOM.

export type RouteStop = { day: number; lat: number; lng: number };

/** A stop in planar coordinates: x is east-west, y is north-south, in degrees before any fitting. */
export type PlanarStop = { day: number; x: number; y: number };

/** A point in some drawing space (SVG user units, or layer pixels). */
export type Point = { x: number; y: number };

/**
 * The factor that shrinks longitude to match latitude at the route's mean latitude, so east-west
 * distance keeps its real proportion to north-south distance. One factor serves both axes, so a route
 * is never stretched.
 */
export function longitudeScale(stops: readonly RouteStop[]): number {
  if (stops.length === 0) return 1;
  const meanLat = stops.reduce((sum, stop) => sum + stop.lat, 0) / stops.length;
  return Math.cos((meanLat * Math.PI) / 180);
}

/** Sorts the stops by day and projects them: x = lng times cos(mean latitude), y = lat. */
export function toPlanar(stops: readonly RouteStop[]): PlanarStop[] {
  const scale = longitudeScale(stops);
  return [...stops]
    .sort((a, b) => a.day - b.day)
    .map((stop) => ({ day: stop.day, x: stop.lng * scale, y: stop.lat }));
}

/**
 * Moves a point that lands on an earlier point's place along the diagonal, by `nudge` for each repeat,
 * so both stay visible. The units are the caller's drawing units (SVG units or pixels).
 */
export function nudgeCoincident<T extends Point>(
  points: readonly T[],
  nudge: number,
): T[] {
  const seen = new Map<string, number>();
  return points.map((point) => {
    const key = `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    const shift = count * nudge;
    return { ...point, x: point.x + shift, y: point.y + shift };
  });
}
