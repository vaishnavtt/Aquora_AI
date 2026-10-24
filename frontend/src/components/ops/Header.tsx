import React, { useEffect, useState } from 'react';
import { Waves, RefreshCw, Menu, Clock } from 'lucide-react';
import { HealthResponse, WaterBody } from '../../types';
import { WaterBodySearchBar } from '../common/WaterBodySearchBar';

interface OpsHeaderProps {
  health: HealthResponse | null;
  loading: boolean;
  onRefresh: () => void;
  searchTerm: string;
  onSearchChange: (query: string) => void;
  waterBodies?: WaterBody[];
  onSelectWaterBody?: (wb: WaterBody) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const OpsHeader: React.FC<OpsHeaderProps> = ({
  health: _health,
  loading,
  onRefresh,
  searchTerm: _searchTerm,
  onSearchChange: _onSearchChange,
  waterBodies = [],
  onSelectWaterBody = () => {},
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const [istTime, setIstTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      const formatted = new Intl.DateTimeFormat('en-IN', options).format(now);
      setIstTime(`${formatted} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#D9E8EF] shadow-[0_1px_4px_rgba(36,68,90,0.04)]">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Mobile Toggle + Brand */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="p-2 rounded-xl bg-[#F1F8FC] hover:bg-[#E8F5FA] active:bg-[#D9F0FF] border border-[#D9E8EF] hover:border-[#8ED7F8] text-[#24445A] hover:text-[#2387D9] transition-all cursor-pointer shadow-2xs hover:-translate-y-0.5 active:translate-y-0 active:shadow-none focus:outline-none focus:ring-2 focus:ring-[#2387D9]/20"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2387D9] via-[#48BFA3] to-[#59D4D0] flex items-center justify-center text-white shadow-xs shrink-0 border-t border-white/30">
              <Waves className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[15px] tracking-tight text-[#24445A] leading-none">
                  AQUORA AI
                </span>
                <span className="hidden sm:inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#D9F0FF] text-[#2387D9] border border-[#8ED7F8]/50 shadow-2xs">
                  Pilot
                </span>
              </div>
              <span className="text-[11px] text-[#647D8C] font-medium hidden sm:block mt-0.5">
                Kerala Water Safety Operations
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Real-time Live Water Body Search Bar */}
        <div className="flex-1 max-w-lg mx-2 hidden md:block">
          <WaterBodySearchBar
            waterBodies={waterBodies}
            onSelectWaterBody={onSelectWaterBody}
            placeholder="Search water bodies, rivers, dams, districts..."
          />
        </div>

        {/* Right: Telemetry status, Sync button, IST Clock */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* Telemetry Status Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#DDF5E8] border border-[#A7F3D0] text-[#14532D] text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span>Telemetry Online</span>
          </div>

          {/* Tactile Sync Button */}
          <button
            onClick={onRefresh}
            title="Manual telemetry sync"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-b from-white to-[#F1F8FC] hover:from-[#F1F8FC] hover:to-[#E8F5FA] active:from-[#E8F5FA] active:to-[#D9F0FF] border border-[#D9E8EF] hover:border-[#8ED7F8] rounded-full text-xs font-semibold text-[#24445A] hover:text-[#2387D9] transition-all cursor-pointer shadow-[0_1px_2px_rgba(36,68,90,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#647D8C] ${loading ? 'animate-spin text-[#2387D9]' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* IST Timestamp Pill */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-[#E8F5FA] border border-[#D9E8EF] rounded-full text-[#647D8C] text-xs font-mono shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-[#647D8C]" />
            <span>{istTime || '—'}</span>
          </div>
        </div>
      </div>

      {/* Mobile Search Input with Suggestions Dropdown */}
      <div className="md:hidden px-4 pb-2.5 pt-1">
        <WaterBodySearchBar
          waterBodies={waterBodies}
          onSelectWaterBody={onSelectWaterBody}
          placeholder="Search water bodies, districts..."
        />
      </div>
    </header>
  );
};
