import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  AlertCircle,
  MapPin,
  Sliders,
  TrendingUp,
  Table,
  Waves,
  Database,
  CheckCircle2,
  Info,
  X,
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
}

export const OpsSidebar: React.FC<OpsSidebarProps> = ({
  activeSection,
  onSelectSection,
  isOpen,
  onClose,
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

  const navItems: Array<{
    id: OpsNavSection;
    label: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    badge?: string;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'exposure-risk',
      label: 'Risk assessment',
      icon: ShieldAlert,
    },
    {
      id: 'incident-actions',
      label: 'Incidents',
      icon: AlertCircle,
      badge: '3',
    },
    {
      id: 'map',
      label: 'Map',
      icon: MapPin,
    },
    {
      id: 'what-if',
      label: 'What-if',
      icon: Sliders,
    },
    {
      id: 'river-forecast',
      label: 'Forecast',
      icon: Waves,
    },
    {
      id: 'all-locations',
      label: 'Locations',
      icon: Table,
    },
    {
      id: 'provenance',
      label: 'Data & models',
      icon: Database,
    },
  ];

  return (
    <>
      {/* Dark backdrop overlay */}
      <div
        className={`fixed inset-0 bg-[#082536]/50 backdrop-blur-xs z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#16587B] border-r border-[#124967] shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigation drawer"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#124967] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#124967] flex items-center justify-center text-[#F5EEDD] shrink-0">
              <Waves className="w-4 h-4 text-[#F5EEDD]" />
            </div>
            <div>
              <span className="font-sans font-semibold text-[15px] tracking-tight text-[#F5EEDD] block leading-tight">
                AQUORA
              </span>
              <span className="font-mono text-[10px] text-[#D6E3EA] block">
                Kerala Operations Desk
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg text-[#D6E3EA] hover:text-[#F5EEDD] hover:bg-[#124967] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F5EEDD]"
          >
            <X className="w-5 h-5" style={{ strokeWidth: 1.5 }} />
          </button>
        </div>

        {/* Navigation List */}
        <div className="p-3 flex-1 overflow-y-auto scrollbar-thin">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#D6E3EA] px-3 py-1.5 font-semibold">
            Navigation
          </div>
          <nav className="flex flex-col gap-1" aria-label="Main navigation">
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
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-colors flex items-center space-x-2.5 cursor-pointer ${
                    isActive
                      ? 'bg-[#F5EEDD] text-[#16587B] font-medium shadow-xs'
                      : 'bg-transparent text-[#D6E3EA] hover:bg-[#124967] hover:text-[#F5EEDD]'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-[#16587B]' : 'text-[#D6E3EA]'
                    }`}
                    style={{ strokeWidth: 1.5 }}
                  />
                  <span className="truncate leading-snug">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#0B2C40] text-[#FF8F9B] text-[10px] font-mono font-semibold px-1">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Operational Notices */}
        <div className="p-3 border-t border-[#124967] space-y-2.5 bg-[#124967]">
          {/* Prototype notice */}
          <div className="p-2.5 rounded-lg bg-[#0E3F5C] text-[11px] text-[#F5EEDD] space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold text-[#F4CD6B]">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] font-mono uppercase tracking-wider">
                Prototype notice
              </span>
            </div>
            <p className="text-[10px] text-[#D6E3EA] leading-relaxed">
              Baseline telemetry is simulated for this pilot surface.
            </p>
          </div>

          {/* Operating status & time standard */}
          <div className="p-2 rounded-lg bg-[#0E3F5C] flex flex-col space-y-1">
            <div className="flex items-center space-x-1.5 text-[10px] text-[#5FDDB4] font-medium">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span className="truncate">Telemetry within expected range</span>
            </div>
            <span className="font-mono text-[9px] text-[#D6E3EA]">
              UTC+05:30 · Indian Standard Time
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
