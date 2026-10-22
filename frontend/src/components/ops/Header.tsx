import React, { useEffect, useState } from 'react';
import { Waves, RefreshCw, Radio, Search } from 'lucide-react';
import { HealthResponse } from '../../types';

interface OpsHeaderProps {
  health: HealthResponse | null;
  loading: boolean;
  onRefresh: () => void;
  searchTerm: string;
  onSearchChange: (query: string) => void;
}

export const OpsHeader: React.FC<OpsHeaderProps> = ({
  health,
  loading,
  onRefresh,
  searchTerm,
  onSearchChange,
}) => {
  const [istTime, setIstTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format as IST time (e.g. 22 Oct 2026 09:25:40 IST)
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
    <header className="sticky top-0 z-50 bg-[#1A1F22] border-b border-[#384145] shadow-xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand Mark, Name, Status, Subtitle */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* AQUORA Wave Mark */}
          <div className="w-8 h-8 rounded-md bg-[#23292C] border border-[#384145] flex items-center justify-center text-[#3D8F91] shrink-0 shadow-xs">
            <Waves className="w-4 h-4 text-[#3D8F91]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-sans font-bold text-[15px] tracking-tight text-[#E8E5DC]">
                AQUORA
              </span>
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#23292C] text-[#3D8F91] border border-[#384145]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5C9B72]" />
                <span>Telemetry online</span>
              </span>
            </div>
            <span className="text-[11px] text-[#9BA5A5] font-sans truncate">
              River &amp; reservoir risk monitoring · Kerala pilot
            </span>
          </div>
        </div>

        {/* Middle: Location search input */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9BA5A5] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#111417] hover:bg-[#23292C]/70 focus:bg-[#23292C] border border-[#384145] focus:border-[#3D8F91] rounded px-3 pl-8 py-1.5 text-xs text-[#E8E5DC] placeholder-[#9BA5A5] focus:outline-none transition-colors font-sans"
            />
          </div>
        </div>

        {/* Right: Connection status, Refresh button, Current timestamp in IST */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* Connection status with last update */}
          <div className="flex items-center space-x-2 px-2.5 py-1 bg-[#23292C] border border-[#384145] rounded text-xs font-mono text-[#E8E5DC]">
            <Radio className="w-3 h-3 text-[#5C9B72]" />
            <span className="hidden sm:inline text-[11px] text-[#9BA5A5]">
              {isConnected ? 'Sync: Nominal' : 'Sync: Local'}
            </span>
            <button
              onClick={onRefresh}
              title="Manual telemetry refresh"
              className="text-[#9BA5A5] hover:text-[#3D8F91] transition-colors ml-1 p-0.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Current timestamp in IST */}
          <div className="hidden lg:flex items-center px-2.5 py-1 bg-[#111417] border border-[#384145] rounded">
            <span className="font-mono text-[11px] text-[#E8E5DC] whitespace-nowrap">
              {istTime || '13:25:00 IST'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Search Input */}
      <div className="md:hidden px-4 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#9BA5A5] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#111417] border border-[#384145] rounded px-3 pl-8 py-1.5 text-xs text-[#E8E5DC] placeholder-[#9BA5A5] focus:outline-none"
          />
        </div>
      </div>
    </header>
  );
};
