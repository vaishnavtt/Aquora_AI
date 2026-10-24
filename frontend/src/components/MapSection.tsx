import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Globe,
  X,
  Map as MapIcon,
  Plus,
  Minus,
  Maximize2,
  Compass,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { WaterBody, RiskLevel, formatCoordinates } from '../types';
import { api } from '../services/api';
import { GoogleMapComponent } from './map/GoogleMapComponent';

interface MapSectionProps {
  waterBodies: WaterBody[];
  selectedStation: WaterBody | null;
  onSelectStation: (wb: WaterBody) => void;
}

type MapLayerType = 'light' | 'osm' | 'satellite' | 'simulation';
type MapEngine = 'leaflet' | 'google';

export const MapSection: React.FC<MapSectionProps> = ({
  waterBodies,
  selectedStation,
  onSelectStation,
}) => {
  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isGoogleMapsConfigured =
    Boolean(googleMapsKey) &&
    googleMapsKey !== 'your_google_maps_api_key_here' &&
    !googleMapsKey.toLowerCase().includes('placeholder');

  const [mapEngine, setMapEngine] = useState<MapEngine>(
    isGoogleMapsConfigured ? 'google' : 'leaflet'
  );
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('light');
  const [filterType, setFilterType] = useState<string>('all');
  const [showRings, setShowRings] = useState(true);
  const [satelliteNotice, setSatelliteNotice] = useState<string | null>(null);
  const [unsupportedLocationNotice, setUnsupportedLocationNotice] = useState<string | null>(null);

  // Check for authorized satellite map provider credentials
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const isMapboxConfigured = Boolean(mapboxToken) && mapboxToken !== 'your_mapbox_token_here';

  const filteredStations = waterBodies.filter((wb) => {
    if (filterType === 'all') return true;
    if (filterType === 'lake') return wb.type === 'lake' || wb.type === 'pond';
    return wb.type === filterType;
  });

  // Helper for risk marker styling
  const getMarkerBadge = (level: RiskLevel) => {
    switch (level) {
      case 'low':
        return {
          bg: 'bg-emerald-500',
          border: 'border-white',
          text: 'text-white',
          pulse: 'bg-emerald-400',
          hex: '#16A34A',
        };
      case 'moderate':
        return {
          bg: 'bg-amber-500',
          border: 'border-white',
          text: 'text-white',
          pulse: 'bg-amber-400',
          hex: '#EAB308',
        };
      case 'high':
      case 'extreme':
      default:
        return {
          bg: 'bg-rose-500',
          border: 'border-white',
          text: 'text-white',
          pulse: 'bg-rose-500',
          hex: '#DC2626',
        };
    }
  };

  // Initialize or re-configure Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // If simulation view is selected, destroy leaflet instance if active
    if (activeLayer === 'simulation') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = selectedStation
        ? [selectedStation.latitude, selectedStation.longitude]
        : [10.15, 76.50]; // Default to Kerala aquatic region

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: selectedStation ? 11 : 8,
        zoomControl: false,
        attributionControl: true,
      });

      mapInstanceRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);

      // Handle map clicks: coordinate lookup or explicit data-availability message
      map.on('click', async (e: L.LeafletMouseEvent) => {
        try {
          const found = await api.getWaterBodyByCoordinates(e.latlng.lat, e.latlng.lng, 0.08);
          onSelectStation(found);
          setUnsupportedLocationNotice(null);
        } catch {
          setUnsupportedLocationNotice(
            `Coordinates (${formatCoordinates(e.latlng.lat, e.latlng.lng, 4)}): No monitored telemetry sensor is stationed here. AQUORA AI strictly does NOT assign fabricated observations to unsupported coordinates.`
          );
        }
      });
    }

    const map = mapInstanceRef.current;

    // Update tile layer based on active selection
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    if (activeLayer === 'light') {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
          subdomains: 'abcd',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map);
      setSatelliteNotice(null);
    } else if (activeLayer === 'osm') {
      tileLayerRef.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      }).addTo(map);
      setSatelliteNotice(null);
    } else if (activeLayer === 'satellite') {
      if (isMapboxConfigured) {
        const mapboxLayer = L.tileLayer(
          `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
          {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.mapbox.com/" target="_blank">Mapbox</a> &copy; <a href="https://www.maxar.com/" target="_blank">Maxar</a>',
          }
        );
        mapboxLayer.on('tileerror', () => {
          setSatelliteNotice(
            'Mapbox satellite token rejected or invalid. Switched to authentic public Esri World Imagery.'
          );
          if (mapInstanceRef.current && tileLayerRef.current === mapboxLayer) {
            map.removeLayer(mapboxLayer);
            const fallbackLayer = L.tileLayer(
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
              }
            ).addTo(map);
            tileLayerRef.current = fallbackLayer;
          }
        });
        mapboxLayer.addTo(map);
        tileLayerRef.current = mapboxLayer;
        setSatelliteNotice(null);
      } else {
        tileLayerRef.current = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          }
        ).addTo(map);
        setSatelliteNotice(
          'Authentic Public Earth Observation Satellite Imagery active (Esri/USGS World Imagery). Commercial Mapbox satellite requires VITE_MAPBOX_TOKEN in frontend/.env.'
        );
      }
    }

    // Invalidate size
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [activeLayer, isMapboxConfigured]);

  // Update Markers when stations or selectedStation changes
  useEffect(() => {
    if (activeLayer === 'simulation' || !mapInstanceRef.current || !markersLayerRef.current) return;

    const layerGroup = markersLayerRef.current;
    layerGroup.clearLayers();

    const bounds: [number, number][] = [];

    filteredStations.forEach((station) => {
      const isSelected = selectedStation?.id === station.id;
      const badge = getMarkerBadge(station.current_risk_level);
      const pos: [number, number] = [station.latitude, station.longitude];
      bounds.push(pos);

      const html = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
          ${
            showRings
              ? `<span class="absolute w-8 h-8 rounded-full opacity-40 animate-ping" style="background-color: ${badge.hex};"></span>`
              : ''
          }
          <div class="relative flex items-center justify-center w-7 h-7 rounded-full border-2 border-white transition-all shadow-md ${badge.bg} ${
            isSelected ? 'scale-125 ring-3 ring-[#1677D2]' : ''
          }">
            <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div class="absolute left-1/2 -translate-x-1/2 top-7.5 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-sm border ${
            isSelected ? 'bg-[#172B4D] text-white border-[#1677D2]' : 'bg-white text-[#172B4D] border-[#E2E8F0]'
          } pointer-events-none">
            ${station.name.replace(' (DEMO Station)', '')} (${station.risk_score.toFixed(0)})
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'aquora-custom-marker',
        html: html,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker(pos, { icon: customIcon });
      marker.on('click', () => {
        onSelectStation(station);
        setUnsupportedLocationNotice(null);
      });
      layerGroup.addLayer(marker);
    });

    if (selectedStation && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([selectedStation.latitude, selectedStation.longitude], {
        animate: true,
        duration: 0.6,
      });
    } else if (bounds.length > 0 && mapInstanceRef.current) {
      try {
        mapInstanceRef.current.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 13 });
      } catch {
        // Safe fallback
      }
    }
  }, [filteredStations, selectedStation, showRings, activeLayer]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleResetView = () => {
    if (mapInstanceRef.current && filteredStations.length > 0) {
      const bounds = filteredStations.map((s) => [s.latitude, s.longitude] as [number, number]);
      mapInstanceRef.current.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
      {/* Top Map Toolbar */}
      <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1677D2] border border-[#BFDBFE] flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#172B4D] flex items-center gap-2">
              Geospatial Hazard Map
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1677D2] border border-[#BFDBFE] font-bold uppercase">
                {activeLayer === 'simulation'
                  ? 'SIMULATION GRID'
                  : activeLayer === 'satellite'
                  ? (isMapboxConfigured ? 'MAPBOX SATELLITE ACTIVE' : 'ESRI SATELLITE ACTIVE')
                  : activeLayer === 'light'
                  ? 'CARTO LIGHT ACTIVE'
                  : 'OPENSTREETMAP ACTIVE'}
              </span>
            </h2>
            <p className="text-xs text-[#64748B]">
              Real-world geographic cartography with live hydrodynamic risk overlays. Works without commercial API keys.
            </p>
          </div>
        </div>

        {/* Map Engine Selector */}
        <div className="flex items-center rounded-xl bg-[#F8FAFC] p-1 border border-[#E2E8F0] text-xs">
          <button
            onClick={() => setMapEngine('leaflet')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              mapEngine === 'leaflet'
                ? 'bg-white text-[#1677D2] border border-[#CBD5E1] shadow-xs'
                : 'text-[#64748B] hover:text-[#172B4D]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-[#1677D2]" />
            Leaflet (Zero-Key)
          </button>
          <button
            onClick={() => setMapEngine('google')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              mapEngine === 'google'
                ? 'bg-white text-amber-700 border border-[#CBD5E1] shadow-xs'
                : 'text-[#64748B] hover:text-[#172B4D]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5 text-amber-600" />
            Google Maps
          </button>
        </div>

        {/* Filter & Layer Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Map Layer Switcher */}
          <div className="flex items-center rounded-xl bg-[#F8FAFC] p-1 border border-[#E2E8F0]">
            <button
              onClick={() => setActiveLayer('light')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeLayer === 'light' ? 'bg-[#1677D2] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              Light Map
            </button>
            <button
              onClick={() => setActiveLayer('osm')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeLayer === 'osm' ? 'bg-[#1677D2] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              Street Map
            </button>
            <button
              onClick={() => setActiveLayer('satellite')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeLayer === 'satellite' ? 'bg-[#1677D2] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setActiveLayer('simulation')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeLayer === 'simulation' ? 'bg-[#1677D2] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              Radar Grid
            </button>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-1 text-[#172B4D] text-xs focus:outline-none focus:border-[#1677D2] cursor-pointer"
          >
            <option value="all">All Aquatic Types ({waterBodies.length})</option>
            <option value="river">Rivers & Riverbanks</option>
            <option value="quarry">Abandoned Quarries</option>
            <option value="waterfall">Waterfalls & Cascades</option>
            <option value="lake">Ponds & Lakes</option>
            <option value="reservoir">Reservoirs & Dams</option>
            <option value="canal">Canals & Waterways</option>
          </select>

          <button
            onClick={() => setShowRings(!showRings)}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              showRings
                ? 'bg-[#EFF6FF] text-[#1677D2] border-[#BFDBFE]'
                : 'bg-white text-[#64748B] border-[#E2E8F0]'
            }`}
          >
            Perimeter Rings
          </button>
        </div>
      </div>

      {/* Satellite Credentials Transparency Notification Banner */}
      {satelliteNotice && activeLayer === 'satellite' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{satelliteNotice}</span>
          </div>
          <span className="text-[10px] font-mono text-[#1677D2] bg-white px-2 py-0.5 rounded border border-[#BFDBFE] whitespace-nowrap font-bold">
            Esri World Imagery (Satellite)
          </span>
        </div>
      )}

      {/* Unsupported Location Data-Availability Notice */}
      {unsupportedLocationNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{unsupportedLocationNotice}</span>
          </div>
          <button
            onClick={() => setUnsupportedLocationNotice(null)}
            className="text-amber-800 hover:text-amber-950 p-1 rounded hover:bg-amber-100 transition-colors cursor-pointer"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {mapEngine === 'google' ? (
        <div className="w-full h-full min-h-[480px] p-2 bg-[#F8FAFC]">
          <GoogleMapComponent
            waterBodies={waterBodies}
            selectedStation={selectedStation}
            onSelectStation={onSelectStation}
          />
        </div>
      ) : (
        <div className="relative w-full h-[480px] bg-[#F8FAFC] overflow-hidden select-none">
          {/* Real Leaflet Map Container */}
          {activeLayer !== 'simulation' ? (
            <div ref={mapContainerRef} className="w-full h-full z-0" />
          ) : (
            /* Bathymetric Radar Grid View */
            <div className="relative w-full h-full bg-[#F8FAFC] overflow-hidden">
              <div className="w-full h-full bg-[radial-gradient(#CBD5E1_1.5px,transparent_1.5px)] [background-size:28px_28px] opacity-70" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-[#93C5FD]/40 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full border border-[#BFDBFE]/30 pointer-events-none" />

              {/* Plotted Risk-Colored Station Markers on Simulation Grid */}
              {filteredStations.map((station, index) => {
                const isSelected = selectedStation?.id === station.id;
                const badge = getMarkerBadge(station.current_risk_level);
                const baseLeft = 18 + index * 14 + (station.id % 3) * 6;
                const baseTop = 22 + (index % 4) * 16 + (station.id % 2) * 8;

                return (
                  <div
                    key={station.id}
                    onClick={() => onSelectStation(station)}
                    style={{
                      left: `${Math.max(8, Math.min(90, baseLeft))}%`,
                      top: `${Math.max(12, Math.min(84, baseTop))}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group focus:outline-none z-10"
                  >
                    {showRings && (
                      <span
                        className={`absolute inset-0 -m-3 rounded-full opacity-40 animate-ping pointer-events-none ${badge.pulse}`}
                      />
                    )}
                    <div
                      className={`relative flex items-center justify-center p-2 rounded-full border-2 border-white transition-all duration-200 shadow-md ${
                        badge.bg
                      } ${
                        isSelected ? 'scale-125 ring-3 ring-[#1677D2]' : 'group-hover:scale-110'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 top-9 px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap shadow-sm border transition-all pointer-events-none z-20 ${
                        isSelected
                          ? 'bg-[#172B4D] text-white border-[#1677D2] opacity-100 scale-100'
                          : 'bg-white text-[#172B4D] border-[#E2E8F0] opacity-80 group-hover:opacity-100 scale-95 group-hover:scale-100'
                      }`}
                    >
                      <span>{station.name.replace(' (DEMO Station)', '')}</span>
                      <span className="font-mono text-[#1677D2] ml-1">
                        ({station.risk_score.toFixed(0)})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Viewport Overlay Controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2 z-20">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-2.5 rounded-xl bg-white/95 hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#172B4D] shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-2.5 rounded-xl bg-white/95 hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#172B4D] shadow-sm transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetView}
              title="Fit All Stations"
              className="p-2.5 rounded-xl bg-white/95 hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#172B4D] shadow-sm transition-colors cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Map Info Ribbon */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-none">
            <div className="px-3 py-1.5 rounded-xl bg-white/95 border border-[#E2E8F0] text-xs font-mono text-[#172B4D] shadow-sm pointer-events-auto flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#1677D2]" />
              <span>
                {selectedStation
                  ? `${selectedStation.name.replace(' (DEMO Station)', '')} (${formatCoordinates(selectedStation.latitude, selectedStation.longitude, 4)})`
                  : 'AQUORA Monitored Hydrological Stations'}
              </span>
            </div>

            {/* Color-Coded Legend */}
            <div className="px-3.5 py-1.5 rounded-xl bg-white/95 border border-[#E2E8F0] text-xs text-[#172B4D] shadow-sm pointer-events-auto flex items-center space-x-3">
              <span className="font-bold text-[#64748B] uppercase tracking-wider text-[10px]">
                Risk Legend:
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span>Low (&lt;30)</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308]" />
                <span>Moderate (30-60)</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                <span>High / Extreme (&gt;60)</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
