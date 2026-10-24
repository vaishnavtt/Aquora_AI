import React from 'react';
import { ArrowRight, History } from 'lucide-react';
import { KERALA_STATUS_CHANGES } from '../../data/keralaStations';
import { OpsRiskBadge, RISK_TOKENS } from './RiskBadge';
import { RiskLevel } from '../../types';

interface StatusTickerProps {
  onViewRiskHistory?: () => void;
  onSelectStationByName?: (stationName: string) => void;
}

export const StatusTicker: React.FC<StatusTickerProps> = ({
  onViewRiskHistory,
  onSelectStationByName,
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#D9E8EF] shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D9E8EF]">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-[#D9F0FF] text-[#2387D9] flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#24445A]">
            Recent Telemetry Changes
          </span>
        </div>
        <button
          onClick={onViewRiskHistory}
          className="inline-flex items-center space-x-1 text-xs font-bold text-[#2387D9] hover:text-[#1970B8] transition-colors cursor-pointer"
        >
          <span>View Forecast &amp; History</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Vertical timeline items */}
      <div className="space-y-2">
        {KERALA_STATUS_CHANGES.map((ev) => {
          const newLevelToken = RISK_TOKENS[ev.newLevel as RiskLevel] || RISK_TOKENS.moderate;
          return (
            <div
              key={ev.id}
              className="flex items-center gap-3.5 cursor-pointer bg-[#F1F8FC]/80 hover:bg-[#E8F5FA] rounded-xl px-3.5 py-2.5 transition-all border border-[#D9E8EF]/60 hover:border-[#8ED7F8] group"
              onClick={() => onSelectStationByName?.(ev.station)}
              title="Click to view station assessment"
            >
              {/* Timestamp */}
              <div className="w-14 shrink-0 text-left">
                <span className="font-mono text-xs text-[#647D8C] font-medium">{ev.time}</span>
              </div>

              {/* Status Indicator Dot */}
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white"
                style={{ backgroundColor: newLevelToken.surfaceColor }}
              />

              {/* Station + transition info */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 flex-1">
                <span className="text-xs font-bold text-[#24445A] group-hover:text-[#2387D9] transition-colors truncate">
                  {ev.station}
                </span>
                <span className="text-[#647D8C] text-xs">&rarr;</span>
                <OpsRiskBadge level={ev.newLevel as RiskLevel} size="sm" />
                <span className="text-xs text-[#647D8C] hidden sm:inline">&bull; {ev.detail}</span>
              </div>

              <span className="text-xs text-[#647D8C] group-hover:text-[#2387D9] group-hover:translate-x-0.5 transition-all hidden md:inline font-bold">
                &rarr;
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
