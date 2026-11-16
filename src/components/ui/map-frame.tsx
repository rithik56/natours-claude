import {
  nudgeCoincident,
  type PlanarStop,
  type RouteStop,
  toPlanar,
} from '@/lib/route-projection';
import styles from './map-frame.module.css';

export type { RouteStop };

type MapFrameProps = {
  locations: RouteStop[];
  /** false holds the route still (no draw animation). The tour page uses it under the Leaflet map (C3). */
  animate?: boolean;
};

// The drawing area, in SVG user units. The same 400 by 240 box the Phase 2 mockup used.
const WIDTH = 400;
const HEIGHT = 240;

/**
 * The drawing sizes as numbers, because a Server Component cannot read a custom property.
 * Each value equals the token it names (UI-SPEC C6). The unit test in
 * test/components/ui/map-frame.test.ts reads tokens.css and fails if they drift.
 */
export const FRAME_TOKENS = {
  /** --space-5 (24px): the space around the route inside the drawing. */
  padding: 24,
  /** --space-3 (12px): the diagonal shift that keeps two stops on one point both visible. */
  nudge: 12,
  /** 1.5rem: the width of a day marker. */
  markerWidth: 24,
  /** 1.25rem: the height of a day marker. */
  markerHeight: 20,
  /** The Neel outline under the route. */
  outlineWidth: 8,
  /** The Highway yellow route line. */
  lineWidth: 4,
} as const;

const PADDING = FRAME_TOKENS.padding;
const MARKER_WIDTH = FRAME_TOKENS.markerWidth;
const MARKER_HEIGHT = FRAME_TOKENS.markerHeight;
// Two stops at the same place (Leh on day 1 and day 8) are nudged apart by this much.
const COLLISION_NUDGE = FRAME_TOKENS.nudge;

/**
 * Fits the planar stops into the viewBox. SVG y grows downwards, so north goes to the top (the y flip
 * happens here, after the shared projection). One scale factor is used on both axes, so the route is
 * never stretched.
 */
function fit(planar: PlanarStop[]): FittedStop[] {
  const flipped = planar.map((stop) => ({
    day: stop.day,
    x: stop.x,
    y: -stop.y,
  }));
  const minX = Math.min(...flipped.map((point) => point.x));
  const minY = Math.min(...flipped.map((point) => point.y));
  const spanX = Math.max(...flipped.map((point) => point.x)) - minX;
  const spanY = Math.max(...flipped.map((point) => point.y)) - minY;
  const scaleX = spanX > 0 ? (WIDTH - 2 * PADDING) / spanX : Infinity;
  const scaleY = spanY > 0 ? (HEIGHT - 2 * PADDING) / spanY : Infinity;
  const scale = Math.min(scaleX, scaleY);
  // A route with one stop, or only stops in a line, has an infinite scale on one axis.
  const unit = Number.isFinite(scale) ? scale : 1;
  const offsetX = (WIDTH - spanX * unit) / 2;
  const offsetY = (HEIGHT - spanY * unit) / 2;
  return flipped.map((point) => ({
    day: point.day,
    x: offsetX + (point.x - minX) * unit,
    y: offsetY + (point.y - minY) * unit,
  }));
}

/** A stop in SVG user units, inside the viewBox. */
type FittedStop = { day: number; x: number; y: number };

/** The accessible name of the route drawing, shared with the Leaflet map that replaces it (R8). */
export function mapLabel(locations: RouteStop[]): string {
  const sorted = [...locations].sort((a, b) => a.day - b.day);
  return `Route map: ${sorted.length} stops, days ${sorted[0]?.day} to ${sorted.at(-1)?.day}`;
}

// A static, server-rendered route. The only motion is the CSS draw in map-frame.module.css, and
// `animate={false}` holds it still. The Leaflet map replaces this drawing in the same box (R8, D-07).
export function MapFrame({ locations, animate = true }: MapFrameProps) {
  if (locations.length === 0) return null;

  const stops = [...locations].sort((a, b) => a.day - b.day);
  const projected = fit(toPlanar(stops));
  // Markers that land on one point are nudged apart; the route line itself is not nudged.
  const markers = nudgeCoincident(projected, COLLISION_NUDGE);
  const path = projected
    .map(
      (stop, index) =>
        `${index === 0 ? 'M' : 'L'}${stop.x.toFixed(1)},${stop.y.toFixed(1)}`,
    )
    .join(' ');

  return (
    <div className={styles.frame}>
      <svg
        className={animate ? styles.route : `${styles.route} ${styles.still}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={mapLabel(stops)}
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
