import React, { useState, useMemo, useEffect } from 'react';
import { Sliders, RefreshCw, ArrowRight, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
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
      ? '#D12F3B'
      : simulatedLevel === 'high'
      ? '#D9631E'
      : simulatedLevel === 'moderate'
      ? '#C79A12'
      : '#17895C';

  return (
    <div className="bg-[#84B3CE] rounded-xl p-5 shadow-xs" id="what-if-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#6A9AB6] gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-[#0B3F5A]" style={{ strokeWidth: 1.5 }} />
            <h3 className="font-sans font-semibold text-[18px] text-[#082536]">
              Operational What-If
            </h3>
            {selectedStation && (
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-[#F5EEDD] text-[#082536] border border-[#6A9AB6]">
                {selectedStation.name}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#134059] font-sans mt-0.5">
            Review the next-hour operating condition.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="inline-flex items-center space-x-1 text-xs font-mono text-[#134059] hover:text-[#0B3F5A] p-1 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset simulation</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 items-start">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. Rainfall increment */}
          <div className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-xl p-3.5">
            <div className="flex justify-between items-center mb-1 text-xs font-mono">
              <span className="text-[#082536] font-semibold">Rainfall increment: 0–150 mm</span>
              <span className="text-[#0B3F5A] font-bold">+{rainfallInc} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              step="1"
              value={rainfallInc}
              onChange={(e) => setRainfallInc(Number(e.target.value))}
              className="w-full accent-[#0B3F5A] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#134059] mt-1">
              <span>0 mm (dry)</span>
              <span>75 mm (heavy)</span>
              <span>150 mm (torrential cloudburst)</span>
            </div>
          </div>

          {/* 2. River stage delta */}
          <div className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-xl p-3.5">
            <div className="flex justify-between items-center mb-1 text-xs font-mono">
              <span className="text-[#082536] font-semibold">River stage delta: -1.00 m to +3.00 m</span>
              <span className="text-[#0B3F5A] font-bold">
                {stageDelta >= 0 ? `+${stageDelta.toFixed(2)}` : stageDelta.toFixed(2)} m
              </span>
            </div>
            <input
              type="range"
              min="-1.00"
              max="3.00"
              step="0.05"
              value={stageDelta}
              onChange={(e) => setStageDelta(Number(e.target.value))}
              className="w-full accent-[#0B3F5A] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#134059] mt-1">
              <span>-1.00 m (drop)</span>
              <span>0.00 m (stable)</span>
              <span>+3.00 m (flash surge breach)</span>
            </div>
          </div>

          {/* 3. River discharge increment */}
          <div className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-xl p-3.5">
            <div className="flex justify-between items-center mb-1 text-xs font-mono">
              <span className="text-[#082536] font-semibold">River discharge increment: 0–100 m³/s</span>
              <span className="text-[#0B3F5A] font-bold">+{dischargeInc} m³/s</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={dischargeInc}
              onChange={(e) => setDischargeInc(Number(e.target.value))}
              className="w-full accent-[#0B3F5A] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#134059] mt-1">
              <span>0 m³/s</span>
              <span>50 m³/s</span>
              <span>100 m³/s (high dam release)</span>
            </div>
          </div>

          {/* 4. Water temperature */}
          <div className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-xl p-3.5">
            <div className="flex justify-between items-center mb-1 text-xs font-mono">
              <span className="text-[#082536] font-semibold">Water temperature: 10–35 °C</span>
              <span className="text-[#0B3F5A] font-bold">{waterTemp.toFixed(1)} °C</span>
            </div>
            <input
              type="range"
              min="10"
              max="35"
              step="0.5"
              value={waterTemp}
              onChange={(e) => setWaterTemp(Number(e.target.value))}
              className="w-full accent-[#0B3F5A] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#134059] mt-1">
              <span>10.0 °C (cold alpine runoff)</span>
              <span>24.0 °C (normal)</span>
              <span>35.0 °C (warm canal)</span>
            </div>
          </div>

          {/* 5. Human exposure scenario */}
          <div className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-xl p-3.5">
            <span className="text-xs font-mono text-[#082536] font-semibold block mb-2">
              Human exposure scenario:
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
                  className={`p-2 rounded-lg text-left border text-[11px] font-mono transition-colors cursor-pointer ${
                    exposureScenario === scen
                      ? 'bg-[#0B3F5A] border-[#0B3F5A] text-[#F5EEDD] font-semibold'
                      : 'bg-[#F5EEDD] border-[#6A9AB6] text-[#0F3A52] hover:bg-[#EAE0CA]'
                  }`}
                >
                  {scen}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results & Recommendation Output (5 cols) */}
        <div className="lg:col-span-5 bg-[#F5EEDD] border border-[#6A9AB6] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="text-[11px] font-mono uppercase text-[#0B3F5A] font-semibold tracking-wider flex items-center space-x-1.5 pb-2 border-b border-[#6A9AB6]">
            <Sparkles className="w-3.5 h-3.5 text-[#0B3F5A]" />
            <span>Simulation Comparison Output</span>
          </div>

          {/* Comparison readout cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#84B3CE]/20 border border-[#6A9AB6] rounded-lg p-3">
              <span className="text-[10px] font-mono text-[#134059] uppercase block">
                Baseline risk
              </span>
              <div className="font-mono text-2xl font-bold text-[#082536] mt-1">
                {baselineRisk !== null ? baselineRisk : '—'}
              </div>
              <span className="text-[10px] font-mono text-[#134059] uppercase">
                {baselineLevel || 'Unrated'}
              </span>
            </div>

            <div
              className="bg-[#84B3CE]/20 border border-[#6A9AB6] rounded-lg p-3"
              style={{ borderLeft: `3px solid ${levelColor}` }}
            >
              <span className="text-[10px] font-mono text-[#134059] uppercase block">
                Simulated risk
              </span>
              <div className="font-mono text-2xl font-bold mt-1" style={{ color: levelColor }}>
                {simulatedRisk !== null ? simulatedRisk : '—'}
              </div>
              <span className="text-[10px] font-mono uppercase font-semibold" style={{ color: levelColor }}>
                {simulatedLevel || 'Awaiting baseline'}
              </span>
            </div>
          </div>

          {/* Delta & Risk Shift Readout */}
          <div className="bg-[#84B3CE]/20 border border-[#6A9AB6] rounded-lg p-3 space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-[#134059]">Delta shift:</span>
              <span
                className={`font-bold ${
                  deltaShift === null
                    ? 'text-[#134059]'
                    : deltaShift > 0
                    ? 'text-[#D9631E]'
                    : deltaShift < 0
                    ? 'text-[#17895C]'
                    : 'text-[#134059]'
                }`}
              >
                {deltaShift !== null
                  ? deltaShift > 0
                    ? `+${deltaShift} points`
                    : `${deltaShift} points`
                  : 'Unavailable'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-[#6A9AB6]">
              <span className="text-[#134059]">Risk shift:</span>
              <div className="flex items-center space-x-1.5 font-bold uppercase">
                <span className="text-[#134059]">{baselineLevel || 'Unrated'}</span>
                <ArrowRight className="w-3 h-3 text-[#0B3F5A]" />
                <span style={{ color: levelColor }}>
                  {simulatedLevel || 'Awaiting baseline'}
                </span>
              </div>
            </div>
          </div>

          {/* Plain-Language Operational Recommendation */}
          <div className="bg-[#84B3CE]/20 border border-[#6A9AB6] rounded-lg p-3 space-y-1.5">
            <div className="flex items-center space-x-1.5 text-[11px] font-sans font-semibold text-[#0B3F5A]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0B3F5A]" />
              <span>Recommended action</span>
            </div>
            <p className="text-xs text-[#082536] leading-relaxed font-sans font-medium">
              {recommendation}
            </p>
          </div>

          {/* Operational Guidance note */}
          <div className="text-[10px] font-mono text-[#134059] bg-[#84B3CE]/30 p-2.5 rounded-lg border border-[#6A9AB6] leading-relaxed">
            <span className="text-[#0B3F5A] font-semibold block mb-0.5">Experimental Operational Stress-Test Tool</span>
            Real-time sensitivity response based on linear heuristic hydrologic factors (+0.22/mm rain, +14.5/m stage rise, +0.18/m³/s discharge, cold shock factor, and crowd exposure offset; score clamped 5–100). Exploratory scenario simulation tool, not a certified hydrodynamic forecast or individual drowning prediction.
          </div>
        </div>
      </div>
    </div>
  );
};
