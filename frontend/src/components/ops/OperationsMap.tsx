import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  Search,
  AlertTriangle,
  ShieldAlert,
  Droplets,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  X,
  Clock,
  Sparkles,
  ArrowRightLeft,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import {
  WaterBody,
  WaterbodyFeature,
  HazardAssessmentResult,
  HazardCategoryType,
} from '../../types';
import {
  fetchWaterbodiesInViewport,
  searchWaterbodyFeatures,
  fetchHazardAssessment,
  triggerHazardAssessment,
} from '../../services/api';

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

// Exact required risk colors across map markers, legend, risk badges, and details
export const RISK_DOT_COLORS = {
  LOW: '#16A34A',           // Green
  MODERATE: '#F59E0B',      // Yellow/Amber
  HIGH: '#DC2626',          // Red
  INSUFFICIENT_DATA: '#94A3B8', // Grey
} as const;

export const RISK_CONFIG: Record<
  HazardCategoryType,
  { label: string; hex: string; bgHex: string; textHex: string; borderHex: string; desc: string }
> = {
  LOW_OBSERVED_HAZARD: {
    label: 'Low Risk',
    hex: '#16A34A',
    bgHex: '#DCFCE7',
    textHex: '#166534',
    borderHex: '#16A34A',
    desc: 'Available evidence indicates lower observed hazard. MANDATORY NOTICE: Does NOT mean safe for swimming.',
  },
  MODERATE_HAZARD: {
    label: 'Moderate Hazard',
    hex: '#F59E0B',
    bgHex: '#FEF3C7',
    textHex: '#92400E',
    borderHex: '#F59E0B',
    desc: 'Available evidence indicates some hazard factors (moderate flow velocity or elevated stage).',
  },
  HIGH_HAZARD: {
    label: 'High Hazard',
    hex: '#DC2626',
    bgHex: '#FEE2E2',
    textHex: '#991B1B',
    borderHex: '#DC2626',
    desc: 'Reliable evidence indicates substantial hazard (rapid current, extreme stage, waterfall or quarry).',
  },
  INSUFFICIENT_DATA: {
    label: 'Insufficient Data',
    hex: '#94A3B8',
    bgHex: '#F1F5F9',
    textHex: '#475569',
    borderHex: '#94A3B8',
    desc: 'Evidence is missing, invalid, or unmonitored. Strictly NOT labeled low risk.',
  },
  STALE_DATA: {
    label: 'Insufficient Data',
    hex: '#94A3B8',
    bgHex: '#F1F5F9',
    textHex: '#475569',
    borderHex: '#94A3B8',
    desc: 'Telemetry is outdated (>60 days old). Evidence insufficient for live hazard verification.',
  },
};

