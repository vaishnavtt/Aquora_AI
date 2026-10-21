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
} from 'lucide-react';

export type NavTab = 'overview' | 'authority' | 'map' | 'simulator' | 'trends' | 'stations' | 'forecasting';

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
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
      desc: 'Summary & live hazard feed',
    },
    {
      id: 'authority' as NavTab,
      label: 'Alerts & Actions',
      icon: ShieldAlert,
      badge: highRiskCount > 0 ? `${highRiskCount} urgent` : undefined,
      badgeColor: 'rose',
      desc: 'Review sites & send alerts',
    },
    {
      id: 'map' as NavTab,
      label: 'Map',
      icon: MapPin,
      desc: 'Interactive location map',
    },
    {
      id: 'simulator' as NavTab,
      label: 'Scenario Tester',
      icon: Sliders,
      badge: 'Interactive',
      desc: 'Simulate flood & weather conditions',
    },
    {
      id: 'trends' as NavTab,
      label: 'Risk History',
      icon: TrendingUp,
      desc: 'Past 24h & 12h forecast',
    },
    {
      id: 'stations' as NavTab,
      label: 'All Locations',
      icon: Droplets,
      desc: 'Full directory of monitored sites',
    },
    {
      id: 'forecasting' as NavTab,
      label: 'River Level Forecast',
      icon: Waves,
      badge: 'Kerala',
      badgeColor: 'cyan',
      desc: 'Ramamangalam Bridge — 1h ahead',
    },
  ];

  return (
    <aside className="w-full lg:w-64 bg-slate-900/60 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between p-3 sm:p-4 shrink-0">
      <div className="space-y-4 lg:space-y-6">
        {/* Navigation */}
        <div>
          <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 pb-2 lg:pb-0 scrollbar-thin">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`shrink-0 min-w-[150px] sm:min-w-[180px] lg:min-w-0 lg:w-full text-left px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/60 text-cyan-300 border border-cyan-700/60 shadow-sm shadow-cyan-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <div className="truncate">
                      <div className="truncate leading-tight">{item.label}</div>
                      <div className="text-[10px] font-normal text-slate-500 truncate mt-0.5 hidden sm:block">
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`hidden sm:inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider shrink-0 ml-1.5 ${
                        item.badgeColor === 'rose'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800/50'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-800/50'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Demo data notice at the bottom */}
      <div className="hidden lg:block pt-4 border-t border-slate-800/80 space-y-2">
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/40 text-[10px] text-amber-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-200">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            Prototype notice
          </div>
          <p className="text-amber-200/80 leading-relaxed">
            All readings shown are <strong>demonstration data</strong>. This tool supports decision-making only — it is not an official emergency alert system.
          </p>
        </div>
      </div>
    </aside>
  );
};
