import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Sliders,
  TrendingUp,
  Droplets,
  ShieldAlert,
  Info,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export type NavTab = 'overview' | 'map' | 'simulator' | 'trends' | 'stations';

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
      label: 'Executive Overview',
      icon: LayoutDashboard,
      desc: 'Metrics & Hazard Feeds',
    },
    {
      id: 'map' as NavTab,
      label: 'Geospatial Map',
      icon: MapPin,
      badge: 'Google Maps Ready',
      desc: 'Interactive Stations',
    },
    {
      id: 'simulator' as NavTab,
      label: 'What-If Simulation',
      icon: Sliders,
      badge: 'AI Powered',
      desc: 'Rainfall & Surge Lab',
    },
    {
      id: 'trends' as NavTab,
      label: 'Risk Trend Analytics',
      icon: TrendingUp,
      desc: '24h History & 12h Forecast',
    },
    {
      id: 'stations' as NavTab,
      label: 'Telemetry Stations',
      icon: Droplets,
      badge: highRiskCount > 0 ? `${highRiskCount} Alerts` : undefined,
      badgeColor: 'rose',
      desc: 'Full Directory',
    },
  ];

  return (
    <aside className="w-full lg:w-64 bg-slate-900/60 backdrop-blur-md border-r border-slate-800/80 flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2 font-mono">
            Navigation Console
          </span>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/60 text-cyan-300 border border-cyan-700/60 shadow-sm shadow-cyan-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <div className="truncate">
                      <div className="truncate leading-tight">{item.label}</div>
                      <div className="text-[10px] font-normal text-slate-500 truncate mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider shrink-0 ml-1.5 ${
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

        {/* Team Collaboration Tracks */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2.5 text-[11px]">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5 text-xs text-white">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Team Tracks
            </span>
            <span className="text-[9px] font-mono text-slate-500">Ownership</span>
          </div>
          <div className="space-y-1.5 text-[10px] text-slate-400">
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800/40">
              <span className="font-semibold text-cyan-300">Track 1 (Lead)</span>
              <span>ML &amp; Integration</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800/40">
              <span className="font-semibold text-blue-300">Track 2 (Mem 2)</span>
              <span>Frontend &amp; Maps</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800/40">
              <span className="font-semibold text-emerald-300">Track 3 (Mem 3)</span>
              <span>Backend &amp; SQLite</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ethics & Synthetic Data Notice */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2">
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/40 text-[10px] text-amber-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-200">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            Hackathon Ethics Notice
          </div>
          <p className="text-amber-200/80 leading-relaxed">
            All telemetry metrics &amp; hazard warnings are synthetic <strong>DEMO</strong> data. No real drowning incidents or unverified emergency reports are fabricated.
          </p>
        </div>
      </div>
    </aside>
  );
};
