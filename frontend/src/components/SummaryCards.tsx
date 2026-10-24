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
      {/* 4 Distinct Environmental Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monitored Sites - Pale Blue Water Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-white via-[#F7FBFE] to-[#D9F0FF]/40 border border-[#D9E8EF] shadow-xs hover:shadow-md hover:border-[#8ED7F8] hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between text-[#647D8C] text-xs font-semibold mb-2">
            <span>Locations monitored</span>
            <div className="p-2.5 rounded-xl bg-[#D9F0FF] text-[#2387D9] border border-[#8ED7F8]/40 shadow-2xs">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-[#24445A] tracking-tight">{total}</span>
            <span className="text-xs text-[#647D8C]">sites</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#647D8C] border-t border-[#D9E8EF]/60 pt-2.5">
            {isUsingDemoData ? (
              <DemoBadge />
            ) : (
              <span className="font-mono text-[#2387D9] font-medium">Live backend</span>
            )}
            <span className="text-[#647D8C] flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              {isUsingDemoData ? 'Demo data' : 'API connected'}
            </span>
          </div>
        </div>

        {/* High & Extreme Hazard Sites - Soft Coral Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-white via-[#FFF9F7] to-[#FFE3D9]/40 border border-[#FFE3D9] shadow-xs hover:shadow-md hover:border-[#FDBA74] hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between text-[#7C2D12] text-xs font-semibold mb-2">
            <span>Need attention</span>
            <div className="p-2.5 rounded-xl bg-[#FFE3D9] text-[#DC2626] border border-[#FDBA74]/40 shadow-2xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-[#DC2626] tracking-tight">
              {highRisk.length}
            </span>
            <span className="text-xs text-[#7C2D12] font-medium">high / extreme</span>
          </div>
          {/* List top affected sites */}
          <div className="mt-2 space-y-1">
            {highRisk.slice(0, 2).map((wb) => (
              <button
                key={wb.id}
                onClick={() => onSelectStation(wb)}
                className="w-full text-left text-xs text-[#7C2D12] hover:text-[#DC2626] truncate flex items-center gap-1 transition-colors font-medium cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                <span className="truncate">{wb.name.replace(' (DEMO Station)', '')}</span>
              </button>
            ))}
            {highRisk.length > 2 && (
              <span className="text-xs text-[#DC2626] font-semibold">+{highRisk.length - 2} more</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#7C2D12] border-t border-[#FFE3D9] pt-2.5">
            <div className="flex items-center gap-1.5">
              {isUsingDemoData && <DemoBadge />}
              <span className="font-semibold text-xs bg-[#FFE3D9] px-2 py-0.5 rounded text-[#7C2D12] border border-[#FDBA74]">
                Active warnings
              </span>
            </div>
          </div>
        </div>

        {/* Moderate Caution Sites - Soft Yellow Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-white via-[#FFFDF7] to-[#FFF1C7]/40 border border-[#FFF1C7] shadow-xs hover:shadow-md hover:border-[#FDE68A] hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between text-[#78350F] text-xs font-semibold mb-2">
            <span>Monitor closely</span>
            <div className="p-2.5 rounded-xl bg-[#FFF1C7] text-[#D97706] border border-[#FDE68A]/40 shadow-2xs">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-[#D97706] tracking-tight">
              {moderate.length}
            </span>
            <span className="text-xs text-[#78350F] font-medium">moderate risk</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#78350F] border-t border-[#FFF1C7] pt-2.5">
            <span className="text-[#78350F]">Elevated flow or chop</span>
            <div className="flex items-center gap-1.5">
              {isUsingDemoData && <DemoBadge />}
              <span className="text-xs font-bold text-[#78350F] bg-[#FFF1C7] px-2 py-0.5 rounded border border-[#FDE68A]">Guarded</span>
            </div>
          </div>
        </div>

        {/* Safe Recreational Zones - Mint Green Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-white via-[#F7FCF9] to-[#DDF5E8]/40 border border-[#DDF5E8] shadow-xs hover:shadow-md hover:border-[#A7F3D0] hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between text-[#14532D] text-xs font-semibold mb-2">
            <span>Normal conditions</span>
            <div className="p-2.5 rounded-xl bg-[#DDF5E8] text-[#16A34A] border border-[#A7F3D0]/40 shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-[#16A34A] tracking-tight">
              {safe.length}
            </span>
            <span className="text-xs text-[#14532D] font-medium">low risk</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#14532D] border-t border-[#DDF5E8] pt-2.5">
            <span className="text-[#14532D]">Flow &lt;2 m³/s · Temp &gt;18°C</span>
            <div className="flex items-center gap-1.5">
              {isUsingDemoData && <DemoBadge />}
              <span className="font-semibold text-xs bg-[#DDF5E8] px-2 py-0.5 rounded text-[#14532D] border border-[#A7F3D0]">
                Clear
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Risk Changes */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E8EF] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#D9F0FF] border border-[#8ED7F8]/50 flex items-center justify-center text-[#2387D9]">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-[#24445A] uppercase tracking-wider">
              Recent status transitions
            </h3>
            {isUsingDemoData && <DemoBadge tooltip="Risk change events are demonstration data." />}
          </div>
          <span className="text-xs font-mono text-[#647D8C] bg-[#F1F8FC] px-3 py-1 rounded-lg border border-[#D9E8EF]">
            Automated evaluation feed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {riskChanges.map((change) => {
            const isIncrease = change.delta_direction === 'increased';
            return (
              <div
                key={change.id}
                className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all hover:-translate-y-0.5 hover:shadow-xs ${
                  isIncrease
                    ? 'bg-gradient-to-br from-white to-[#FFF5F2] border-[#FFE3D9] hover:border-[#FDBA74]'
                    : 'bg-gradient-to-br from-white to-[#F4FBF7] border-[#DDF5E8] hover:border-[#A7F3D0]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#24445A] truncate pr-2">
                    {change.water_body_name}
                  </span>
                  <div
                    className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      isIncrease
                        ? 'bg-[#FFE3D9] text-[#7C2D12] border border-[#FDBA74]'
                        : 'bg-[#DDF5E8] text-[#14532D] border border-[#A7F3D0]'
                    }`}
                  >
                    {isIncrease ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#DC2626]" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-[#16A34A]" />
                    )}
                    <span>{change.new_level}</span>
                  </div>
                </div>

                <div className="text-xs text-[#647D8C] font-mono">
                  <span>
                    Score: {change.previous_score} &rarr; <strong className="text-[#24445A] font-bold">{change.new_score}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[#647D8C] text-xs">
                  <Clock className="w-3 h-3 text-[#647D8C]" />
                  {(() => {
                    const diff = Math.round((Date.now() - new Date(change.timestamp).getTime()) / 60000);
                    if (diff < 1) return 'Just now';
                    if (diff < 60) return `${diff}m ago`;
                    return `${Math.floor(diff / 60)}h ago`;
                  })()}
                </div>

                <p className="text-xs text-[#647D8C] line-clamp-2 leading-relaxed">
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
