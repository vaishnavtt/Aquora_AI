import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Layers,
  Info,
  Plus,
  Minus,
  Maximize2,
  Compass,
  AlertTriangle,
  RotateCcw,
  Search,
  X,
  ShieldAlert,
  Droplets,
  Activity,
  Sliders,
  ExternalLink,
  Eye,
  CheckCircle2,
  Navigation,
  Crosshair,
  Radio,
  ChevronDown,
  ChevronUp,
  MapPinOff,
  Locate,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { WaterBody, formatCoordinates, NearbyRiverItem } from '../types';
import { api } from '../services/api';

export interface MapSectionProps {
  waterBodies: WaterBody[];
  selectedStation: WaterBody | null;
  onSelectStation: (wb: WaterBody) => void;
  onSendToSimulator?: (wb: WaterBody) => void;
}

export type MapTileLayer = 'osm' | 'dark' | 'topo';

// Strict coordinate validation
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// Kerala geographic bounding box validator
export function isKeralaCoordinate(lat: number, lng: number): boolean {
  return lat >= 8.0 && lat <= 13.0 && lng >= 74.5 && lng <= 78.0;
}

// Strict risk classification: LOW, MEDIUM, HIGH, or NO_PREDICTION
export type NormalizedRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'NO_PREDICTION';

export function normalizeRiskLevel(level?: string | null): NormalizedRisk {
  if (!level) return 'NO_PREDICTION';
  const l = level.trim().toLowerCase();
  if (l === 'high' || l === 'extreme' || l === 'very high' || l === 'critical') return 'HIGH';
  if (l === 'moderate' || l === 'medium') return 'MEDIUM';
  if (l === 'low' || l === 'safe') return 'LOW';
  return 'NO_PREDICTION';
}

export interface RiskStyleInfo {
  category: NormalizedRisk;
  hex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  pulseClass: string;
  label: string;
}

export function getRiskStyle(level?: string | null): RiskStyleInfo {
  const norm = normalizeRiskLevel(level);
  switch (norm) {
    case 'LOW':
      return {
        category: 'LOW',
        hex: '#16a34a',
        bgClass: 'bg-emerald-950',
        borderClass: 'border-emerald-500',
        textClass: 'text-emerald-300',
        pulseClass: 'bg-emerald-500',
        label: 'LOW RISK',
      };
    case 'MEDIUM':
      return {
        category: 'MEDIUM',
        hex: '#f59e0b',
        bgClass: 'bg-amber-950',
        borderClass: 'border-amber-500',
        textClass: 'text-amber-300',
        pulseClass: 'bg-amber-500',
        label: 'MEDIUM RISK',
      };
    case 'HIGH':
      return {
        category: 'HIGH',
        hex: '#dc2626',
        bgClass: 'bg-rose-950',
        borderClass: 'border-rose-500',
        textClass: 'text-rose-300',
        pulseClass: 'bg-rose-500',
        label: 'HIGH RISK',
      };
    case 'NO_PREDICTION':
    default:
      return {
        category: 'NO_PREDICTION',
        hex: '#94a3b8',
        bgClass: 'bg-slate-900',
        borderClass: 'border-slate-500',
        textClass: 'text-slate-300',
        pulseClass: 'bg-slate-500',
        label: 'NO PREDICTION AVAILABLE',
      };
  }
}

// Convert NearbyRiverItem to compatible WaterBody structure for selection
export function nearbyRiverToWaterBody(r: NearbyRiverItem): WaterBody {
  return {
    id: r.id ?? Math.floor(Math.random() * 90000 + 10000),
    name: r.name,
    type: (r.type as any) || 'river',
    latitude: r.latitude,
    longitude: r.longitude,
    current_risk_level: (r.current_risk_level as any) || 'no_prediction',
    risk_score: r.risk_score ?? 0,
    water_temp_c: 26.5,
    flow_rate_cms: 0,
    depth_meters: 0,
    elevation_meters: null,
    basin_region: r.basin_region || r.district || 'Kerala Waterway',
    data_source: r.data_source || 'OpenStreetMap (OSM waterways)',
    last_updated: r.last_updated || new Date().toISOString(),
    description: r.description || 'Geographic waterway feature from OpenStreetMap.',
    is_demonstration_data: false,
  };
}

// Kerala geographic preset hubs for manual selection
export const KERALA_PRESET_LOCATIONS = [
  { name: 'Kochi / Aluva (Periyar River)', lat: 10.1076, lon: 76.3516, district: 'Ernakulam' },
  { name: 'Kottayam (Meenachil River)', lat: 9.5915, lon: 76.5222, district: 'Kottayam' },
  { name: 'Shoranur (Bharathappuzha / Nila)', lat: 10.7628, lon: 76.2755, district: 'Palakkad' },
  { name: 'Athirappilly (Chalakudy River)', lat: 10.2851, lon: 76.5698, district: 'Thrissur' },
  { name: 'Alappuzha (Canals & Vembanad)', lat: 9.4981, lon: 76.3288, district: 'Alappuzha' },
  { name: 'Aranmula (Pampa River)', lat: 9.3082, lon: 76.6854, district: 'Pathanamthitta' },
  { name: 'Punalur (Kallada River)', lat: 9.0189, lon: 76.9247, district: 'Kollam' },
  { name: 'Kozhikode / Feroke (Chaliyar)', lat: 11.1734, lon: 75.8341, district: 'Kozhikode' },
  { name: 'Kannur (Valapattanam River)', lat: 11.9845, lon: 75.4012, district: 'Kannur' },
  { name: 'Thiruvananthapuram (Karamana)', lat: 8.4612, lon: 76.9534, district: 'Thiruvananthapuram' },
  { name: 'Idukki (Dam Reservoir Basin)', lat: 9.8456, lon: 76.9744, district: 'Idukki' },
];

// Default center on Kerala aquatic geography
export const KERALA_CENTER: [number, number] = [10.15, 76.50];
export const KERALA_DEFAULT_ZOOM = 8;

