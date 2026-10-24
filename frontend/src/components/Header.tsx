import React from 'react';
import { Waves, RefreshCw } from 'lucide-react';
import { HealthResponse, WaterBody } from '../types';
import { WaterBodySearchBar } from './common/WaterBodySearchBar';

interface HeaderProps {
  health: HealthResponse | null;
  loading: boolean;
  onRefresh: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  waterBodies?: WaterBody[];
  onSelectWaterBody?: (wb: WaterBody) => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  loading,
  onRefresh,
  searchTerm: _searchTerm,
  onSearchChange: _onSearchChange,
  waterBodies = [],
  onSelectWaterBody = () => {},
}) => {
  const isBackendOnline = health?.status === 'healthy';

  // Compute a human-readable "last updated" string
  const lastUpdated = health?.timestamp
    ? (() => {
        const diff = Math.round((Date.now() - new Date(health.timestamp).getTime()) / 1000);
        if (diff < 60) return `Updated ${diff}s ago`;
        if (diff < 3600) return `Updated ${Math.floor(diff / 60)}m ago`;
        return `Updated ${Math.floor(diff / 3600)}h ago`;
      })()
    : null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#D9E8EF] px-4 sm:px-6 py-2.5 shadow-[0_1px_4px_rgba(36,68,90,0.04)]">
      <div className="flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2387D9] via-[#48BFA3] to-[#59D4D0] flex items-center justify-center shadow-xs border-t border-white/30 text-white">
            <Waves className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-[#24445A] font-sans">
                AQUORA AI
              </h1>
              <span
                className={`hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border shadow-2xs ${
                  isBackendOnline
                    ? 'bg-[#DDF5E8] text-[#14532D] border-[#A7F3D0]'
                    : 'bg-[#FFF1C7] text-[#78350F] border-[#FDE68A]'
                }`}
              >
                {isBackendOnline ? 'Live data' : 'Demo mode'}
              </span>
            </div>
            <p className="text-[11px] text-[#647D8C] font-medium hidden sm:block">
              River &amp; reservoir risk monitoring · Kerala pilot
            </p>
          </div>
        </div>

        {/* Real-time Water Body Search */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <WaterBodySearchBar
            waterBodies={waterBodies}
            onSelectWaterBody={onSelectWaterBody}
            placeholder="Search water bodies, rivers, districts..."
          />
        </div>

        {/* Search & Status */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* Connection status */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#E8F5FA] border border-[#D9E8EF] text-xs shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendOnline ? 'bg-[#16A34A] animate-pulse' : 'bg-[#EAB308]'
              }`}
            />
            <span className="font-mono text-[#647D8C] text-xs hidden sm:inline">
              {lastUpdated ?? (isBackendOnline ? 'Connected' : 'Demo mode')}
            </span>
            <button
              onClick={onRefresh}
              title="Refresh telemetry"
              className="text-[#647D8C] hover:text-[#2387D9] transition-colors cursor-pointer p-0.5 rounded-full hover:bg-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2387D9]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile search */}
      <div className="md:hidden pt-2">
        <WaterBodySearchBar
          waterBodies={waterBodies}
          onSelectWaterBody={onSelectWaterBody}
          placeholder="Search water bodies, districts..."
        />
      </div>
    </header>
  );
};
