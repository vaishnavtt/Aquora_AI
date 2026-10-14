import React from 'react';
import { Waves, ShieldAlert, Cpu, Activity, RefreshCw } from 'lucide-react';
import { HealthResponse } from '../types';

interface NavbarProps {
  health: HealthResponse | null;
  loading: boolean;
  onRefreshHealth: () => void;
  activeTab: 'dashboard' | 'sites' | 'predict' | 'map';
  setActiveTab: (tab: 'dashboard' | 'sites' | 'predict' | 'map') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  loading,
  onRefreshHealth,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">AQUORA</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30">
                  AI v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-wide">WATER HAZARD PREDICTOR</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'sites', label: 'Water Bodies' },
              { id: 'predict', label: 'Risk Predictor' },
              { id: 'map', label: 'Map View' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Backend Status indicator */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.status === 'healthy'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-300 font-mono">
                {loading
                  ? 'Connecting...'
                  : health?.status === 'healthy'
                  ? `API: Online (DB: ${health.database})`
                  : 'API: Standby'}
              </span>
              <button
                onClick={onRefreshHealth}
                title="Refresh backend status"
                className="text-slate-400 hover:text-cyan-400 transition-colors ml-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300">
              <Cpu className="w-3.5 h-3.5 mr-1 text-cyan-400" />
              <span>ML Track: Baseline</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
