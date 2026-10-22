import React from 'react';
import { Activity, ArrowRight, Clock } from 'lucide-react';
import { KERALA_STATUS_CHANGES } from '../../data/keralaStations';

interface StatusTickerProps {
  onViewRiskHistory?: () => void;
  onSelectStationByName?: (stationName: string) => void;
}

export const StatusTicker: React.FC<StatusTickerProps> = ({
  onViewRiskHistory,
  onSelectStationByName,
}) => {
  return (
    <div className="bg-[#1A1F22] border border-[#384145] rounded px-3 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
      {/* Title & Badge */}
      <div className="flex items-center space-x-2 shrink-0">
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#23292C] text-[#3D8F91] font-mono text-[10px] font-semibold uppercase tracking-wider border border-[#384145]">
          <Activity className="w-3 h-3 text-[#3D8F91]" />
          <span>STATION STATUS CHANGES</span>
        </span>
      </div>

      {/* Ticker Event Items */}
      <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center space-x-4 px-1 text-[11px] font-mono text-[#E8E5DC]">
        {KERALA_STATUS_CHANGES.map((ev, idx) => (
          <div
            key={ev.id}
            className="inline-flex items-center space-x-1.5 shrink-0 hover:bg-[#23292C] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
            onClick={() => onSelectStationByName?.(ev.station)}
            title="Click to view station assessment"
          >
            <Clock className="w-3 h-3 text-[#9BA5A5]" />
            <span className="text-[#9BA5A5]">{ev.time}</span>
            <span className="text-[#384145]">·</span>
            <span className="font-semibold text-[#3D8F91] underline decoration-[#384145] hover:decoration-[#3D8F91]">
              {ev.station}
            </span>
            <span className="text-[#384145]">·</span>
            <span
              className={`font-semibold px-1.5 py-0.2 rounded text-[10px] border ${
                ev.newLevel === 'extreme'
                  ? 'bg-[rgba(183,72,72,0.16)] text-[#D96B6B] border-[rgba(183,72,72,0.35)]'
                  : ev.newLevel === 'high'
                  ? 'bg-[rgba(201,106,80,0.16)] text-[#E68A72] border-[rgba(201,106,80,0.35)]'
                  : 'bg-[rgba(201,154,69,0.16)] text-[#E5B662] border-[rgba(201,154,69,0.35)]'
              }`}
            >
              {ev.transition}
            </span>
            <span className="text-[#384145]">·</span>
            <span className="text-[#9BA5A5]">{ev.detail}</span>
            {idx < KERALA_STATUS_CHANGES.length - 1 && (
              <span className="text-[#384145] pl-3">|</span>
            )}
          </div>
        ))}
      </div>

      {/* Action link to view risk history */}
      <div className="shrink-0 flex items-center justify-end">
        <button
          onClick={onViewRiskHistory}
          className="inline-flex items-center space-x-1 text-[11px] font-sans font-medium text-[#3D8F91] hover:text-[#4CA1A3] transition-colors cursor-pointer"
        >
          <span>View risk history</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
