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
    <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded px-3 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
      {/* Title & Badge */}
      <div className="flex items-center space-x-2 shrink-0">
        <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#E8EFEC] text-[#125B61] font-mono text-[10px] font-semibold uppercase tracking-wider border border-[#D2DDDA]">
          <Activity className="w-3 h-3 text-[#197F80]" />
          <span>STATION STATUS CHANGES</span>
        </span>
      </div>

      {/* Ticker Event Items */}
      <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center space-x-4 px-1 text-[11px] font-mono text-[#203235]">
        {KERALA_STATUS_CHANGES.map((ev, idx) => (
          <div
            key={ev.id}
            className="inline-flex items-center space-x-1.5 shrink-0 hover:bg-[#F3F5F1] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
            onClick={() => onSelectStationByName?.(ev.station)}
            title="Click to view station assessment"
          >
            <Clock className="w-3 h-3 text-[#82908F]" />
            <span className="text-[#82908F]">{ev.time}</span>
            <span className="text-[#D2DDDA]">·</span>
            <span className="font-semibold text-[#125B61] underline decoration-[#D2DDDA] hover:decoration-[#125B61]">
              {ev.station}
            </span>
            <span className="text-[#D2DDDA]">·</span>
            <span
              className={`font-semibold px-1 rounded text-[10px] ${
                ev.newLevel === 'extreme'
                  ? 'bg-[#FBECEE] text-[#A83E45]'
                  : ev.newLevel === 'high'
                  ? 'bg-[#FDF1EE] text-[#C8644D]'
                  : 'bg-[#FAF4E8] text-[#B98225]'
              }`}
            >
              {ev.transition}
            </span>
            <span className="text-[#D2DDDA]">·</span>
            <span className="text-[#667678]">{ev.detail}</span>
            {idx < KERALA_STATUS_CHANGES.length - 1 && (
              <span className="text-[#D2DDDA] pl-3">|</span>
            )}
          </div>
        ))}
      </div>

      {/* Action link to view risk history */}
      <div className="shrink-0 flex items-center justify-end">
        <button
          onClick={onViewRiskHistory}
          className="inline-flex items-center space-x-1 text-[11px] font-sans font-medium text-[#197F80] hover:text-[#125B61] transition-colors"
        >
          <span>View risk history</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
