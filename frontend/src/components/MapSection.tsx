import React from 'react';
import { WaterBody } from '../types';
import { GoogleMapComponent } from './map/GoogleMapComponent';

interface MapSectionProps {
  waterBodies: WaterBody[];
  selectedStation: WaterBody | null;
  onSelectStation: (wb: WaterBody) => void;
}

/**
 * MapSection — public map surface rendered on the Overview and Map tabs.
 *
 * This component wraps GoogleMapComponent (Google Maps JavaScript API via
 * @googlemaps/js-api-loader) which replaced the previous Leaflet implementation.
 *
 * Requires VITE_GOOGLE_MAPS_API_KEY in the environment. If the key is absent,
 * GoogleMapComponent renders a setup-instructions fallback instead of crashing.
 */
export const MapSection: React.FC<MapSectionProps> = ({
  waterBodies,
  selectedStation,
  onSelectStation,
}) => {
  return (
    <div className="w-full h-full min-h-[480px]">
      <GoogleMapComponent
        waterBodies={waterBodies}
        selectedStation={selectedStation}
        onSelectStation={onSelectStation}
      />
    </div>
  );
};
