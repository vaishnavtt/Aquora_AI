import React, { useState, useMemo, useEffect } from 'react';
import { Sliders, RefreshCw, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { WaterBody, RiskLevel } from '../../types';

interface OperationalWhatIfPanelProps {
  selectedStation: WaterBody | null;
}

type ExposureScenario = 'Normal Activity' | 'Low Off-Peak' | 'Crowded Holiday/Festival' | 'Night Operations';

export const OperationalWhatIfPanel: React.FC<OperationalWhatIfPanelProps> = ({
  selectedStation,
}) => {
  const [rainfallInc, setRainfallInc] = useState<number>(35);
  const [stageDelta, setStageDelta] = useState<number>(0.85);
  const [dischargeInc, setDischargeInc] = useState<number>(24);
  const [waterTemp, setWaterTemp] = useState<number>(selectedStation?.water_temp_c ?? 24.0);
  const [exposureScenario, setExposureScenario] = useState<ExposureScenario>('Crowded Holiday/Festival');

  useEffect(() => {
    if (selectedStation?.water_temp_c != null) {
      setWaterTemp(selectedStation.water_temp_c);
    }
  }, [selectedStation?.id]);

  // Baseline risk from selected station without silent fallback to 47
  const rawBaselineScore = selectedStation
    ? (selectedStation.current_risk_score ?? selectedStation.risk_score)
    : null;
  const hasBaselineRisk = rawBaselineScore != null && !isNaN(rawBaselineScore);
  const baselineRisk: number | null = hasBaselineRisk ? Math.round(rawBaselineScore!) : null;
  const baselineLevel: RiskLevel | null = hasBaselineRisk ? selectedStation!.current_risk_level : null;

  const { simulatedRisk, simulatedLevel, deltaShift, recommendation } = useMemo(() => {
    if (baselineRisk === null) {
      return {
        simulatedRisk: null,
        simulatedLevel: null,
        deltaShift: null,
        recommendation: selectedStation
          ? 'Baseline risk score is unrated for this station. A calibrated baseline observation is required before calculating what-if stress tests.'
          : 'Select a monitored station from the directory or map to simulate operational what-if scenarios.',
      };
    }

    // Weight factors
    let rainImpact = rainfallInc * 0.22;
    let stageImpact = stageDelta * 14.5;
    let dischargeImpact = dischargeInc * 0.18;
    let tempFactor = (28 - waterTemp) * 0.4;

    let exposureFactor = 0;
    if (exposureScenario === 'Crowded Holiday/Festival') exposureFactor = 12;
    else if (exposureScenario === 'Night Operations') exposureFactor = 9;
    else if (exposureScenario === 'Low Off-Peak') exposureFactor = -8;

    let computed = Math.round(baselineRisk + rainImpact + stageImpact + dischargeImpact + tempFactor + exposureFactor);
    let clamped = Math.min(100, Math.max(5, computed));
    let delta = clamped - baselineRisk;

    let level: RiskLevel = 'low';
    if (clamped >= 85) level = 'extreme';
    else if (clamped >= 70) level = 'high';
    else if (clamped >= 40) level = 'moderate';
    else level = 'low';

    let rec = '';
    if (clamped >= 85) {
      rec = 'Increase station watch frequency to 10 minutes and issue a riverbank access advisory.';
    } else if (clamped >= 70) {
      rec = 'Deploy field wardens to water ingress corridors and restrict recreational swimming.';
    } else if (clamped >= 40) {
      rec = 'Continue scheduled 30-minute automated telemetry sweeps and advisory surveillance.';
    } else {
      rec = 'Standard nominal operating protocol. Telemetry within safe discharge thresholds.';
    }

    return {
      simulatedRisk: clamped,
      simulatedLevel: level,
      deltaShift: delta,
      recommendation: rec,
    };
  }, [baselineRisk, selectedStation, rainfallInc, stageDelta, dischargeInc, waterTemp, exposureScenario]);

  const handleReset = () => {
    setRainfallInc(0);
    setStageDelta(0);
    setDischargeInc(0);
    setWaterTemp(selectedStation?.water_temp_c ?? 24.0);
    setExposureScenario('Normal Activity');
  };

  const levelColor =
    simulatedLevel === 'extreme'
      ? '#DC2626'
      : simulatedLevel === 'high'
      ? '#EA580C'
      : simulatedLevel === 'moderate'
      ? '#D97706'
      : '#16A34A';

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" id="what-if-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1677D2] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-lg text-[#172B4D]">
              Operational What-If Simulator
            </h3>
            {selectedStation && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1677D2] border border-blue-200">
                {selectedStation.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulate the operational risk response under sudden rainfall surges, stage rises, or festival crowds.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="btn-secondary text-xs self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Simulation</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. Rainfall increment */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 transition-colors hover:border-slate-300">
            <div className="flex justify-between items-center mb-1.5 text-xs">
              <span className="text-[#172B4D] font-bold">Rainfall increment: 0–150 mm</span>
              <span className="font-mono font-bold text-[#1677D2]">+{rainfallInc} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              step="1"
              value={rainfallInc}
              onChange={(e) => setRainfallInc(Number(e.target.value))}
              className="w-full accent-[#1677D2] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>0 mm (dry)</span>
              <span>75 mm (heavy downpour)</span>
              <span>150 mm (cloudburst)</span>
            </div>
          </div>

          {/* 2. River stage delta */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 transition-colors hover:border-slate-300">
            <div className="flex justify-between items-center mb-1.5 text-xs">
              <span className="text-[#172B4D] font-bold">River stage delta: -1.00 m to +3.00 m</span>
              <span className="font-mono font-bold text-[#1677D2]">
                {stageDelta >= 0 ? `+${stageDelta.toFixed(2)}` : stageDelta.toFixed(2)} m
              </span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="3.0"
              step="0.05"
              value={stageDelta}
              onChange={(e) => setStageDelta(Number(e.target.value))}
              className="w-full accent-[#1677D2] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>-1.00 m (receding)</span>
              <span>0.00 m (steady gauge)</span>
              <span>+3.00 m (extreme surge)</span>
            </div>
          </div>

          {/* 3. Discharge increment */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 transition-colors hover:border-slate-300">
            <div className="flex justify-between items-center mb-1.5 text-xs">
              <span className="text-[#172B4D] font-bold">Discharge increment: 0–100 m³/s</span>
              <span className="font-mono font-bold text-[#1677D2]">+{dischargeInc} m³/s</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={dischargeInc}
              onChange={(e) => setDischargeInc(Number(e.target.value))}
              className="w-full accent-[#1677D2] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>0 m³/s (nominal)</span>
              <span>50 m³/s (sluice spill)</span>
              <span>100 m³/s (high dam release)</span>
            </div>
          </div>

          {/* 4. Water temperature */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 transition-colors hover:border-slate-300">
            <div className="flex justify-between items-center mb-1.5 text-xs">
              <span className="text-[#172B4D] font-bold">Water temperature: 10–35 °C</span>
              <span className="font-mono font-bold text-[#1677D2]">{waterTemp.toFixed(1)} °C</span>
            </div>
            <input
              type="range"
              min="10"
              max="35"
              step="0.5"
              value={waterTemp}
              onChange={(e) => setWaterTemp(Number(e.target.value))}
              className="w-full accent-[#1677D2] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>10.0 °C (cold alpine runoff)</span>
              <span>24.0 °C (normal)</span>
              <span>35.0 °C (warm canal)</span>
            </div>
          </div>

          {/* 5. Human exposure scenario */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
            <span className="text-xs font-bold text-[#172B4D] block mb-2.5">
              Human Exposure Scenario:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  'Normal Activity',
                  'Low Off-Peak',
                  'Crowded Holiday/Festival',
                  'Night Operations',
                ] as ExposureScenario[]
              ).map((scen) => (
                <button
                  key={scen}
                  onClick={() => setExposureScenario(scen)}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                    exposureScenario === scen
                      ? 'btn-primary'
                      : 'btn-secondary text-[#24445A]'
                  }`}
                >
                  {scen}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results & Recommendation Output (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-2xs">
          <div className="text-xs font-bold uppercase text-[#1677D2] tracking-wider flex items-center space-x-1.5 pb-2.5 border-b border-slate-200">
            <Sparkles className="w-4 h-4 text-[#1677D2]" />
            <span>Simulation Comparison Output</span>
          </div>

          {/* Comparison Readout Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase block">
                Baseline risk
              </span>
              <div className="font-mono text-3xl font-extrabold text-[#172B4D] mt-1">
                {baselineRisk !== null ? baselineRisk : '—'}
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase mt-0.5 block">
                {baselineLevel || 'Unrated'}
              </span>
            </div>

            <div
              className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs"
              style={{ borderLeft: `4px solid ${levelColor}` }}
            >
              <span className="text-[11px] font-semibold text-slate-400 uppercase block">
                Simulated risk
              </span>
              <div className="font-mono text-3xl font-extrabold mt-1" style={{ color: levelColor }}>
                {simulatedRisk !== null ? simulatedRisk : '—'}
              </div>
              <span className="text-[11px] font-bold uppercase mt-0.5 block" style={{ color: levelColor }}>
                {simulatedLevel || 'Awaiting baseline'}
              </span>
            </div>
          </div>

          {/* Delta & Risk Shift Readout */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs font-medium shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Delta shift:</span>
              <span
                className={`font-mono font-bold ${
                  deltaShift === null
                    ? 'text-slate-500'
                    : deltaShift > 0
                    ? 'text-[#EA580C]'
                    : deltaShift < 0
                    ? 'text-[#16A34A]'
                    : 'text-slate-600'
                }`}
              >
                {deltaShift !== null
                  ? deltaShift > 0
                    ? `+${deltaShift} points`
                    : `${deltaShift} points`
                  : 'Unavailable'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-slate-500">Risk shift:</span>
              <div className="flex items-center space-x-1.5 font-bold uppercase">
                <span className="text-slate-600">{baselineLevel || 'Unrated'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span style={{ color: levelColor }}>
                  {simulatedLevel || 'Awaiting baseline'}
                </span>
              </div>
            </div>
          </div>

          {/* Plain-Language Operational Recommendation */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5 shadow-2xs">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#1677D2]">
              <CheckCircle2 className="w-4 h-4 text-[#1677D2]" />
              <span>Recommended Operational Response</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {recommendation}
            </p>
          </div>

          {/* Operational Guidance note */}
          <div className="text-[11px] text-slate-500 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed shadow-2xs">
            <span className="text-[#1677D2] font-bold block mb-1">Experimental Operational Stress-Test Tool</span>
            Real-time sensitivity response based on linear heuristic hydrologic factors (+0.22/mm rain, +14.5/m stage rise, +0.18/m³/s discharge, cold shock factor, and crowd exposure offset; score clamped 5–100). Exploratory scenario simulation tool, not a certified hydrodynamic forecast or individual drowning prediction.
          </div>
        </div>
      </div>
    </div>
  );
};
