import React from 'react';
import {
  Droplets,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Compass,
} from 'lucide-react';
import { WaterBody, RiskChangeEvent } from '../types';
import { DemoBadge } from './common/DemoBadge';

interface SummaryCardsProps {
  waterBodies: WaterBody[];
  riskChanges: RiskChangeEvent[];
  onSelectStation: (wb: WaterBody) => void;
  /** Pass true when the displayed water bodies are synthetic/fallback demo data */
  isUsingDemoData?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  waterBodies,
  riskChanges,
  onSelectStation,
  isUsingDemoData = false,
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
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm relative group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Locations monitored</span>
            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60">
              <Droplets className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">{total}</span>
            <span className="text-xs text-slate-400">sites</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-2">
            {isUsingDemoData ? (
              <DemoBadge />
            ) : (
              <span className="font-mono text-slate-500">Live backend</span>
            )}
            <span className="text-slate-400 flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {isUsingDemoData ? 'Demo data' : 'API connected'}
            </span>
          </div>
        </div>

        {/* High & Extreme Hazard Sites */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-rose-900/40 shadow-sm relative group hover:border-rose-800/60 transition-all">
          <div className="flex items-center justify-between text-rose-300 text-xs font-medium mb-2">
            <span>Need attention</span>
            <div className="p-1.5 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/40">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-rose-400 tracking-tight">
              {highRisk.length}
            </span>
            <span className="text-xs text-rose-300/80">high / extreme</span>
          </div>
          {/* List top affected sites */}
          <div className="mt-2 space-y-1">
            {highRisk.slice(0, 2).map((wb) => (
              <button
                key={wb.id}
                onClick={() => onSelectStation(wb)}
                className="w-full text-left text-xs text-rose-200/90 hover:text-white truncate flex items-center gap-1 transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">{wb.name.replace(' (DEMO Station)', '')}</span>
              </button>
            ))}
            {highRisk.length > 2 && (
              <span className="text-xs text-rose-400/70">+{highRisk.length - 2} more</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-rose-300/80 border-t border-rose-950 pt-2">
            <div className="flex items-center gap-1.5">
              {isUsingDemoData && <DemoBadge />}
              <span className="font-medium text-xs bg-rose-950/80 px-2 py-0.5 rounded text-rose-300 border border-rose-800/50">
                Active warnings
              </span>
            </div>
          </div>
        </div>

        {/* Moderate Caution Sites */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-900/30 shadow-sm relative group hover:border-amber-800/50 transition-all">
          <div className="flex items-center justify-between text-amber-300 text-xs font-medium mb-2">
            <span>Monitor closely</span>
            <div className="p-1.5 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-amber-400 tracking-tight">
              {moderate.length}
            </span>
            <span className="text-xs text-amber-300/80">moderate risk</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-amber-300/80 border-t border-amber-950 pt-2">
            <span>Elevated flow or chop</span>
            <div className="flex items-center gap-1.5">
              {isUsingDemoData && <DemoBadge />}
              <span className="text-xs text-amber-400/80">Guarded</span>
            </div>
          </div>
        </div>

        {/* Safe Recreational Zones */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-900/30 shadow-sm relative group hover:border-emerald-800/50 transition-all">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-medium mb-2">
            <span>Normal conditions</span>
            <div className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {safe.length}
            </span>
            <span className="text-xs text-emerald-300/80">low risk</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-emerald-300/80 border-t border-emerald-950 pt-2">
            <span>Flow &lt;2 m³/s · Temp &gt;18°C</span>
            <div className="flex items-center gap-1.5">
              {isUsingDemoData && <DemoBadge />}
              <span className="font-medium text-xs bg-emerald-950/80 px-2 py-0.5 rounded text-emerald-300 border border-emerald-800/50">
                Clear
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Risk Changes */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-semibold text-slate-200">
              Recent status transitions
            </h3>
            {isUsingDemoData && <DemoBadge tooltip="Risk change events are demonstration data." />}
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
            Automated evaluation feed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {riskChanges.map((change) => {
            const isIncrease = change.delta_direction === 'increased';
            return (
              <div
                key={change.id}
                className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                  isIncrease
                    ? 'bg-rose-950/15 border-rose-900/30 hover:border-rose-800/50'
                    : 'bg-emerald-950/15 border-emerald-900/30 hover:border-emerald-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 truncate pr-2">
                    {change.water_body_name}
                  </span>
                  <div
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded capitalize ${
                      isIncrease
                        ? 'bg-rose-950/70 text-rose-300 border border-rose-800/50'
                        : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50'
                    }`}
                  >
                    {isIncrease ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{change.new_level}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  <span>
                    Score: {change.previous_score} &rarr; <strong className="text-white font-bold">{change.new_score}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {(() => {
                    const diff = Math.round((Date.now() - new Date(change.timestamp).getTime()) / 60000);
                    if (diff < 1) return 'Just now';
                    if (diff < 60) return `${diff}m ago`;
                    return `${Math.floor(diff / 60)}h ago`;
                  })()}
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
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