export const KERALA_DISTRICTS: Record<string, [number, number, number]> = {
  'All Districts': [10.5, 76.5, 8],
  Alappuzha: [9.4981, 76.3388, 11],
  Ernakulam: [10.0261, 76.3125, 11],
  Idukki: [9.8500, 76.9700, 10],
  Kannur: [11.8745, 75.3704, 11],
  Kasaragod: [12.5102, 74.9852, 11],
  Kollam: [8.8932, 76.6141, 11],
  Kottayam: [9.5916, 76.5222, 11],
  Kozhikode: [11.2588, 75.7804, 11],
  Malappuram: [11.0510, 76.0711, 11],
  Palakkad: [10.7867, 76.6548, 11],
  Pathanamthitta: [9.2648, 76.7870, 11],
  Thiruvananthapuram: [8.5241, 76.9366, 11],
  Thrissur: [10.5276, 76.2144, 11],
  Wayanad: [11.6854, 76.1320, 11],
};

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
  const dotsLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [engine, setEngine] = useState<'leaflet' | 'google'>('leaflet');
  const [layer, setLayer] = useState<'osm' | 'dark' | 'satellite'>('osm');

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All Districts');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('all');

  // Features & Viewport State
  const [waterbodyFeatures, setWaterbodyFeatures] = useState<WaterbodyFeature[]>([]);
  const [isLoadingViewport, setIsLoadingViewport] = useState<boolean>(false);

  // Selected Waterbody & Comparative Location State
  const [selectedFeature, setSelectedFeature] = useState<WaterbodyFeature | null>(null);
  const [comparedFeature, setComparedFeature] = useState<WaterbodyFeature | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<HazardAssessmentResult | null>(null);
  const [comparedAssessment, setComparedAssessment] = useState<HazardAssessmentResult | null>(null);
  const [isLoadingAssessment, setIsLoadingAssessment] = useState<boolean>(false);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<WaterbodyFeature[]>([]);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  // Live User Location
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const userLocationCircleRef = useRef<L.Circle | null>(null);

  // 1. Initialize Leaflet Map Centered on Kerala, India
  useEffect(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    // Centered on Kerala, India (10.5° N, 76.5° E)
    const map = L.map(mapContainerRef.current, {
      center: [10.5, 76.5],
      zoom: 8,
      minZoom: 7,
      maxZoom: 18,
      zoomControl: false, // Custom styled zoom controls
      attributionControl: false,
    });

    leafletMapRef.current = map;

    // Dots Layer Group
    const dotsGroup = L.layerGroup().addTo(map);
    dotsLayerGroupRef.current = dotsGroup;

    // Debounced Viewport Loader on moveend
    let debounceTimer: any = null;
    const handleMoveEnd = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadFeaturesForViewport();
      }, 300);
    };

    map.on('moveend', handleMoveEnd);

    // Initial Load
    loadFeaturesForViewport(map);

    return () => {
      clearTimeout(debounceTimer);
      map.off('moveend', handleMoveEnd);
      map.remove();
      leafletMapRef.current = null;
      dotsLayerGroupRef.current = null;
    };
  }, []);

  // 2. Base Tile Layer
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
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 18;
    }

    L.tileLayer(tileUrl, { maxZoom }).addTo(map);
  }, [layer]);

  // 3. Viewport-Based Feature Loading
  const loadFeaturesForViewport = useCallback(async (mapInstance?: L.Map) => {
    const map = mapInstance || leafletMapRef.current;
    if (!map) return;

    setIsLoadingViewport(true);
    try {
      const bounds = map.getBounds();
      const south = Math.max(bounds.getSouth(), 8.10);
      const north = Math.min(bounds.getNorth(), 12.95);
      const west = Math.max(bounds.getWest(), 74.70);
      const east = Math.min(bounds.getEast(), 77.65);

      const resp = await fetchWaterbodiesInViewport({
        min_lat: south,
        min_lon: west,
        max_lat: north,
        max_lon: east,
        district: selectedDistrict !== 'All Districts' ? selectedDistrict : undefined,
        types: selectedType !== 'all' ? selectedType : undefined,
        limit: 300,
      });

      if (resp && resp.features) {
        setWaterbodyFeatures(resp.features);
      }
    } catch (err) {
      console.warn('Viewport dots load error:', err);
    } finally {
      setIsLoadingViewport(false);
    }
  }, [selectedDistrict, selectedType]);

  // 4. Dot Selection Handler
  const handleSelectDot = useCallback(
    async (feat: WaterbodyFeature, asComparison = false) => {
      if (asComparison) {
        setComparedFeature(feat);
        try {
          const compAssessment = await fetchHazardAssessment(feat.id);
          setComparedAssessment(compAssessment);
          setIsComparing(true);
        } catch {
          // ignore
        }
        return;
      }

      setSelectedFeature(feat);
      setIsLoadingAssessment(true);
      try {
        const assessment = await fetchHazardAssessment(feat.id);
        setAssessmentResult(assessment);
      } catch (err) {
        console.warn('Failed loading assessment for dot:', err);
      } finally {
        setIsLoadingAssessment(false);
      }

      // Synchronize with external selectedStation
      const matched = waterBodies.find(
        (st) => st.name.toLowerCase() === feat.name.toLowerCase() || st.id === feat.id
      );
      if (matched) {
        onSelectStation(matched);
      } else {
        const virtualStation: WaterBody = {
          id: feat.id,
          name: feat.name,
          type: (feat.type as any) || 'river',
          latitude: feat.centroid_lat,
          longitude: feat.centroid_lon,
          elevation_m: 15,
          elevation_meters: 15,
          water_temp_c: 26.5,
          current_risk_level:
            feat.hazard_category === 'HIGH_HAZARD'
              ? 'high'
              : feat.hazard_category === 'MODERATE_HAZARD'
              ? 'moderate'
              : 'low',
          current_risk_score: feat.hazard_category === 'HIGH_HAZARD' ? 75 : 20,
          is_demonstration_data: false,
          risk_score: feat.hazard_category === 'HIGH_HAZARD' ? 75 : 20,
          flow_rate_cms: 2.5,
          depth_meters: 2.0,
          last_updated: feat.last_assessed || new Date().toISOString(),
          basin_region: feat.basin_region,
          data_source: feat.data_source,
          description: feat.description,
        };
        onSelectStation(virtualStation);
      }
    },
    [waterBodies, onSelectStation]
  );

  // 5. Render Circular Dots (Leaflet circleMarker)
  useEffect(() => {
    if (!leafletMapRef.current || !dotsLayerGroupRef.current) return;
    const group = dotsLayerGroupRef.current;
    group.clearLayers();

    // Filter by district, type, risk
    const filtered = waterbodyFeatures.filter((feat) => {
      if (selectedDistrict !== 'All Districts' && feat.district?.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (selectedType !== 'all' && feat.type.toLowerCase() !== selectedType.toLowerCase()) {
        return false;
      }
      if (selectedRiskFilter !== 'all') {
        if (selectedRiskFilter === 'low' && feat.hazard_category !== 'LOW_OBSERVED_HAZARD') return false;
        if (selectedRiskFilter === 'moderate' && feat.hazard_category !== 'MODERATE_HAZARD') return false;
        if (selectedRiskFilter === 'high' && feat.hazard_category !== 'HIGH_HAZARD') return false;
        if (selectedRiskFilter === 'insufficient' && feat.hazard_category !== 'INSUFFICIENT_DATA' && feat.hazard_category !== 'STALE_DATA') return false;
      }
      return true;
    });

    filtered.forEach((feat) => {
      const isSelected = selectedFeature?.id === feat.id;
      const isCompared = comparedFeature?.id === feat.id;

      // Exact color mapping
      const config = RISK_CONFIG[feat.hazard_category] || RISK_CONFIG.INSUFFICIENT_DATA;
      const dotColor = config.hex;

      const lat = feat.centroid_lat;
      const lon = feat.centroid_lon;

      // Safe Leaflet circleMarker instantiation
      let dotMarker: L.Layer;
      if (typeof L.circleMarker === 'function') {
        dotMarker = L.circleMarker([lat, lon], {
          radius: isSelected ? 12 : isCompared ? 11 : 8.5,
          fillColor: dotColor,
          color: isSelected ? '#082536' : isCompared ? '#2563EB' : '#FFFFFF',
          weight: isSelected ? 3.5 : isCompared ? 3 : 2,
          opacity: 1.0,
          fillOpacity: 0.95,
        });
      } else {
        dotMarker = L.marker([lat, lon]);
      }

      // Interactive Popup for Dot
      const popupHtml = `
        <div style="font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; line-height: 1.4; color: #082536; min-width: 230px; background-color: #F5EEDD; padding: 10px; border-radius: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 9px; font-family: 'IBM Plex Mono', monospace; text-transform: uppercase; color: #134059; font-weight: 600;">
              ${feat.type.toUpperCase()} · ${feat.district || 'KERALA'}
            </span>
            <span style="
              background-color: ${config.bgHex};
              color: ${config.textHex};
              border: 1px solid ${config.borderHex};
              padding: 1px 7px;
              border-radius: 9999px;
              font-size: 9px;
              font-family: 'IBM Plex Mono', monospace;
              font-weight: 700;
              text-transform: uppercase;
            ">
              ${config.label}
            </span>
          </div>

          <div style="font-weight: 700; font-size: 14px; color: #0B3F5A; margin-bottom: 2px;">
            ${feat.name}
          </div>

          <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #134059; margin-bottom: 6px;">
            ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E
          </div>

          <div style="border-top: 1px solid #DDD2B8; padding-top: 6px; font-size: 11px; color: #082536; line-height: 1.35; margin-bottom: 8px;">
            ${feat.rule_summary || config.desc}
          </div>

          <div style="border-top: 1px solid #DDD2B8; padding-top: 6px; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 10px; font-family: 'IBM Plex Mono', monospace; color: #134059;">
              Source: ${feat.data_source.split(' ')[0]}
            </span>
            <span style="font-size: 10px; font-family: 'IBM Plex Mono', monospace; font-weight: 600; color: #0B3F5A;">
              Click to Assess
            </span>
          </div>
        </div>
      `;

      if ('bindPopup' in dotMarker && typeof (dotMarker as any).bindPopup === 'function') {
        (dotMarker as any).bindPopup(popupHtml);
      }

      if ('on' in dotMarker && typeof (dotMarker as any).on === 'function') {
        (dotMarker as any).on('click', () => {
          handleSelectDot(feat);
        });
      }

      dotMarker.addTo(group);
    });
  }, [waterbodyFeatures, selectedFeature, comparedFeature, selectedDistrict, selectedType, selectedRiskFilter, handleSelectDot]);

  // 6. District Fly-To
  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
    const target = KERALA_DISTRICTS[dist] || KERALA_DISTRICTS['All Districts'];
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([target[0], target[1]], target[2], { duration: 0.8 });
    }
  };

  // 7. Search Handler
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const results = await searchWaterbodyFeatures(val.trim(), undefined, undefined, 10);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (feat: WaterbodyFeature) => {
    setShowSearchResults(false);
    setSearchQuery(feat.name);
    handleSelectDot(feat);
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([feat.centroid_lat, feat.centroid_lon], 12, { duration: 0.8 });
    }
  };

  // 8. GPS Location Discovery
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
        const accuracy = pos.coords.accuracy || 25;
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

  // User location marker & circle
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
          color: '#2563EB',
          fillColor: '#3B82F6',
          fillOpacity: 0.16,
          weight: 2,
        }).addTo(map);
      } catch {
        // Safe fallback
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

  // Nearest waterbody calculation
  const nearestWaterbody = useMemo(() => {
    if (!userLocation || waterbodyFeatures.length === 0) return null;
    let closest: WaterbodyFeature | null = null;
    let minDist = Infinity;
    for (const feat of waterbodyFeatures) {
      const d = computeDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        feat.centroid_lat,
        feat.centroid_lon
      );
      if (d < minDist) {
        minDist = d;
        closest = feat;
      }
    }
    return closest ? { feature: closest, distanceKm: minDist } : null;
  }, [userLocation, waterbodyFeatures]);

  return (
    <div className="bg-[#84B3CE] rounded-xl overflow-hidden shadow-xs" id="map-section">
      {/* 1. Header Toolbar */}
      <div className="p-3.5 border-b border-[#6A9AB6] bg-[#F5EEDD] flex flex-wrap items-center justify-between gap-3">
        {/* Title & Live Dot Count */}
        <div className="flex items-center space-x-2">
          <MapIcon className="w-5 h-5 text-[#0B3F5A]" style={{ strokeWidth: 1.5 }} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-sm text-[#082536]">
                Kerala Waterbody Risk Dot Map
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#16587B] text-[#F5EEDD]">
                {isLoadingViewport ? 'Loading...' : `${waterbodyFeatures.length} Locations Active`}
              </span>
            </div>
            <p className="text-[11px] text-[#134059] font-mono hidden sm:block">
              Circular risk markers calibrated across rivers, lakes, reservoirs, canals &amp; stations
            </p>
          </div>
        </div>

        {/* Controls: Search, Engine, Tiles, GPS */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Waterbody Search Input */}
          <div className="relative">
            <div className="flex items-center bg-[#84B3CE]/20 border border-[#6A9AB6] rounded-lg px-2.5 py-1 text-xs">
              <Search className="w-3.5 h-3.5 text-[#0F3A52] mr-1.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search waterbody or reach..."
                className="bg-transparent border-none focus:outline-none text-xs font-sans text-[#082536] placeholder-[#134059] w-36 sm:w-48"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                  className="text-[#134059] hover:text-[#082536] cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-[#DDD2B8] text-[10px] font-mono text-[#134059] uppercase font-semibold">
                  Matching Waterbodies ({searchResults.length})
                </div>
                {searchResults.map((res) => {
                  const cfg = RISK_CONFIG[res.hazard_category] || RISK_CONFIG.INSUFFICIENT_DATA;
                  return (
                    <button
                      key={res.id}
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left p-2.5 hover:bg-[#84B3CE]/30 border-b border-[#DDD2B8]/40 last:border-b-0 cursor-pointer flex flex-col"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[#0B3F5A]">{res.name}</span>
                        <span
                          style={{ backgroundColor: cfg.bgHex, color: cfg.textHex, borderColor: cfg.borderHex }}
                          className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full border font-bold"
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#134059] mt-0.5">
                        {res.district || 'Kerala'} · {res.type.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* District Dropdown Filter */}
          <select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg px-2.5 py-1 text-[11px] font-mono text-[#082536] focus:outline-none focus:border-[#0B3F5A] cursor-pointer"
          >
            {Object.keys(KERALA_DISTRICTS).map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>

          {/* Waterbody Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg px-2.5 py-1 text-[11px] font-mono text-[#082536] focus:outline-none focus:border-[#0B3F5A] cursor-pointer"
          >
            <option value="all">All Aquatic Types</option>
            <option value="river">Rivers &amp; Reaches</option>
            <option value="lake">Lakes &amp; Backwaters</option>
            <option value="reservoir">Reservoirs &amp; Dams</option>
            <option value="canal">Canals</option>
            <option value="quarry">Quarries &amp; Pits</option>
            <option value="waterfall">Waterfalls</option>
            <option value="station">Hydrological Stations</option>
          </select>

          {/* Risk Level Filter */}
          <select
            value={selectedRiskFilter}
            onChange={(e) => setSelectedRiskFilter(e.target.value)}
            className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg px-2.5 py-1 text-[11px] font-mono text-[#082536] focus:outline-none focus:border-[#0B3F5A] cursor-pointer"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">🟢 Low Hazard (#16A34A)</option>
            <option value="moderate">🟡 Moderate Hazard (#F59E0B)</option>
            <option value="high">🔴 High Hazard (#DC2626)</option>
            <option value="insufficient">⚪ Insufficient Data (#94A3B8)</option>
          </select>

          {/* GPS Button */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
              userLocation
                ? 'bg-blue-900 text-blue-200 border-blue-500 shadow-sm'
                : 'bg-[#16587B] text-[#F5EEDD] hover:bg-[#0B3F5A] border-[#16587B]'
            }`}
            title="Detect your live GPS position and find nearby waterbody dots"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-300' : 'text-[#84B3CE]'}`} />
            <span>{isLocating ? 'Locating...' : userLocation ? 'GPS Active' : 'Use My Location'}</span>
          </button>
        </div>
      </div>

      {/* 2. Map Canvas Surface with Circular Dot Markers */}
      <div className="relative w-full h-[520px] bg-[#F5EEDD]">
        {/* Custom Map View Controls */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          <button
            onClick={() => leafletMapRef.current?.zoomIn()}
            className="w-8 h-8 rounded-lg bg-[#F5EEDD] border border-[#6A9AB6] hover:bg-[#FAF6EC] text-[#082536] flex items-center justify-center shadow-md cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => leafletMapRef.current?.zoomOut()}
            className="w-8 h-8 rounded-lg bg-[#F5EEDD] border border-[#6A9AB6] hover:bg-[#FAF6EC] text-[#082536] flex items-center justify-center shadow-md cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDistrictChange('All Districts')}
            className="w-8 h-8 rounded-lg bg-[#F5EEDD] border border-[#6A9AB6] hover:bg-[#FAF6EC] text-[#082536] flex items-center justify-center shadow-md cursor-pointer"
            title="Reset to Full Kerala Extent"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Live GPS HUD */}
        {userLocation && (
          <div className="absolute top-3 left-3 z-20 bg-[#082536]/95 border border-blue-400/60 backdrop-blur-xs rounded-lg p-2.5 shadow-xl text-xs font-mono text-[#F5EEDD] flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span>Live GPS Active</span>
            </div>
            <div className="text-[11px] text-slate-300">
              <span>{userLocation.latitude.toFixed(4)}°N, {userLocation.longitude.toFixed(4)}°E</span>
              <span className="text-slate-400 ml-1">(±{Math.round(userLocation.accuracy)}m)</span>
            </div>
            {nearestWaterbody && (
              <div className="text-[10px] text-cyan-200 bg-cyan-950/80 border border-cyan-700/50 px-2 py-0.5 rounded flex items-center gap-1">
                <span>Nearest Waterbody: <strong>{nearestWaterbody.feature.name}</strong></span>
                <span className="text-emerald-400 font-bold">
                  ({nearestWaterbody.distanceKm < 1 ? `${Math.round(nearestWaterbody.distanceKm * 1000)} m` : `${nearestWaterbody.distanceKm.toFixed(1)} km`})
                </span>
              </div>
            )}
            <button
              onClick={() => {
                if (leafletMapRef.current && userLocation) {
                  leafletMapRef.current.setView([userLocation.latitude, userLocation.longitude], 13, { animate: true });
                }
              }}
              className="text-[10px] text-blue-300 hover:text-white underline font-semibold ml-1 cursor-pointer"
            >
              Re-center
            </button>
          </div>
        )}

        {locationError && (
          <div className="absolute top-3 left-3 z-20 bg-rose-950/95 border border-rose-700/60 rounded px-2.5 py-1 text-xs font-mono text-rose-300 flex items-center gap-2">
            <span>{locationError}</span>
            <button onClick={() => setLocationError(null)} className="text-rose-400 hover:text-rose-200 ml-1 cursor-pointer">✕</button>
          </div>
        )}

        {/* Map Container */}
        {engine === 'leaflet' ? (
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#F5EEDD]">
            <Globe className="w-8 h-8 text-[#0B3F5A] mb-2" />
            <h4 className="font-sans font-semibold text-sm text-[#082536]">
              Google Maps Cartographic Surface
            </h4>
            <p className="text-xs text-[#134059] max-w-sm mt-1 font-mono">
              Vector terrain mode. Switch to Leaflet for circular risk markers.
            </p>
            <button
              onClick={() => setEngine('leaflet')}
              className="mt-3 px-3.5 py-1.5 bg-[#0B3F5A] text-[#F5EEDD] font-semibold text-xs font-mono rounded-lg cursor-pointer shadow-xs"
            >
              Switch back to Leaflet Survey Surface
            </button>
          </div>
        )}

        {/* 3. Explicit Required Risk Color Legend */}
        <div className="absolute bottom-3 left-3 z-20 bg-[#082536]/95 backdrop-blur-xs border border-[#6A9AB6] rounded-xl p-3 text-[10px] font-mono shadow-xl space-y-1.5 text-[#F5EEDD] max-w-xs">
          <div className="font-bold uppercase tracking-wider text-[9px] mb-1.5 text-[#84B3CE] flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#84B3CE]" />
            <span>Kerala Waterbody Risk Scale</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full border-2 border-white shadow-xs" style={{ backgroundColor: RISK_DOT_COLORS.LOW }} />
            <span className="font-bold text-emerald-400">LOW (#16A34A):</span>
            <span className="text-slate-300">Lower observed hazard (NOT safe for swimming)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full border-2 border-white shadow-xs" style={{ backgroundColor: RISK_DOT_COLORS.MODERATE }} />
            <span className="font-bold text-amber-400">MODERATE (#F59E0B):</span>
            <span className="text-slate-300">Some verified hazard indicators present</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full border-2 border-white shadow-xs" style={{ backgroundColor: RISK_DOT_COLORS.HIGH }} />
            <span className="font-bold text-rose-400">HIGH (#DC2626):</span>
            <span className="text-slate-300">Substantial hazard / rapid flow / cascade / quarry</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full border-2 border-white shadow-xs" style={{ backgroundColor: RISK_DOT_COLORS.INSUFFICIENT_DATA }} />
            <span className="font-bold text-slate-300">INSUFFICIENT DATA (#94A3B8):</span>
            <span className="text-slate-400">Unmonitored reach (Never assumed low risk)</span>
          </div>
          <div className="text-[9px] text-[#84B3CE] italic border-t border-[#6A9AB6]/40 pt-1 mt-1">
            *Representative circular dots for waterbody reaches. Click any dot to assess &amp; compare.
          </div>
        </div>
      </div>

      {/* 4. Selected Waterbody Side/Bottom Panel with Comparison Support */}
      {selectedFeature && (
        <div className="border-t border-[#6A9AB6] bg-[#F5EEDD] p-4 text-[#082536]">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Header: Title, Controls, Close */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#DDD2B8] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full border border-white"
                    style={{ backgroundColor: RISK_CONFIG[selectedFeature.hazard_category]?.hex || '#94A3B8' }}
                  />
                  <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded bg-[#16587B] text-[#F5EEDD]">
                    {selectedFeature.type}
                  </span>
                  <h3 className="font-sans font-bold text-base text-[#0B3F5A]">
                    {selectedFeature.name}
                  </h3>
                  {selectedFeature.district && (
                    <span className="text-xs font-mono text-[#134059]">
                      ({selectedFeature.district} District)
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-[#134059] mt-1 flex flex-wrap items-center gap-3">
                  <span>Coordinates: <strong>{selectedFeature.centroid_lat.toFixed(4)}°N, {selectedFeature.centroid_lon.toFixed(4)}°E</strong></span>
                  {selectedFeature.basin_region && <span>Basin: <strong>{selectedFeature.basin_region}</strong></span>}
                  <span>Data Source: <strong>{selectedFeature.data_source}</strong></span>
                </div>
              </div>

              {/* Actions: Re-evaluate, Compare, Close */}
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setIsLoadingAssessment(true);
                    try {
                      const updated = await triggerHazardAssessment(selectedFeature.id);
                      setAssessmentResult(updated);
                    } catch (e) {
                      console.warn(e);
                    } finally {
                      setIsLoadingAssessment(false);
                    }
                  }}
                  disabled={isLoadingAssessment}
                  className="px-3 py-1.5 bg-[#16587B] hover:bg-[#0B3F5A] text-[#F5EEDD] rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAssessment ? 'animate-spin' : ''}`} />
                  <span>{isLoadingAssessment ? 'Evaluating...' : 'Re-evaluate Hazard'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsComparing(!isComparing);
                    if (!isComparing && !comparedFeature && waterbodyFeatures.length > 1) {
                      // Suggest the second waterbody as initial comparison
                      const other = waterbodyFeatures.find((f) => f.id !== selectedFeature.id);
                      if (other) handleSelectDot(other, true);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isComparing
                      ? 'bg-blue-900 text-blue-200 border-blue-500'
                      : 'bg-[#F5EEDD] hover:bg-[#FAF6EC] text-[#0B3F5A] border-[#6A9AB6]'
                  }`}
                  title="Compare this waterbody with another location"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{isComparing ? 'Close Comparison' : 'Compare Locations'}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedFeature(null);
                    setComparedFeature(null);
                    setIsComparing(false);
                  }}
                  className="p-1.5 rounded-lg border border-[#6A9AB6] hover:bg-[#84B3CE]/30 text-[#0F3A52] cursor-pointer"
                  title="Close Assessment Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Assessment Grid: Single Card or Side-by-Side Comparison */}
            <div className={`grid grid-cols-1 ${isComparing && comparedFeature ? 'lg:grid-cols-2' : ''} gap-4`}>
              {/* Primary Location Card */}
              {assessmentResult && (
                <div className="bg-[#84B3CE]/20 border border-[#6A9AB6] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#6A9AB6]/40 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#0B3F5A]">Primary Location:</span>
                      <span className="text-xs font-sans font-semibold text-[#082536]">{selectedFeature.name}</span>
                    </div>
                    <span
                      style={{
                        backgroundColor: RISK_CONFIG[assessmentResult.hazard_category]?.bgHex || '#F1F5F9',
                        color: RISK_CONFIG[assessmentResult.hazard_category]?.textHex || '#475569',
                        borderColor: RISK_CONFIG[assessmentResult.hazard_category]?.borderHex || '#94A3B8',
                      }}
                      className="px-3 py-0.5 rounded-full text-xs font-mono font-bold border uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: RISK_CONFIG[assessmentResult.hazard_category]?.hex || '#94A3B8' }}
                      />
                      <span>{RISK_CONFIG[assessmentResult.hazard_category]?.label || assessmentResult.hazard_category}</span>
                    </span>
                  </div>

                  <div className="text-xs font-sans text-[#082536] leading-relaxed">
                    <strong>Rule Explanation:</strong> {assessmentResult.rule_summary}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {/* Available Indicators */}
                    <div className="bg-[#F5EEDD] p-2.5 rounded-lg border border-[#DDD2B8] space-y-1.5">
                      <div className="font-mono font-semibold text-xs text-[#0B3F5A] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Available Indicators ({assessmentResult.contributing_indicators.length})</span>
                      </div>
                      {assessmentResult.contributing_indicators.length > 0 ? (
                        <div className="space-y-1">
                          {assessmentResult.contributing_indicators.map((ind, i) => (
                            <div key={i} className="p-1.5 rounded bg-[#84B3CE]/15 text-[11px]">
                              <div className="flex justify-between font-semibold text-[#0B3F5A]">
                                <span>{ind.indicator}</span>
                                <span className="font-mono text-emerald-700 font-bold">{ind.value} {ind.unit}</span>
                              </div>
                              <div className="text-[#134059] text-[10px]">{ind.description}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#134059] italic py-1">
                          No active sensor telemetry available at this reach.
                        </div>
                      )}
                    </div>

                    {/* Missing / Limitations */}
                    <div className="bg-[#F5EEDD] p-2.5 rounded-lg border border-[#DDD2B8] space-y-1.5">
                      <div className="font-mono font-semibold text-xs text-[#0B3F5A] flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Missing or Unmonitored Data</span>
                      </div>
                      {assessmentResult.missing_factors.length > 0 ? (
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#134059] font-mono">
                          {assessmentResult.missing_factors.map((m, i) => (
                            <li key={i}>{m.replace(/_/g, ' ')}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-[11px] text-emerald-700 italic">
                          All standard telemetry parameters monitored.
                        </div>
                      )}
                      <div className="text-[10px] font-mono text-[#134059] border-t border-[#DDD2B8] pt-1 mt-1">
                        Assessed: {new Date(assessmentResult.assessment_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {assessmentResult.data_source}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Comparison Location Card */}
              {isComparing && comparedFeature && comparedAssessment && (
                <div className="bg-blue-50/80 border border-blue-300 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-900">Comparing Location:</span>
                      <span className="text-xs font-sans font-semibold text-[#082536]">{comparedFeature.name}</span>
                    </div>
                    <span
                      style={{
                        backgroundColor: RISK_CONFIG[comparedAssessment.hazard_category]?.bgHex || '#F1F5F9',
                        color: RISK_CONFIG[comparedAssessment.hazard_category]?.textHex || '#475569',
                        borderColor: RISK_CONFIG[comparedAssessment.hazard_category]?.borderHex || '#94A3B8',
                      }}
                      className="px-3 py-0.5 rounded-full text-xs font-mono font-bold border uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: RISK_CONFIG[comparedAssessment.hazard_category]?.hex || '#94A3B8' }}
                      />
                      <span>{RISK_CONFIG[comparedAssessment.hazard_category]?.label || comparedAssessment.hazard_category}</span>
                    </span>
                  </div>

                  <div className="text-xs font-sans text-[#082536] leading-relaxed">
                    <strong>Rule Explanation:</strong> {comparedAssessment.rule_summary}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-[#F5EEDD] p-2.5 rounded-lg border border-[#DDD2B8] space-y-1.5">
                      <div className="font-mono font-semibold text-xs text-[#0B3F5A] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Available Indicators ({comparedAssessment.contributing_indicators.length})</span>
                      </div>
                      {comparedAssessment.contributing_indicators.length > 0 ? (
                        <div className="space-y-1">
                          {comparedAssessment.contributing_indicators.map((ind, i) => (
                            <div key={i} className="p-1.5 rounded bg-[#84B3CE]/15 text-[11px]">
                              <div className="flex justify-between font-semibold text-[#0B3F5A]">
                                <span>{ind.indicator}</span>
                                <span className="font-mono text-emerald-700 font-bold">{ind.value} {ind.unit}</span>
                              </div>
                              <div className="text-[#134059] text-[10px]">{ind.description}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#134059] italic py-1">
                          No active sensor telemetry available at this reach.
                        </div>
                      )}
                    </div>

                    <div className="bg-[#F5EEDD] p-2.5 rounded-lg border border-[#DDD2B8] space-y-1.5">
                      <div className="font-mono font-semibold text-xs text-[#0B3F5A] flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Missing or Unmonitored Data</span>
                      </div>
                      {comparedAssessment.missing_factors.length > 0 ? (
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#134059] font-mono">
                          {comparedAssessment.missing_factors.map((m, i) => (
                            <li key={i}>{m.replace(/_/g, ' ')}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-[11px] text-emerald-700 italic">
                          All standard telemetry parameters monitored.
                        </div>
                      )}
                      <div className="text-[10px] font-mono text-[#134059] border-t border-[#DDD2B8] pt-1 mt-1">
                        Assessed: {new Date(comparedAssessment.assessment_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {comparedAssessment.data_source}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scientific Integrity Notice */}
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-[11px] text-amber-900 leading-relaxed font-sans">
              <strong>⚠️ Public Safety Notice:</strong> This preliminary water-hazard assessment is calculated strictly from physical environmental parameters (depth, flow velocity, stage, rainfall, and structural hazards). We do NOT possess a verified drowning incident dataset and do NOT predict individual drowning probabilities. A LOW hazard rating indicates nominal observed baseline conditions; it DOES NOT mean the location is safe for swimming. Always maintain vigilance around waterbodies.
            </div>
          </div>
        </div>
      )}

      {/* 5. Attribution & Status Bar */}
      <div className="px-3.5 py-2 bg-[#F5EEDD] border-t border-[#6A9AB6] text-[10px] font-mono text-[#134059] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>Sources:</span>
          <span className="font-semibold text-[#0B3F5A]">
            OpenStreetMap contributors (ODbL) | Central Water Commission (CWC) | Kerala State Water Resources Department (Kerala SW)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>Marker Representation: Circular Risk Dots</span>
          <span>CRS: WGS84</span>
        </div>
      </div>
    </div>
  );
};
