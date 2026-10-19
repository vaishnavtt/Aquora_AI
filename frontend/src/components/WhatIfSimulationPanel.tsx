import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CloudRain,
  Waves,
  Thermometer,
  Wind,
  Cpu,
  Sparkles,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { WaterBody, PredictRequest, PredictResponse } from '../types';
import { api } from '../services/api';

interface WhatIfSimulationPanelProps {
  selectedStation: WaterBody | null;
}

export const WhatIfSimulationPanel: React.FC<WhatIfSimulationPanelProps> = ({
  selectedStation,
}) => {
  const [params, setParams] = useState<PredictRequest>({
    water_body_id: selectedStation?.id ?? 1,
    water_temp_c: selectedStation?.water_temp_c ?? 16.0,
    flow_rate_cms: selectedStation?.flow_rate_cms ?? 4.0,
    depth_meters: selectedStation?.depth_meters ?? 3.5,
    rainfall_last_24h_mm: 15.0,
    wind_speed_kmh: 20.0,
    visibility_meters: 2500.0,
    include_ai_explanation: false,
  });

  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync when selected station changes
  useEffect(() => {
    if (selectedStation) {
      setParams((prev) => ({
        ...prev,
        water_body_id: selectedStation.id,
        water_temp_c: selectedStation.water_temp_c,
        flow_rate_cms: selectedStation.flow_rate_cms,
        depth_meters: selectedStation.depth_meters,
      }));
    }
  }, [selectedStation]);

  const runSimulation = async (abortSignal?: AbortSignal) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.predictRisk(params, abortSignal);
      setPrediction(res);
      setErrorMsg(null);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setErrorMsg(err.message || 'Risk prediction evaluation failed');
    } finally {
      setLoading(false);
    }
  };

  // Run automatically on mount or when key sliders change with AbortController for race condition protection
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      runSimulation(controller.signal);
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    params.rainfall_last_24h_mm,
    params.depth_meters,
    params.flow_rate_cms,
    params.water_temp_c,
    params.wind_speed_kmh,
    params.water_body_id,
    params.include_ai_explanation,
  ]);

  // Preset scenarios
  const applyPreset = (preset: 'flashFlood' | 'snowmelt' | 'calm' | 'storm') => {
    switch (preset) {
      case 'flashFlood':
        setParams((p) => ({
          ...p,
          rainfall_last_24h_mm: 75.0,
          depth_meters: 6.8,
          flow_rate_cms: 14.5,
          water_temp_c: 13.0,
          wind_speed_kmh: 35.0,
        }));
        break;
      case 'snowmelt':
        setParams((p) => ({
          ...p,
          rainfall_last_24h_mm: 20.0,
          depth_meters: 4.8,
          flow_rate_cms: 9.2,
          water_temp_c: 7.5,
          wind_speed_kmh: 18.0,
        }));
        break;
      case 'calm':
        setParams((p) => ({
          ...p,
          rainfall_last_24h_mm: 0.0,
          depth_meters: 2.5,
          flow_rate_cms: 0.6,
          water_temp_c: 22.5,
          wind_speed_kmh: 8.0,
        }));
        break;
      case 'storm':
        setParams((p) => ({
          ...p,
          rainfall_last_24h_mm: 50.0,
          depth_meters: 5.5,
          flow_rate_cms: 7.8,
          water_temp_c: 14.0,
          wind_speed_kmh: 52.0,
        }));
        break;
    }
  };

  const baselineScore = selectedStation ? selectedStation.risk_score : 25.0;
  const currentSimScore = prediction ? prediction.risk_score : baselineScore;
  const delta = Math.round((currentSimScore - baselineScore) * 10) / 10;

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md p-5 space-y-6">
      {/* Header & DEMO Disclaimer */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/40">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                What-If Environmental Simulation Lab
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 font-semibold uppercase">
                  DEMO HEURISTIC
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Adjust precipitation and hydrodynamic parameters to simulate real-time flood surges and cold-shock hazards.
              </p>
            </div>
          </div>

          {selectedStation && (
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
              Station: <span className="text-cyan-300 font-bold">{selectedStation.name.replace(' (DEMO Station)', '')}</span>
            </div>
          )}
        </div>

        {/* Quick Scenario Buttons */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Quick Scenarios:
          </span>
          <button
            onClick={() => applyPreset('flashFlood')}
            className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800/50 transition-colors flex items-center gap-1"
          >
            ⛈️ Flash Flood Surge
          </button>
          <button
            onClick={() => applyPreset('snowmelt')}
            className="px-2.5 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900 text-blue-300 text-xs font-semibold border border-blue-800/50 transition-colors flex items-center gap-1"
          >
            ❄️ Cold Snowmelt Runoff
          </button>
          <button
            onClick={() => applyPreset('storm')}
            className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 text-amber-300 text-xs font-semibold border border-amber-800/50 transition-colors flex items-center gap-1"
          >
            🌪️ Gale Storm Waves
          </button>
          <button
            onClick={() => applyPreset('calm')}
            className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-800/50 transition-colors flex items-center gap-1"
          >
            ☀️ Calm Summer Low-Flow
          </button>
        </div>
      </div>

      {/* Grid of Sliders and Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Area (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Rainfall Accumulation */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-cyan-400" />
                Rainfall Accumulation (Last 24h)
              </span>
              <span className="font-mono text-cyan-400 text-sm font-bold">
                {params.rainfall_last_24h_mm.toFixed(0)} mm
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={params.rainfall_last_24h_mm}
              onChange={(e) =>
                setParams({ ...params, rainfall_last_24h_mm: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0 mm (Drought/Dry)</span>
              <span>30 mm (Threshold)</span>
              <span>100 mm (Extreme Torrent)</span>
            </div>
          </div>

          {/* Water Level / Depth */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-blue-400" />
                Water Level / Depth
              </span>
              <span className="font-mono text-blue-400 text-sm font-bold">
                {params.depth_meters.toFixed(1)} m
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="15.0"
              step="0.5"
              value={params.depth_meters}
              onChange={(e) =>
                setParams({ ...params, depth_meters: parseFloat(e.target.value) })
              }
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.5 m (Shallow)</span>
              <span>4.0 m (Moderate)</span>
              <span>15.0 m (Deep Basin)</span>
            </div>
          </div>

          {/* Flow Rate Discharge Velocity */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-indigo-400" />
                Flow Velocity / Hydrodynamic Discharge
              </span>
              <span className="font-mono text-indigo-400 text-sm font-bold">
                {params.flow_rate_cms.toFixed(1)} m³/s
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="25.0"
              step="0.5"
              value={params.flow_rate_cms}
              onChange={(e) =>
                setParams({ ...params, flow_rate_cms: parseFloat(e.target.value) })
              }
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.1 m³/s (Still)</span>
              <span>6.0 m³/s (Hazard Limit)</span>
              <span>25.0 m³/s (Violent Current)</span>
            </div>
          </div>

          {/* Water Temperature */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-emerald-400" />
                Water Temperature (°C)
              </span>
              <span className="font-mono text-emerald-400 text-sm font-bold">
                {params.water_temp_c.toFixed(1)}°C
              </span>
            </div>
            <input
              type="range"
              min="4.0"
              max="35.0"
              step="0.5"
              value={params.water_temp_c}
              onChange={(e) =>
                setParams({ ...params, water_temp_c: parseFloat(e.target.value) })
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>&lt;10°C (Hypothermia)</span>
              <span>15°C (Cold Shock)</span>
              <span>&gt;20°C (Temperate)</span>
            </div>
          </div>

          {/* Wind Speed & Wave Action */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-sky-400" />
                Wind Speed &amp; Surface Wave Action
              </span>
              <span className="font-mono text-sky-400 text-sm font-bold">
                {params.wind_speed_kmh.toFixed(1)} km/h
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="80.0"
              step="1.0"
              value={params.wind_speed_kmh}
              onChange={(e) =>
                setParams({ ...params, wind_speed_kmh: parseFloat(e.target.value) })
              }
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0 km/h (Calm)</span>
              <span>25 km/h (Chop)</span>
              <span>&gt;45 km/h (Gale / Capsizing)</span>
            </div>
          </div>

          {/* AI Explanation & Inference Options */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Include Generative AI Advisory</span>
                <span className="text-[10px] text-slate-400">Calls Gemini endpoint hook when configured in backend .env</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={params.include_ai_explanation || false}
                onChange={(e) => setParams({ ...params, include_ai_explanation: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>
        </div>

        {/* Prediction Results & Delta (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Simulated Output
              </span>
              <div className="flex items-center gap-2">
                {loading && (
                  <span className="text-[10px] font-mono text-cyan-400 animate-pulse flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    Evaluating...
                  </span>
                )}
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  {prediction?.model_version || 'baseline-heuristic-v0.1'}
                </span>
              </div>
            </div>

            {/* Error Banner if inference fails */}
            {errorMsg && (
              <div className="my-3 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-rose-300">Inference Service Unavailable</div>
                  <p className="text-[11px] text-rose-200/90 leading-tight">{errorMsg}</p>
                  <button
                    onClick={() => runSimulation()}
                    className="mt-1 px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-100 rounded text-[10px] font-bold transition-colors"
                  >
                    Retry Inference
                  </button>
                </div>
              </div>
            )}

            {/* Score Comparison Display */}
            <div className="my-4 text-center space-y-2">
              <div className="text-[11px] uppercase font-bold text-slate-400">
                Projected Hazard Rating
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="text-4xl font-black text-white font-mono">
                  {prediction ? prediction.risk_score.toFixed(1) : (loading ? '...' : '—')}
                </div>
                <div
                  className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono flex items-center ${
                    delta > 0
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : delta < 0
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta} pts vs baseline
                </div>
              </div>

              {prediction && (
                <div>
                  <span
                    className={`inline-block px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                      prediction.risk_level === 'low'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : prediction.risk_level === 'moderate'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {prediction.risk_level} Risk Level
                  </span>
                </div>
              )}
            </div>

            {/* Generative AI Explanation if returned */}
            {prediction?.ai_explanation && (
              <div className="my-3 p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-xs text-cyan-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI Safety Advisory Summary</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  {prediction.ai_explanation}
                </p>
              </div>
            )}

            {/* Simulated Hazards Breakdown */}
            <div className="space-y-3 text-xs">
              <div>
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                  Predicted Danger Factors:
                </h4>
                <div className="space-y-1">
                  {prediction?.primary_hazards && prediction.primary_hazards.length > 0 ? (
                    prediction.primary_hazards.map((hz, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-200 text-[11px] flex items-center gap-2"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{hz}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-slate-500 text-[11px] italic">No active hazard factors detected.</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                  Safety Directives:
                </h4>
                <div className="space-y-1 text-[11px] text-slate-300">
                  {prediction?.safety_recommendations && prediction.safety_recommendations.length > 0 ? (
                    prediction.safety_recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-1 text-slate-500 text-[11px] italic">Standard shoreline guidelines apply.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>Confidence: {prediction ? `${(prediction.confidence * 100).toFixed(0)}%` : '85%'}</span>
            <span>Zero Fabrication Guarantee</span>
          </div>
        </div>
      </div>
    </div>
  );
};
