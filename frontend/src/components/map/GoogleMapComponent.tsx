import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import {
  Plus,
  Minus,
  Maximize2,
  Compass,
  Globe,
  Satellite,
  Mountain,
  MapPin,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { WaterBody, RiskLevel, WaterBodyType, formatCoordinates } from '../../types';
import { api } from '../../services/api';
import { RiskLegend } from '../common/RiskLegend';
import { createMarkerIcon } from './MapMarker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoogleMapComponentProps {
  waterBodies: WaterBody[];
  selectedStation: WaterBody | null;
  onSelectStation: (wb: WaterBody) => void;
}

type MapLayerType = 'roadmap' | 'satellite' | 'terrain';
type FilterType = WaterBodyType | 'all';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const KEY_MISSING =
  !GOOGLE_MAPS_API_KEY ||
  GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key_here' ||
  GOOGLE_MAPS_API_KEY.toLowerCase().includes('placeholder');

const LAYER_LABELS: Record<MapLayerType, string> = {
  roadmap:   'Street',
  satellite: 'Satellite',
  terrain:   'Terrain',
};

const LAYER_ICONS: Record<MapLayerType, React.ReactNode> = {
  roadmap:   <Globe className="w-3.5 h-3.5" />,
  satellite: <Satellite className="w-3.5 h-3.5" />,
  terrain:   <Mountain className="w-3.5 h-3.5" />,
};

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'river',     label: 'River' },
  { value: 'lake',      label: 'Lake' },
  { value: 'reservoir', label: 'Reservoir' },
  { value: 'coastal',   label: 'Coastal' },
];

// ─── Fallback UI (no API key configured) ─────────────────────────────────────

const MapKeyMissingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[420px] bg-slate-900/80 rounded-2xl border border-amber-800/40 p-8 text-center space-y-5">
    <div className="p-4 rounded-full bg-amber-950 border border-amber-800">
      <KeyRound className="w-8 h-8 text-amber-400" />
    </div>
    <div className="space-y-2 max-w-sm">
      <h3 className="text-base font-bold text-white">Google Maps API Key Required</h3>
      <p className="text-xs text-slate-400 leading-relaxed">
        The live map requires a Google Maps JavaScript API key. Water body data and risk
        overlays are ready — add your key to enable the full map experience.
      </p>
    </div>
    <div className="w-full max-w-sm text-left space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Setup instructions</p>
      <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
        <li>
          Go to{' '}
          <a
            href="https://console.cloud.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 underline hover:text-cyan-300"
          >
            console.cloud.google.com
          </a>
        </li>
        <li>Enable the <strong>Maps JavaScript API</strong></li>
        <li>Create an API key and restrict it to your domain</li>
        <li>Add it to your <code className="bg-slate-800 px-1 rounded text-amber-300">.env</code> file:</li>
      </ol>
      <pre className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-amber-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
VITE_GOOGLE_MAPS_API_KEY=your_key_here
      </pre>
      <p className="text-[10px] text-slate-500">Restart the dev server after updating .env.</p>
    </div>
  </div>
);

