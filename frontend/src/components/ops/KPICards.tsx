import React from 'react';
import { Radio, AlertOctagon, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';
import { WaterBody } from '../../types';

interface KPICardsProps {
  waterBodies: WaterBody[];
  onSelectStationByName?: (name: string) => void;
}

export const KPICards: React.FC<KPICardsProps> = ({
  waterBodies,
  onSelectStationByName,
}) => {
  const highExtreme = waterBodies.filter(
    (w) => w.current_risk_level === 'high' || w.current_risk_level === 'extreme'
  );
  const advisory = waterBodies.filter((w) => w.current_risk_level === 'moderate');
  const safe = waterBodies.filter((w) => w.current_risk_level === 'low');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Locations Monitored */}
      <div className="bg-[#1A1F22] border border-[#384145] rounded p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-[#9BA5A5] uppercase tracking-wider">
            Locations monitored
          </span>
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#23292C] text-[#3D8F91] border border-[#384145]">
            <Radio className="w-2.5 h-2.5 text-[#5C9B72]" />
            <span>API connected</span>
          </span>
        </div>
        <div className="my-2">
          <div className="font-mono text-[28px] font-medium text-[#E8E5DC] leading-none">
            {waterBodies.length} sites
          </div>
          <div className="text-[11px] text-[#9BA5A5] mt-1 font-sans">
            Kerala pilot coverage
          </div>
        </div>
        <div className="pt-2 border-t border-[#384145] flex items-center justify-between text-[10px] font-mono text-[#9BA5A5]">
          <span>Status: Pilot telemetry</span>
          <span>Basin: SW-KL</span>
        </div>
      </div>

      {/* 2. Active Intervention */}
      <div className="bg-[#1A1F22] border border-[#384145] rounded p-3.5 flex flex-col justify-between border-l-3 border-l-[#C96A50]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-[#C96A50] uppercase tracking-wider flex items-center space-x-1">
            <AlertOctagon className="w-3.5 h-3.5 text-[#C96A50]" />
            <span>Active intervention</span>
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-[rgba(201,106,80,0.16)] text-[#E68A72] border border-[rgba(201,106,80,0.35)]">
            URGENT
          </span>
        </div>
        <div className="my-2">
          <div className="font-mono text-[28px] font-medium text-[#C96A50] leading-none">
            {highExtreme.length} high / extreme
          </div>
          <div className="text-[11px] text-[#9BA5A5] mt-1 font-sans">
            Immediate operator review
          </div>
        </div>
        <div className="pt-2 border-t border-[#384145] text-[10px] text-[#9BA5A5]">
          <span className="font-sans text-[#9BA5A5]">Affected stations: </span>
          {highExtreme.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => onSelectStationByName?.(s.name)}
              className="text-[#C96A50] hover:underline font-mono inline mr-1 cursor-pointer"
            >
              {s.name}{idx < highExtreme.length - 1 ? ',' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Advisory Conditions */}
      <div className="bg-[#1A1F22] border border-[#384145] rounded p-3.5 flex flex-col justify-between border-l-3 border-l-[#C99A45]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-[#C99A45] uppercase tracking-wider flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5 text-[#C99A45]" />
            <span>Advisory conditions</span>
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-[rgba(201,154,69,0.16)] text-[#E5B662] border border-[rgba(201,154,69,0.35)]">
            WATCH
          </span>
        </div>
        <div className="my-2">
          <div className="font-mono text-[28px] font-medium text-[#C99A45] leading-none">
            {advisory.length} sites
          </div>
          <div className="text-[11px] text-[#9BA5A5] mt-1 font-sans">
            Under advisory
          </div>
        </div>
        <div className="pt-2 border-t border-[#384145] text-[10px] text-[#9BA5A5]">
          <span className="font-sans text-[#9BA5A5]">Example station: </span>
          <button
            onClick={() => onSelectStationByName?.(advisory[0]?.name || 'Pala Station')}
            className="text-[#C99A45] hover:underline font-mono cursor-pointer"
          >
            {advisory[0]?.name || 'Pala Station'}
          </button>
        </div>
      </div>

      {/* 4. Within Operating Range */}
      <div className="bg-[#1A1F22] border border-[#384145] rounded p-3.5 flex flex-col justify-between border-l-3 border-l-[#5C9B72]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-[#5C9B72] uppercase tracking-wider flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5C9B72]" />
            <span>Within operating range</span>
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-[rgba(92,155,114,0.16)] text-[#7DC798] border border-[rgba(92,155,114,0.35)]">
            NOMINAL
          </span>
        </div>
        <div className="my-2">
          <div className="font-mono text-[28px] font-medium text-[#5C9B72] leading-none">
            {safe.length} safe
          </div>
          <div className="text-[11px] text-[#9BA5A5] mt-1 font-sans">
            No active intervention
          </div>
        </div>
        <div className="pt-2 border-t border-[#384145] text-[10px] font-mono text-[#9BA5A5]">
          <span>Telemetry nominal across reservoirs</span>
        </div>
      </div>
    </div>
  );
};
