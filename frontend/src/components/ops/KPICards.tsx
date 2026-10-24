import React from 'react';
import { AlertTriangle, Eye, CheckCircle2 } from 'lucide-react';
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
      label: 'Needs Immediate Action',
      sublabel: 'High & extreme hazard levels',
      count: highExtreme.length,
      cardGradient: 'bg-gradient-to-br from-white via-[#FFF9F7] to-[#FFE3D9]/40',
      cardBorder: 'border-[#FFE3D9] hover:border-[#FDBA74]',
      badgeBg: 'bg-[#FFE3D9]',
      badgeBorder: 'border-[#FDBA74]',
      badgeText: 'text-[#7C2D12]',
      countColor: 'text-[#DC2626]',
      iconBg: 'bg-[#FFE3D9] text-[#DC2626]',
      viewColor: 'text-[#EA580C]',
      Icon: AlertTriangle,
      stations: highExtreme,
      onClick: () => highExtreme[0] && onSelectStationByName?.(highExtreme[0].name),
    },
    {
      label: 'Watch & Monitoring',
      sublabel: 'Elevated or rising stage',
      count: advisory.length,
      cardGradient: 'bg-gradient-to-br from-white via-[#FFFDF7] to-[#FFF1C7]/40',
      cardBorder: 'border-[#FFF1C7] hover:border-[#FDE68A]',
      badgeBg: 'bg-[#FFF1C7]',
      badgeBorder: 'border-[#FDE68A]',
      badgeText: 'text-[#78350F]',
      countColor: 'text-[#D97706]',
      iconBg: 'bg-[#FFF1C7] text-[#D97706]',
      viewColor: 'text-[#D97706]',
      Icon: Eye,
      stations: advisory,
      onClick: () => advisory[0] && onSelectStationByName?.(advisory[0].name),
    },
    {
      label: 'Normal Telemetry',
      sublabel: 'Safe operating parameters',
      count: safe.length,
      cardGradient: 'bg-gradient-to-br from-white via-[#F7FCF9] to-[#DDF5E8]/40',
      cardBorder: 'border-[#DDF5E8] hover:border-[#A7F3D0]',
      badgeBg: 'bg-[#DDF5E8]',
      badgeBorder: 'border-[#A7F3D0]',
      badgeText: 'text-[#14532D]',
      countColor: 'text-[#16A34A]',
      iconBg: 'bg-[#DDF5E8] text-[#16A34A]',
      viewColor: 'text-[#16A34A]',
      Icon: CheckCircle2,
      stations: safe,
      onClick: () => safe[0] && onSelectStationByName?.(safe[0].name),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {segments.map((seg) => {
        const Icon = seg.Icon;
        return (
          <button
            key={seg.label}
            onClick={seg.onClick}
            className={`text-left rounded-2xl p-5 border ${seg.cardGradient} ${seg.cardBorder} shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${seg.iconBg} shadow-2xs group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${seg.badgeBg} ${seg.badgeBorder} ${seg.badgeText}`}>
                  {seg.label}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className={`font-sans text-3xl font-extrabold tracking-tight ${seg.countColor}`}>
                  {seg.count}
                </span>
                <span className="text-xs text-[#647D8C] font-medium">
                  {seg.count === 1 ? 'station' : 'stations'}
                </span>
              </div>

              <p className="text-xs text-[#647D8C] mt-1 font-normal">
                {seg.sublabel}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#D9E8EF]/60 flex items-center justify-between text-xs">
              <span className="text-[#24445A] font-medium truncate max-w-[170px]">
                {seg.stations.length === 0
                  ? 'No stations'
                  : seg.stations.length === 1
                  ? seg.stations[0].name
                  : `${seg.stations[0].name} +${seg.stations.length - 1} more`}
              </span>
              <span className={`${seg.viewColor} font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0`}>
                View &rarr;
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
