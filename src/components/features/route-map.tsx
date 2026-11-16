'use client';
// client: Leaflet needs the DOM, and it is loaded only after the slot scrolls into view (R1, R8)
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { FRAME_TOKENS } from '@/components/ui/map-frame';
import {
  nudgeCoincident,
  type RouteStop,
  toPlanar,
} from '@/lib/route-projection';
import './leaflet-vendor.css';
import styles from './route-map.module.css';

type RouteMapProps = {
  stops: RouteStop[];
  /** The MapFrame label, so the map and the static drawing it replaces have one accessible name (R8). */
  label: string;
  /** Called once the route, and the boundary when it loads, are drawn. */
  onReady: () => void;
  /** Called on any thrown error; the static route then stays in the slot. */
  onError: () => void;
};

/** A length token in CSS pixels, read from the document (a rem is the root font size). */
function tokenPixels(name: string): number {
  const root = getComputedStyle(document.documentElement);
  const raw = root.getPropertyValue(name).trim();
  const rootSize = Number.parseFloat(root.fontSize) || 16;
  const value = Number.parseFloat(raw);
  return raw.endsWith('rem') ? value * rootSize : value;
}

/**
 * The non-interactive Leaflet route map (R8, D-07, ADR 0034). It draws the route once, in the same box as
 * the static MapFrame, from the same projection. It has no tile layer and no drag, zoom or keyboard control.
 */
export default function RouteMap({
  stops,
  label,
  onReady,
  onError,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // The callbacks are read through a ref, so a parent that passes new functions does not rebuild the map.
  const callbacks = useRef({ onReady, onError });
  useEffect(() => {
    callbacks.current = { onReady, onError };
  }, [onReady, onError]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let map: L.Map | null = null;
    try {
      const created = L.map(container, {
        // CRS.Simple reads a point as (lng, lat), so the planar x goes in as lng and y as lat.
        crs: L.CRS.Simple,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
        inertia: false,
        zoomSnap: 0,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });
      map = created;
      const toLatLng = (x: number, y: number) => L.latLng(y, x);
      const planar = toPlanar(stops);
      const latlngs = planar.map((stop) => toLatLng(stop.x, stop.y));

      // The same fit as MapFrame: the route's bounds, inset by --space-5 (C6).
      const pad = tokenPixels('--space-5');
      created.fitBounds(L.latLngBounds(latlngs), {
        padding: [pad, pad],
        animate: false,
        maxZoom: 12,
      });

      // Route line: the outline under the yellow line, both drawn once by the CSS dash (RESEARCH A5).
      const outline = L.polyline(latlngs, {
        interactive: false,
        className: styles.outline,
        weight: FRAME_TOKENS.outlineWidth,
      }).addTo(created);
      const line = L.polyline(latlngs, {
        interactive: false,
        className: styles.line,
        weight: FRAME_TOKENS.lineWidth,
      }).addTo(created);
      for (const layer of [outline, line]) {
        layer.getElement()?.setAttribute('pathLength', '1');
      }

      // Markers: nudged apart in pixels, as MapFrame nudges them in SVG units (C6). Text is set with textContent.
      const pixels = planar.map((stop) => {
        const point = created.latLngToLayerPoint(toLatLng(stop.x, stop.y));
        return { day: stop.day, x: point.x, y: point.y };
      });
      for (const marker of nudgeCoincident(pixels, FRAME_TOKENS.nudge)) {
        const element = document.createElement('span');
        element.className = styles.marker ?? '';
        element.textContent = String(marker.day);
        const icon = L.divIcon({
          html: element,
          className: styles.icon,
          iconSize: [FRAME_TOKENS.markerWidth, FRAME_TOKENS.markerHeight],
          iconAnchor: [
            FRAME_TOKENS.markerWidth / 2,
            FRAME_TOKENS.markerHeight / 2,
          ],
        });
        L.marker(created.layerPointToLatLng(L.point(marker.x, marker.y)), {
          icon,
          interactive: false,
          keyboard: false,
        }).addTo(created);
      }

      callbacks.current.onReady();
    } catch {
      map?.remove();
      map = null;
      callbacks.current.onError();
    }
    return () => {
      map?.remove();
    };
  }, [stops]);

  return (
    <div
      ref={containerRef}
      className={styles.map}
      role="img"
      aria-label={label}
    />
  );
}
