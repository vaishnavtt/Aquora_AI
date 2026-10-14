import React from 'react';
import { Activity, AlertCircle, RefreshCw, SearchX, Database } from 'lucide-react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
            <div className="h-4 w-24 bg-slate-800 rounded" />
            <div className="h-8 w-16 bg-slate-800 rounded" />
            <div className="h-3 w-32 bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-96 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
            <Activity className="w-8 h-8 text-cyan-400 animate-spin" />
            <span>Streaming Hydrodynamic Telemetry...</span>
          </div>
        </div>
        <div className="lg:col-span-4 h-96 rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-4">
          <div className="h-6 w-32 bg-slate-800 rounded" />
          <div className="h-20 w-full bg-slate-800/40 rounded-xl" />
          <div className="h-10 w-full bg-slate-800/60 rounded" />
          <div className="h-10 w-full bg-slate-800/60 rounded" />
        </div>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  searchTerm: string;
  onReset: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ searchTerm, onReset }) => {
  return (
    <div className="p-12 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-3 flex flex-col items-center justify-center">
      <div className="p-3 rounded-full bg-slate-800/80 text-slate-400">
        <SearchX className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-white">No Monitored Stations Found</h3>
      <p className="text-xs text-slate-400 max-w-sm">
        No water body matched your search query "{searchTerm}". Try clearing your filters or search keywords.
      </p>
      <button
        onClick={onReset}
        className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
      >
        Reset Filter Criteria
      </button>
    </div>
  );
};

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  return (
    <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 flex items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
        <span>
          <strong>Telemetry Notice:</strong> {message}
        </span>
      </div>
      <button
        onClick={onRetry}
        className="px-3 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-xs font-semibold rounded-md border border-rose-700 flex items-center gap-1.5 transition-colors whitespace-nowrap"
      >
        <RefreshCw className="w-3 h-3" />
        Retry Telemetry
      </button>
    </div>
  );
};
