import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, Globe, Layers, Filter } from 'lucide-react';
import { WaterBody, RiskLevel } from '../../types';
import { RISK_TOKENS } from './RiskBadge';

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
  const [layer, setLayer] = useState<'osm' | 'voyager' | 'satellite'>('osm');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showPulseRings, setShowPulseRings] = useState<boolean>(true);

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

    if (layer === 'voyager') {
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
                  width: 34px;
                  height: 34px;
                  border-radius: 9999px;
                  background-color: ${token.surfaceColor};
                  opacity: 0.25;
                  animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
                "></div>`
              : ''
          }
          <div style="
            width: ${isSelected ? '24px' : '18px'};
            height: ${isSelected ? '24px' : '18px'};
            border-radius: 9999px;
            background-color: ${token.surfaceColor};
            border: ${isSelected ? '3px solid #FFFFFF' : '2px solid #FFFFFF'};
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-size: 10px;
            font-weight: bold;
            transition: all 0.2s ease;
          ">
            ${isSelected ? '●' : ''}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: markerHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
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
        <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-size: 12px; line-height: 1.4; color: #172B4D; min-width: 200px; background-color: #FFFFFF; padding: 10px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px;">
            ${station.type} · ${station.station_id || 'ID-' + station.id}
          </div>
          <div style="font-weight: 700; font-size: 15px; color: #172B4D; margin-top: 2px;">
            ${station.name}
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;">
            ${coordText}
          </div>
          <div style="border-top: 1px solid #E2E8F0; padding-top: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; color: #64748B;">Current Stage:</span>
            <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #172B4D;">${stageText}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 2px;">
            <span style="font-size: 11px; color: #64748B;">Risk Score:</span>
            <span style="
              background-color: ${token.bgHex};
              border: 1px solid ${token.borderHex};
              color: ${token.textHex};
              padding: 2px 8px;
              border-radius: 9999px;
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              font-weight: 700;
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]" id="map-section">
      {/* Map Control Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Section Header */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1677D2] flex items-center justify-center">
            <MapIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-[#172B4D]">
              Kerala Hydrological Surface Map
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline ml-1.5 font-normal">
              &bull; Real-time station telemetry
            </span>
          </div>
        </div>

        {/* Right: Controls Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Layer Selector */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setLayer('osm')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                layer === 'osm'
                  ? 'bg-white text-[#1677D2] shadow-2xs'
                  : 'text-slate-600 hover:text-[#172B4D]'
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setLayer('voyager')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                layer === 'voyager'
                  ? 'bg-white text-[#1677D2] shadow-2xs'
                  : 'text-slate-600 hover:text-[#172B4D]'
              }`}
            >
              Voyager
            </button>
            <button
              onClick={() => setLayer('satellite')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                layer === 'satellite'
                  ? 'bg-white text-[#1677D2] shadow-2xs'
                  : 'text-slate-600 hover:text-[#172B4D]'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Water Body Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-[#172B4D] focus:outline-none focus:border-[#1677D2] cursor-pointer shadow-2xs"
          >
            <option value="all">All Types (All Stations)</option>
            <option value="river">River</option>
            <option value="reservoir">Reservoir</option>
            <option value="lake">Lake</option>
            <option value="waterfall">Waterfall</option>
            <option value="canal">Canal</option>
          </select>

          {/* Pulse Rings Toggle */}
          <label className="flex items-center space-x-1.5 cursor-pointer select-none bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={showPulseRings}
              onChange={(e) => setShowPulseRings(e.target.checked)}
              className="rounded accent-[#1677D2]"
            />
            <span>Hazard Rings</span>
          </label>
        </div>
      </div>

      {/* Map Surface */}
      <div className="relative w-full h-[500px] bg-slate-50">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Map Legend - Pure Light Theme */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3.5 text-xs shadow-lg space-y-2 text-[#172B4D]">
          <div className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
            Hazard Level Scale
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span className="text-slate-600 font-medium">Safe / Low (0–39)</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
            <span className="text-slate-600 font-medium">Watch / Moderate (40–69)</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
            <span className="text-slate-600 font-medium">High Hazard (70–84)</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
            <span className="text-slate-600 font-medium">Extreme Risk (85–100)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
