import React from 'react';
import {
  ShieldAlert,
  Thermometer,
  Waves,
  ArrowDownCircle,
  Wind,
  Clock,
  Sliders,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Compass,
} from 'lucide-react';
import { WaterBody, RiskLevel } from '../types';

interface LocationDetailsPanelProps {
  station: WaterBody | null;
  onSendToSimulator: (wb: WaterBody) => void;
}

export const LocationDetailsPanel: React.FC<LocationDetailsPanelProps> = ({
  station,
  onSendToSimulator,
}) => {
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
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md p-5 flex flex-col justify-between space-y-5">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/50">
                {station.type}
              </span>
              <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/40">
                DEMO
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1 leading-snug">
              {station.name.replace(' (DEMO Station)', '')}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
              <Compass className="w-3 h-3 text-slate-500" />
              <span>{station.latitude.toFixed(4)}°N, {station.longitude.toFixed(4)}°W</span>
            </div>
          </div>

          {/* Risk Level Badge */}
          <div className="text-right">
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}
            >
              {station.current_risk_level}
            </span>
          </div>
        </div>

        {/* Risk Score Gauge Card */}
        <div className="my-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Calculated Hazard Score
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
              ? 'Recreational activity within normal margins.'
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
              <span>Flow Velocity</span>
            </div>
            <span className="text-sm font-bold font-mono text-white">
              {station.flow_rate_cms.toFixed(1)} m³/s
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
              <ArrowDownCircle className="w-3 h-3 text-indigo-400" />
              <span>Avg Depth</span>
            </div>
            <span className="text-sm font-bold font-mono text-white">
              {station.depth_meters.toFixed(1)} m
            </span>
          </div>
        </div>

        {/* Contributing Danger Factors */}
        <div className="mt-4 space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Primary Contributing Factors
          </h4>
          <div className="space-y-1.5">
            {contributingFactors.map((fac, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800 text-xs flex items-start gap-2"
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
      </div>

      {/* Footer & Actions */}
      <div className="pt-3 border-t border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last Sync: {new Date(station.last_updated).toLocaleTimeString()}
          </span>
          <span>Source: Demo Telemetry Node</span>
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
