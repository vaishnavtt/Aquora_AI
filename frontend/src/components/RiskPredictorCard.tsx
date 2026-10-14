import React, { useState } from 'react';
import { PredictRequest, PredictResponse, WaterBody } from '../types';
import { api } from '../services/api';
import { Cpu, AlertCircle, ShieldAlert, Sparkles, CheckCircle2, Sliders, Info } from 'lucide-react';

interface RiskPredictorCardProps {
  selectedWaterBody: WaterBody | null;
}

export const RiskPredictorCard: React.FC<RiskPredictorCardProps> = ({ selectedWaterBody }) => {
  const [formData, setFormData] = useState<PredictRequest>({
    water_body_id: selectedWaterBody?.id ?? null,
    water_temp_c: selectedWaterBody?.water_temp_c ?? 16.5,
    flow_rate_cms: selectedWaterBody?.flow_rate_cms ?? 4.2,
    depth_meters: selectedWaterBody?.depth_meters ?? 3.5,
    rainfall_last_24h_mm: 18.0,
    wind_speed_kmh: 22.0,
    visibility_meters: 2500.0,
    include_ai_explanation: false,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick simulation presets
  const applyPreset = (preset: 'calm' | 'turbulent' | 'coldShock' | 'flood') => {
    if (preset === 'calm') {
      setFormData((prev) => ({
        ...prev,
        water_temp_c: 23.5,
        flow_rate_cms: 0.5,
        depth_meters: 2.0,
        rainfall_last_24h_mm: 0.0,
        wind_speed_kmh: 8.0,
        visibility_meters: 5000.0,
      }));
    } else if (preset === 'turbulent') {
      setFormData((prev) => ({
        ...prev,
        water_temp_c: 17.0,
        flow_rate_cms: 9.8,
        depth_meters: 4.5,
        rainfall_last_24h_mm: 45.0,
        wind_speed_kmh: 38.0,
        visibility_meters: 1200.0,
      }));
    } else if (preset === 'coldShock') {
      setFormData((prev) => ({
        ...prev,
        water_temp_c: 7.2,
        flow_rate_cms: 3.0,
        depth_meters: 6.0,
        rainfall_last_24h_mm: 5.0,
        wind_speed_kmh: 15.0,
        visibility_meters: 3000.0,
      }));
    } else if (preset === 'flood') {
      setFormData((prev) => ({
        ...prev,
        water_temp_c: 12.0,
        flow_rate_cms: 18.5,
        depth_meters: 8.0,
        rainfall_last_24h_mm: 82.0,
        wind_speed_kmh: 55.0,
        visibility_meters: 600.0,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.predictRisk(formData);
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Failed to compute prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & ML Disclaimer */}
      <div>
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-white">ML Hazard Prediction Engine</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Simulate environmental parameters to calculate aquatic danger scores, hypothermia warnings, and safety recommendations.
        </p>

        {/* Status notice */}
        <div className="mt-3 p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 flex items-start gap-2.5 text-xs text-cyan-200">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Team Track 1 (ML Lead):</span> Currently operating under baseline explainable heuristic rules (<code className="font-mono bg-cyan-900/60 px-1 py-0.2 rounded">baseline-heuristic-v0.1</code>). Scikit-learn model weights will be plugged in as datasets are trained.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters Form */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Environmental Telemetry
            </span>
            {selectedWaterBody && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                Station: {selectedWaterBody.name}
              </span>
            )}
          </div>

          {/* Scenario Presets */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Quick Simulation Presets:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('calm')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-colors"
              >
                🌊 Calm Summer
              </button>
              <button
                type="button"
                onClick={() => applyPreset('turbulent')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-colors"
              >
                ⚡ High Current
              </button>
              <button
                type="button"
                onClick={() => applyPreset('coldShock')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-colors"
              >
                ❄️ Cold Shock Risk
              </button>
              <button
                type="button"
                onClick={() => applyPreset('flood')}
                className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-medium border border-rose-800/40 transition-colors"
              >
                🚨 Flash Flood
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Water Temperature */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Water Temp (°C): <span className="font-mono text-cyan-400">{formData.water_temp_c}°C</span>
                </label>
                <input
                  type="range"
                  min="-2"
                  max="40"
                  step="0.5"
                  value={formData.water_temp_c}
                  onChange={(e) => setFormData({ ...formData, water_temp_c: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">&lt;15°C poses cold-shock risk</span>
              </div>

              {/* Flow Rate */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Flow Rate (m³/s): <span className="font-mono text-cyan-400">{formData.flow_rate_cms} m³/s</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.2"
                  value={formData.flow_rate_cms}
                  onChange={(e) => setFormData({ ...formData, flow_rate_cms: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">&gt;6 m³/s creates strong currents</span>
              </div>

              {/* Depth */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Depth (meters): <span className="font-mono text-cyan-400">{formData.depth_meters} m</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="15"
                  step="0.5"
                  value={formData.depth_meters}
                  onChange={(e) => setFormData({ ...formData, depth_meters: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Rainfall */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Rainfall 24h (mm): <span className="font-mono text-cyan-400">{formData.rainfall_last_24h_mm} mm</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.rainfall_last_24h_mm}
                  onChange={(e) => setFormData({ ...formData, rainfall_last_24h_mm: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Wind Speed */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Wind Speed (km/h): <span className="font-mono text-cyan-400">{formData.wind_speed_kmh} km/h</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  value={formData.wind_speed_kmh}
                  onChange={(e) => setFormData({ ...formData, wind_speed_kmh: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Visibility (meters): <span className="font-mono text-cyan-400">{formData.visibility_meters} m</span>
                </label>
                <input
                  type="range"
                  min="200"
                  max="10000"
                  step="100"
                  value={formData.visibility_meters}
                  onChange={(e) => setFormData({ ...formData, visibility_meters: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Optional AI Explanation Checkbox */}
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.include_ai_explanation}
                  onChange={(e) => setFormData({ ...formData, include_ai_explanation: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Generate Plain-Language AI Explanation (Gemini API)
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Cpu className="w-4 h-4 animate-spin" />
                  Calculating Risk Metrics...
                </>
              ) : (
                'Run Risk Assessment (/api/v1/predict)'
              )}
            </button>
          </form>
        </div>

        {/* Prediction Output Results */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                Assessment Results
              </span>
              {result && (
                <span className="text-[10px] font-mono text-cyan-400">
                  {result.model_version}
                </span>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!result && !error && (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <Cpu className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                <p>Adjust the sliders and click "Run Risk Assessment" to evaluate hazard probabilities.</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Score and Risk Badge */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Computed Hazard Score
                  </div>
                  <div className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-1">
                    <span>{result.risk_score.toFixed(1)}</span>
                    <span className="text-lg text-slate-500 font-normal">/ 100</span>
                  </div>

                  <div className="inline-block">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        result.risk_level === 'low'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : result.risk_level === 'moderate'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {result.risk_level} Risk Level
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                    <div
                      className={`h-full transition-all duration-500 ${
                        result.risk_level === 'low'
                          ? 'bg-emerald-400'
                          : result.risk_level === 'moderate'
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, result.risk_score)}%` }}
                    />
                  </div>
                </div>

                {/* Primary Hazards Identified */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Primary Hazard Factors:
                  </h4>
                  <div className="space-y-1.5">
                    {result.primary_hazards.map((hz, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-800/60 border border-slate-700/50 text-xs text-rose-300 flex items-center gap-2"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{hz}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Safety Recommendations */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Advisory & Recommendations:
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {result.safety_recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Gemini AI explanation */}
                {result.ai_explanation && (
                  <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200 space-y-1">
                    <div className="flex items-center gap-1 font-semibold text-blue-300">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Gemini Advisory Explanation
                    </div>
                    <p className="leading-relaxed">{result.ai_explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between font-mono">
            <span>Confidence: {result ? `${(result.confidence * 100).toFixed(0)}%` : '—'}</span>
            <span>Type: {result?.is_baseline_model ? 'Pre-train Baseline' : 'Trained Estimator'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