export const MapSection: React.FC<MapSectionProps> = ({
  waterBodies = [],
  selectedStation,
  onSelectStation,
  onSendToSimulator,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersMapRef = useRef<Map<number, L.Marker>>(new Map());

  // Location-aware markers & layers refs
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const userLocationCircleRef = useRef<L.Circle | null>(null);
  const osmMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);

  // Interactive UI state
  const [activeLayer, setActiveLayer] = useState<MapTileLayer>('osm');
  const [scopeFilter, setScopeFilter] = useState<'kerala' | 'all'>('kerala');
  const [riskFilter, setRiskFilter] = useState<'all' | NormalizedRisk>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showRings, setShowRings] = useState<boolean>(true);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [tileErrorNotice, setTileErrorNotice] = useState<string | null>(null);
  const [unsupportedLocationNotice, setUnsupportedLocationNotice] = useState<string | null>(null);

  // Objective 1 & 2: Location-Aware River Discovery State
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);
  const [userLocationLoading, setUserLocationLoading] = useState<boolean>(false);
  const [userLocationError, setUserLocationError] = useState<string | null>(null);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(10);
  const [discoveryOrigin, setDiscoveryOrigin] = useState<{
    latitude: number;
    longitude: number;
    label: string;
  } | null>(null);
  const [nearbyRivers, setNearbyRivers] = useState<NearbyRiverItem[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState<boolean>(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [nearbyPanelOpen, setNearbyPanelOpen] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showPresetDropdown, setShowPresetDropdown] = useState<boolean>(false);
  const [manualKeyword, setManualKeyword] = useState<string>('');
  const [showCoordModal, setShowCoordModal] = useState<boolean>(false);
  const [manualLatInput, setManualLatInput] = useState<string>('');
  const [manualLonInput, setManualLonInput] = useState<string>('');
  const [coordError, setCoordError] = useState<string | null>(null);

  // Validate and sanitize records from backend
  const validWaterBodies = useMemo(() => {
    return waterBodies.filter((wb) => isValidCoordinate(wb.latitude, wb.longitude));
  }, [waterBodies]);

  // Kerala-scoped stations (verified hydrological nodes situated in Kerala)
  const keralaWaterBodies = useMemo(() => {
    const inKerala = validWaterBodies.filter((wb) => isKeralaCoordinate(wb.latitude, wb.longitude));
    return inKerala.length > 0 ? inKerala : validWaterBodies;
  }, [validWaterBodies]);

  // Active pool of stations based on scope filter
  const activePoolStations = useMemo(() => {
    return scopeFilter === 'kerala' ? keralaWaterBodies : validWaterBodies;
  }, [scopeFilter, keralaWaterBodies, validWaterBodies]);

  // Real vs Demonstration dataset statistics
  const stats = useMemo(() => {
    const total = activePoolStations.length;
    let low = 0;
    let medium = 0;
    let high = 0;
    let noPred = 0;
    let verifiedCount = 0;
    let demoCount = 0;

    activePoolStations.forEach((wb) => {
      const norm = normalizeRiskLevel(wb.current_risk_level);
      if (norm === 'LOW') low += 1;
      else if (norm === 'MEDIUM') medium += 1;
      else if (norm === 'HIGH') high += 1;
      else noPred += 1;

      if (wb.is_demonstration_data) demoCount += 1;
      else verifiedCount += 1;
    });

    const keralaCount = validWaterBodies.filter((w) => isKeralaCoordinate(w.latitude, w.longitude)).length;

    return { total, low, medium, high, noPred, verifiedCount, demoCount, keralaCount };
  }, [activePoolStations, validWaterBodies]);

  // Filtered water bodies matching risk, type, and search
  const filteredStations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return activePoolStations.filter((wb) => {
      if (riskFilter !== 'all') {
        const norm = normalizeRiskLevel(wb.current_risk_level);
        if (norm !== riskFilter) return false;
      }
      if (typeFilter !== 'all') {
        if (typeFilter === 'lake') {
          if (wb.type !== 'lake' && wb.type !== 'pond') return false;
        } else if (wb.type !== typeFilter) {
          return false;
        }
      }
      if (query) {
        const nameMatch = wb.name.toLowerCase().includes(query);
        const basinMatch = wb.basin_region?.toLowerCase().includes(query) ?? false;
        const typeMatch = wb.type.toLowerCase().includes(query);
        if (!nameMatch && !basinMatch && !typeMatch) return false;
      }
      return true;
    });
  }, [activePoolStations, riskFilter, typeFilter, searchQuery]);

  // Format last updated timestamp with date and time
  const latestTimestamp = useMemo(() => {
    if (validWaterBodies.length === 0) return null;
    const timestamps = validWaterBodies
      .map((w) => new Date(w.last_updated).getTime())
      .filter((t) => !isNaN(t));
    if (timestamps.length === 0) return null;
    const maxTime = Math.max(...timestamps);
    const date = new Date(maxTime);
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }, [validWaterBodies]);

  // Switch tile layer
  const applyTileLayer = useCallback((layerType: MapTileLayer, map: L.Map) => {
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    let layer: L.TileLayer;

    if (layerType === 'dark') {
      layer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
      });
    } else if (layerType === 'topo') {
      layer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution:
          'Map data: &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a>',
      });
    } else {
      layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      });
    }

    layer.on('tileerror', () => {
      setTileErrorNotice('Network error loading map tiles. Please check internet connection.');
    });

    layer.on('load', () => {
      setTileErrorNotice(null);
    });

    layer.addTo(map);
    tileLayerRef.current = layer;
  }, []);

  // Fetch nearby rivers from backend API (or client fallback)
  const fetchNearbyRivers = useCallback(async (lat: number, lon: number, radiusKm: number) => {
    setNearbyLoading(true);
    setNearbyError(null);
    try {
      const res = await api.getNearbyRivers(lat, lon, radiusKm, true);
      setNearbyRivers(res.rivers || []);
      setNearbyPanelOpen(true);
    } catch (err: any) {
      setNearbyError(err.message || 'Failed to discover nearby rivers. Please try again.');
    } finally {
      setNearbyLoading(false);
    }
  }, []);

  // Map initialization effect (Mount once)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] =
      selectedStation &&
      isValidCoordinate(selectedStation.latitude, selectedStation.longitude) &&
      isKeralaCoordinate(selectedStation.latitude, selectedStation.longitude)
        ? [selectedStation.latitude, selectedStation.longitude]
        : KERALA_CENTER;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: selectedStation && isKeralaCoordinate(selectedStation.latitude, selectedStation.longitude) ? 11 : KERALA_DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    osmMarkersLayerRef.current = L.layerGroup().addTo(map);

    // Direct map click handler: sets discovery center and finds nearby rivers
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const label = `Selected Map Location (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;

      setUserLocation(null);
      setDiscoveryOrigin({ latitude: lat, longitude: lng, label });
      fetchNearbyRivers(lat, lng, searchRadiusKm);

      // Check if clicked directly on an existing monitored station
      try {
        const found = await api.getWaterBodyByCoordinates(lat, lng, 0.08);
        if (found && isValidCoordinate(found.latitude, found.longitude)) {
          onSelectStation(found);
          setUnsupportedLocationNotice(null);
        }
      } catch {
        // Not a direct station hit; nearby rivers panel will list surrounding waterways
      }
    });

    applyTileLayer(activeLayer, map);
    setIsMapReady(true);

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setIsMapReady(false);
    };
  }, []);

  // Tile layer change effect
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    applyTileLayer(activeLayer, mapInstanceRef.current);
  }, [activeLayer, applyTileLayer, isMapReady]);

  // Update Monitored Station Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !isMapReady) return;

    const layerGroup = markersLayerRef.current;
    layerGroup.clearLayers();
    markersMapRef.current.clear();

    filteredStations.forEach((station) => {
      const isSelected = selectedStation?.id === station.id;
      const risk = getRiskStyle(station.current_risk_level);
      const pos: [number, number] = [station.latitude, station.longitude];

      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);" role="button" aria-label="${station.name} (${risk.label})">
          ${
            showRings
              ? `<span class="absolute w-8 h-8 rounded-full opacity-60 animate-ping pointer-events-none" style="background-color: ${risk.hex};"></span>`
              : ''
          }
          <div class="relative flex items-center justify-center w-7 h-7 rounded-full border-2 transition-transform shadow-xl ${
            risk.bgClass
          } ${risk.borderClass} ${isSelected ? 'scale-125 ring-4 ring-cyan-400' : 'group-hover:scale-110'}" style="border-color: ${risk.hex};">
            <svg class="w-3.5 h-3.5" style="color: ${risk.hex};" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div class="absolute left-1/2 -translate-x-1/2 top-7 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-md border ${
            isSelected
              ? 'bg-slate-900 text-cyan-300 border-cyan-400'
              : 'bg-slate-950/95 text-slate-200 border-slate-700'
          } pointer-events-none z-10">
            ${station.name.replace(' (Demonstration Station)', '').replace(' (DEMO Station)', '')}
            <span class="font-mono text-xs ml-1" style="color: ${risk.hex};">(${
              risk.category === 'NO_PREDICTION' ? 'N/A' : station.risk_score.toFixed(0)
            })</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'aquora-custom-marker',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -18],
      });

      const marker = L.marker(pos, { icon: customIcon });

      const cleanName = station.name.replace(' (Demonstration Station)', '').replace(' (DEMO Station)', '');
      const popupHtml = `
        <div class="p-4 w-72 text-slate-100 font-sans space-y-2.5">
          <div class="flex items-start justify-between gap-2 border-b border-slate-700/80 pb-2">
            <div>
              <span class="text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold tracking-wider" style="background-color: ${risk.hex}22; color: ${risk.hex}; border: 1px solid ${risk.hex}66;">
                ${risk.label} ${risk.category === 'NO_PREDICTION' ? '' : `(${station.risk_score.toFixed(0)}/100)`}
              </span>
              <h3 class="text-xs font-bold text-white mt-1 leading-snug">${cleanName}</h3>
            </div>
            <span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
              ${station.type}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <div>
              <span class="text-slate-400 block text-[9px]">FLOW RATE</span>
              <span class="font-bold text-white">${station.flow_rate_cms.toFixed(2)} m³/s</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[9px]">EFFECTIVE DEPTH</span>
              <span class="font-bold text-white">${station.depth_meters.toFixed(1)} m</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[9px]">WATER TEMP</span>
              <span class="font-bold text-white">${station.water_temp_c.toFixed(1)} °C</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[9px]">ELEVATION</span>
              <span class="font-bold text-white">${station.elevation_meters ? `${station.elevation_meters.toFixed(0)} m MSL` : 'Uncalibrated'}</span>
            </div>
          </div>

          <div class="text-[10px] text-slate-300 space-y-1">
            <div class="flex items-center justify-between text-slate-400">
              <span>Jurisdiction:</span>
              <span class="font-semibold text-slate-200 truncate max-w-[140px]">${station.basin_region || 'Kerala Inland'}</span>
            </div>
            <div class="flex items-center justify-between text-slate-400">
              <span>Coordinates:</span>
              <span class="font-mono text-slate-200">${station.latitude.toFixed(4)}°N, ${station.longitude.toFixed(4)}°E</span>
            </div>
            <div class="flex items-center justify-between text-slate-400">
              <span>Data Provenance:</span>
              <span class="text-[9px] font-mono px-1 rounded ${station.is_demonstration_data ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}">
                ${station.is_demonstration_data ? 'DEMONSTRATION RECORD' : 'VERIFIED HYDROLOGICAL NODE'}
              </span>
            </div>
          </div>

          ${
            station.description
              ? `<p class="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 italic line-clamp-2">${station.description.replace('[DEMONSTRATION DATA] ', '')}</p>`
              : ''
          }

          <div class="pt-1.5 flex flex-col gap-1.5">
            <button id="popup-select-${station.id}" class="w-full py-1.5 px-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[10px] transition-colors flex items-center justify-center gap-1 shadow-sm">
              <Eye class="w-3 h-3" />
              Inspect Telemetry & Risk Details
            </button>
            ${
              onSendToSimulator
                ? `<button id="popup-sim-${station.id}" class="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-[10px] transition-colors flex items-center justify-center gap-1 border border-slate-700 shadow-sm">
                    <Sliders class="w-3 h-3" />
                    Simulate in What-If Lab &rarr;
                  </button>`
                : ''
            }
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });

      marker.on('click', () => {
        onSelectStation(station);
        setUnsupportedLocationNotice(null);
      });

      marker.on('popupopen', () => {
        const selectBtn = document.getElementById(`popup-select-${station.id}`);
        if (selectBtn) {
          selectBtn.onclick = () => {
            onSelectStation(station);
            marker.closePopup();
          };
        }
        const simBtn = document.getElementById(`popup-sim-${station.id}`);
        if (simBtn && onSendToSimulator) {
          simBtn.onclick = () => {
            onSendToSimulator(station);
            marker.closePopup();
          };
        }
      });

      layerGroup.addLayer(marker);
      markersMapRef.current.set(station.id, marker);
    });
  }, [filteredStations, selectedStation, showRings, isMapReady, onSelectStation, onSendToSimulator]);

  // Objective 1.A: Blue User Location Marker + Accuracy Ring on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    const map = mapInstanceRef.current;

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
          radius: Math.max(userLocation.accuracy, 30),
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.18,
          weight: 2,
        }).addTo(map);
      } catch {
        // Safe mock fallback
      }

      const userHtml = `
        <div class="relative flex items-center justify-center cursor-pointer" style="transform: translate(-50%, -50%);" role="button" aria-label="Your GPS Location">
          <span class="absolute w-8 h-8 rounded-full bg-blue-500 opacity-60 animate-ping"></span>
          <div class="w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center">
            <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
          </div>
          <div class="absolute top-7 px-2 py-0.5 rounded bg-blue-950 text-blue-200 border border-blue-700 text-[10px] font-bold whitespace-nowrap shadow-md">
            You are here (±${Math.round(userLocation.accuracy)}m)
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
              <span>● Your Current Location</span>
            </div>
            <div class="text-[11px] text-slate-300 font-mono">
              GPS Accuracy: ±${Math.round(userLocation.accuracy)} meters
            </div>
            <div class="text-[10px] text-slate-400 font-mono">
              ${userLocation.latitude.toFixed(4)}°N, ${userLocation.longitude.toFixed(4)}°E
            </div>
          </div>
        `);
    }
  }, [userLocation, isMapReady]);

  // Objective 2.A: OpenStreetMap Waterway Markers (Teal Diamond Pins)
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    const map = mapInstanceRef.current;

    if (!osmMarkersLayerRef.current) {
      osmMarkersLayerRef.current = L.layerGroup().addTo(map);
    }
    const layer = osmMarkersLayerRef.current;
    layer.clearLayers();

    const unmonitored = nearbyRivers.filter((r) => !r.is_monitored_station);

    unmonitored.forEach((river) => {
      const isSelected = selectedStation?.name === river.name;
      const osmHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);" role="button" aria-label="${river.name} (OSM Waterway)">
          <div class="w-6 h-6 rotate-45 rounded bg-cyan-950 border-2 transition-transform shadow-lg ${
            isSelected ? 'border-cyan-300 scale-125 ring-2 ring-cyan-400' : 'border-cyan-500 group-hover:scale-110'
          } flex items-center justify-center">
            <div class="w-2 h-2 rounded-full bg-cyan-400 -rotate-45"></div>
          </div>
          <div class="absolute left-1/2 -translate-x-1/2 top-6 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shadow-md bg-slate-950/95 text-cyan-300 border border-cyan-800 pointer-events-none z-10">
            ${river.name} <span class="text-slate-400 font-mono text-[8px]">(OSM)</span>
          </div>
        </div>
      `;
      const osmIcon = L.divIcon({
        className: 'aquora-osm-waterway-marker',
        html: osmHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14],
      });

      const marker = L.marker([river.latitude, river.longitude], { icon: osmIcon });
      const popupHtml = `
        <div class="p-3 w-64 text-slate-100 font-sans space-y-2">
          <div class="border-b border-slate-700/80 pb-1.5">
            <span class="text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
              UNMONITORED OSM WATERWAY
            </span>
            <h4 class="text-xs font-bold text-white mt-1">${river.name}</h4>
          </div>
          <div class="text-[10px] text-slate-300 space-y-1">
            <div class="flex items-center justify-between text-slate-400">
              <span>Typology:</span>
              <span class="font-mono text-cyan-300 uppercase">${river.type}</span>
            </div>
            <div class="flex items-center justify-between text-slate-400">
              <span>Distance:</span>
              <span class="font-mono font-bold text-white">${river.distance_formatted}</span>
            </div>
            <div class="flex items-center justify-between text-slate-400">
              <span>District:</span>
              <span class="text-slate-200">${river.district || 'Kerala'}</span>
            </div>
          </div>
          <p class="text-[10px] text-slate-400 border-t border-slate-800 pt-1 leading-relaxed">
            ${river.description || 'OpenStreetMap mapped river/waterway without dedicated telemetry sensors.'}
          </p>
          <button id="osm-inspect-${river.id}" class="w-full mt-1 py-1 px-2 rounded bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 text-[10px] font-semibold transition-colors border border-cyan-700">
            View River Details &amp; Scientific Limitations
          </button>
        </div>
      `;
      marker.bindPopup(popupHtml, { maxWidth: 280 });
      marker.on('click', () => {
        onSelectStation(nearbyRiverToWaterBody(river));
      });
      marker.on('popupopen', () => {
        const btn = document.getElementById(`osm-inspect-${river.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectStation(nearbyRiverToWaterBody(river));
            marker.closePopup();
          };
        }
      });

      layer.addLayer(marker);
    });
  }, [nearbyRivers, isMapReady, selectedStation, onSelectStation]);

  // Selected Manual Origin Pin Marker (When not using live GPS)
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    const map = mapInstanceRef.current;

    if (originMarkerRef.current) {
      map.removeLayer(originMarkerRef.current);
      originMarkerRef.current = null;
    }

    if (discoveryOrigin && !userLocation) {
      const pinHtml = `
        <div class="relative flex items-center justify-center" style="transform: translate(-50%, -50%);">
          <div class="w-5 h-5 rounded-full bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
          <div class="absolute top-6 px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-700 text-[9px] font-bold whitespace-nowrap shadow-md">
            Discovery Center (${searchRadiusKm} km)
          </div>
        </div>
      `;
      const pinIcon = L.divIcon({
        className: 'aquora-origin-pin-marker',
        html: pinHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      originMarkerRef.current = L.marker([discoveryOrigin.latitude, discoveryOrigin.longitude], { icon: pinIcon }).addTo(map);
    }
  }, [discoveryOrigin, userLocation, searchRadiusKm, isMapReady]);

  // Selected station smooth pan effect
  useEffect(() => {
    if (!selectedStation || !mapInstanceRef.current || !isMapReady) return;
    if (!isValidCoordinate(selectedStation.latitude, selectedStation.longitude)) return;

    mapInstanceRef.current.panTo([selectedStation.latitude, selectedStation.longitude], {
      animate: true,
      duration: 0.6,
    });
    const marker = markersMapRef.current.get(selectedStation.id);
    if (marker && !marker.isPopupOpen()) {
      marker.openPopup();
    }
  }, [selectedStation, isMapReady]);

  // Objective 1.A: Geolocation Button Handler
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setUserLocationError('Browser Geolocation is not supported by your browser. Please use manual location search.');
      return;
    }

    setUserLocationLoading(true);
    setUserLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy || 25;

        setUserLocation({
          latitude: lat,
          longitude: lon,
          accuracy,
          timestamp: pos.timestamp,
        });

        const label = `My Location (±${Math.round(accuracy)}m)`;
        setDiscoveryOrigin({ latitude: lat, longitude: lon, label });
        setUserLocationLoading(false);
        setUserLocationError(null);
        setSelectedPreset('');

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lon], 12, { animate: true });
        }

        fetchNearbyRivers(lat, lon, searchRadiusKm);
      },
      (err) => {
        setUserLocationLoading(false);
        let msg = 'Unable to obtain GPS location.';
        if (err.code === 1) {
          msg = 'Location permission was denied. You can search by town or click directly on the map instead.';
        } else if (err.code === 2) {
          msg = 'GPS signal unavailable. Please ensure device location is enabled or select manually.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please retry or select your location manually.';
        }
        setUserLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Objective 1.B: Manual Preset Selection Handler
  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPreset(val);
    if (!val) return;

    const found = KERALA_PRESET_LOCATIONS.find((p) => p.name === val);
    if (found) {
      setUserLocation(null);
      setDiscoveryOrigin({ latitude: found.lat, longitude: found.lon, label: found.name });
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([found.lat, found.lon], 12, { animate: true });
      }
      fetchNearbyRivers(found.lat, found.lon, searchRadiusKm);
    }
  };

  // Objective 1.B: Manual Keyword Search
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualKeyword.trim()) return;

    setNearbyLoading(true);
    setNearbyError(null);
    try {
      const res = await api.searchRivers(manualKeyword.trim(), 20);
      if (res.results && res.results.length > 0) {
        const top = res.results[0];
        setDiscoveryOrigin({
          latitude: top.latitude,
          longitude: top.longitude,
          label: `Search: "${manualKeyword.trim()}" (${top.name})`,
        });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([top.latitude, top.longitude], 12, { animate: true });
        }
        fetchNearbyRivers(top.latitude, top.longitude, searchRadiusKm);
      } else {
        setNearbyRivers([]);
        setNearbyPanelOpen(true);
      }
    } catch (err: any) {
      setNearbyError(err.message || 'Search failed. Please try another keyword.');
    } finally {
      setNearbyLoading(false);
    }
  };

  // Objective 1.B: Manual Coordinate Submission
  const handleManualCoordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLatInput);
    const lon = parseFloat(manualLonInput);
    if (isNaN(lat) || isNaN(lon) || !isValidCoordinate(lat, lon)) {
      setCoordError('Please enter valid numeric latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }
    setCoordError(null);
    setShowCoordModal(false);
    setUserLocation(null);
    const label = `Custom Coordinates (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`;
    setDiscoveryOrigin({ latitude: lat, longitude: lon, label });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lon], 12, { animate: true });
    }
    fetchNearbyRivers(lat, lon, searchRadiusKm);
  };

  // Radius change handler
  const handleRadiusChange = (radius: number) => {
    setSearchRadiusKm(radius);
    if (discoveryOrigin) {
      fetchNearbyRivers(discoveryOrigin.latitude, discoveryOrigin.longitude, radius);
    }
  };

  // Reset discovery origin
  const handleClearDiscovery = () => {
    setUserLocation(null);
    setDiscoveryOrigin(null);
    setNearbyRivers([]);
    setNearbyPanelOpen(false);
    setSelectedPreset('');
    setManualKeyword('');
    setUserLocationError(null);
    if (originMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(originMarkerRef.current);
      originMarkerRef.current = null;
    }
    if (userLocationMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(userLocationMarkerRef.current);
      userLocationMarkerRef.current = null;
    }
    if (userLocationCircleRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(userLocationCircleRef.current);
      userLocationCircleRef.current = null;
    }
  };

  // View River on map action
  const handleViewRiverOnMap = (river: NearbyRiverItem) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([river.latitude, river.longitude], 13, { animate: true });
      if (river.is_monitored_station && river.id) {
        const marker = markersMapRef.current.get(river.id);
        if (marker) marker.openPopup();
      }
    }
    onSelectStation(nearbyRiverToWaterBody(river));
  };

  // Assess Risk action
  const handleAssessRisk = (river: NearbyRiverItem) => {
    onSelectStation(nearbyRiverToWaterBody(river));
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([river.latitude, river.longitude], 13, { animate: true });
    }
  };

  // Map Controls
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetToKerala = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(KERALA_CENTER, KERALA_DEFAULT_ZOOM, {
        animate: true,
        duration: 0.5,
      });
      setUnsupportedLocationNotice(null);
    }
  };

  const handleFitFilteredStations = () => {
    if (mapInstanceRef.current && filteredStations.length > 0) {
      const bounds = filteredStations.map((s) => [s.latitude, s.longitude] as [number, number]);
      try {
        mapInstanceRef.current.fitBounds(L.latLngBounds(bounds), {
          padding: [50, 50],
          maxZoom: 13,
          animate: true,
        });
      } catch {
        // Safe fallback
      }
    }
  };

  const handleClearFilters = () => {
    setRiskFilter('all');
    setTypeFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = riskFilter !== 'all' || typeFilter !== 'all' || searchQuery.trim().length > 0;

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md overflow-hidden flex flex-col font-sans">
      {/* 4.A Header: Kerala Water Risk Intelligence Map */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/50 shadow-sm shrink-0">
            <Compass className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Kerala Water Risk Intelligence Map
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {activeLayer === 'osm'
                  ? 'OpenStreetMap Standard'
                  : activeLayer === 'dark'
                  ? 'Carto Dark Matter'
                  : 'OpenTopoMap Terrain'}
              </span>
              {latestTimestamp && (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Telemetry Sync: {latestTimestamp}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Geospatial waterways, river telemetry stations, and AI hazard assessments across Kerala.
            </p>
          </div>
        </div>

        {/* Toolbar: Scope, Layer Switcher & Ring Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
          <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => setScopeFilter('kerala')}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                scopeFilter === 'kerala'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show monitored water bodies situated across Kerala"
            >
              Kerala ({stats.keralaCount})
            </button>
            <button
              onClick={() => setScopeFilter('all')}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                scopeFilter === 'all'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show all database records including prototype nodes"
            >
              All ({validWaterBodies.length})
            </button>
          </div>

          <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveLayer('osm')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                activeLayer === 'osm'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Standard OpenStreetMap raster cartography"
            >
              OSM
            </button>
            <button
              onClick={() => setActiveLayer('dark')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                activeLayer === 'dark'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Carto Dark Matter"
            >
              Dark
            </button>
            <button
              onClick={() => setActiveLayer('topo')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                activeLayer === 'topo'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Topographic elevation contours & river valleys"
            >
              Topo
            </button>
          </div>

          <button
            onClick={() => setShowRings(!showRings)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
              showRings
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800'
                : 'bg-slate-900 text-slate-400 border-slate-700/60'
            }`}
            title="Toggle hazard perimeter pulse rings"
          >
            Pulse Rings
          </button>
        </div>
      </div>

      {/* OBJECTIVE 1 & 2: Prominent "Find Rivers Near Me" Location Discovery Bar */}
      <div className="p-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-cyan-900/40 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* A. Use My Location Button */}
          <button
            onClick={handleUseMyLocation}
            disabled={userLocationLoading}
            id="use-my-location-btn"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
              userLocation
                ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 ring-2 ring-blue-500/30'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
            title="Request browser geolocation to find mapped rivers near you"
          >
            {userLocationLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-white" />
            )}
            <span>{userLocationLoading ? 'Acquiring GPS...' : userLocation ? 'My Location Active' : 'Use My Location'}</span>
          </button>

          {/* B. Manual Preset Hub Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetDropdown(!showPresetDropdown)}
              className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg px-2.5 py-1 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Select a Kerala river reach or town"
            >
              <span className="truncate max-w-[150px]">{selectedPreset || 'Select River Hub / District...'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {showPresetDropdown && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl py-1 z-30 backdrop-blur-md max-h-60 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  Kerala River Reach Presets
                </div>
                {KERALA_PRESET_LOCATIONS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(p.name);
                      setShowPresetDropdown(false);
                      setUserLocation(null);
                      setDiscoveryOrigin({ latitude: p.lat, longitude: p.lon, label: p.name });
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([p.lat, p.lon], 12, { animate: true });
                      }
                      fetchNearbyRivers(p.lat, p.lon, searchRadiusKm);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono ml-2 shrink-0">{p.district}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual Keyword Search */}
          <form onSubmit={handleManualSearch} className="flex items-center gap-1">
            <div className="relative">
              <input
                type="search"
                id="nearby-river-search-input"
                value={manualKeyword}
                onChange={(e) => setManualKeyword(e.target.value)}
                placeholder="Search river or locality..."
                className="w-36 sm:w-44 bg-slate-900 border border-slate-700 rounded-lg pl-2.5 pr-2 py-1 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold"
            >
              Search
            </button>
          </form>

          {/* Direct Coordinate Input Toggle */}
          <button
            onClick={() => setShowCoordModal(!showCoordModal)}
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs flex items-center gap-1"
            title="Enter precise latitude and longitude"
          >
            <Crosshair className="w-3 h-3 text-cyan-400" />
            <span>Coordinates</span>
          </button>
        </div>

        {/* Radius Selector Pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400">Radius:</span>
          {[2, 5, 10, 25].map((r) => (
            <button
              key={r}
              onClick={() => handleRadiusChange(r)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all ${
                searchRadiusKm === r
                  ? 'bg-cyan-500 text-slate-950 border border-cyan-300 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
              title={`Set nearby river discovery radius to ${r} km`}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {/* Geolocation Error Notice */}
      {userLocationError && (
        <div className="bg-rose-950/90 border-b border-rose-800 px-4 py-2 text-xs text-rose-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{userLocationError}</span>
          </div>
          <button
            onClick={() => setUserLocationError(null)}
            className="text-rose-400 hover:text-rose-100 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Coordinate Entry Modal/Popover */}
      {showCoordModal && (
        <div className="p-3 bg-slate-950 border-b border-cyan-800/80 flex flex-wrap items-center gap-2 text-xs animate-fadeIn">
          <span className="text-cyan-300 font-semibold flex items-center gap-1">
            <Crosshair className="w-3.5 h-3.5" />
            Direct Coordinates:
          </span>
          <form onSubmit={handleManualCoordSubmit} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Latitude (e.g. 10.0241)"
              value={manualLatInput}
              onChange={(e) => setManualLatInput(e.target.value)}
              className="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-xs focus:border-cyan-500"
            />
            <input
              type="text"
              placeholder="Longitude (e.g. 76.3512)"
              value={manualLonInput}
              onChange={(e) => setManualLonInput(e.target.value)}
              className="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-xs focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
            >
              Locate &amp; Find Rivers
            </button>
            <button
              type="button"
              onClick={() => setShowCoordModal(false)}
              className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs"
            >
              Cancel
            </button>
          </form>
          {coordError && <span className="text-rose-400 text-[11px] block">{coordError}</span>}
        </div>
      )}

      {/* Active Discovery Center Ribbon */}
      {discoveryOrigin && (
        <div className="bg-cyan-950/80 border-b border-cyan-800/60 px-4 py-2 text-xs text-cyan-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Locate className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-medium">
              Searching rivers near: <strong className="text-white">{discoveryOrigin.label}</strong> ({searchRadiusKm} km radius)
            </span>
            <span className="text-[11px] font-mono text-cyan-300/80">
              ({discoveryOrigin.latitude.toFixed(4)}°N, {discoveryOrigin.longitude.toFixed(4)}°E)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNearbyPanelOpen(!nearbyPanelOpen)}
              className="text-cyan-400 hover:text-cyan-200 text-[11px] font-semibold underline flex items-center gap-1"
            >
              {nearbyPanelOpen ? 'Hide Nearby Rivers' : `View Nearby Rivers (${nearbyRivers.length})`}
            </button>
            <button
              onClick={handleClearDiscovery}
              className="p-1 rounded text-cyan-400 hover:text-cyan-100 hover:bg-slate-800 transition-colors"
              title="Reset location discovery"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4.E Map Filters & Search Toolbar */}
      <div className="p-3 bg-slate-950/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Risk Filter:</span>
          <button
            onClick={() => setRiskFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              riskFilter === 'all'
                ? 'bg-slate-800 text-white border border-slate-600 font-bold'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setRiskFilter('LOW')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              riskFilter === 'LOW'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold shadow-sm'
                : 'bg-slate-900/80 text-emerald-400/80 hover:text-emerald-300 border border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
            LOW (&lt;30) ({stats.low})
          </button>
          <button
            onClick={() => setRiskFilter('MEDIUM')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              riskFilter === 'MEDIUM'
                ? 'bg-amber-950 text-amber-300 border border-amber-500 font-bold shadow-sm'
                : 'bg-slate-900/80 text-amber-400/80 hover:text-amber-300 border border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            MEDIUM (30-60) ({stats.medium})
          </button>
          <button
            onClick={() => setRiskFilter('HIGH')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              riskFilter === 'HIGH'
                ? 'bg-rose-950 text-rose-300 border border-rose-500 font-bold shadow-sm'
                : 'bg-slate-900/80 text-rose-400/80 hover:text-rose-300 border border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
            HIGH (&gt;60) ({stats.high})
          </button>
          {stats.noPred > 0 && (
            <button
              onClick={() => setRiskFilter('NO_PREDICTION')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                riskFilter === 'NO_PREDICTION'
                  ? 'bg-slate-800 text-slate-200 border border-slate-500 font-bold shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />
              UNASSESSED ({stats.noPred})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-medium"
            aria-label="Filter by water body type"
          >
            <option value="all">All Aquatic Types ({activePoolStations.length})</option>
            <option value="river">Rivers &amp; Riverbanks</option>
            <option value="quarry">Abandoned Quarries</option>
            <option value="waterfall">Waterfalls &amp; Cascades</option>
            <option value="lake">Ponds &amp; Lakes</option>
            <option value="reservoir">Reservoirs &amp; Dams</option>
            <option value="canal">Canals &amp; Waterways</option>
          </select>

          <div className="relative w-40 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter stations..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-7 py-1 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                title="Clear search query"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Unsupported Location Notice */}
      {unsupportedLocationNotice && (
        <div className="bg-slate-900/95 border-b border-cyan-800/80 px-4 py-2.5 text-xs text-cyan-200 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-medium">{unsupportedLocationNotice}</span>
          </div>
          <button
            onClick={() => setUnsupportedLocationNotice(null)}
            className="text-cyan-400 hover:text-cyan-100 p-1 rounded hover:bg-slate-800 transition-colors"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4.B Interactive Map Container */}
      <div className="relative w-full h-[460px] sm:h-[520px] bg-slate-950 overflow-hidden select-none">
        <div ref={mapContainerRef} className="w-full h-full z-0" tabIndex={0} aria-label="Interactive Kerala Water Risk Map" />

        {!isMapReady && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
            <p className="text-xs font-mono text-cyan-300">Initializing Kerala OpenStreetMap Cartography...</p>
          </div>
        )}

        {filteredStations.length === 0 && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 pointer-events-auto">
            <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 mb-2">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="text-sm font-bold text-white">No Monitored Water Bodies Match Filters</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              No stations match &ldquo;{searchQuery || riskFilter}&rdquo;. Reset your filters to view all monitored locations across Kerala.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-3 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        )}

        {/* 4.G Map Overlay Controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2 z-20">
          <button
            onClick={handleZoomIn}
            title="Zoom In (+)"
            aria-label="Zoom In"
            className="p-2 rounded-lg bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white shadow-lg transition-colors focus:ring-2 focus:ring-cyan-500"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            aria-label="Zoom Out"
            className="p-2 rounded-lg bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white shadow-lg transition-colors focus:ring-2 focus:ring-cyan-500"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetToKerala}
            title="Reset Map View to Kerala"
            aria-label="Reset Map View to Kerala"
            className="p-2 rounded-lg bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-cyan-400 hover:text-cyan-300 shadow-lg transition-colors focus:ring-2 focus:ring-cyan-500"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleFitFilteredStations}
            title="Fit All Filtered Stations in View"
            aria-label="Fit All Filtered Stations in View"
            className="p-2 rounded-lg bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white shadow-lg transition-colors focus:ring-2 focus:ring-cyan-500"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* 4.F Legend, Statistics & Active Pinpoint Ribbon */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-none">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/95 border border-slate-800 text-[11px] font-mono text-slate-300 shadow-md pointer-events-auto flex items-center gap-2 backdrop-blur-sm">
            <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate max-w-[220px] sm:max-w-none">
              {selectedStation
                ? `${selectedStation.name.replace(' (Demonstration Station)', '').replace(' (DEMO Station)', '')} (${formatCoordinates(
                    selectedStation.latitude,
                    selectedStation.longitude,
                    4
                  )})`
                : 'Click map or "Use My Location" to discover nearby rivers'}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-900/95 border border-slate-800 text-[11px] text-slate-300 shadow-md pointer-events-auto flex items-center space-x-3 backdrop-blur-sm flex-wrap">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">
              HAZARD CLASSIFICATION:
            </span>
            <span className="flex items-center gap-1 text-[10px]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] border border-emerald-400" />
              <span>LOW (&lt;30)</span>
            </span>
            <span className="flex items-center gap-1 text-[10px]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] border border-amber-400" />
              <span>MEDIUM (30-60)</span>
            </span>
            <span className="flex items-center gap-1 text-[10px]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] border border-rose-400" />
              <span>HIGH (&gt;60)</span>
            </span>
            <span className="flex items-center gap-1 text-[10px]">
              <span className="w-2.5 h-2.5 rotate-45 rounded-sm bg-cyan-900 border border-cyan-400" />
              <span>OSM WATERWAY</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Showing {filteredStations.length}/{activePoolStations.length}
            </span>
          </div>
        </div>
      </div>

      {/* OBJECTIVE 2.B: Nearby Rivers & Water Bodies Results Panel */}
      {nearbyPanelOpen && (
        <div className="border-t border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Nearby Rivers &amp; Water Bodies
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-bold">
                  {nearbyRivers.length} Found within {searchRadiusKm} km
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Accurate spherical Haversine distances calculated from {discoveryOrigin?.label || 'selected location'}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Radius:</span>
              {[2, 5, 10, 25].map((r) => (
                <button
                  key={r}
                  onClick={() => handleRadiusChange(r)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    searchRadiusKm === r
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {r} km
                </button>
              ))}
              <button
                onClick={() => setNearbyPanelOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1 ml-2"
                title="Collapse nearby rivers panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {nearbyLoading ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-mono">
                Calculating Haversine distance and discovering waterways...
              </p>
            </div>
          ) : nearbyError ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900 text-center space-y-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-300">{nearbyError}</p>
              {discoveryOrigin && (
                <button
                  onClick={() => fetchNearbyRivers(discoveryOrigin.latitude, discoveryOrigin.longitude, searchRadiusKm)}
                  className="px-3 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-100 text-xs font-semibold"
                >
                  Retry Search
                </button>
              )}
            </div>
          ) : nearbyRivers.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <MapPinOff className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">
                No mapped rivers or water bodies found within {searchRadiusKm} km
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No monitored stations or OpenStreetMap waterway vectors were detected within the current radius. Try expanding your search radius.
              </p>
              {searchRadiusKm < 25 && (
                <button
                  onClick={() => handleRadiusChange(25)}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
                >
                  Expand Search Radius to 25 km
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {nearbyRivers.map((river) => {
                const isSelected = selectedStation?.name === river.name;
                const risk = getRiskStyle(river.current_risk_level);

                return (
                  <div
                    key={`${river.id}-${river.name}`}
                    className={`p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500 ring-2 ring-cyan-500/30'
                        : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800'
                    } flex flex-col justify-between gap-2.5`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700">
                              {river.type}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold flex items-center gap-1">
                              <Navigation className="w-2.5 h-2.5" />
                              {river.distance_formatted}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white mt-1.5 leading-snug line-clamp-1">
                            {river.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {river.district || 'Kerala'} &bull; {river.basin_region || 'River Basin'}
                          </p>
                        </div>

                        {river.is_monitored_station ? (
                          <span
                            className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded shrink-0"
                            style={{
                              backgroundColor: `${risk.hex}22`,
                              color: risk.hex,
                              border: `1px solid ${risk.hex}66`,
                            }}
                          >
                            {risk.label}
                            {river.risk_score !== null && river.risk_score !== undefined && (
                              <span className="ml-1">({river.risk_score.toFixed(0)})</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                            UNASSESSED (OSM)
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                        {river.description ||
                          (river.is_monitored_station
                            ? 'AQUORA telemetry monitoring station with validated sensor stream.'
                            : 'Mapped OpenStreetMap river reach. No real-time sensor installed.')}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono text-slate-400 truncate max-w-[120px]">
                        {river.data_source || (river.is_monitored_station ? 'CWC / Kerala SW' : 'OpenStreetMap')}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewRiverOnMap(river)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-colors flex items-center gap-1"
                          title="Center and highlight this river on map"
                        >
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          View
                        </button>
                        <button
                          onClick={() => handleAssessRisk(river)}
                          className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                            river.is_monitored_station
                              ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
                          }`}
                          title={
                            river.is_monitored_station
                              ? 'Assess risk with Two-Layer ML engine'
                              : 'Inspect geographic feature and limitations'
                          }
                        >
                          <Activity className="w-3 h-3" />
                          {river.is_monitored_station ? 'Assess Risk' : 'Inspect Details'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
