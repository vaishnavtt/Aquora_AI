import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CloudRain,
  Waves,
  Gauge,
  Thermometer,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Zap,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { WaterBody, WhatIfSimulationRequest, WhatIfSimulationResponse, RiskCategory } from '../types';
import { api } from '../services/api';
import { DemoBadge } from './common/DemoBadge';

interface WhatIfSimulationPanelProps {
  selectedStation: WaterBody | null;
}

export const WhatIfSimulationPanel: React.FC<WhatIfSimulationPanelProps> = ({
  selectedStation,
}) => {
  const [req, setReq] = useState<WhatIfSimulationRequest>({
    water_body_id: selectedStation?.id ?? null,
    water_body_type: selectedStation?.type ?? 'river',
    simulated_rainfall_increment_mm: 35.0,
    simulated_stage_delta_m: 0.45,
    simulated_discharge_increment_cms: 18.0,
    simulated_water_temp_c: selectedStation?.water_temp_c ?? 26.0,
    simulated_exposure_scenario: 'normal',
  });

  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState<WhatIfSimulationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync with selected station
  useEffect(() => {
    if (selectedStation) {
      setReq((prev) => ({
        ...prev,
        water_body_id: selectedStation.id,
        water_body_type: selectedStation.type,
        simulated_water_temp_c: selectedStation.water_temp_c,
      }));
    }
  }, [selectedStation]);

  const runSimulation = async (abortSignal?: AbortSignal) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.simulateWhatIf(req, abortSignal);
      setSimulation(res);
      setErrorMsg(null);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setErrorMsg(err.message || 'What-If simulation service unavailable');
    } finally {
      setLoading(false);
    }
  };

  // Debounced auto-run when sliders change
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      runSimulation(controller.signal);
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    req.water_body_id,
    req.water_body_type,
    req.simulated_rainfall_increment_mm,
    req.simulated_stage_delta_m,
    req.simulated_discharge_increment_cms,
    req.simulated_water_temp_c,
    req.simulated_exposure_scenario,
  ]);

  const applyPreset = (preset: 'cloudburst' | 'monsoonSurge' | 'quarryPlunge' | 'waterfallSurge' | 'baseflow') => {
    switch (preset) {
      case 'cloudburst':
        setReq((p) => ({
          ...p,
          simulated_rainfall_increment_mm: 85.0,
          simulated_stage_delta_m: 1.25,
          simulated_discharge_increment_cms: 45.0,
          simulated_exposure_scenario: 'weekend_crowd',
        }));
        break;
      case 'monsoonSurge':
        setReq((p) => ({
          ...p,
          simulated_rainfall_increment_mm: 45.0,
          simulated_stage_delta_m: 0.65,
          simulated_discharge_increment_cms: 25.0,
          simulated_exposure_scenario: 'normal',
        }));
        break;
      case 'quarryPlunge':
        setReq((p) => ({
          ...p,
          water_body_type: 'quarry',
          simulated_rainfall_increment_mm: 10.0,
          simulated_stage_delta_m: 0.10,
          simulated_discharge_increment_cms: 0.0,
          simulated_water_temp_c: 15.0,
          simulated_exposure_scenario: 'unfenced',
        }));
        break;
      case 'waterfallSurge':
        setReq((p) => ({
          ...p,
          water_body_type: 'waterfall',
          simulated_rainfall_increment_mm: 60.0,
          simulated_stage_delta_m: 0.85,
          simulated_discharge_increment_cms: 32.0,
          simulated_exposure_scenario: 'weekend_crowd',
        }));
        break;
      case 'baseflow':
        setReq((p) => ({
          ...p,
          simulated_rainfall_increment_mm: 0.0,
          simulated_stage_delta_m: 0.0,
          simulated_discharge_increment_cms: 0.0,
          simulated_exposure_scenario: 'normal',
        }));
        break;
    }
  };

  const getRiskCategoryColor = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case 'LOW':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'MODERATE':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'HIGH':
        return 'bg-orange-950 text-orange-300 border-orange-800';
      case 'VERY HIGH':
      default:
        return 'bg-rose-950 text-rose-300 border-rose-800';
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden space-y-6 p-5 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/50">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Interactive What-If Scenario Simulator
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50 font-bold uppercase">
                HYPOTHETICAL LAB
              </span>
              {selectedStation?.is_demonstration_data && <DemoBadge />}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Simulate hypothetical weather and hydrological conditions. Recalculates both Layer A
            (ML-evaluated environmental surge) and Layer B (contextual site vulnerability) in real time.
          </p>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
          <button
            onClick={() => applyPreset('cloudburst')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700 transition-colors"
          >
            ⚡ Ghats Cloudburst
          </button>
          <button
            onClick={() => applyPreset('monsoonSurge')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700 transition-colors"
          >
            🌧️ Monsoon Surge
          </button>
          <button
            onClick={() => applyPreset('quarryPlunge')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700 transition-colors"
          >
            ⛏️ Quarry Pit
          </button>
          <button
            onClick={() => applyPreset('waterfallSurge')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700 transition-colors"
          >
            🌊 Waterfall Flash
          </button>
          <button
            onClick={() => applyPreset('baseflow')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-400 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3 h-3 inline mr-1" /> Reset
          </button>
        </div>
      </div>

      {/* Mandatory Simulation Banner */}
      <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-200/90 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed font-mono text-[11px]">
          <strong>NOTICE:</strong> Calculations below reflect user-adjusted scenario parameters.
          Hypothetical scenarios are strictly distinct from verified telemetry observations and do not represent historical incident records.
        </p>
      </div>

      {/* Main Grid: Controls on Left, Side-by-Side Comparison on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sliders & Selectors (5 cols) */}
        <div className="lg:col-span-5 space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            Adjust Scenario Variables
          </h3>

          {/* Water Body Type Context */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold flex items-center justify-between">
              <span>Water Body Type Context</span>
              <span className="text-[10px] font-mono text-cyan-400 uppercase">{req.water_body_type}</span>
            </label>
            <select
              value={req.water_body_type || 'river'}
              onChange={(e) => setReq({ ...req, water_body_type: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="river">River & Riverbank</option>
              <option value="quarry">Abandoned Stone Quarry</option>
              <option value="waterfall">Waterfall & Mountain Stream</option>
              <option value="lake">Freshwater Lake & Village Pond</option>
              <option value="reservoir">Reservoir & Dam Spillway</option>
              <option value="canal">Irrigation & Transport Canal</option>
            </select>
          </div>

          {/* Slider 1: Rainfall Increment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                Additional 24h Rainfall
              </span>
              <span className="font-mono text-cyan-300 font-bold">
                +{req.simulated_rainfall_increment_mm.toFixed(1)} mm
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              step="5"
              value={req.simulated_rainfall_increment_mm}
              onChange={(e) => setReq({ ...req, simulated_rainfall_increment_mm: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0 mm (Dry)</span>
              <span>50 mm (Monsoon)</span>
              <span>150 mm (Cloudburst)</span>
            </div>
          </div>

          {/* Slider 2: Water Level Surge / Delta */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-cyan-400" />
                Water Level Stage Delta
              </span>
              <span className="font-mono text-cyan-300 font-bold">
                {req.simulated_stage_delta_m >= 0 ? '+' : ''}{req.simulated_stage_delta_m.toFixed(2)} m
              </span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="3.0"
              step="0.05"
              value={req.simulated_stage_delta_m}
              onChange={(e) => setReq({ ...req, simulated_stage_delta_m: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>-1.0 m (Drought)</span>
              <span>0.0 m (Normal)</span>
              <span>+3.0 m (Extreme Surge)</span>
            </div>
          </div>

          {/* Slider 3: River Discharge Increment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                Additional River Discharge
              </span>
              <span className="font-mono text-cyan-300 font-bold">
                +{req.simulated_discharge_increment_cms.toFixed(1)} m³/s
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="2"
              value={req.simulated_discharge_increment_cms}
              onChange={(e) => setReq({ ...req, simulated_discharge_increment_cms: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0 m³/s (Base)</span>
              <span>50 m³/s (High Current)</span>
              <span>100 m³/s (Flash Flood)</span>
            </div>
          </div>

          {/* Exposure Scenario Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold">Exposure & Access Condition</label>
            <select
              value={req.simulated_exposure_scenario || 'normal'}
              onChange={(e) => setReq({ ...req, simulated_exposure_scenario: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="normal">Normal Daytime Access</option>
              <option value="weekend_crowd">Weekend Recreational Tourist Rush</option>
              <option value="unfenced">Unfenced / Dilapidated Barrier Access</option>
              <option value="night_time">Night-Time / Poor Ambient Visibility</option>
            </select>
          </div>
        </div>

        {/* Right Column: Side-by-Side Comparison (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {errorMsg ? (
            <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 text-center">
              {errorMsg}
            </div>
          ) : simulation ? (
            <div className="space-y-4">
              {/* Delta Comparison Banner */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${simulation.delta_risk_score >= 0 ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'}`}>
                    {simulation.delta_risk_score >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Scenario Impact</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-sm font-bold text-white">
                        {simulation.delta_risk_category}
                      </span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${simulation.delta_risk_score >= 0 ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'}`}>
                        {simulation.delta_risk_score >= 0 ? '+' : ''}{simulation.delta_risk_score.toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-400">
                  {loading ? 'Recalculating...' : 'Real-time inference'}
                </span>
              </div>

              {/* Side-by-Side Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Baseline Assessment Card */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-slate-400" />
                      Baseline Assessment
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      ACTUAL
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${getRiskCategoryColor(simulation.baseline_assessment.risk_category)}`}>
                        {simulation.baseline_assessment.risk_category}
                      </span>
                      <span className="text-sm font-bold text-white font-mono">
                        {simulation.baseline_assessment.risk_score.toFixed(1)} / 100
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Layer A Hazard:</span>
                      <strong className="text-slate-200">{simulation.baseline_assessment.layer_a_environmental_hazard.hazard_score.toFixed(1)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Layer B Vulnerability:</span>
                      <strong className="text-slate-200">{simulation.baseline_assessment.layer_b_contextual_risk.vulnerability_score.toFixed(1)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Stage:</span>
                      <strong className="text-slate-200">
                        {simulation.baseline_assessment.layer_a_environmental_hazard.water_level_m != null
                          ? `${simulation.baseline_assessment.layer_a_environmental_hazard.water_level_m.toFixed(2)} m`
                          : 'Unavailable'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>24h Rain:</span>
                      <strong className="text-slate-200">
                        {simulation.baseline_assessment.layer_a_environmental_hazard.rainfall_24h_mm != null
                          ? `${simulation.baseline_assessment.layer_a_environmental_hazard.rainfall_24h_mm.toFixed(1)} mm`
                          : 'Unavailable'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 2. Simulated Scenario Card */}
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/60 space-y-3">
                  <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      Simulated Scenario
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      SIMULATED
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${getRiskCategoryColor(simulation.simulated_assessment.risk_category)}`}>
                        {simulation.simulated_assessment.risk_category}
                      </span>
                      <span className="text-sm font-bold text-cyan-300 font-mono">
                        {simulation.simulated_assessment.risk_score.toFixed(1)} / 100
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Layer A Hazard:</span>
                      <strong className="text-cyan-300">{simulation.simulated_assessment.layer_a_environmental_hazard.hazard_score.toFixed(1)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Layer B Vulnerability:</span>
                      <strong className="text-amber-300">{simulation.simulated_assessment.layer_b_contextual_risk.vulnerability_score.toFixed(1)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Simulated Stage:</span>
                      <strong className="text-cyan-200">
                        {simulation.simulated_assessment.layer_a_environmental_hazard.water_level_m != null
                          ? `${simulation.simulated_assessment.layer_a_environmental_hazard.water_level_m.toFixed(2)} m`
                          : 'Unavailable'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Simulated Rain:</span>
                      <strong className="text-cyan-200">
                        {simulation.simulated_assessment.layer_a_environmental_hazard.rainfall_24h_mm != null
                          ? `${simulation.simulated_assessment.layer_a_environmental_hazard.rainfall_24h_mm.toFixed(1)} mm`
                          : 'Unavailable'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Newly Triggered Hazard Factors */}
              {simulation.newly_triggered_hazards.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-900/40 space-y-2">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Newly Triggered Hazards in Scenario:
                  </h4>
                  <ul className="space-y-1">
                    {simulation.newly_triggered_hazards.map((hazard, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-amber-400 font-bold">&bull;</span>
                        <span>{hazard}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
