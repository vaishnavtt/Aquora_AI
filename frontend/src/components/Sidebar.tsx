import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Sliders,
  TrendingUp,
  Droplets,
  ShieldAlert,
  Info,
  Waves,
  Sparkles,
  Radio,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

export type NavTab =
  | 'operations-desk'
  | 'overview'
  | 'drowning-risk'
  | 'authority'
  | 'map'
  | 'simulator'
  | 'trends'
  | 'stations'
  | 'forecasting'
  | 'data-audit';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  highRiskCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  highRiskCount,
}) => {
  const navItems = [
    {
      id: 'operations-desk' as NavTab,
      label: 'Operations Desk',
      icon: Radio,
      badge: 'Live Pilot',
      badgeColor: 'teal',
      iconBg: 'bg-[#D9F0FF]',
      iconColor: 'text-[#2387D9]',
      desc: 'Kerala Hydrology Command Center',
    },
    {
      id: 'overview' as NavTab,
      label: 'Overview & Triage',
      icon: LayoutDashboard,
      iconBg: 'bg-[#D9F0FF]',
      iconColor: 'text-[#2387D9]',
      desc: 'Summary & authority inspection queue',
    },
    {
      id: 'drowning-risk' as NavTab,
      label: 'AI Drowning Risk',
      icon: ShieldAlert,
      badge: 'Two-Layer AI',
      badgeColor: 'rose',
      iconBg: 'bg-[#FFE3D9]',
      iconColor: 'text-[#EA580C]',
      desc: 'Kerala Hydrodynamic Engine',
    },
    {
      id: 'authority' as NavTab,
      label: 'Alerts & Actions',
      icon: ShieldAlert,
      badge: highRiskCount > 0 ? `${highRiskCount} urgent` : undefined,
      badgeColor: 'rose',
      iconBg: 'bg-[#FFE3D9]',
      iconColor: 'text-[#DC2626]',
      desc: 'Review sites & send alerts',
    },
    {
      id: 'map' as NavTab,
      label: 'Geospatial Map',
      icon: MapPin,
      iconBg: 'bg-[#D9F0FF]',
      iconColor: 'text-[#2387D9]',
      desc: 'Interactive location map',
    },
    {
      id: 'simulator' as NavTab,
      label: 'Scenario Tester',
      icon: Sliders,
      badge: 'Interactive',
      badgeColor: 'amber',
      iconBg: 'bg-[#E0F4FF]',
      iconColor: 'text-[#48BFA3]',
      desc: 'Simulate flood & weather conditions',
    },
    {
      id: 'trends' as NavTab,
      label: 'Risk History',
      icon: TrendingUp,
      iconBg: 'bg-[#E5FAFF]',
      iconColor: 'text-[#59D4D0]',
      desc: 'Past 24h & 12h forecast',
    },
    {
      id: 'stations' as NavTab,
      label: 'All Locations',
      icon: Droplets,
      iconBg: 'bg-[#DDF5E8]',
      iconColor: 'text-[#16A34A]',
      desc: 'Full directory of monitored sites',
    },
    {
      id: 'forecasting' as NavTab,
      label: 'River Level Forecast',
      icon: Waves,
      badge: 'Kerala',
      badgeColor: 'cyan',
      iconBg: 'bg-[#D9F0FF]',
      iconColor: 'text-[#2387D9]',
      desc: 'Ramamangalam Bridge — 1h ahead',
    },
    {
      id: 'data-audit' as NavTab,
      label: 'Datasets & ML Audit',
      icon: Sparkles,
      badge: '5 Files',
      badgeColor: 'cyan',
      iconBg: 'bg-[#ECF8E8]',
      iconColor: 'text-[#48BFA3]',
      desc: 'Raw Data & Model Benchmark',
    },
  ];

  return (
    <aside className="w-full lg:w-72 bg-[#E8F5FA] border-b lg:border-b-0 lg:border-r border-[#D9E8EF] flex flex-col justify-between p-3 sm:p-4 shrink-0 shadow-xs">
      <div className="space-y-3">
        <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#647D8C]">
          <span>Analytical Workspace</span>
          <span className="text-[10px] font-mono font-normal">Multi-Module</span>
        </div>

        {/* Navigation list */}
        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1 pb-2 lg:pb-0 scrollbar-thin" aria-label="Analytical Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`shrink-0 min-w-[150px] sm:min-w-[180px] lg:min-w-0 lg:w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-180 flex items-center justify-between group cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#2387D9] shadow-sm border-l-4 border-[#2387D9] lg:translate-x-1'
                    : 'text-[#24445A] hover:bg-white/80 hover:text-[#2387D9] hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-2xs border border-white/60`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="truncate leading-tight font-bold">{item.label}</div>
                    <div className="text-[10px] font-normal text-[#647D8C] truncate mt-0.5 hidden sm:block">
                      {item.desc}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0 ml-1.5">
                  {item.badge && (
                    <span
                      className={`hidden sm:inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                        item.badgeColor === 'rose'
                          ? 'bg-[#FFE3D9] text-[#DC2626] border border-[#FCA5A5]'
                          : item.badgeColor === 'teal'
                          ? 'bg-[#DDF5E8] text-[#14532D] border border-[#A7F3D0]'
                          : 'bg-[#D9F0FF] text-[#2387D9] border border-[#8ED7F8]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-[#2387D9] hidden lg:block shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Environmental Notices in Sidebar Footer */}
      <div className="hidden lg:block pt-3 border-t border-[#D9E8EF] space-y-2.5">
        {/* Pilot Surveillance Notice in Soft Warm Yellow */}
        <div className="p-3 rounded-2xl bg-[#FFF1C7] border border-[#FDE68A] text-[11px] text-[#78350F] space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold text-[#78350F]">
            <Info className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
            <span className="text-[10px] uppercase tracking-wider">Pilot Notice</span>
          </div>
          <p className="text-[11px] text-[#78350F]/90 leading-relaxed">
            Calibrated for Kerala river basin operations with automated multi-channel emergency advisory dispatches.
          </p>
        </div>

        {/* Telemetry Nominal Status Card */}
        <div className="p-2.5 rounded-2xl bg-white border border-[#D9E8EF] text-[11px] flex items-center justify-between text-[#14532D] font-semibold shadow-2xs">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
            <span className="text-[11px]">Telemetry Nominal</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
        </div>
      </div>
    </aside>
  );
};
