import styles from './map-frame.module.css';

export type RouteStop = { day: number; lat: number; lng: number };

type MapFrameProps = { locations: RouteStop[] };

// The drawing area, in SVG user units. The same 400 by 240 box the Phase 2 mockup used.
const WIDTH = 400;
const HEIGHT = 240;
const PADDING = 28;
const MARKER_WIDTH = 22;
const MARKER_HEIGHT = 18;
// Two stops at the same place (Leh on day 1 and day 8) are nudged apart by this much.
const COLLISION_NUDGE = 14;

type Placed = RouteStop & { x: number; y: number };

/**
 * Projects the stops into the viewBox. Longitude is scaled by cos(latitude), so
 * east-west distance keeps its real proportion to north-south distance. One
 * scale factor is used on both axes, so the route is never stretched.
 */
function project(stops: RouteStop[]): Placed[] {
  const meanLat = stops.reduce((sum, stop) => sum + stop.lat, 0) / stops.length;
  const cos = Math.cos((meanLat * Math.PI) / 180);
  // Latitude grows northwards, but SVG y grows downwards, so north goes to the top.
  const toPlanar = (stop: RouteStop) => ({ x: stop.lng * cos, y: -stop.lat });
  const planar = stops.map(toPlanar);
  const minX = Math.min(...planar.map((point) => point.x));
  const minY = Math.min(...planar.map((point) => point.y));
  const spanX = Math.max(...planar.map((point) => point.x)) - minX;
  const spanY = Math.max(...planar.map((point) => point.y)) - minY;
  const scaleX = spanX > 0 ? (WIDTH - 2 * PADDING) / spanX : Infinity;
  const scaleY = spanY > 0 ? (HEIGHT - 2 * PADDING) / spanY : Infinity;
  const scale = Math.min(scaleX, scaleY);
  // A route with one stop, or only stops in a line, has an infinite scale on one axis.
  const unit = Number.isFinite(scale) ? scale : 1;
  const offsetX = (WIDTH - spanX * unit) / 2;
  const offsetY = (HEIGHT - spanY * unit) / 2;
  return stops.map((stop) => {
    const point = toPlanar(stop);
    return {
      ...stop,
      x: offsetX + (point.x - minX) * unit,
      y: offsetY + (point.y - minY) * unit,
    };
  });
}

/** Moves a marker that lands on an earlier stop's point along the diagonal, so both stay visible. */
function placeMarkers(projected: Placed[]): Placed[] {
  const seen = new Map<string, number>();
  return projected.map((stop) => {
    const key = `${stop.x.toFixed(1)},${stop.y.toFixed(1)}`;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    const nudge = count * COLLISION_NUDGE;
    return { ...stop, x: stop.x + nudge, y: stop.y + nudge };
  });
}

// A static, server-rendered route. The only motion is the CSS draw in map-frame.module.css.
// Phase 4's RouteMap replaces the data source with a real Leaflet map.
export function MapFrame({ locations }: MapFrameProps) {
  if (locations.length === 0) return null;

  const stops = [...locations].sort((a, b) => a.day - b.day);
  const projected = project(stops);
  const markers = placeMarkers(projected);
  const path = projected
    .map(
      (stop, index) =>
        `${index === 0 ? 'M' : 'L'}${stop.x.toFixed(1)},${stop.y.toFixed(1)}`,
    )
    .join(' ');
  const first = stops[0]?.day;
  const last = stops.at(-1)?.day;

  return (
    <div className={styles.frame}>
      <svg
        className={styles.route}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Route map: ${stops.length} stops, days ${first} to ${last}`}
      >
        <path className={styles.outline} d={path} pathLength={1} />
        <path className={styles.line} d={path} pathLength={1} />
        {markers.map((marker) => (
          <g
            key={marker.day}
            className={styles.stop}
            transform={`translate(${marker.x.toFixed(1)} ${marker.y.toFixed(1)})`}
          >
            <rect
              x={-MARKER_WIDTH / 2}
              y={-MARKER_HEIGHT / 2}
              width={MARKER_WIDTH}
              height={MARKER_HEIGHT}
              rx={4}
            />
            <text>{marker.day}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
