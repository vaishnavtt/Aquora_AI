import React from 'react';
import { Waves, RefreshCw } from 'lucide-react';
import { HealthResponse } from '../types';

interface HeaderProps {
  health: HealthResponse | null;
  loading: boolean;
  onRefresh: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  loading,
  onRefresh,
  searchTerm,
  onSearchChange,
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
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/10">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white">
                AQUORA
              </h1>
              <span className={`hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border ${
                isBackendOnline
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50'
                  : 'bg-amber-950/80 text-amber-300 border-amber-800/50'
              }`}>
                {isBackendOnline ? 'Live data' : 'Demo mode'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              River &amp; reservoir risk monitoring · Kerala pilot
            </p>
          </div>
        </div>

        {/* Search & Status */}
        <div className="flex items-center space-x-3">
          {/* Quick Filter Search */}
          <div className="hidden md:block relative w-64">
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* Connection status */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-slate-300 hidden sm:inline">
              {lastUpdated ?? (isBackendOnline ? 'Connected' : 'Demo mode')}
            </span>
            <button
              onClick={onRefresh}
              title="Refresh data"
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
