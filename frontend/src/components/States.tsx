import React from 'react';
import { Activity, AlertCircle, RefreshCw, SearchX } from 'lucide-react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white border border-[#E2E8F0] p-5 space-y-3 shadow-xs">
            <div className="h-4 w-24 bg-[#E2E8F0] rounded" />
            <div className="h-8 w-16 bg-[#E2E8F0] rounded" />
            <div className="h-3 w-32 bg-[#F1F5F9] rounded" />
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-96 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center shadow-xs">
          <div className="flex flex-col items-center gap-2.5 text-[#64748B] text-xs font-mono">
            <Activity className="w-8 h-8 text-[#1677D2] animate-spin" />
            <span>Loading locations...</span>
          </div>
        </div>
        <div className="lg:col-span-4 h-96 rounded-2xl bg-white border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
          <div className="h-6 w-32 bg-[#E2E8F0] rounded" />
          <div className="h-20 w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl" />
          <div className="h-10 w-full bg-[#F1F5F9] rounded-lg" />
          <div className="h-10 w-full bg-[#F1F5F9] rounded-lg" />
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
    <div className="p-12 rounded-2xl bg-white border border-[#E2E8F0] text-center space-y-3.5 flex flex-col items-center justify-center shadow-xs">
      <div className="p-3.5 rounded-full bg-[#EFF6FF] text-[#1677D2] border border-[#BFDBFE]">
        <SearchX className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-[#172B4D]">No locations found</h3>
      <p className="text-xs text-[#64748B] max-w-sm leading-relaxed">
        No water body matched "{searchTerm}". Try a different name or clear your search.
      </p>
      <button
        onClick={onReset}
        className="mt-2 px-4 py-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172B4D] text-xs font-semibold rounded-lg transition-colors border border-[#E2E8F0] shadow-xs cursor-pointer"
      >
        Clear search
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
    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>Running in demo mode.</strong> {message}
        </span>
      </div>
      <button
        onClick={onRetry}
        className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-md border border-amber-300 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
      >
        <RefreshCw className="w-3 h-3 text-amber-700" />
        Retry
      </button>
    </div>
  );
};
