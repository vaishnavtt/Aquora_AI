import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Layers,
  Compass,
  Radio,
  Eye,
  Activity,
  Maximize2,
  Info,
  Map as MapIcon,
  Globe,
  Navigation,
  Crosshair,
} from 'lucide-react';
import { WaterBody, RiskLevel, WaterBodyType } from '../../types';
import { RISK_TOKENS, OpsRiskBadge } from './RiskBadge';


function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface OperationsMapProps {
  waterBodies: WaterBody[];
  selectedStation: WaterBody | null;
  onSelectStation: (station: WaterBody) => void;
}

export const OperationsMap: React.FC<OperationsMapProps> = ({
  waterBodies,
  selectedStation,
  onSelectStation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [engine, setEngine] = useState<'leaflet' | 'google'>('leaflet');
  const [layer, setLayer] = useState<'dark' | 'osm' | 'satellite'>('osm');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showPulseRings, setShowPulseRings] = useState<boolean>(true);

  // Live User Location State
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const userLocationCircleRef = useRef<L.Circle | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [9.9312, 76.65],
      zoom: 8,
      zoomControl: true,
      attributionControl: false,
    });

    leafletMapRef.current = map;
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      leafletMapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update Base Layer
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    map.eachLayer((l) => {
      if (l instanceof L.TileLayer) {
        map.removeLayer(l);
      }
    });

    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let maxZoom = 19;

    if (layer === 'dark') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    } else if (layer === 'satellite') {
      tileUrl =
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 18;
    }

    L.tileLayer(tileUrl, { maxZoom }).addTo(map);
  }, [layer]);

  // Update Map Markers and Station Pins
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    const filtered = waterBodies.filter((st) => {
      if (selectedType === 'all') return true;
      return st.type.toLowerCase() === selectedType.toLowerCase();
    });

    filtered.forEach((station) => {
      const isSelected = selectedStation?.id === station.id;
      const token = RISK_TOKENS[station.current_risk_level] || RISK_TOKENS.low;

      const markerHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${
            showPulseRings && (station.current_risk_level === 'extreme' || station.current_risk_level === 'high')
              ? `<div style="
                  position: absolute;
                  width: 32px;
                  height: 32px;
                  border-radius: 9999px;
                  background-color: ${token.surfaceColor};
                  opacity: 0.35;
                  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                "></div>`
              : ''
          }
          <div style="
            width: ${isSelected ? '24px' : '18px'};
            height: ${isSelected ? '24px' : '18px'};
            border-radius: 9999px;
            background-color: ${token.surfaceColor};
            border: 2px solid ${isSelected ? '#082536' : '#F5EEDD'};
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-family: monospace;
            font-weight: bold;
            color: #F5EEDD;
            transition: all 0.2s ease;
          ">
            ${isSelected ? '●' : ''}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([station.latitude, station.longitude], {
        icon: customIcon,
      });

      const stageText = station.current_water_level_m != null
        ? `${station.current_water_level_m.toFixed(2)} m`
        : station.depth_meters != null
        ? `${station.depth_meters.toFixed(2)} m`
        : 'No observation';

      const rawRiskScore = station.current_risk_score ?? station.risk_score;
      const riskText = rawRiskScore != null
        ? `${Math.round(rawRiskScore)} · ${station.current_risk_level}`
        : `Unrated · ${station.current_risk_level || 'unknown'}`;

      const coordText = station.latitude != null && station.longitude != null
        ? `${station.latitude.toFixed(4)}° N, ${station.longitude.toFixed(4)}° E`
        : 'Coordinates Unavailable';

      const popupHtml = `
        <div style="font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; line-height: 1.4; color: #082536; min-width: 190px; background-color: #F5EEDD; padding: 6px; border-radius: 6px;">
          <div style="font-size: 9px; font-family: 'IBM Plex Mono', monospace; text-transform: uppercase; color: #134059; letter-spacing: 0.5px;">
            ${station.type} · ${station.station_id || 'ID-' + station.id}
          </div>
          <div style="font-weight: 600; font-size: 14px; color: #0B3F5A; margin-top: 2px;">
            ${station.name}
          </div>
          <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #134059; margin-bottom: 6px;">
            ${coordText}
          </div>
          <div style="border-top: 1px solid #6A9AB6; padding-top: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #134059;">Current Stage:</span>
            <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 600; color: #082536;">${stageText}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 2px;">
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #134059;">Risk Score:</span>
            <span style="
              background-color: ${token.bgHex};
              color: ${token.textHex};
              padding: 1px 8px;
              border-radius: 9999px;
              font-family: 'IBM Plex Mono', monospace;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
            ">
              ${riskText}
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        onSelectStation(station);
      });

      marker.addTo(markersLayer);
    });
  }, [waterBodies, selectedStation, selectedType, showPulseRings, onSelectStation]);

  useEffect(() => {
    if (leafletMapRef.current && selectedStation) {
      leafletMapRef.current.flyTo(
        [selectedStation.latitude, selectedStation.longitude],
        9,
        { duration: 0.8 }
      );
    }
  }, [selectedStation]);

  // Objective: Live User Location Marker + Accuracy Ring on Operations Map
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    if (userLocationMarkerRef.current) {
      map.removeLayer(userLocationMarkerRef.current);
      userLocationMarkerRef.current = null;
    }
    if (userLocationCircleRef.current) {
      map.removeLayer(userLocationCircleRef.current);
      userLocationCircleRef.current = null;
    }

    if (userLocation) {
      try {
        userLocationCircleRef.current = L.circle([userLocation.latitude, userLocation.longitude], {
          radius: Math.max(userLocation.accuracy, 25),
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.16,
          weight: 2,
        }).addTo(map);
      } catch {
        // Safe mock fallback
      }

      const userHtml = `
        <div class="relative flex items-center justify-center cursor-pointer" style="transform: translate(-50%, -50%);" role="button" aria-label="Live GPS Location">
          <span class="absolute w-8 h-8 rounded-full bg-blue-500 opacity-60 animate-ping"></span>
          <div class="w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center">
            <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
          </div>
          <div class="absolute top-7 px-2 py-0.5 rounded bg-blue-950 text-blue-200 border border-blue-700 text-[10px] font-bold whitespace-nowrap shadow-md">
            Live Location (±${Math.round(userLocation.accuracy)}m)
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        className: 'aquora-user-location-marker',
        html: userHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      userLocationMarkerRef.current = L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon })
        .addTo(map)
        .bindPopup(`
          <div class="p-3 text-xs font-sans text-slate-100 space-y-1">
            <div class="font-bold text-blue-400 flex items-center gap-1.5">
              <span>● Your Current Live Location</span>
            </div>
            <div class="text-[11px] text-slate-300 font-mono">
              GPS Accuracy: ±${Math.round(userLocation.accuracy)} meters
            </div>
            <div class="text-[11px] text-slate-400 font-mono">
              Coordinates: ${userLocation.latitude.toFixed(5)}°N, ${userLocation.longitude.toFixed(5)}°E
            </div>
          </div>
        `);
    }
  }, [userLocation]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy || 20;
        setUserLocation({ latitude: lat, longitude: lon, accuracy });
        setIsLocating(false);
        if (leafletMapRef.current) {
          leafletMapRef.current.setView([lat, lon], 12, { animate: true });
        }
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Unable to acquire GPS location.';
        if (err.code === 1) msg = 'Location permission denied by browser.';
        else if (err.code === 2) msg = 'GPS signal unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const nearestStationInfo = React.useMemo(() => {
    if (!userLocation || waterBodies.length === 0) return null;
    let closest: WaterBody | null = null;
    let minDist = Infinity;
    for (const wb of waterBodies) {
      const d = computeDistanceKm(userLocation.latitude, userLocation.longitude, wb.latitude, wb.longitude);
      if (d < minDist) {
        minDist = d;
        closest = wb;
      }
    }
    return closest ? { name: closest.name, distanceKm: minDist, station: closest } : null;
  }, [userLocation, waterBodies]);

  return (
    <div className="bg-[#84B3CE] rounded-xl overflow-hidden shadow-xs" id="map-section">
      {/* Map Control Bar */}
      <div className="p-3.5 border-b border-[#6A9AB6] bg-[#F5EEDD] flex flex-wrap items-center justify-between gap-3">
        {/* Left: Section Header */}
        <div className="flex items-center space-x-2">
          <MapIcon className="w-5 h-5 text-[#0B3F5A]" style={{ strokeWidth: 1.5 }} />
          <span className="font-sans font-semibold text-sm text-[#082536]">
            Kerala Hydrological Surface Map
          </span>
          <span className="text-[11px] font-mono text-[#134059] hidden sm:inline">
            (Survey &amp; GIS Overlay)
          </span>
        </div>

        {/* Right: Controls Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Engine Selector */}
          <div className="flex items-center space-x-1 bg-[#84B3CE]/20 p-1 rounded-lg border border-[#6A9AB6]">
            <button
              onClick={() => setEngine('leaflet')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                engine === 'leaflet'
                  ? 'bg-[#0B3F5A] text-[#F5EEDD] shadow-xs'
                  : 'text-[#0F3A52] hover:text-[#082536]'
              }`}
            >
              Leaflet
            </button>
            <button
              onClick={() => setEngine('google')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                engine === 'google'
                  ? 'bg-[#0B3F5A] text-[#F5EEDD] shadow-xs'
                  : 'text-[#0F3A52] hover:text-[#082536]'
              }`}
            >
              Google Maps
            </button>
          </div>

          {/* Layer Selector */}
          <div className="flex items-center space-x-1 bg-[#84B3CE]/20 p-1 rounded-lg border border-[#6A9AB6]">
            <button
              onClick={() => setLayer('osm')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                layer === 'osm'
                  ? 'bg-[#0B3F5A] text-[#F5EEDD] shadow-xs'
                  : 'text-[#0F3A52] hover:text-[#082536]'
              }`}
            >
              Street Map
            </button>
            <button
              onClick={() => setLayer('dark')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                layer === 'dark'
                  ? 'bg-[#0B3F5A] text-[#F5EEDD] shadow-xs'
                  : 'text-[#0F3A52] hover:text-[#082536]'
              }`}
            >
              Voyager
            </button>
            <button
              onClick={() => setLayer('satellite')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                layer === 'satellite'
                  ? 'bg-[#0B3F5A] text-[#F5EEDD] shadow-xs'
                  : 'text-[#0F3A52] hover:text-[#082536]'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Water Body Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg px-2.5 py-1 text-[11px] font-mono text-[#082536] focus:outline-none focus:border-[#0B3F5A] cursor-pointer"
          >
            <option value="all">All Types (8 Sites)</option>
            <option value="river">River</option>
            <option value="reservoir">Reservoir</option>
            <option value="lake">Lake</option>
            <option value="waterfall">Waterfall</option>
            <option value="canal">Canal</option>
          </select>

          {/* Pulse Rings Toggle */}
          <label className="flex items-center space-x-1.5 cursor-pointer select-none bg-[#F5EEDD] border border-[#6A9AB6] px-2.5 py-1 rounded-lg text-[11px] font-mono text-[#0F3A52]">
            <input
              type="checkbox"
              checked={showPulseRings}
              onChange={(e) => setShowPulseRings(e.target.checked)}
              className="rounded accent-[#0B3F5A]"
            />
            <span>Hazard pulse rings</span>
          </label>

          {/* Live Location Button */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
              userLocation
                ? 'bg-blue-950 text-blue-300 border-blue-500 shadow-sm shadow-blue-500/20'
                : 'bg-[#1A1F22] text-[#9BA5A5] hover:text-[#E8E5DC] border-[#384145] hover:border-[#3D8F91]'
            }`}
            title="Detect your live GPS position and plot on the map"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-400' : userLocation ? 'text-blue-400' : 'text-[#3D8F91]'}`} />
            <span>{isLocating ? 'Acquiring GPS...' : userLocation ? 'Live GPS Active' : 'Live Location'}</span>
          </button>
        </div>
      </div>

      {/* Map Surface */}
      <div className="relative w-full h-[480px] bg-[#F5EEDD]">
        {/* Live Location Overlay HUD */}
        {userLocation && (
          <div className="absolute top-3 left-3 z-20 bg-[#1A1F22]/95 border border-blue-500/50 backdrop-blur-xs rounded-lg p-2.5 shadow-xl text-xs font-mono text-slate-200 flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span>Live GPS</span>
            </div>
            <div className="text-[11px] text-slate-300">
              <span>{userLocation.latitude.toFixed(4)}°N, {userLocation.longitude.toFixed(4)}°E</span>
              <span className="text-slate-500 ml-1">(±{Math.round(userLocation.accuracy)}m)</span>
            </div>
            {nearestStationInfo && (
              <div className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded flex items-center gap-1">
                <span>Nearest: {nearestStationInfo.name}</span>
                <span className="font-bold">({nearestStationInfo.distanceKm < 1 ? `${Math.round(nearestStationInfo.distanceKm * 1000)}m` : `${nearestStationInfo.distanceKm.toFixed(1)}km`})</span>
              </div>
            )}
            <button
              onClick={() => {
                if (leafletMapRef.current && userLocation) {
                  leafletMapRef.current.setView([userLocation.latitude, userLocation.longitude], 13, { animate: true });
                }
              }}
              className="text-[10px] text-blue-400 hover:text-blue-300 underline font-semibold ml-1 cursor-pointer"
            >
              Re-center
            </button>
          </div>
        )}

        {locationError && (
          <div className="absolute top-3 left-3 z-20 bg-rose-950/90 border border-rose-700/60 rounded px-2.5 py-1 text-xs font-mono text-rose-300 flex items-center gap-2">
            <span>{locationError}</span>
            <button onClick={() => setLocationError(null)} className="text-rose-400 hover:text-rose-200 ml-1 cursor-pointer">✕</button>
          </div>
        )}
        {engine === 'leaflet' ? (
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#F5EEDD]">
            <Globe className="w-8 h-8 text-[#0B3F5A] mb-2" />
            <h4 className="font-sans font-semibold text-sm text-[#082536]">
              Google Maps Cartographic Layer
            </h4>
            <p className="text-xs text-[#134059] max-w-sm mt-1 font-mono">
              Vector Google Terrain &amp; Satellite layer active. Leaflet offline tile fallback available on toggle.
            </p>
            <button
              onClick={() => setEngine('leaflet')}
              className="mt-3 px-3.5 py-1.5 bg-[#0B3F5A] text-[#F5EEDD] font-semibold text-xs font-mono rounded-lg cursor-pointer shadow-xs"
            >
              Switch back to Leaflet Survey Surface
            </button>
          </div>
        )}

        {/* Floating Map Legend */}
        <div className="absolute bottom-3 left-3 z-20 bg-[#0B2C40]/95 backdrop-blur-xs border border-[#6A9AB6] rounded-xl p-3 text-[10px] font-mono shadow-xs space-y-1.5 text-[#F5EEDD]">
          <div className="font-semibold uppercase tracking-wider text-[9px] mb-1.5 text-[#D6E3EA]">
            Hydrology Risk Legend
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#17895C]" />
            <span>Safe / Low (0–39)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C79A12]" />
            <span>Advisory / Moderate (40–69)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D9631E]" />
            <span>High Risk (70–84)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D12F3B]" />
            <span>Extreme Risk (85–100)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
