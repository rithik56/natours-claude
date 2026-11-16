import { Itinerary } from '@/components/ui/itinerary';
import { MapFrame, mapLabel, type RouteStop } from '@/components/ui/map-frame';
import { RouteMapSlot } from './route-map-slot';
import styles from './tour-route.module.css';

type TourStop = {
  day: number;
  description: string;
  /** GeoJSON order: longitude first, then latitude. */
  coordinates: number[];
};

type TourRouteProps = { locations: TourStop[] };

// D-07, R8, UI-SPEC "Route map": the static route holds a 5:3 slot and the day-by-day list sits beside it from 64em,
// below it on a phone. The list is always rendered, and a day without a stop does not appear (DES-18). Nothing animates here (C3).
export function TourRoute({ locations }: TourRouteProps) {
  if (locations.length === 0) return null;

  const ordered = [...locations].sort((a, b) => a.day - b.day);
  const stops: RouteStop[] = ordered.map((stop) => ({
    day: stop.day,
    lat: stop.coordinates[1] ?? 0,
    lng: stop.coordinates[0] ?? 0,
  }));
  const days = ordered.map((stop) => ({
    day: stop.day,
    summary: stop.description,
  }));

  return (
    <div className={styles.route}>
      <div className={styles.slot}>
        <RouteMapSlot stops={stops} label={mapLabel(stops)}>
          <MapFrame locations={stops} animate={false} />
        </RouteMapSlot>
      </div>
      <Itinerary days={days} />
    </div>
  );
}
