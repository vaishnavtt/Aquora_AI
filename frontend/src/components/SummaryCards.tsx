import React from 'react';
import {
  Droplets,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Clock,
  Compass,
} from 'lucide-react';
import { WaterBody, RiskChangeEvent } from '../types';

interface SummaryCardsProps {
  waterBodies: WaterBody[];
  riskChanges: RiskChangeEvent[];
  onSelectStation: (wb: WaterBody) => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  waterBodies,
  riskChanges,
  onSelectStation,
}) => {
  const total = waterBodies.length;
  const highRisk = waterBodies.filter(
    (w) => w.current_risk_level === 'high' || w.current_risk_level === 'extreme'
  );
  const safe = waterBodies.filter((w) => w.current_risk_level === 'low');
  const moderate = waterBodies.filter((w) => w.current_risk_level === 'moderate');

  return (
    <div className="space-y-4">
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monitored Sites */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Monitored Stations</span>
            <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{total}</span>
            <span className="text-xs text-slate-400 font-mono">Zones Monitored</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2 font-mono">
            <span>DEMO STREAM</span>
            <span className="text-cyan-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              Live Telemetry
            </span>
          </div>
        </div>

        {/* High & Extreme Hazard Sites */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-rose-900/40 shadow-sm relative overflow-hidden group hover:border-rose-700/60 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between text-rose-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>High / Extreme Hazard</span>
            <div className="p-1.5 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800/40 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-rose-400 tracking-tight">
              {highRisk.length}
            </span>
            <span className="text-xs text-rose-400/80 font-mono">Critical Advisories</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-rose-300/80 border-t border-rose-950 pt-2">
            <span>Rapid current / hypothermia</span>
            <span className="font-semibold uppercase text-[10px] bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800/50">
              Active Warnings
            </span>
          </div>
        </div>

        {/* Moderate Caution Sites */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-900/40 shadow-sm relative overflow-hidden group hover:border-amber-700/60 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Moderate Caution</span>
            <div className="p-1.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800/40">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">
              {moderate.length}
            </span>
            <span className="text-xs text-amber-400/80 font-mono">Guarded State</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-amber-300/80 border-t border-amber-950 pt-2">
            <span>Elevated flow or chop</span>
            <span className="font-mono text-[10px]">Supervised swim only</span>
          </div>
        </div>

        {/* Safe Recreational Zones */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-900/40 shadow-sm relative overflow-hidden group hover:border-emerald-700/60 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Safe Activity Zones</span>
            <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
              {safe.length}
            </span>
            <span className="text-xs text-emerald-400/80 font-mono">Calm Dynamics</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-emerald-300/80 border-t border-emerald-950 pt-2">
            <span>Flow &lt;2 m³/s | Temp &gt;18°C</span>
            <span className="font-semibold uppercase text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/50">
              Clear
            </span>
          </div>
        </div>
      </div>

      {/* Recent Risk Changes Section */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Recent Hazard Level Changes (DEMO Telemetry)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            Real-Time State Transitions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {riskChanges.map((change) => {
            const isIncrease = change.delta_direction === 'increased';
            return (
              <div
                key={change.id}
                className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                  isIncrease
                    ? 'bg-rose-950/20 border-rose-800/40 hover:border-rose-700/60'
                    : 'bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-700/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 truncate pr-2">
                    {change.water_body_name}
                  </span>
                  <div
                    className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      isIncrease
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {isIncrease ? (
                      <ArrowUpRight className="w-3 h-3 text-rose-400" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                    )}
                    <span>{change.new_level}</span>
                  </div>
                </div>

                <div className="flex items-center text-[11px] text-slate-400 gap-2 font-mono">
                  <span>Score: {change.previous_score} &rarr; {change.new_score}</span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                    <Clock className="w-3 h-3" />
                    {new Date(change.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                  {change.trigger_reason}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
