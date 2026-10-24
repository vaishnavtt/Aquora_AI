import React, { useState, useEffect } from 'react';
import {
  Thermometer,
  Waves,
  ArrowDownCircle,
  Clock,
  Sliders,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Compass,
  Mountain,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Info,
} from 'lucide-react';
import { WaterBody, RiskLevel, EnvironmentalPipelineAuditResponse, formatCoordinates } from '../types';
import { DemoBadge } from './common/DemoBadge';
import { api } from '../services/api';

interface LocationDetailsPanelProps {
  station: WaterBody | null;
  onSendToSimulator: (wb: WaterBody) => void;
}

export const LocationDetailsPanel: React.FC<LocationDetailsPanelProps> = ({
  station,
  onSendToSimulator,
}) => {
  const [pipelineAudit, setPipelineAudit] = useState<EnvironmentalPipelineAuditResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState<boolean>(false);

  const fetchAudit = (stationId: number) => {
    setAuditLoading(true);
    setAuditError(null);
    api.getEnvironmentalPipelineAudit(stationId)
      .then((data) => {
        setPipelineAudit(data);
        setAuditError(null);
      })
      .catch((err: any) => {
        setPipelineAudit(null);
        setAuditError(err.message || 'Data check not available right now');
      })
      .finally(() => {
        setAuditLoading(false);
      });
  };

  useEffect(() => {
    if (!station) {
      setPipelineAudit(null);
      setAuditError(null);
      return;
    }
    fetchAudit(station.id);
  }, [station?.id]);

  if (!station) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-[#E2E8F0] text-center text-[#64748B] text-xs flex flex-col items-center justify-center space-y-2 h-full min-h-[320px] shadow-xs">
        <MapPin className="w-8 h-8 text-[#94A3B8] animate-bounce" />
        <p className="font-bold text-[#172B4D] text-sm">No location selected</p>
        <p className="text-xs text-[#64748B] max-w-xs">
          Select a pin on the map or pick a water body from the directory to inspect safety factors.
        </p>
      </div>
    );
  }

  // Derive contributing factors based on station telemetry
  const contributingFactors: { name: string; severity: 'low' | 'moderate' | 'high'; note: string }[] = [];

  if (station.flow_rate_cms >= 6.0) {
    contributingFactors.push({
      name: 'Dangerous flow — stay out of the water',
      severity: 'high',
      note: `${station.flow_rate_cms.toFixed(1)} m³/s exceeds the safe limit of 6 m³/s.`,
    });
  } else if (station.flow_rate_cms >= 2.5) {
    contributingFactors.push({
      name: 'Moderate river flow',
      severity: 'moderate',
      note: `${station.flow_rate_cms.toFixed(1)} m³/s — swimming fatigue risk.`,
    });
  } else {
    contributingFactors.push({
      name: 'Calm current — normal conditions',
      severity: 'low',
      note: 'Flow is gentle; no hydrodynamic suction concern.',
    });
  }

  if (station.water_temp_c < 12.0) {
    contributingFactors.push({
      name: 'Water too cold — cold shock risk within 60 seconds',
      severity: 'high',
      note: `${station.water_temp_c.toFixed(1)}°C triggers involuntary gasping reflex on immersion.`,
    });
  } else if (station.water_temp_c < 17.0) {
    contributingFactors.push({
      name: 'Cold water — thermal protection recommended',
      severity: 'moderate',
      note: `${station.water_temp_c.toFixed(1)}°C is cold; limit immersion time.`,
    });
  } else {
    contributingFactors.push({
      name: 'Comfortable water temperature',
      severity: 'low',
      note: `${station.water_temp_c.toFixed(1)}°C is within comfortable recreational range.`,
    });
  }

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'low':
        return {
          text: 'text-[#16A34A]',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          bar: 'bg-[#16A34A]',
          dot: 'bg-[#16A34A]',
        };
      case 'moderate':
        return {
          text: 'text-amber-800',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          bar: 'bg-[#EAB308]',
          dot: 'bg-[#EAB308]',
        };
      case 'high':
      case 'extreme':
      default:
        return {
          text: 'text-rose-800',
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          bar: 'bg-[#DC2626]',
          dot: 'bg-[#DC2626]',
        };
    }
  };

  const riskStyle = getRiskColor(station.current_risk_level);

  // Human-readable last updated
  const timeAgo = (() => {
    const diff = Math.round((Date.now() - new Date(station.last_updated).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  })();

  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-xs p-5 sm:p-6 flex flex-col justify-between space-y-5">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold capitalize text-[#172B4D] bg-[#F1F5F9] px-2.5 py-0.5 rounded-md border border-[#E2E8F0]">
                {station.type}
              </span>
              {station.is_demonstration_data && (
                <DemoBadge className="mt-0.5" tooltip="This location uses demonstration data." />
              )}
              {station.basin_region && (
                <span className="text-xs text-[#64748B] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#E2E8F0]">
                  {station.basin_region}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-[#172B4D] mt-1.5 leading-snug">
              {station.name.replace(' (DEMO Station)', '')}
            </h3>
            <div className="flex items-center gap-3.5 text-xs text-[#64748B] font-mono mt-1.5 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#64748B]" />
                {formatCoordinates(station.latitude, station.longitude, 4)}
              </span>
              <span className="flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-[#64748B]" />
                {station.elevation_meters ? `${station.elevation_meters.toFixed(1)} m MSL` : 'Elevation unrecorded'}
              </span>
            </div>
          </div>

          {/* Risk Level Badge */}
          <div className="text-right shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${riskStyle.dot}`} />
              {station.current_risk_level}
            </span>
          </div>
        </div>

        {/* Description */}
        {station.description && (
          <p className="text-xs text-[#475569] mt-3.5 leading-relaxed bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
            {station.description}
          </p>
        )}

        {/* Risk Score */}
        <div className="my-4 p-4.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center space-y-2.5 shadow-xs">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
            Estimated Hazard Score
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className={`text-4xl font-extrabold font-mono tracking-tight ${riskStyle.text}`}>
              {station.risk_score.toFixed(1)}
            </span>
            <span className="text-sm font-medium text-[#64748B]">/ 100</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${riskStyle.bar}`}
              style={{ width: `${Math.min(100, station.risk_score)}%` }}
            />
          </div>

          <p className="text-xs text-[#64748B] pt-1">
            {station.current_risk_level === 'low'
              ? 'Conditions are currently within safe baseline parameters.'
              : station.current_risk_level === 'moderate'
              ? 'Moderate caution: flow rate or temperature warrant vigilance.'
              : 'Immediate hazard: unassisted shoreline entry is strongly discouraged.'}
          </p>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-1">
              <Thermometer className="w-3.5 h-3.5 text-amber-500" />
              <span>Water temp</span>
            </div>
            <span className="text-base font-bold font-mono text-[#172B4D]">
              {station.water_temp_c != null ? `${station.water_temp_c.toFixed(1)}°C` : 'Unavailable'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-1">
              <Waves className="w-3.5 h-3.5 text-[#1677D2]" />
              <span>Flow speed</span>
            </div>
            <span className="text-base font-bold font-mono text-[#172B4D]">
              {station.flow_rate_cms != null
                ? `${station.flow_rate_cms.toFixed(1)} m³/s`
                : station.discharge_cms != null
                ? `${station.discharge_cms.toFixed(1)} m³/s`
                : 'Unavailable'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-1">
              <ArrowDownCircle className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Water depth</span>
            </div>
            <span className="text-base font-bold font-mono text-[#172B4D]">
              {station.depth_meters != null
                ? `${station.depth_meters.toFixed(1)} m`
                : station.current_water_level_m != null
                ? `${station.current_water_level_m.toFixed(1)} m`
                : 'Unavailable'}
            </span>
          </div>
        </div>

        {/* Contributing Factors */}
        <div className="mt-4 space-y-2">
          <div className="text-xs font-bold text-[#172B4D]">
            Why this score?
          </div>
          <div className="space-y-2">
            {contributingFactors.map((fac, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-2.5 shadow-xs"
              >
                {fac.severity === 'high' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : fac.severity === 'moderate' ? (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-[#172B4D] text-xs">{fac.name}</div>
                  <div className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{fac.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Sources Audit Accordion */}
        <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-xs">
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="w-full p-3.5 flex items-center justify-between text-xs text-[#172B4D] font-bold hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#1677D2]" />
              <span>Data sources &amp; coverage audit</span>
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-[#64748B]">
              {pipelineAudit && (
                <span className="text-[#16A34A] font-bold">
                  {pipelineAudit.available_dimensions_count}/6 verified
                </span>
              )}
              {showAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showAudit && (
            <div className="p-4 border-t border-[#E2E8F0] space-y-3 text-xs bg-[#F8FAFC]">
              {auditLoading ? (
                <div className="text-center py-2 text-[#64748B] text-xs">Checking data sources...</div>
              ) : pipelineAudit ? (
                <>
                  <div className="space-y-2.5">
                    {/* Dimension 1: Rainfall */}
                    <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] flex items-start justify-between gap-3 shadow-xs">
                      <div>
                        <div className="font-bold text-[#172B4D] text-xs">Rainfall (24h)</div>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {pipelineAudit.dimensions.rainfall?.limitation_reason || 'No local raingauge connected to this location.'}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        {pipelineAudit.dimensions.rainfall?.status || 'UNAVAILABLE'}
                      </span>
                    </div>

                    {/* Dimension 2: Water Level */}
                    <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] flex items-start justify-between gap-3 shadow-xs">
                      <div>
                        <div className="font-bold text-[#172B4D] text-xs">Water level / stage</div>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {pipelineAudit.dimensions.water_level?.status === 'UNAVAILABLE' || (pipelineAudit.dimensions.water_level?.value == null && station.current_water_level_m == null && station.depth_meters == null)
                            ? 'Not available'
                            : `${pipelineAudit.dimensions.water_level?.value ?? station.current_water_level_m ?? station.depth_meters} m · Source: ${pipelineAudit.dimensions.water_level?.source || 'Telemetry node'}`}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        {pipelineAudit.dimensions.water_level?.status || 'AVAILABLE'}
                      </span>
                    </div>

                    {/* Dimension 3: Water Body Type */}
                    <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] flex items-start justify-between gap-3 shadow-xs">
                      <div>
                        <div className="font-bold text-[#172B4D] text-xs">Water-body classification</div>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          Type: <span className="capitalize">{station.type}</span> · Verified in registry
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        AVAILABLE
                      </span>
                    </div>

                    {/* Dimension 4: Terrain / Elevation */}
                    <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] flex items-start justify-between gap-3 shadow-xs">
                      <div>
                        <div className="font-bold text-[#172B4D] text-xs">Terrain &amp; elevation</div>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {station.elevation_meters
                            ? `${station.elevation_meters.toFixed(1)} m MSL (SRTM digital elevation)`
                            : 'Elevation unrecorded for these coordinates.'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        station.elevation_meters
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                      }`}>
                        {station.elevation_meters ? 'AVAILABLE' : 'UNAVAILABLE'}
                      </span>
                    </div>

                    {/* Dimension 5: Historical Incident Records */}
                    <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] flex items-start justify-between gap-3 shadow-xs">
                      <div>
                        <div className="font-bold text-[#172B4D] text-xs">Historical incident records</div>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          No public Kerala accident registry is connected. The system does not invent accident counts.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] shrink-0">
                        UNAVAILABLE
                      </span>
                    </div>

                    {/* Dimension 6: Source & Freshness */}
                    <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] flex items-start justify-between gap-3 shadow-xs">
                      <div>
                        <div className="font-bold text-[#172B4D] text-xs">Observation timestamps &amp; provenance</div>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          Source: {station.data_source || 'AQUORA Hydrological DB'} · Last sync: {new Date(station.last_updated).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        AVAILABLE
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#64748B] flex items-start gap-2 shadow-xs">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#1677D2]" />
                    <span>{pipelineAudit.ethical_data_notice}</span>
                  </div>
                </>
              ) : auditError ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
                  <span>{auditError}</span>
                  <button
                    onClick={() => station && fetchAudit(station.id)}
                    className="px-2.5 py-1 bg-white border border-rose-300 text-rose-800 rounded text-xs hover:bg-rose-50 font-bold"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="text-[#64748B] text-xs py-1 text-center">Data check not available right now.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
        <div className="flex items-center justify-between text-xs text-[#64748B] font-mono">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#64748B]" />
            Updated {timeAgo}
          </span>
          <span className="truncate max-w-[200px]">
            Source: {station.data_source || 'Hydrological survey'}
          </span>
        </div>

        <button
          onClick={() => onSendToSimulator(station)}
          className="w-full py-3 px-4 rounded-xl bg-[#1677D2] hover:bg-[#125FA8] active:scale-98 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
          Simulate a flood scenario &rarr;
        </button>
      </div>
    </div>
  );
};
