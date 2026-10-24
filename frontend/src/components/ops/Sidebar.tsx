import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  AlertCircle,
  MapPin,
  Sliders,
  Table,
  Waves,
  Database,
  CheckCircle2,
  Info,
  X,
  Radio,
  ChevronRight,
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
  isOpen: boolean;
  onClose: () => void;
  telemetryOnline?: boolean;
}

export const OpsSidebar: React.FC<OpsSidebarProps> = ({
  activeSection,
  onSelectSection,
  isOpen,
  onClose,
  telemetryOnline = true,
}) => {
  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background body scrolling when sidebar drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navItems: Array<{
    id: OpsNavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    iconBg: string;
    iconColor: string;
    description: string;
  }> = [
    {
      id: 'overview',
      label: 'Operations Overview',
      icon: LayoutDashboard,
      iconBg: 'bg-[#D9F0FF]',
      iconColor: 'text-[#2387D9]',
      description: 'Fleet command & telemetry ticker',
    },
    {
      id: 'exposure-risk',
      label: 'Risk Assessment',
      icon: ShieldAlert,
      iconBg: 'bg-[#FFE3D9]',
      iconColor: 'text-[#EA580C]',
      description: 'Calibrated station exposure gauges',
    },
    {
      id: 'incident-actions',
      label: 'Incident Console',
      icon: AlertCircle,
      badge: '3',
      iconBg: 'bg-[#FFE3D9]',
      iconColor: 'text-[#DC2626]',
      description: 'Dispatches & threshold sweeps',
    },
    {
      id: 'map',
      label: 'Geospatial Map',
      icon: MapPin,
      iconBg: 'bg-[#D9F0FF]',
      iconColor: 'text-[#2387D9]',
      description: 'Kerala catchment surface zones',
    },
    {
      id: 'what-if',
      label: 'What-If Simulator',
      icon: Sliders,
      iconBg: 'bg-[#E0F4FF]',
      iconColor: 'text-[#48BFA3]',
      description: 'Discharge pulses & scenario testing',
    },
    {
      id: 'river-forecast',
      label: 'River Forecast & Trends',
      icon: Waves,
      iconBg: 'bg-[#E5FAFF]',
      iconColor: 'text-[#59D4D0]',
      description: 'Kinematic 1h stage trajectory',
    },
    {
      id: 'all-locations',
      label: 'Locations Directory',
      icon: Table,
      iconBg: 'bg-[#DDF5E8]',
      iconColor: 'text-[#16A34A]',
      description: '22 monitored station fleet records',
    },
    {
      id: 'provenance',
      label: 'Data & Model Provenance',
      icon: Database,
      iconBg: 'bg-[#ECF8E8]',
      iconColor: 'text-[#48BFA3]',
      description: 'USGS & CWC archive telemetry',
    },
  ];

  return (
    <>
      {/* Refined natural backdrop with smooth opacity */}
      <div
        className={`fixed inset-0 bg-[#24445A]/25 backdrop-blur-[2px] z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Navigation Drawer with natural #E8F5FA background */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-[#E8F5FA] border-r border-[#D9E8EF] shadow-2xl flex flex-col justify-between transform transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Operations Navigation Drawer"
      >
        {/* Drawer Header with flowing water logo */}
        <div className="p-4 bg-white border-b border-[#D9E8EF] flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#2387D9] via-[#48BFA3] to-[#59D4D0] flex items-center justify-center text-white shadow-xs shrink-0 border-t border-white/40">
              <Waves className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[16px] tracking-tight text-[#24445A] leading-tight font-sans">
                  AQUORA AI
                </span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#D9F0FF] text-[#2387D9] border border-[#8ED7F8]/60">
                  Pilot
                </span>
              </div>
              <span className="text-[11px] text-[#647D8C] font-semibold block mt-0.5">
                Kerala Water Safety
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="p-2 rounded-xl text-[#647D8C] hover:text-[#24445A] bg-[#F1F8FC] hover:bg-[#E8F5FA] border border-[#D9E8EF] hover:border-[#8ED7F8] transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#2387D9]/25"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="p-3.5 flex-1 overflow-y-auto space-y-1">
          <div className="flex items-center justify-between px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#647D8C]">
            <span>Operations Modules</span>
            <span className="text-[10px] font-mono font-normal">v1.0-pilot</span>
          </div>

          <nav className="flex flex-col gap-1 mt-1" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectSection(item.id);
                    onClose();
                  }}
                  aria-label={item.label}
                  className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all duration-180 flex items-center justify-between group cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#2387D9] shadow-sm border-l-4 border-[#2387D9] translate-x-1'
                      : 'text-[#24445A] hover:bg-white/80 hover:text-[#2387D9] hover:shadow-2xs hover:translate-x-0.5'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-2xs border border-white/60`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="truncate">
                      <div className="truncate leading-snug">{item.label}</div>
                      <div className="text-[10px] font-normal text-[#647D8C] truncate">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 ml-2">
                    {item.badge && (
                      <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-[#FFE3D9] border border-[#FDBA74] text-[#EA580C] text-[10px] font-bold px-1.5 shadow-2xs">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-[#2387D9] shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Two Distinct Environmental Status Cards */}
        <div className="p-3.5 border-t border-[#D9E8EF] space-y-2.5 bg-white/70 backdrop-blur-sm">
          {/* Card 1: Pilot Surveillance Notice in Soft Warm Yellow */}
          <div className="p-3 rounded-2xl bg-[#FFF1C7] border border-[#FDE68A] text-[11px] text-[#78350F] space-y-1 shadow-[0_1px_3px_rgba(217,119,6,0.08)] transition-all hover:-translate-y-0.5">
            <div className="flex items-center space-x-1.5 font-bold text-[#78350F]">
              <Info className="w-3.5 h-3.5 shrink-0 text-[#D97706]" />
              <span className="text-[10px] uppercase tracking-wider">
                Pilot Surveillance Notice
              </span>
            </div>
            <p className="text-[11px] text-[#78350F]/90 leading-relaxed font-sans">
              Baseline telemetry is monitored across Kerala pilot river basins with calibrated thresholds.
            </p>
          </div>

          {/* Card 2: Real Telemetry Status in Mint Green */}
          <div
            className={`p-3 rounded-2xl border text-[11px] flex flex-col space-y-1 shadow-2xs transition-all hover:-translate-y-0.5 ${
              telemetryOnline
                ? 'bg-[#DDF5E8] border-[#A7F3D0] text-[#14532D]'
                : 'bg-[#FFF1C7] border-[#FDE68A] text-[#78350F]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 font-bold">
                <CheckCircle2
                  className={`w-3.5 h-3.5 shrink-0 ${
                    telemetryOnline ? 'text-[#16A34A]' : 'text-[#D97706]'
                  }`}
                />
                <span className="truncate">
                  {telemetryOnline ? 'Field Pilot Telemetry · Active' : 'Telemetry Standby'}
                </span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${
                  telemetryOnline ? 'bg-[#16A34A] animate-pulse' : 'bg-[#D97706]'
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#647D8C] font-mono">
              <span>UTC+05:30</span>
              <span>Indian Standard Time</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
