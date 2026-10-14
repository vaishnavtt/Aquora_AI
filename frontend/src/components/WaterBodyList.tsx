import React, { useState } from 'react';
import { WaterBody, RiskLevel, WaterBodyType } from '../types';
import { Droplets, Filter, Search, ArrowUpRight, Compass, Thermometer, Wind } from 'lucide-react';

interface WaterBodyListProps {
  waterBodies: WaterBody[];
  loading: boolean;
  onSelectWaterBody: (wb: WaterBody) => void;
}

export const WaterBodyList: React.FC<WaterBodyListProps> = ({
  waterBodies,
  loading,
  onSelectWaterBody,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');

  const filtered = waterBodies.filter((wb) => {
    const matchesSearch = wb.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'all' || wb.type === selectedType;
    const matchesRisk = selectedRisk === 'all' || wb.current_risk_level === selectedRisk;
    return matchesSearch && matchesType && matchesRisk;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-400" />
            Monitored Water Bodies Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse all telemetry stations and inspect real-time flow, thermal conditions, and hazard ratings.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search station..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Types</option>
            <option value="lake">Lake</option>
            <option value="river">River</option>
            <option value="reservoir">Reservoir</option>
            <option value="coastal">Coastal</option>
          </select>

          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Risks</option>
            <option value="low">Low Risk</option>
            <option value="moderate">Moderate</option>
            <option value="high">High Risk</option>
          </select>
        </div>
      </div>

      {/* Grid of Water Body Cards */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-slate-900/40 rounded-xl border border-slate-800">
          No water bodies match your active filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((wb) => (
            <div
              key={wb.id}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      {wb.type}
                    </span>
                    <h3 className="text-base font-semibold text-white mt-1.5 group-hover:text-cyan-300 transition-colors">
                      {wb.name}
                    </h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      wb.current_risk_level === 'low'
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                        : wb.current_risk_level === 'moderate'
                        ? 'bg-amber-950/80 text-amber-400 border border-amber-800/40'
                        : 'bg-rose-950/80 text-rose-400 border border-rose-800/40'
                    }`}
                  >
                    {wb.current_risk_level} ({wb.risk_score.toFixed(0)})
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/60 my-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Temperature</span>
                    <span className="font-mono text-slate-200">{wb.water_temp_c.toFixed(1)}°C</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Flow Velocity</span>
                    <span className="font-mono text-slate-200">{wb.flow_rate_cms.toFixed(1)} m³/s</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Avg Depth</span>
                    <span className="font-mono text-slate-200">{wb.depth_meters.toFixed(1)} m</span>
                  </div>
                </div>

                <div className="flex items-center text-[11px] text-slate-500 font-mono mt-2">
                  <Compass className="w-3 h-3 mr-1 text-slate-400" />
                  <span>{wb.latitude.toFixed(4)}, {wb.longitude.toFixed(4)}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-800/40">
                <span className="text-[10px] text-slate-500">
                  Updated: {new Date(wb.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => onSelectWaterBody(wb)}
                  className="flex items-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Predict Risk <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
