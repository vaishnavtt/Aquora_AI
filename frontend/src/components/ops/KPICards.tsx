import React from 'react';
import { Octagon, CircleDot, CheckCircle2 } from 'lucide-react';
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

  const segments = [
    {
      label: 'Needs action',
      count: highExtreme.length,
      color: '#D12F3B',
      Icon: Octagon,
      stations: highExtreme,
      onClick: () => highExtreme[0] && onSelectStationByName?.(highExtreme[0].name),
    },
    {
      label: 'Watch',
      count: advisory.length,
      color: '#C79A12',
      Icon: CircleDot,
      stations: advisory,
      onClick: () => advisory[0] && onSelectStationByName?.(advisory[0].name),
    },
    {
      label: 'Normal',
      count: safe.length,
      color: '#17895C',
      Icon: CheckCircle2,
      stations: safe,
      onClick: () => safe[0] && onSelectStationByName?.(safe[0].name),
    },
  ];

  return (
    <div className="bg-[#F5EEDD] rounded-xl overflow-hidden border-2 border-[#16587B] shadow-sm">
      {/* 3 horizontal segments with color bar aligned directly to each box */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#16587B]">
        {segments.map((seg) => {
          const Icon = seg.Icon;
          return (
            <button
              key={seg.label}
              onClick={seg.onClick}
              className="text-left flex flex-col justify-between bg-[#F5EEDD] hover:bg-[#FAF6EC] transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-[#16587B]"
            >
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    className="w-4 h-4 shrink-0"
                    style={{ color: seg.color, strokeWidth: 1.5 }}
                  />
                  <span
                    className="text-[11px] font-sans font-medium uppercase tracking-wide"
                    style={{ color: seg.color }}
                  >
                    {seg.label}
                  </span>
                </div>
                <div
                  className="font-mono text-[36px] font-semibold leading-none"
                  style={{ color: seg.color }}
                >
                  {seg.count}
                </div>
                <div className="mt-1.5 text-[12px] font-sans text-[#134059]">
                  {seg.stations.length === 0
                    ? 'No stations'
                    : seg.stations.length === 1
                    ? seg.stations[0].name
                    : `${seg.stations[0].name} +${seg.stations.length - 1} more`}
                </div>
              </div>

              {/* Color accent bar aligned exactly to this segment's box width */}
              <div
                className="h-1 w-full shrink-0"
                style={{
                  backgroundColor: seg.color,
                  opacity: seg.count > 0 ? 1 : 0.35,
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
