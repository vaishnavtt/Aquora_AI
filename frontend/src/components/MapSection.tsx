import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Layers,
  Info,
  ExternalLink,
  Plus,
  Minus,
  Maximize2,
  Compass,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { WaterBody, RiskLevel } from '../types';

interface MapSectionProps {
  waterBodies: WaterBody[];
  selectedStation: WaterBody | null;
  onSelectStation: (wb: WaterBody) => void;
}

export const MapSection: React.FC<MapSectionProps> = ({
  waterBodies,
  selectedStation,
  onSelectStation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [showRings, setShowRings] = useState(true);

  // Read Google Maps API key safely from environment
  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isGoogleMapsConfigured =
    Boolean(googleMapsKey) &&
    googleMapsKey !== 'your_google_maps_api_key_here' &&
    !googleMapsKey.includes('placeholder');

  const filteredStations = waterBodies.filter(
    (wb) => filterType === 'all' || wb.type === filterType
  );

  // Helper for risk marker styling
  const getMarkerBadge = (level: RiskLevel) => {
    switch (level) {
      case 'low':
        return {
          bg: 'bg-emerald-950/90',
          border: 'border-emerald-400',
          text: 'text-emerald-300',
          pulse: 'bg-emerald-400',
          ring: 'ring-emerald-500/30',
        };
      case 'moderate':
        return {
          bg: 'bg-amber-950/90',
          border: 'border-amber-400',
          text: 'text-amber-300',
          pulse: 'bg-amber-400',
          ring: 'ring-amber-500/30',
        };
      case 'high':
      case 'extreme':
      default:
        return {
          bg: 'bg-rose-950/90',
          border: 'border-rose-400',
          text: 'text-rose-300',
          pulse: 'bg-rose-500',
          ring: 'ring-rose-500/30',
        };
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md overflow-hidden flex flex-col">
      {/* Top Map Toolbar */}
      <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/50">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Geospatial Hazard Map
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 font-semibold uppercase">
                DEMO SIMULATION
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Interactive telemetry marker array. Click any risk pin to inspect real-time station physics.
            </p>
          </div>
        </div>

        {/* Filter & Layer Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Aquatic Types</option>
            <option value="lake">Lakes</option>
            <option value="river">Rivers</option>
            <option value="reservoir">Reservoirs</option>
            <option value="coastal">Coastal</option>
          </select>

          <button
            onClick={() => setShowRings(!showRings)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
              showRings
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800'
                : 'bg-slate-900 text-slate-400 border-slate-700/60'
            }`}
          >
            Hazard Perimeter Rings
          </button>
        </div>
      </div>

      {/* Google Maps Credentials Notification Banner */}
      {!isGoogleMapsConfigured && (
        <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border-b border-amber-800/40 px-4 py-2 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>PLACEHOLDER MAP:</strong> Google Maps JS API credentials are unconfigured. Displaying interactive high-contrast bathymetry simulation canvas.
            </span>
          </div>
          <div className="text-[11px] text-amber-300 font-mono">
            Track 2 Lead: Set <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200">VITE_GOOGLE_MAPS_API_KEY</code> in <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200">frontend/.env</code>
          </div>
        </div>
      )}

      {/* Map Viewport Area */}
      <div
        ref={mapContainerRef}
        className="relative w-full h-[460px] bg-slate-950 overflow-hidden select-none"
      >
        {/* Background Bathymetric & Radar Grid */}
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Subtle grid pattern */}
          <div className="w-full h-full bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:28px_28px] opacity-70" />

          {/* Simulated shoreline and waterway vectors */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M -50 150 Q 180 80 320 220 T 700 180 T 1100 290 T 1400 120"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="42"
              strokeLinecap="round"
              className="opacity-20"
            />
            <path
              d="M -50 150 Q 180 80 320 220 T 700 180 T 1100 290 T 1400 120"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="12"
              strokeDasharray="6 6"
              className="opacity-40 animate-pulse"
            />
            {/* Coastal contour line */}
            <path
              d="M 50 480 Q 250 350 450 390 T 850 340 T 1200 440"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="28"
              className="opacity-15"
            />
          </svg>

          {/* Radar scan pulse */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-cyan-800/20 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full border border-blue-900/15 pointer-events-none" />

          {/* Plotted Risk-Colored Station Markers */}
          {filteredStations.map((station, index) => {
            const isSelected = selectedStation?.id === station.id;
            const badge = getMarkerBadge(station.current_risk_level);

            // Compute deterministic relative coordinates across the viewport canvas
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
                {/* Hazard Perimeter Ring */}
                {showRings && (
                  <span
                    className={`absolute inset-0 -m-3 rounded-full opacity-60 animate-ping pointer-events-none ${badge.pulse}`}
                  />
                )}

                {/* Marker Pin */}
                <div
                  className={`relative flex items-center justify-center p-2 rounded-full border-2 transition-all duration-200 shadow-xl ${
                    badge.bg
                  } ${badge.border} ${
                    isSelected
                      ? 'scale-125 ring-4 ring-white shadow-cyan-500/50'
                      : 'group-hover:scale-115'
                  }`}
                >
                  <MapPin className={`w-4 h-4 ${badge.text}`} />
                </div>

                {/* Marker Callout Tooltip */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 top-9 px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap shadow-lg border transition-all pointer-events-none z-20 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-cyan-500 shadow-cyan-500/20 opacity-100 scale-100'
                      : 'bg-slate-950/90 text-slate-300 border-slate-700 opacity-80 group-hover:opacity-100 scale-95 group-hover:scale-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${badge.pulse}`}
                    />
                    <span>{station.name.replace(' (DEMO Station)', '')}</span>
                    <span className="font-mono text-cyan-400">
                      ({station.risk_score.toFixed(0)})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Viewport Overlay Controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2 z-20">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 1.8))}
            title="Zoom In"
            className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
            title="Zoom Out"
            className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white shadow-md transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            title="Reset View"
            className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white shadow-md transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Map Info Ribbon */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-none">
          {/* Coordinates readout */}
          <div className="px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-400 shadow-sm pointer-events-auto flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Region: California Aquatic Basin (DEMO Coordinates)</span>
          </div>

          {/* Color-Coded Legend */}
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/95 border border-slate-800 text-[10px] text-slate-300 shadow-sm pointer-events-auto flex items-center space-x-3">
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">
              Risk Legend:
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Low (&lt;30)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Moderate (30-60)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>High / Extreme (&gt;60)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
