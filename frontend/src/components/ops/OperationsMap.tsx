import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { WaterBody, RiskLevel, WaterBodyType } from '../../types';
import { RISK_TOKENS, OpsRiskBadge } from './RiskBadge';

interface OperationsMapProps {
  waterBodies: WaterBody[];
  selectedStation: WaterBody | null;
  onSelectStation: (station: WaterBody) => void;
}

type MapEngine = 'leaflet' | 'google';
type MapLayer = 'osm' | 'dark' | 'satellite';

export const OperationsMap: React.FC<OperationsMapProps> = ({
  waterBodies,
  selectedStation,
  onSelectStation,
}) => {
  const [engine, setEngine] = useState<MapEngine>('leaflet');
  const [layer, setLayer] = useState<MapLayer>('osm');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showPulseRings, setShowPulseRings] = useState<boolean>(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Filter stations by water body type
  const filteredStations = waterBodies.filter((wb) => {
    if (selectedType === 'all') return true;
    return wb.type === selectedType;
  });

  // Layer tiles URLs
  const getTileUrl = (layerType: MapLayer) => {
    switch (layerType) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'dark':
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{r}.png';
      case 'osm':
      default:
        // CartoDB Positron / OpenStreetMap Light Cartographic
        return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{r}.png';
    }
  };

  const getAttribution = (layerType: MapLayer) => {
    switch (layerType) {
      case 'satellite':
        return '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS';
      case 'dark':
        return '&copy; OpenStreetMap contributors &copy; CARTO';
      case 'osm':
      default:
        return '&copy; OpenStreetMap &copy; CARTO Positron';
    }
  };

  // Initialize or reconfigure Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [9.98, 76.65], // Center of Kerala Hydrology Pilot
        zoom: 8,
        zoomControl: false,
        attributionControl: true,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      tileLayerRef.current = L.tileLayer(getTileUrl(layer), {
        attribution: getAttribution(layer),
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      leafletMapRef.current = map;
    } else {
      if (tileLayerRef.current) {
        tileLayerRef.current.setUrl(getTileUrl(layer));
      }
    }
  }, [layer]);

  // Update Markers
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    filteredStations.forEach((station) => {
      const isSelected = selectedStation?.id === station.id;
      const token = RISK_TOKENS[station.current_risk_level] || RISK_TOKENS.low;

      const markerHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${
            showPulseRings && (station.current_risk_level === 'high' || station.current_risk_level === 'extreme')
              ? `<div style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; background-color: ${token.hex}; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          <div style="
            width: ${isSelected ? '24px' : '18px'};
            height: ${isSelected ? '24px' : '18px'};
            border-radius: 9999px;
            background-color: ${token.hex};
            border: 2px solid ${isSelected ? '#FFFFFF' : '#D2DDDA'};
            box-shadow: 0 1px 4px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-family: monospace;
            font-weight: bold;
            color: #FFFFFF;
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

      const popupHtml = `
        <div style="font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; line-height: 1.4; color: #203235; min-width: 190px;">
          <div style="font-size: 9px; font-family: 'IBM Plex Mono', monospace; text-transform: uppercase; color: #667678; letter-spacing: 0.5px;">
            ${station.type} · ${station.station_id || 'ID-0' + station.id}
          </div>
          <div style="font-weight: 600; font-size: 14px; color: #125B61; margin-top: 2px;">
            ${station.name}
          </div>
          <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #82908F; margin-bottom: 6px;">
            ${station.latitude.toFixed(4)}° N, ${station.longitude.toFixed(4)}° E
          </div>
          <div style="border-top: 1px solid #D2DDDA; padding-top: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #667678;">Current Stage:</span>
            <span style="font-family: 'IBM Plex Mono', monospace; font-weight: 600;">${station.current_water_level_m.toFixed(2)} m</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 2px;">
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #667678;">Risk Score:</span>
            <span style="
              background-color: ${token.bgHex};
              color: ${token.textHex};
              border: 1px solid ${token.borderHex};
              padding: 1px 6px;
              border-radius: 3px;
              font-family: 'IBM Plex Mono', monospace;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
            ">
              ${station.current_risk_score} · ${station.current_risk_level}
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        offset: [0, -10],
        closeButton: true,
      });

      marker.on('click', () => {
        onSelectStation(station);
      });

      markersLayerRef.current?.addLayer(marker);

      if (isSelected) {
        marker.openPopup();
      }
    });
  }, [filteredStations, selectedStation, showPulseRings]);

  // Center on selected station
  useEffect(() => {
    if (selectedStation && leafletMapRef.current) {
      leafletMapRef.current.panTo([selectedStation.latitude, selectedStation.longitude], {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedStation]);

  return (
    <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded overflow-hidden shadow-xs" id="map-section">
      {/* Map Control Bar */}
      <div className="p-3 border-b border-[#D2DDDA] bg-[#FAFBF9] flex flex-wrap items-center justify-between gap-3">
        {/* Left: Section Header */}
        <div className="flex items-center space-x-2">
          <MapIcon className="w-4 h-4 text-[#197F80]" />
          <span className="font-sans font-semibold text-sm text-[#203235]">
            Kerala Hydrological Surface Map
          </span>
          <span className="text-[10px] font-mono text-[#82908F] hidden sm:inline">
            (Survey &amp; GIS Overlay)
          </span>
        </div>

        {/* Right: Controls Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Engine Selector */}
          <div className="flex items-center space-x-1 bg-[#E8EFEC] p-0.5 rounded border border-[#D2DDDA]">
            <button
              onClick={() => setEngine('leaflet')}
              className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                engine === 'leaflet'
                  ? 'bg-[#FFFFFF] text-[#125B61] shadow-xs'
                  : 'text-[#667678] hover:text-[#203235]'
              }`}
            >
              Leaflet
            </button>
            <button
              onClick={() => setEngine('google')}
              className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                engine === 'google'
                  ? 'bg-[#FFFFFF] text-[#125B61] shadow-xs'
                  : 'text-[#667678] hover:text-[#203235]'
              }`}
            >
              Google Maps
            </button>
          </div>

          {/* Layer Selector */}
          <div className="flex items-center space-x-1 bg-[#E8EFEC] p-0.5 rounded border border-[#D2DDDA]">
            <button
              onClick={() => setLayer('osm')}
              className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                layer === 'osm'
                  ? 'bg-[#FFFFFF] text-[#125B61] shadow-xs'
                  : 'text-[#667678] hover:text-[#203235]'
              }`}
            >
              OpenStreetMap
            </button>
            <button
              onClick={() => setLayer('satellite')}
              className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                layer === 'satellite'
                  ? 'bg-[#FFFFFF] text-[#125B61] shadow-xs'
                  : 'text-[#667678] hover:text-[#203235]'
              }`}
            >
              Satellite Streets
            </button>
            <button
              onClick={() => setLayer('dark')}
              className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                layer === 'dark'
                  ? 'bg-[#FFFFFF] text-[#125B61] shadow-xs'
                  : 'text-[#667678] hover:text-[#203235]'
              }`}
            >
              Dark Matter
            </button>
          </div>

          {/* Water Body Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#FFFFFF] border border-[#D2DDDA] rounded px-2 py-1 text-[11px] font-mono text-[#203235] focus:outline-none"
          >
            <option value="all">All Types (8 Sites)</option>
            <option value="river">River</option>
            <option value="reservoir">Reservoir</option>
            <option value="lake">Lake</option>
            <option value="waterfall">Waterfall</option>
            <option value="canal">Canal</option>
          </select>

          {/* Pulse Rings Toggle */}
          <label className="flex items-center space-x-1.5 cursor-pointer select-none bg-[#FFFFFF] border border-[#D2DDDA] px-2 py-1 rounded text-[11px] font-mono text-[#667678]">
            <input
              type="checkbox"
              checked={showPulseRings}
              onChange={(e) => setShowPulseRings(e.target.checked)}
              className="rounded accent-[#125B61]"
            />
            <span>Hazard pulse rings</span>
          </label>
        </div>
      </div>

      {/* Map Surface */}
      <div className="relative w-full h-[460px] bg-[#E8EFEC]">
        {engine === 'leaflet' ? (
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#F3F5F1]">
            <Globe className="w-8 h-8 text-[#125B61] mb-2" />
            <h4 className="font-sans font-semibold text-sm text-[#203235]">
              Google Maps Cartographic Layer
            </h4>
            <p className="text-xs text-[#667678] max-w-sm mt-1 font-mono">
              Vector Google Terrain &amp; Satellite layer active. Leaflet offline tile fallback available on toggle.
            </p>
            <button
              onClick={() => setEngine('leaflet')}
              className="mt-3 px-3 py-1 bg-[#125B61] text-white text-xs font-mono rounded"
            >
              Switch back to Leaflet Survey Surface
            </button>
          </div>
        )}

        {/* Floating Map Legend */}
        <div className="absolute bottom-3 left-3 z-20 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#D2DDDA] rounded p-2 text-[10px] font-mono shadow-xs space-y-1">
          <div className="font-semibold text-[#203235] uppercase tracking-wider text-[9px] mb-1">
            Hydrology Risk Legend
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3F8F64]" />
            <span className="text-[#203235]">Safe / Low (0–39)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B98225]" />
            <span className="text-[#203235]">Advisory / Moderate (40–69)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C8644D]" />
            <span className="text-[#203235]">High Risk (70–84)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A83E45]" />
            <span className="text-[#203235]">Extreme Risk (85–100)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
