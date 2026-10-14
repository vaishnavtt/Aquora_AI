import React from 'react';
import { Waves, Bell, Shield, Database, RefreshCw, Cpu, ExternalLink } from 'lucide-react';
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

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Brand & Mission Badge */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/10">
            <Waves className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>AQUORA</span>
                <span className="text-cyan-400 font-light">AI</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 uppercase tracking-wider">
                MVP v1.0
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/50 uppercase tracking-wider">
                DEMO DATA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Autonomous Water Safety & Hydrodynamic Hazard Warning System
            </p>
          </div>
        </div>

        {/* Global Search & Telemetry Controls */}
        <div className="flex items-center space-x-3">
          {/* Quick Filter Search */}
          <div className="hidden md:block relative w-64">
            <input
              type="text"
              placeholder="Search water body..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* Backend Connection Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-slate-300 hidden sm:inline">
              {isBackendOnline ? 'API 8000: Live' : 'API: Standby (Demo Mode)'}
            </span>
            <button
              onClick={onRefresh}
              title="Refresh backend status & telemetry"
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* ML Heuristic Tag */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-medium">Track 1: Heuristic Engine</span>
          </div>
        </div>
      </div>
    </header>
  );
};
