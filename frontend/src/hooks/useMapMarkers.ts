/**
 * useMapMarkers — manages Google Maps marker lifecycle.
 *
 * Note: GoogleMapComponent builds markers directly in its own useEffect to keep
 * the map instance, clusterer, and markers tightly coupled. This hook is exported
 * for use in other contexts that need standalone marker management.
 */
import { useEffect, useRef } from 'react';
import { WaterBody, RiskLevel } from '../types';
import { createMarkerIcon } from '../components/map/MapMarker';

interface UseMapMarkersOptions {
  /** Live Google Maps instance (null while loading) */
  map: google.maps.Map | null;
  waterBodies: WaterBody[];
  selectedWaterBody: WaterBody | null;
  onSelectWaterBody: (wb: WaterBody) => void;
  /** Whether to draw decorative pulse rings around markers */
  showRings: boolean;
}

interface UseMapMarkersResult {
  /** Current set of active markers (used by MarkerClusterer) */
  markers: google.maps.Marker[];
}

/**
 * Creates and manages Google Maps markers reactively.
 * Cleans up all markers and event listeners on re-render or unmount.
 */
export function useMapMarkers({
  map,
  waterBodies,
  selectedWaterBody,
  onSelectWaterBody,
  showRings,
}: UseMapMarkersOptions): UseMapMarkersResult {
  const markersRef = useRef<google.maps.Marker[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  useEffect(() => {
    if (!map) return;

    // Remove old listeners and markers
    listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
    listenersRef.current = [];
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const newMarkers: google.maps.Marker[] = [];

    waterBodies.forEach((wb) => {
      if (
        wb.latitude == null || wb.longitude == null ||
        isNaN(wb.latitude) || isNaN(wb.longitude)
      ) {
        return; // Skip invalid / missing coordinates safely
      }

      const isSelected = selectedWaterBody?.id === wb.id;
      const icon = createMarkerIcon(wb.current_risk_level as RiskLevel, isSelected, showRings);

      const marker = new google.maps.Marker({
        position: { lat: wb.latitude, lng: wb.longitude },
        map,
        title: wb.name,
        icon: {
          url: icon.url,
          scaledSize: new google.maps.Size(icon.scaledSize.width, icon.scaledSize.height),
          anchor: new google.maps.Point(icon.anchor.x, icon.anchor.y),
        },
        zIndex: isSelected ? 100 : 10,
        optimized: false, // Required for SVG data URL icons
      });

      const listener = marker.addListener('click', () => {
        onSelectWaterBody(wb);
      });

      listenersRef.current.push(listener);
      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;

    return () => {
      listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
      listenersRef.current = [];
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, waterBodies, selectedWaterBody, onSelectWaterBody, showRings]);

  return { markers: markersRef.current };
}
