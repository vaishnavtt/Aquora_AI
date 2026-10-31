import React, { useState, useEffect } from 'react';
import {
  Activity,
  Radio,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Waves,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { fetchCWCLiveTelemetry } from '../../services/api';
import type { CWCLiveTelemetryResponse, CWCLiveStationReading } from '../../types';

interface CWCLiveTelemetrySectionProps {
  onSelectStationByName?: (stationName: string) => void;
}

export const CWCLiveTelemetrySection: React.FC<CWCLiveTelemetrySectionProps> = ({
  onSelectStationByName,
}) => {
  const [data, setData] = useState<CWCLiveTelemetryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadCWCData = async (force: boolean = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetchCWCLiveTelemetry(force);
      setData(res);
    } catch (err) {
      setError('Unable to synchronize with CWC Flood Forecast API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCWCData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadCWCData(false);
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const getFreshnessBadge = (freshness: string) => {
    switch (freshness) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DDF5E8] text-[#14532D] border border-[#A7F3D0]">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            LIVE (&lt;4h)
          </span>
        );
      case 'RECENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D9F0FF] text-[#0369A1] border border-[#8ED7F8]">
            <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
            RECENT (&lt;24h)
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
            <span className="w-2 h-2 rounded-full bg-[#D97706]" />
            STALE (&gt;24h)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFE4E6] text-[#9F1239] border border-[#FECDD3]">
            <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
            UNAVAILABLE
          </span>
        );
    }
  };

  const getStatusBadge = (reading: CWCLiveStationReading) => {
    const level = reading.current_water_level_m;
    const warn = reading.warning_threshold_m;
    const danger = reading.danger_threshold_m;

    if (level === null || level === undefined) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F1F8FC] text-[#647D8C] border border-[#D9E8EF]">
          AWAITING FEED
        </span>
      );
    }
    if (danger !== null && danger !== undefined && level >= danger) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#FFE4E6] text-[#9F1239] border border-[#FECDD3] flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-[#E11D48]" />
          DANGER EXCEEDED
        </span>
      );
    }
    if (warn !== null && warn !== undefined && level >= warn) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-[#D97706]" />
          WARNING EXCEEDED
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#DDF5E8] text-[#14532D] border border-[#A7F3D0] flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
        NORMAL STAGE
      </span>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D9E8EF] shadow-xs space-y-6">
      {/* Header with Provider Branding and Live Status Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#D9E8EF]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#D9F0FF] text-[#2387D9]">
              <Radio className="w-5 h-5 text-[#2387D9] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-bold text-lg sm:text-xl text-[#24445A]">
                  Central Water Commission (CWC) Live River Telemetry
                </h2>
                {/* Provider Status Indicator */}
                {data?.provider_status === 'CONNECTED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#DDF5E8] text-[#14532D] border border-[#A7F3D0] shadow-2xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-ping" />
                    <span>CWC Connected (Live Feed)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                    <span>CWC Connecting</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#647D8C] mt-0.5">
                Official real-time hydrological telemetry from CWC South Western Rivers Division, Kochi &bull; Ministry of Jal Shakti
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Provenance Badges */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-[#F1F8FC] text-[#3D5A73] border border-[#D9E8EF]">
            Zero-Auth Official REST
          </span>
          <button
            onClick={() => loadCWCData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#F1F8FC] hover:bg-[#E8F5FA] text-[#2387D9] border border-[#8ED7F8] transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Fetch fresh telemetry from ffs.india-water.gov.in"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing...' : 'Sync CWC Feed'}
          </button>
        </div>
      </div>

      {/* Overview Stat Strip */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] text-xs">
          <div>
            <span className="text-[#647D8C] block text-[11px]">Monitored Stations</span>
            <span className="font-bold text-[#24445A] font-mono text-sm">
              {data.total_stations} Kerala Basins
            </span>
          </div>
          <div>
            <span className="text-[#647D8C] block text-[11px]">Active Feeds</span>
            <span className="font-bold text-[#16A34A] font-mono text-sm">
              {data.live_stations_count} Transmitting
            </span>
          </div>
          <div>
            <span className="text-[#647D8C] block text-[11px]">Data Source</span>
            <span className="font-bold text-[#2387D9] truncate block" title={data.provider}>
              Central Water Commission
            </span>
          </div>
          <div>
            <span className="text-[#647D8C] block text-[11px]">Model Coupling</span>
            <span className="font-bold text-[#475569] font-mono">
              Independent (Decoupled)
            </span>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-[#F1F8FC] rounded-2xl p-5 border border-[#D9E8EF] h-48" />
          ))}
        </div>
      )}

      {/* Station Cards Grid */}
      {data && data.stations && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.stations.map((st) => {
            const hasReading = st.current_water_level_m !== null && st.current_water_level_m !== undefined;
            const levelVal = st.current_water_level_m ?? 0;
            const warnVal = st.warning_threshold_m ?? 10;
            const dangerVal = st.danger_threshold_m ?? 12;

            // Compute relative progress bar percentage capped at 100%
            const pct = Math.min(Math.max((levelVal / (dangerVal * 1.05)) * 100, 4), 100);

            return (
              <div
                key={st.station_code}
                className="bg-white rounded-2xl p-5 border border-[#D9E8EF] hover:border-[#8ED7F8] hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Station Title & Badges */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-sans font-bold text-base text-[#24445A] group-hover:text-[#2387D9] transition-colors leading-snug">
                      {st.station_name}
                    </h3>
                    {getStatusBadge(st)}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-[#2387D9] flex items-center gap-1">
                      <Waves className="w-3.5 h-3.5 text-[#2387D9]" />
                      {st.river} River
                    </span>
                    <span className="text-[#94A3B8]">&bull;</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#F1F8FC] text-[#475569] font-medium text-[11px] border border-[#E2E8F0]">
                      {st.district}
                    </span>
                  </div>
                </div>

                {/* Primary Measurement: Measured Water Level */}
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0] space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold text-[#647D8C] uppercase tracking-wider">
                      Measured River Stage
                    </span>
                    {getFreshnessBadge(st.data_freshness)}
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    {hasReading ? (
                      <>
                        <span className="font-mono font-black text-2xl sm:text-3xl text-[#24445A] tracking-tight">
                          {st.current_water_level_m?.toFixed(2)}
                        </span>
                        <span className="font-mono text-sm font-bold text-[#647D8C]">
                          metres
                        </span>
                      </>
                    ) : (
                      <span className="font-mono text-sm text-[#94A3B8] italic">
                        No reading reported
                      </span>
                    )}
                  </div>

                  {/* Relative Gauge Meter */}
                  {hasReading && (
                    <div className="space-y-1 pt-1">
                      <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            levelVal >= dangerVal
                              ? 'bg-[#E11D48]'
                              : levelVal >= warnVal
                              ? 'bg-[#D97706]'
                              : 'bg-[#2387D9]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-[#647D8C]">
                        <span>0m</span>
                        <span>Warn: {st.warning_threshold_m?.toFixed(1)}m</span>
                        <span>Danger: {st.danger_threshold_m?.toFixed(1)}m</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata & Thresholds */}
                <div className="space-y-2 pt-1 border-t border-[#F1F5F9] text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#647D8C] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#94A3B8]" />
                      Observation (IST):
                    </span>
                    <span className="font-mono font-medium text-[#24445A]">
                      {st.observation_time_ist || 'N/A'}
                    </span>
                  </div>

                  {st.highest_flood_level_m && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#647D8C]">Highest Recorded HFL:</span>
                      <span className="font-mono text-[#475569]">
                        {st.highest_flood_level_m.toFixed(2)}m
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-[#94A3B8] pt-1">
                    <span>Source: {st.data_source.split('(')[0].trim()}</span>
                    <span className="font-mono text-[9px]">{st.station_code}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safety & Model Isolation Disclaimer */}
      <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#647D8C]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span>
            <strong>Scientific Guardrail:</strong> CWC live river measurements reflect independent river bed elevations and are deliberately decoupled from the Ramamangalam Machine Learning model to prevent spatial feature distortion.
          </span>
        </div>
        <a
          href="https://ffs.india-water.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#2387D9] hover:underline font-medium inline-flex items-center gap-1 shrink-0"
        >
          CWC Portal <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

