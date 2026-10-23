import React, { useEffect, useState } from 'react';
import { Waves, RefreshCw, Search, Menu } from 'lucide-react';
import { HealthResponse } from '../../types';

interface OpsHeaderProps {
  health: HealthResponse | null;
  loading: boolean;
  onRefresh: () => void;
  searchTerm: string;
  onSearchChange: (query: string) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const OpsHeader: React.FC<OpsHeaderProps> = ({
  health,
  loading,
  onRefresh,
  searchTerm,
  onSearchChange,
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

  const isConnected = health ? health.status === 'healthy' : true;

  return (
    <header className="sticky top-0 z-50 bg-[#F5EEDD] border-b border-[#DDD2B8]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Left: Menu Toggle + Brand Mark + Name */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* Menu button to toggle sidebar */}
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="p-1.5 rounded-lg bg-[#F5EEDD] hover:bg-[#EAE0CA] border border-[#DDD2B8] text-[#0F3A52] hover:text-[#082536] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B3F5A]"
          >
            <Menu className="w-5 h-5" style={{ strokeWidth: 1.5 }} />
          </button>

          {/* AQUORA Wave Mark */}
          <div className="w-8 h-8 rounded-lg bg-[#16587B] flex items-center justify-center text-[#F5EEDD] shrink-0">
            <Waves className="w-4 h-4 text-[#F5EEDD]" />
          </div>

          <span className="font-sans font-semibold text-[16px] tracking-tight text-[#082536]">
            AQUORA
          </span>
        </div>

        {/* Middle: Location search input */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#134059] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#F5EEDD] hover:bg-[#FAF6EC] focus:bg-[#FAF6EC] border border-[#DDD2B8] focus:border-[#0B3F5A] rounded-lg px-3 pl-8 py-2 text-[13px] text-[#082536] placeholder-[#134059] focus:outline-none transition-colors font-sans"
            />
          </div>
        </div>

        {/* Right: Telemetry status, Sync button, IST timestamp */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* Telemetry status */}
          <div className="hidden sm:flex items-center space-x-1.5 text-[12px] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#17895C]" />
            <span className="text-[#17895C] font-medium">Telemetry online</span>
          </div>

          {/* Sync button */}
          <button
            onClick={onRefresh}
            title="Manual telemetry sync"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F5EEDD] hover:bg-[#EAE0CA] border border-[#DDD2B8] rounded-lg text-[12px] font-sans text-[#0F3A52] hover:text-[#082536] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Current timestamp in IST */}
          <div className="hidden lg:flex items-center px-2.5 py-1.5 bg-[#F5EEDD] border border-[#DDD2B8] rounded-lg">
            <span className="font-mono text-[12px] text-[#134059] whitespace-nowrap">
              {istTime || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Search Input */}
      <div className="md:hidden px-4 pb-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#134059] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#F5EEDD] border border-[#DDD2B8] rounded-lg px-3 pl-8 py-2 text-[13px] text-[#082536] placeholder-[#134059] focus:outline-none focus:border-[#0B3F5A] transition-colors"
          />
        </div>
      </div>
    </header>
  );
};
