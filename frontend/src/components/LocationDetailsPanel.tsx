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
  FolderGit2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';
import { WaterBody, RiskLevel, EnvironmentalPipelineAuditResponse, formatCoordinates } from '../types';
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
  const [showAudit, setShowAudit] = useState<boolean>(false);

  useEffect(() => {
    if (!station) {
      setPipelineAudit(null);
      return;
    }
    // Fetch pipeline audit whenever selected station changes
    let active = true;
    setAuditLoading(true);
    api.getEnvironmentalPipelineAudit(station.id)
      .then((data) => {
        if (active) setPipelineAudit(data);
      })
      .catch(() => {
        if (active) setPipelineAudit(null);
      })
      .finally(() => {
        if (active) setAuditLoading(false);
      });

    return () => {
      active = false;
    };
  }, [station?.id]);

  if (!station) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2 h-full min-h-[320px]">
        <MapPin className="w-8 h-8 text-slate-600 animate-bounce" />
        <p className="font-medium text-slate-400">No Location Selected</p>
        <p className="text-[11px] text-slate-500">
          Click any pin on the map or select a station from the directory to inspect hydrodynamic telemetry.
        </p>
      </div>
    );
  }

  // Derive contributing factors based on station telemetry
  const contributingFactors: { name: string; severity: 'low' | 'moderate' | 'high'; note: string }[] = [];

  if (station.flow_rate_cms >= 6.0) {
    contributingFactors.push({
      name: 'Violent Current / High Discharge',
      severity: 'high',
      note: `${station.flow_rate_cms.toFixed(1)} m³/s exceeds safe recreational thresholds (>6 m³/s).`,
    });
  } else if (station.flow_rate_cms >= 2.5) {
    contributingFactors.push({
      name: 'Moderate River Flow Velocity',
      severity: 'moderate',
      note: `${station.flow_rate_cms.toFixed(1)} m³/s poses swimming fatigue risks.`,
    });
  } else {
    contributingFactors.push({
      name: 'Nominal Current Velocity',
      severity: 'low',
      note: 'Gentle displacement circulation.',
    });
  }

  if (station.water_temp_c < 12.0) {
    contributingFactors.push({
      name: 'Severe Hypothermia & Cold Shock',
      severity: 'high',
      note: `${station.water_temp_c.toFixed(1)}°C triggers gasping reflex within 60 seconds of immersion.`,
    });
  } else if (station.water_temp_c < 17.0) {
    contributingFactors.push({
      name: 'Cold Water Advisory',
      severity: 'moderate',
      note: `${station.water_temp_c.toFixed(1)}°C is brisk; thermal protection recommended.`,
    });
  } else {
    contributingFactors.push({
      name: 'Temperate Water Range',
      severity: 'low',
      note: `${station.water_temp_c.toFixed(1)}°C within comfortable recreation boundaries.`,
    });
  }

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'low':
        return { text: 'text-emerald-400', bg: 'bg-emerald-950', border: 'border-emerald-800', bar: 'bg-emerald-400' };
      case 'moderate':
        return { text: 'text-amber-400', bg: 'bg-amber-950', border: 'border-amber-800', bar: 'bg-amber-400' };
      case 'high':
      case 'extreme':
      default:
        return { text: 'text-rose-400', bg: 'bg-rose-950', border: 'border-rose-800', bar: 'bg-rose-500' };
    }
  };

  const riskStyle = getRiskColor(station.current_risk_level);

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md p-5 flex flex-col justify-between space-y-4">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/50">
                {station.type}
              </span>
              {station.basin_region && (
                <span className="text-[9px] font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                  {station.basin_region}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
              {station.name.replace(' (DEMO Station)', '')}
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Compass className="w-3 h-3 text-slate-500" />
                {formatCoordinates(station.latitude, station.longitude, 4)}
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <Mountain className="w-3 h-3 text-emerald-400" />
                {station.elevation_meters ? `${station.elevation_meters.toFixed(1)} m MSL` : 'Elevation Unsurveyed'}
              </span>
            </div>
          </div>

          {/* Risk Level Badge */}
          <div className="text-right shrink-0">
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}
            >
              {station.current_risk_level}
            </span>
          </div>
        </div>

        {/* Description / Bathymetry */}
        {station.description && (
          <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            {station.description}
          </p>
        )}

        {/* Risk Score Gauge Card */}
        <div className="my-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Explainable Environmental Hazard Score
          </span>
          <div className="flex items-center justify-center gap-1">
            <span className={`text-4xl font-black tracking-tight ${riskStyle.text}`}>
              {station.risk_score.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-slate-500">/ 100</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${riskStyle.bar}`}
              style={{ width: `${Math.min(100, station.risk_score)}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 pt-1">
            {station.current_risk_level === 'low'
              ? 'Recreational activity within nominal margins.'
              : station.current_risk_level === 'moderate'
              ? 'Heightened caution required due to rapid flow or cold temperature.'
              : 'Immediate hazard. Entry prohibited for non-rescue personnel.'}
          </p>
        </div>

        {/* Hydrodynamic Telemetry Grid */}
        <div className="grid grid-cols-3 gap-2.5 my-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
              <Thermometer className="w-3 h-3 text-cyan-400" />
              <span>Water Temp</span>
            </div>
            <span className="text-sm font-bold font-mono text-white">
              {station.water_temp_c.toFixed(1)}°C
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
              <Waves className="w-3 h-3 text-blue-400" />
              <span>Discharge Flow</span>
            </div>
            <span className="text-sm font-bold font-mono text-white">
              {station.flow_rate_cms.toFixed(1)} m³/s
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
              <ArrowDownCircle className="w-3 h-3 text-indigo-400" />
              <span>Gauge Depth</span>
            </div>
            <span className="text-sm font-bold font-mono text-white">
              {station.depth_meters.toFixed(1)} m
            </span>
          </div>
        </div>

        {/* Contributing Danger Factors */}
        <div className="mt-3 space-y-1.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Primary Contributing Factors
          </h4>
          <div className="space-y-1.5">
            {contributingFactors.map((fac, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 text-xs flex items-start gap-2"
              >
                {fac.severity === 'high' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                ) : fac.severity === 'moderate' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-200 text-[11px]">{fac.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{fac.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Environmental Pipeline Audit Collapsible (Task 2 Transparency) */}
        <div className="mt-3.5 rounded-xl border border-slate-800/80 bg-slate-950/70 overflow-hidden">
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="w-full p-2.5 flex items-center justify-between text-xs text-slate-300 font-semibold hover:bg-slate-800/40 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
              Environmental Pipeline Audit (6 Dimensions)
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              {pipelineAudit && (
                <span className="text-emerald-400 font-bold">
                  {pipelineAudit.available_dimensions_count}/6 Available
                </span>
              )}
              {showAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showAudit && (
            <div className="p-3 border-t border-slate-800/80 space-y-2.5 text-xs">
              {auditLoading ? (
                <div className="text-center py-2 text-slate-400 text-[11px]">Auditing pipeline dimensions...</div>
              ) : pipelineAudit ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Dimension 1: Rainfall */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-300 text-[11px]">Rainfall (24h)</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50">
                          {pipelineAudit.dimensions.rainfall?.status || 'UNAVAILABLE'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                        {pipelineAudit.dimensions.rainfall?.limitation_reason || 'No real-time raingauge connected.'}
                      </p>
                    </div>

                    {/* Dimension 2: Water Level */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-300 text-[11px]">Water Level / Stage</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                          {pipelineAudit.dimensions.water_level?.status || 'AVAILABLE'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                        Value: {pipelineAudit.dimensions.water_level?.value ?? station.depth_meters} m &bull; Source: {pipelineAudit.dimensions.water_level?.source || 'Telemetry Node'}
                      </p>
                    </div>

                    {/* Dimension 3: Water Body Type */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-300 text-[11px]">Water-Body Type</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                          AVAILABLE
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                        Classification: <span className="capitalize">{station.type}</span> &bull; Source: AQUORA Registry
                      </p>
                    </div>

                    {/* Dimension 4: Terrain / Elevation */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-300 text-[11px]">Terrain & Elevation</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${station.elevation_meters ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50' : 'bg-slate-800 text-slate-400'}`}>
                          {station.elevation_meters ? 'AVAILABLE' : 'UNAVAILABLE'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                        {station.elevation_meters ? `${station.elevation_meters.toFixed(1)} m MSL (SRTM Digital Elevation)` : 'Elevation not surveyed for this coordinates.'}
                      </p>
                    </div>

                    {/* Dimension 5: Historical Drowning Incidents */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-300 text-[11px]">Historical Hazard / Drowning Records</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50">
                          UNAVAILABLE (NOT FABRICATED)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                        No validated public Kerala drowning incident registry is accessible. AQUORA AI strictly does NOT invent or synthesize historical accident records.
                      </p>
                    </div>

                    {/* Dimension 6: Source Metadata & Freshness */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-300 text-[11px]">Source Metadata & Timestamps</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                          AVAILABLE
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                        Agency: {station.data_source || 'AQUORA Hydrological DB Baseline'} &bull; Last Sync: {new Date(station.last_updated).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[10px] text-cyan-300 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400" />
                    <span>{pipelineAudit.ethical_data_notice}</span>
                  </div>
                </>
              ) : (
                <div className="text-slate-500 italic text-[11px] py-1 text-center">Pipeline audit unavailable.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="pt-2 border-t border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last Sync: {new Date(station.last_updated).toLocaleTimeString()}
          </span>
          <span className="truncate max-w-[180px]">Source: {station.data_source || 'Hydrological Survey'}</span>
        </div>

        <button
          onClick={() => onSendToSimulator(station)}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Sliders className="w-3.5 h-3.5" />
          Test Surge in What-If Simulator &rarr;
        </button>
      </div>
    </div>
  );
};
