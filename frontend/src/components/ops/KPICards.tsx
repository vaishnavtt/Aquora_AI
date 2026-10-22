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
      <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-[#667678] uppercase tracking-wider">
            Locations monitored
          </span>
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#E8EFEC] text-[#125B61] border border-[#D2DDDA]">
            <Radio className="w-2.5 h-2.5 text-[#3F8F64]" />
            <span>API connected</span>
          </span>
        </div>
        <div className="my-2">
          <div className="font-mono text-[28px] font-medium text-[#203235] leading-none">
            {waterBodies.length} sites
          </div>
          <div className="text-[11px] text-[#667678] mt-1 font-sans">
            Kerala pilot coverage
          </div>
        </div>
        <div className="pt-2 border-t border-[#D2DDDA] flex items-center justify-between text-[10px] font-mono text-[#82908F]">
          <span>Status: Pilot telemetry</span>
          <span>Basin: SW-KL</span>
        </div>
      </div>

      {/* 2. Active Intervention */}
      <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded p-3.5 flex flex-col justify-between border-l-3 border-l-[#C8644D]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-[#C8644D] uppercase tracking-wider flex items-center space-x-1">
            <AlertOctagon className="w-3.5 h-3.5 text-[#C8644D]" />
            <span>Active intervention</span>
          </span>
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#FDF1EE] text-[#8C3926] border border-[#F4D2C9]">
            URGENT
          </span>
        </div>
        <div className="my-2">
          <div className="font-mono text-[28px] font-medium text-[#C8644D] leading-none">
            {highExtreme.length} high / extreme
          </div>
          <div className="text-[11px] text-[#667678] mt-1 font-sans">
            Immediate operator review
          </div>
        </div>
        <div className="pt-2 border-t border-[#D2DDDA] text-[10px] text-[#667678]">
          <span className="font-sans text-[#82908F]">Affected stations: </span>
          {highExtreme.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => onSelectStationByName?.(s.name)}
              className="text-[#C8644D] hover:underline font-mono inline mr-1 cursor-pointer"
            >
              {s.name}{idx < highExtreme.length - 1 ? ',' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Advisory Conditions */}
      <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded p-3.5 flex flex-col justify-between border-l-3 border-l-[#B98225]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-[#B98225] uppercase tracking-wider flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5 text-[#B98225]" />
            <span>Advisory conditions</span>
          </span>
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#FAF4E8] text-[#7C5311] border border-[#EADBBE]">
            WATCH
          </span>
        </div>
        <div className="my-2">
          <div className="font-mono text-[28px] font-medium text-[#B98225] leading-none">
            {advisory.length} sites
          </div>
          <div className="text-[11px] text-[#667678] mt-1 font-sans">
            Under advisory
          </div>
        </div>
        <div className="pt-2 border-t border-[#D2DDDA] text-[10px] text-[#667678]">
          <span className="font-sans text-[#82908F]">Example station: </span>
          <button
            onClick={() => onSelectStationByName?.(advisory[0]?.name || 'Pala Station')}
            className="text-[#B98225] hover:underline font-mono cursor-pointer"
          >
            {advisory[0]?.name || 'Pala Station'}
          </button>
        </div>
      </div>

      {/* 4. Within Operating Range */}
      <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded p-3.5 flex flex-col justify-between border-l-3 border-l-[#3F8F64]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-[#3F8F64] uppercase tracking-wider flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3F8F64]" />
            <span>Within operating range</span>
          </span>
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#EDF5F0] text-[#25583E] border border-[#C5DFD0]">
            NOMINAL
          </span>
        </div>
        <div className="my-2">
          <div className="font-mono text-[28px] font-medium text-[#3F8F64] leading-none">
            {safe.length} safe
          </div>
          <div className="text-[11px] text-[#667678] mt-1 font-sans">
            No active intervention
          </div>
        </div>
        <div className="pt-2 border-t border-[#D2DDDA] text-[10px] font-mono text-[#82908F]">
          <span>Telemetry nominal across reservoirs</span>
        </div>
      </div>
    </div>
  );
};
