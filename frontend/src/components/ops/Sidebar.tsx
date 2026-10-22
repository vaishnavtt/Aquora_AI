import React from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Send,
  MapPin,
  Sliders,
  TrendingUp,
  Table,
  Waves,
  Database,
  Info,
  CheckCircle2,
} from 'lucide-react';

export type OpsNavSection =
  | 'overview'
  | 'exposure-risk'
  | 'incident-actions'
  | 'map'
  | 'what-if'
  | 'risk-history'
  | 'all-locations'
  | 'river-forecast'
  | 'provenance';

interface OpsSidebarProps {
  activeSection: OpsNavSection;
  onSelectSection: (section: OpsNavSection) => void;
}

export const OpsSidebar: React.FC<OpsSidebarProps> = ({
  activeSection,
  onSelectSection,
}) => {
  const navItems: Array<{
    id: OpsNavSection;
    label: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      sub: 'Summary & live hazard feed',
      icon: LayoutDashboard,
    },
    {
      id: 'exposure-risk',
      label: 'Exposure Risk Assessment',
      sub: 'Kerala hydrology engine',
      icon: ShieldAlert,
    },
    {
      id: 'incident-actions',
      label: 'Incident Actions',
      sub: 'Review sites & issue notices',
      icon: Send,
    },
    {
      id: 'map',
      label: 'Map',
      sub: 'Interactive location map',
      icon: MapPin,
    },
    {
      id: 'what-if',
      label: 'Operational What-If',
      sub: 'Simulate flood & weather conditions',
      icon: Sliders,
    },
    {
      id: 'risk-history',
      label: 'Risk History',
      sub: 'Past 24h & 12h forecast',
      icon: TrendingUp,
    },
    {
      id: 'all-locations',
      label: 'All Locations',
      sub: 'Full monitored directory',
      icon: Table,
    },
    {
      id: 'river-forecast',
      label: 'River Level Forecast',
      sub: 'Ramamangalam · 1h ahead',
      icon: Waves,
    },
    {
      id: 'provenance',
      label: 'Data & Model Provenance',
      sub: 'Raw data & benchmark',
      icon: Database,
    },
  ];

  return (
    <aside className="w-full lg:w-64 bg-[#FFFFFF] border-b lg:border-b-0 lg:border-r border-[#D2DDDA] flex flex-col justify-between shrink-0">
      {/* Top Nav Rail */}
      <div className="p-3">
        <div className="text-[10px] font-mono uppercase text-[#82908F] px-2 py-1 tracking-wider font-semibold hidden lg:block">
          Operations Rail
        </div>

        {/* Desktop Rail / Mobile Horizontal Bar */}
        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1 pb-1 lg:pb-0 scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`shrink-0 min-w-[200px] lg:min-w-0 lg:w-full text-left px-2.5 py-2 rounded text-xs transition-colors flex items-start space-x-2.5 border ${
                  isActive
                    ? 'bg-[#DCEBE7] border-[#197F80] text-[#125B61] font-semibold'
                    : 'bg-transparent border-transparent text-[#203235] hover:bg-[#E8EFEC] hover:text-[#125B61]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    isActive ? 'text-[#197F80]' : 'text-[#667678]'
                  }`}
                />
                <div className="min-w-0 truncate">
                  <div className="text-xs truncate leading-snug">{item.label}</div>
                  <div className="text-[10px] text-[#667678] font-normal truncate">
                    {item.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Operational Notices */}
      <div className="p-3 border-t border-[#D2DDDA] space-y-2.5 hidden lg:block bg-[#F3F5F1]">
        {/* Prototype notice */}
        <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#D2DDDA] text-[11px] text-[#203235] space-y-1">
          <div className="flex items-center space-x-1.5 font-semibold text-[#B98225]">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Prototype notice
            </span>
          </div>
          <p className="text-[10px] text-[#667678] leading-relaxed">
            Baseline telemetry is simulated for this pilot surface.
          </p>
        </div>

        {/* Operating status & time standard */}
        <div className="p-2 rounded bg-[#E8EFEC] border border-[#D2DDDA] flex flex-col space-y-1">
          <div className="flex items-center space-x-1.5 text-[10px] text-[#3F8F64] font-medium">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span className="truncate">Telemetry within expected range</span>
          </div>
          <span className="font-mono text-[9px] text-[#82908F]">
            UTC+05:30 · Indian Standard Time
          </span>
        </div>
      </div>
    </aside>
  );
};
