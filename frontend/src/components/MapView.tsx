import React, { useEffect, useRef, useState } from 'react';
import { WaterBody } from '../types';
import { MapPin, Layers, Navigation, ExternalLink, Info } from 'lucide-react';

interface MapViewProps {
  waterBodies: WaterBody[];
  onSelectWaterBody: (wb: WaterBody) => void;
}

export const MapView: React.FC<MapViewProps> = ({ waterBodies, onSelectWaterBody }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [activeStation, setActiveStation] = useState<WaterBody | null>(waterBodies[0] || null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isKeyConfigured = googleMapsApiKey && googleMapsApiKey !== 'your_google_maps_api_key_here';

  useEffect(() => {
    if (isKeyConfigured && (window as any).google && mapRef.current) {
      // Team Member 2 integration hook: Standard Google Maps initialization
      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 10,
        mapId: 'AQUORA_WATER_MONITOR',
      });

      waterBodies.forEach((wb) => {
        new (window as any).google.maps.Marker({
          position: { lat: wb.latitude, lng: wb.longitude },
          map,
          title: wb.name,
        });
      });
    }
  }, [isKeyConfigured, waterBodies]);

  return (
    <div className="space-y-6">
      {/* Header & Track Owner Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Geospatial Hazard Map
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visualizing telemetry stations, aquatic danger perimeters, and flow corridors.
          </p>
        </div>

        <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] text-slate-300 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Track 2 Owner: Frontend & Maps Lead</span>
        </div>
      </div>

      {/* Google Maps API Key Setup Prompt */}
      {!isKeyConfigured && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-800/40 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Google Maps API Ready:</span> Add your Google Maps JS key to{' '}
              <code className="text-cyan-300 font-mono bg-slate-800 px-1 py-0.5 rounded">frontend/.env</code> under{' '}
              <code className="text-cyan-300 font-mono bg-slate-800 px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code>.
              Rendering high-contrast geospatial matrix below.
            </div>
          </div>
          <a
            href="https://console.cloud.google.com/google/maps-apis/overview"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium whitespace-nowrap text-xs"
          >
            Google Cloud Console <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Map Canvas and Station Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Viewport Canvas */}
        <div className="lg:col-span-8 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative min-h-[440px] flex items-center justify-center p-6 shadow-inner">
          <div ref={mapRef} className="absolute inset-0">
            {/* Interactive Geospatial Grid Fallback */}
            <div className="w-full h-full bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] relative flex items-center justify-center overflow-hidden">
              {/* Radar circular sweeps */}
              <div className="absolute w-[360px] h-[360px] rounded-full border border-cyan-900/30 animate-pulse pointer-events-none" />
              <div className="absolute w-[540px] h-[540px] rounded-full border border-blue-900/20 pointer-events-none" />

              {/* Plotted stations */}
              {waterBodies.map((wb, index) => {
                // Map coordinates offset dynamically for prototype preview
                const leftPercent = 35 + ((wb.longitude + 122.4) * 450) + (index * 8);
                const topPercent = 40 - ((wb.latitude - 37.7) * 350) + (index * 6);
                const isSelected = activeStation?.id === wb.id;

                return (
                  <button
                    key={wb.id}
                    onClick={() => setActiveStation(wb)}
                    style={{ left: `${Math.max(10, Math.min(85, leftPercent))}%`, top: `${Math.max(15, Math.min(80, topPercent))}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none transition-transform hover:scale-110"
                  >
                    <div className="relative flex items-center justify-center">
                      <span
                        className={`absolute w-8 h-8 rounded-full opacity-60 animate-ping ${
                          wb.current_risk_level === 'low'
                            ? 'bg-emerald-500'
                            : wb.current_risk_level === 'moderate'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
                          isSelected ? 'scale-125 ring-2 ring-white' : ''
                        } ${
                          wb.current_risk_level === 'low'
                            ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                            : wb.current_risk_level === 'moderate'
                            ? 'bg-amber-950 border-amber-400 text-amber-300'
                            : 'bg-rose-950 border-rose-400 text-rose-300'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <span className="absolute top-7 left-1/2 -translate-x-1/2 text-[10px] font-medium text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap opacity-80 group-hover:opacity-100">
                      {wb.name}
                    </span>
                  </button>
                );
              })}

              <div className="absolute bottom-4 left-4 text-[11px] font-mono text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                Lat: 37.7749° N | Lng: -122.4194° W | Region: Bay Aquatics
              </div>
            </div>
          </div>
        </div>

        {/* Selected Station Inspector */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Station Telemetry
              </span>
              {activeStation && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    activeStation.current_risk_level === 'low'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : activeStation.current_risk_level === 'moderate'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {activeStation.current_risk_level}
                </span>
              )}
            </div>

            {activeStation ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                    {activeStation.type}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{activeStation.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Geo-coordinates: {activeStation.latitude.toFixed(4)}, {activeStation.longitude.toFixed(4)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/80 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">Water Temp</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {activeStation.water_temp_c.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">Flow Velocity</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {activeStation.flow_rate_cms.toFixed(1)} m³/s
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">Current Depth</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {activeStation.depth_meters.toFixed(1)} m
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">Calculated Risk</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {activeStation.risk_score.toFixed(0)} / 100
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  {activeStation.current_risk_level === 'low'
                    ? 'Environmental variables indicate normal recreation parameters. Safe for normal activity.'
                    : activeStation.current_risk_level === 'moderate'
                    ? 'Flow velocity or water temperature warrants elevated caution for recreational swimming.'
                    : 'Hazard thresholds exceeded. Shoreline safety warnings active.'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-8 text-center">
                Select a water body on the map to inspect telemetry.
              </p>
            )}
          </div>

          {activeStation && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={() => onSelectWaterBody(activeStation)}
                className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                Send Telemetry to Predictor &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
