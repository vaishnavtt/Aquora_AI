import React from 'react';
import { ArrowRight } from 'lucide-react';
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
    <div className="bg-[#84B3CE] rounded-xl p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#6A9AB6]">
        <span className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#0F3A52]">
          Recent changes
        </span>
        <button
          onClick={onViewRiskHistory}
          className="inline-flex items-center space-x-1 text-[12px] font-sans font-medium text-[#0B3F5A] hover:text-[#16587B] transition-colors cursor-pointer"
        >
          <span>View history</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Vertical timeline */}
      <div>
        <div className="space-y-2">
          {KERALA_STATUS_CHANGES.map((ev) => {
            const newLevelToken = RISK_TOKENS[ev.newLevel as RiskLevel] || RISK_TOKENS.moderate;
            return (
              <div
                key={ev.id}
                className="flex items-center gap-3 cursor-pointer bg-[#F5EEDD]/80 hover:bg-[#F5EEDD] rounded-lg px-2.5 py-2 transition-colors border border-transparent hover:border-[#6A9AB6]"
                onClick={() => onSelectStationByName?.(ev.station)}
                title="Click to view station assessment"
              >
                {/* Timestamp */}
                <div className="w-12 shrink-0 text-right">
                  <span className="font-mono text-[11px] text-[#134059]">{ev.time}</span>
                </div>

                {/* Timeline dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 z-10 relative ring-2 ring-[#84B3CE]"
                  style={{ backgroundColor: newLevelToken.surfaceColor }}
                />

                {/* Station + transition */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                  <span className="text-[13px] font-sans text-[#082536] font-semibold truncate">
                    {ev.station}
                  </span>
                  <span className="text-[#134059] text-[12px]">→</span>
                  <OpsRiskBadge level={ev.newLevel as RiskLevel} size="sm" />
                  <span className="text-[11px] font-sans text-[#134059] hidden sm:inline">· {ev.detail}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
