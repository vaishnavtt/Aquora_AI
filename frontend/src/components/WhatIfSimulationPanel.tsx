import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CloudRain,
  Waves,
  Thermometer,
  Wind,
  Cpu,
  Sparkles,
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
      setErrorMsg(err.message || 'Risk prediction failed — check backend connection');
    } finally {
      setLoading(false);
    }
  };

  // Run automatically on mount or when key sliders change with AbortController
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

  // Reset to current station values
  const resetToBaseline = () => {
    if (selectedStation) {
      setParams((p) => ({
        ...p,
        water_temp_c: selectedStation.water_temp_c,
        flow_rate_cms: selectedStation.flow_rate_cms,
        depth_meters: selectedStation.depth_meters,
        rainfall_last_24h_mm: 15.0,
        wind_speed_kmh: 20.0,
      }));
    }
  };

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
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-slate-850 text-slate-300 border border-slate-800">
              <Sliders className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Scenario Simulator
              </h2>
              <p className="text-xs text-slate-400">
                Adjust weather and river variables to test how risk estimates respond.
              </p>
            </div>
          </div>

          {selectedStation && (
            <div className="text-xs font-mono text-slate-400 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
              Testing location: <span className="text-white font-semibold">{selectedStation.name.replace(' (DEMO Station)', '')}</span>
            </div>
          )}
        </div>

        {/* Quick Scenario Presets */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400 mr-1">
            Preset scenarios:
          </span>
          <button
            onClick={() => applyPreset('flashFlood')}
            className="px-3 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5"
          >
            ⛈️ Flash flood surge
          </button>
          <button
            onClick={() => applyPreset('snowmelt')}
            className="px-3 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5"
          >
            ❄️ Cold snowmelt runoff
          </button>
          <button
            onClick={() => applyPreset('storm')}
            className="px-3 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5"
          >
            🌪️ Gale storm
          </button>
          <button
            onClick={() => applyPreset('calm')}
            className="px-3 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1.5"
          >
            ☀️ Calm summer flow
          </button>
          <button
            onClick={resetToBaseline}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Reset
          </button>
        </div>
      </div>

      {/* Grid of Sliders and Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Area (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Rainfall */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-slate-400" />
                Rainfall accumulation (last 24 hours)
              </span>
              <span className="font-mono text-white text-sm font-semibold">
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
              className="w-full accent-sky-500 hover:accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 font-mono">
              <span>0 mm (Dry)</span>
              <span>30 mm (Caution)</span>
              <span>100 mm (Extreme torrent)</span>
            </div>
          </div>

          {/* Water Depth */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <Waves className="w-4 h-4 text-slate-400" />
                Water depth / stage
              </span>
              <span className="font-mono text-white text-sm font-semibold">
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
              className="w-full accent-sky-500 hover:accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 font-mono">
              <span>0.5 m (Shallow)</span>
              <span>4.0 m (Moderate)</span>
              <span>15.0 m (Deep channel)</span>
            </div>
          </div>

          {/* Flow Rate */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <Waves className="w-4 h-4 text-slate-400" />
                River flow velocity / discharge
              </span>
              <span className="font-mono text-white text-sm font-semibold">
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
              className="w-full accent-sky-500 hover:accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 font-mono">
              <span>0.1 m³/s (Calm)</span>
              <span>6.0 m³/s (Safe threshold)</span>
              <span>25.0 m³/s (Violent discharge)</span>
            </div>
          </div>

          {/* Water Temperature */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-slate-400" />
                Water temperature
              </span>
              <span className="font-mono text-white text-sm font-semibold">
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
              className="w-full accent-sky-500 hover:accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 font-mono">
              <span>&lt;10°C (Hypothermia risk)</span>
              <span>15°C (Cold)</span>
              <span>&gt;20°C (Comfortable)</span>
            </div>
          </div>

          {/* Wind Speed */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <Wind className="w-4 h-4 text-slate-400" />
                Wind speed
              </span>
              <span className="font-mono text-white text-sm font-semibold">
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
              className="w-full accent-sky-500 hover:accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 font-mono">
              <span>0 km/h (Calm)</span>
              <span>25 km/h (Surface chop)</span>
              <span>&gt;45 km/h (Gale warning)</span>
            </div>
          </div>

          {/* Optional Generative AI explanation */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Include AI advisory summary</span>
                <span className="text-xs text-slate-500">Converts structured factors into readable briefing notes</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={params.include_ai_explanation || false}
                onChange={(e) => setParams({ ...params, include_ai_explanation: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>
        </div>

        {/* Prediction Results (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="font-semibold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                Simulated Result
              </span>
              <div className="flex items-center gap-2">
                {loading && (
                  <span className="text-xs font-mono text-sky-400 animate-pulse flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                    Calculating...
                  </span>
                )}
                <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {prediction?.model_version || 'baseline-heuristic-v0.1'}
                </span>
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="my-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-rose-300">Prediction unavailable</div>
                  <p className="text-xs text-rose-200/90 leading-tight">{errorMsg}</p>
                  <button
                    onClick={() => runSimulation()}
                    className="mt-1 px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-100 rounded text-xs font-medium transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Score Comparison */}
            <div className="my-4 text-center space-y-2">
              <div className="text-xs font-medium text-slate-400">
                Simulated Risk Score
              </div>
              <div className="flex items-baseline justify-center gap-2.5">
                <div className="text-4xl font-extrabold text-white font-mono">
                  {prediction ? prediction.risk_score.toFixed(1) : (loading ? '...' : '—')}
                </div>
                <div
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full font-mono flex items-center ${
                    delta > 0
                      ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60'
                      : delta < 0
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta} vs baseline
                </div>
              </div>

              {prediction && (
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      prediction.risk_level === 'low'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                        : prediction.risk_level === 'moderate'
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                        : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      prediction.risk_level === 'low'
                        ? 'bg-emerald-400'
                        : prediction.risk_level === 'moderate'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`} />
                    {prediction.risk_level} risk
                  </span>
                </div>
              )}
            </div>

            {/* Before / After comparison */}
            {prediction && (
              <div className="my-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                <div className="grid grid-cols-2 divide-x divide-slate-800 text-center">
                  <div className="pr-3">
                    <div className="text-slate-400 text-xs mb-0.5">Current observation</div>
                    <div className="font-bold text-white text-base font-mono">{baselineScore.toFixed(1)}</div>
                    <div className="text-slate-400 text-xs capitalize">{selectedStation?.current_risk_level ?? '—'}</div>
                  </div>
                  <div className="pl-3">
                    <div className="text-slate-400 text-xs mb-0.5">Simulated condition</div>
                    <div className={`font-bold text-base font-mono ${
                      delta > 5 ? 'text-rose-400' : delta < -5 ? 'text-emerald-400' : 'text-slate-200'
                    }`}>
                      {prediction.risk_score.toFixed(1)}
                    </div>
                    <div className="text-slate-400 text-xs capitalize">{prediction.risk_level}</div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Explanation */}
            {prediction?.ai_explanation && (
              <div className="my-3 p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-sky-300">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Advisory Summary</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {prediction.ai_explanation}
                </p>
              </div>
            )}

            {/* Active Hazards */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="font-semibold text-slate-300 mb-1.5">
                  Contributing hazard factors:
                </div>
                <div className="space-y-1">
                  {prediction?.primary_hazards && prediction.primary_hazards.length > 0 ? (
                    prediction.primary_hazards.map((hz, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-900/80 border border-slate-800 text-slate-200 text-xs flex items-center gap-2"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{hz}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-slate-500 text-xs italic">No critical hazard thresholds breached.</div>
                  )}
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-300 mb-1.5">
                  Actionable safety directives:
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  {prediction?.safety_recommendations && prediction.safety_recommendations.length > 0 ? (
                    prediction.safety_recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-1 text-slate-500 text-xs italic">Standard shoreline monitoring guidelines apply.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-500 font-mono flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Interactive simulation · Values are not live sensor telemetry</span>
          </div>
        </div>
      </div>
    </div>
  );
};
