import { MapFrame, type RouteStop } from '@/components/ui/map-frame';
import styles from '../styleguide.module.css';

// The eight stops of Ladakh High Passes, from seed/data/tours.json. Coordinates are
// rewritten from GeoJSON's [lng, lat] order into lat and lng. Day 8 starts where Day 1 starts.
const ladakhStops: RouteStop[] = [
  { day: 1, lat: 34.15287, lng: 77.57726 },
  { day: 2, lat: 34.05567, lng: 77.6665 },
  { day: 3, lat: 34.27833, lng: 77.60417 },
  { day: 4, lat: 34.57584, lng: 77.49482 },
  { day: 5, lat: 33.90719, lng: 78.4573 },
  { day: 6, lat: 34.04704, lng: 77.93054 },
  { day: 7, lat: 33.91248, lng: 77.70283 },
  { day: 8, lat: 34.15287, lng: 77.57726 },
];

export function MapFrameSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-map-frame">
      <h2 id="styleguide-map-frame">Map frame</h2>
      <p className={styles.note}>
        The route line draws once, in 1.2 seconds, when it first appears. With
        reduced motion on, it is already drawn and nothing moves. The stops come
        from the real Ladakh High Passes itinerary.
      </p>
      <MapFrame locations={ladakhStops} />
    </section>
  );
}