// ─── Dark map styles ──────────────────────────────────────────────────────────

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b4f6c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#14b8a6' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#334155' }] },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  waterBodies,
  selectedStation,
  onSelectStation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const markerListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const isMountedRef = useRef(true);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>('roadmap');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showRings, setShowRings] = useState(true);
  const [coordNotice, setCoordNotice] = useState<string | null>(null);

  // Filtered stations
  const filteredStations = waterBodies.filter(
    (wb) => filterType === 'all' || wb.type === filterType
  );

  // Centroid of all valid water bodies for initial camera
  const getDefaultCenter = useCallback((): google.maps.LatLngLiteral => {
    const valid = waterBodies.filter(
      (wb) => wb.latitude != null && wb.longitude != null && !isNaN(wb.latitude) && !isNaN(wb.longitude)
    );
    if (valid.length === 0) return { lat: 37.79, lng: -122.37 };
    const lat = valid.reduce((s, wb) => s + wb.latitude, 0) / valid.length;
    const lng = valid.reduce((s, wb) => s + wb.longitude, 0) / valid.length;
    return { lat, lng };
  }, [waterBodies]);

  // ── Fit all visible markers into view ──────────────────────────────────────
  const fitAllMarkers = useCallback(() => {
    if (!mapRef.current) return;
    const valid = filteredStations.filter(
      (wb) => wb.latitude != null && wb.longitude != null && !isNaN(wb.latitude) && !isNaN(wb.longitude)
    );
    if (valid.length === 0) return;
    if (valid.length === 1) {
      mapRef.current.panTo({ lat: valid[0].latitude, lng: valid[0].longitude });
      mapRef.current.setZoom(13);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    valid.forEach((wb) => bounds.extend({ lat: wb.latitude, lng: wb.longitude }));
    mapRef.current.fitBounds(bounds, 60);
  }, [filteredStations]);

  // ── Build / Rebuild Markers ─────────────────────────────────────────────────
  const buildMarkers = useCallback(() => {
    if (!mapRef.current) return;

    // Tear down clusterer
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
    // Remove listener refs
    markerListenersRef.current.forEach((l) => google.maps.event.removeListener(l));
    markerListenersRef.current = [];
    // Remove marker refs
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const newMarkers: google.maps.Marker[] = [];

    filteredStations.forEach((wb) => {
      if (wb.latitude == null || wb.longitude == null || isNaN(wb.latitude) || isNaN(wb.longitude)) return;

      const isSelected = selectedStation?.id === wb.id;
      const icon = createMarkerIcon(wb.current_risk_level as RiskLevel, isSelected, showRings);

      const marker = new google.maps.Marker({
        position: { lat: wb.latitude, lng: wb.longitude },
        map: mapRef.current!,
        title: wb.name,
        icon: {
          url: icon.url,
          scaledSize: new google.maps.Size(icon.scaledSize.width, icon.scaledSize.height),
          anchor: new google.maps.Point(icon.anchor.x, icon.anchor.y),
        },
        zIndex: isSelected ? 100 : 10,
        optimized: false, // required for SVG data URLs
      });

      const listener = marker.addListener('click', () => {
        onSelectStation(wb);
        setCoordNotice(null);
      });

      markerListenersRef.current.push(listener);
      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;

    // Attach marker clusterer
    clustererRef.current = new MarkerClusterer({
      map: mapRef.current,
      markers: newMarkers,
    });
  }, [filteredStations, selectedStation, showRings, onSelectStation]);

  // ── Initialize Google Maps ──────────────────────────────────────────────────
  useEffect(() => {
    if (KEY_MISSING || !mapContainerRef.current) return;
    isMountedRef.current = true;

    const initMap = async () => {
      try {
        // Configure the loader (must call before importLibrary)
        setOptions({
          key: GOOGLE_MAPS_API_KEY!,
          v: 'weekly',
          libraries: ['marker', 'geometry'],
        });

        // Import the core maps library
        const { Map: GoogleMap } = await importLibrary('maps') as google.maps.MapsLibrary;

        if (!isMountedRef.current || !mapContainerRef.current) return;

        const map = new GoogleMap(mapContainerRef.current, {
          center: getDefaultCenter(),
          zoom: 11,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          backgroundColor: '#0f172a',
          styles: DARK_MAP_STYLES,
        });

        mapRef.current = map;

        // Map click → coordinate lookup
        const clickListener = map.addListener(
          'click',
          async (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            try {
              const found = await api.getWaterBodyByCoordinates(lat, lng, 0.08);
              onSelectStation(found);
              setCoordNotice(null);
            } catch {
              setCoordNotice(
                `No monitored station near ${formatCoordinates(lat, lng, 4)}. AQUORA does not assign data to unmonitored coordinates.`
              );
            }
          }
        );
        mapClickListenerRef.current = clickListener;

        if (isMountedRef.current) setMapReady(true);
      } catch (err: unknown) {
        if (isMountedRef.current) {
          const msg = err instanceof Error ? err.message : String(err);
          setMapError(`Failed to load Google Maps: ${msg}`);
        }
      }
    };

    initMap();

    return () => {
      isMountedRef.current = false;
      if (mapClickListenerRef.current) {
        google.maps.event.removeListener(mapClickListenerRef.current);
      }
      markerListenersRef.current.forEach((l) => google.maps.event.removeListener(l));
      markersRef.current.forEach((m) => m.setMap(null));
      if (clustererRef.current) clustererRef.current.clearMarkers();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Rebuild markers when data/selection/filter/rings changes ───────────────
  useEffect(() => {
    if (mapReady) buildMarkers();
  }, [mapReady, buildMarkers]);

  // ── Pan / fit when selection changes ───────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    if (selectedStation?.latitude != null && selectedStation?.longitude != null &&
        !isNaN(selectedStation.latitude) && !isNaN(selectedStation.longitude)) {
      mapRef.current.panTo({ lat: selectedStation.latitude, lng: selectedStation.longitude });
      if ((mapRef.current.getZoom() ?? 0) < 12) mapRef.current.setZoom(12);
    } else if (!selectedStation) {
      fitAllMarkers();
    }
  }, [selectedStation, mapReady, fitAllMarkers]);

  // ── Apply tile layer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const typeMap: Record<MapLayerType, google.maps.MapTypeId> = {
      roadmap:   google.maps.MapTypeId.ROADMAP,
      satellite: google.maps.MapTypeId.SATELLITE,
      terrain:   google.maps.MapTypeId.TERRAIN,
    };
    mapRef.current.setMapTypeId(typeMap[activeLayer]);
    // Restore dark styles on roadmap/terrain but not satellite
    if (activeLayer === 'roadmap') {
      mapRef.current.setOptions({ styles: DARK_MAP_STYLES });
    } else {
      mapRef.current.setOptions({ styles: [] });
    }
  }, [activeLayer, mapReady]);

  // ── Zoom controls ───────────────────────────────────────────────────────────
  const handleZoomIn  = () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 11) + 1);
  const handleZoomOut = () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 11) - 1);

  // ── Early exits ─────────────────────────────────────────────────────────────
  if (KEY_MISSING) return <MapKeyMissingFallback />;

  if (mapError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[420px] bg-slate-900/80 rounded-2xl border border-rose-800/60 p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-400" />
        <p className="text-sm text-rose-300 font-medium">{mapError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-rose-900/60 text-rose-200 text-xs font-semibold hover:bg-rose-900 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl">

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-30 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">Loading Google Maps…</p>
        </div>
      )}

      {/* Map canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* ── Top-left: Layer switcher + Type filter ──────────────────── */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Layer switcher */}
        <div className="flex rounded-lg overflow-hidden border border-slate-700 shadow-md">
          {(Object.keys(LAYER_LABELS) as MapLayerType[]).map((layer) => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              title={LAYER_LABELS[layer]}
              aria-pressed={activeLayer === layer}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                activeLayer === layer
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {LAYER_ICONS[layer]}
              <span className="hidden sm:inline">{LAYER_LABELS[layer]}</span>
            </button>
          ))}
        </div>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-1">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterType(value)}
              aria-pressed={filterType === value}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors border ${
                filterType === value
                  ? 'bg-cyan-700 border-cyan-500 text-white'
                  : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Top-right: Zoom + rings ────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 pointer-events-auto">
        <button onClick={handleZoomIn}  title="Zoom in"
          className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white shadow-md transition-colors">
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={handleZoomOut} title="Zoom out"
          className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white shadow-md transition-colors">
          <Minus className="w-4 h-4" />
        </button>
        <button onClick={fitAllMarkers} title="Fit all stations"
          className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white shadow-md transition-colors">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowRings((v) => !v)}
          title={showRings ? 'Hide pulse rings' : 'Show pulse rings'}
          className={`p-2 rounded-lg border shadow-md transition-colors ${
            showRings
              ? 'bg-cyan-900/80 border-cyan-700 text-cyan-300 hover:bg-cyan-900'
              : 'bg-slate-900/90 border-slate-700 text-slate-500 hover:text-slate-300'
          }`}
        >
          {showRings ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Bottom-left: coordinate bar + notices ─────────────────── */}
      <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-2 max-w-[60%] pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/95 border border-slate-800 text-[10px] font-mono text-slate-400 shadow-sm">
          <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">
            {selectedStation
              ? `${selectedStation.name.replace(' (DEMO Station)', '')} · ${formatCoordinates(selectedStation.latitude, selectedStation.longitude, 4)}`
              : 'AQUORA Monitored Hydrological Stations'}
          </span>
        </div>

        {coordNotice && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-900/95 border border-amber-800/60 text-[10px] text-amber-300 shadow-md max-w-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="leading-snug flex-1">{coordNotice}</span>
            <button onClick={() => setCoordNotice(null)} aria-label="Dismiss" className="shrink-0 text-slate-500 hover:text-slate-300">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom-right: Risk legend ──────────────────────────────── */}
      <div className="absolute bottom-3 right-3 z-20 pointer-events-auto">
        <RiskLegend />
      </div>

      {/* ── Top-center: Station count badge ───────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700 shadow text-[10px] text-slate-300">
          <MapPin className="w-3 h-3 text-cyan-400" />
          <span>{filteredStations.filter((wb) => wb.latitude != null).length} stations</span>
          {filterType !== 'all' && (
            <span className="text-cyan-400 font-semibold">· {filterType}</span>
          )}
        </div>
      </div>
    </div>
  );
};
