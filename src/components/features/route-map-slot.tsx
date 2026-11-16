'use client';
// client: IntersectionObserver must watch the slot in the browser (R1, R8)
import dynamic from 'next/dynamic';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { RouteStop } from '@/lib/route-projection';
import styles from './route-map.module.css';

// Leaflet is loaded only when the slot is about to scroll into view, so `/` and `/credits` never load it (R8).
const RouteMap = dynamic(() => import('./route-map'), { ssr: false });

type RouteMapSlotProps = {
  stops: RouteStop[];
  /** The MapFrame label, shared with the Leaflet map (R8). */
  label: string;
  /** The static route. It is shown until the Leaflet map is ready, and kept if the map fails (D-07). */
  children: ReactNode;
};

/**
 * Holds the static route in the slot and, once the slot is near the viewport, replaces it with the Leaflet
 * map in the same box (D-07). The itinerary list is a sibling outside this slot and is never touched here.
 */
export function RouteMapSlot({ stops, label, children }: RouteMapSlotProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === 'undefined') return undefined;
    // IntersectionObserver takes rootMargin in px or %, not rem, so 12rem is converted from the root font size.
    const rootSize =
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize) ||
      16;
    // One observer, and it fires once: the map mounts and stays mounted after that.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: `${12 * rootSize}px 0px` },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={styles.host} data-testid="route-map-slot">
      {ready ? null : children}
      {inView && !failed ? (
        <RouteMap
          stops={stops}
          label={label}
          onReady={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
