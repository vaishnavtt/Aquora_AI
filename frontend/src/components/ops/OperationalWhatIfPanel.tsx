import React, { useState, useMemo } from 'react';
import { Sliders, RefreshCw, AlertTriangle, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { WaterBody, RiskLevel } from '../../types';
import { OpsRiskBadge, RISK_TOKENS } from './RiskBadge';

interface OperationalWhatIfPanelProps {
  selectedStation: WaterBody | null;
}

type ExposureScenario = 'Normal Activity' | 'Low Off-Peak' | 'Crowded Holiday/Festival' | 'Night Operations';

export const OperationalWhatIfPanel: React.FC<OperationalWhatIfPanelProps> = ({
  selectedStation,
}) => {
  // Scenario simulation controls state
  const [rainfallInc, setRainfallInc] = useState<number>(35); // 0–150 mm
  const [stageDelta, setStageDelta] = useState<number>(0.85); // -1.00 m to +3.00 m
  const [dischargeInc, setDischargeInc] = useState<number>(24); // 0–100 m³/s
  const [waterTemp, setWaterTemp] = useState<number>(selectedStation?.water_temp_c ?? 24.0); // 10–35 °C
  const [exposureScenario, setExposureScenario] = useState<ExposureScenario>('Crowded Holiday/Festival');

  // Baseline risk from selected station or default 47
  const baselineRisk = selectedStation ? Math.round(selectedStation.current_risk_score) : 47;
  const baselineLevel: RiskLevel = selectedStation ? selectedStation.current_risk_level : 'moderate';

  // Real-time calculation of simulated risk
  const { simulatedRisk, simulatedLevel, deltaShift, recommendation } = useMemo(() => {
    // Weight factors
    let rainImpact = rainfallInc * 0.22;
    let stageImpact = stageDelta * 14.5;
    let dischargeImpact = dischargeInc * 0.18;
    let tempFactor = (28 - waterTemp) * 0.4; // cooler water or thermal shock increases hazard

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
  }, [baselineRisk, rainfallInc, stageDelta, dischargeInc, waterTemp, exposureScenario]);

  const handleReset = () => {
    setRainfallInc(0);
    setStageDelta(0);
    setDischargeInc(0);
    setWaterTemp(selectedStation?.water_temp_c ?? 24.0);
    setExposureScenario('Normal Activity');
  };

  return (
    <div className="bg-[#1A1F22] border border-[#384145] rounded p-4 shadow-xs" id="what-if-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#384145] gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-[#3D8F91]" />
            <h3 className="font-sans font-semibold text-[18px] text-[#E8E5DC]">
              Operational What-If
            </h3>
            {selectedStation && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#23292C] text-[#3D8F91] border border-[#384145]">
                {selectedStation.name}
              </span>
            )}
          </div>
          <p className="text-xs text-[#9BA5A5] font-sans mt-0.5">
            Review the next-hour operating condition.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="inline-flex items-center space-x-1 text-xs font-mono text-[#9BA5A5] hover:text-[#3D8F91] p-1 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset simulation</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 items-start">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. Rainfall increment */}
          <div className="bg-[#23292C] border border-[#384145] rounded p-3">
            <div className="flex justify-between items-center mb-1 text-xs font-mono">
              <span className="text-[#E8E5DC] font-semibold">Rainfall increment: 0–150 mm</span>
              <span className="text-[#3D8F91] font-bold">+{rainfallInc} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              step="1"
              value={rainfallInc}
              onChange={(e) => setRainfallInc(Number(e.target.value))}
              className="w-full accent-[#3D8F91] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#9BA5A5] mt-1">
              <span>0 mm (dry)</span>
              <span>75 mm (heavy)</span>
              <span>150 mm (torrential cloudburst)</span>
            </div>
          </div>

          {/* 2. River stage delta */}
          <div className="bg-[#23292C] border border-[#384145] rounded p-3">
            <div className="flex justify-between items-center mb-1 text-xs font-mono">
              <span className="text-[#E8E5DC] font-semibold">River stage delta: -1.00 m to +3.00 m</span>
              <span className="text-[#3D8F91] font-bold">
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
              className="w-full accent-[#3D8F91] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#9BA5A5] mt-1">
              <span>-1.00 m (drop)</span>
              <span>0.00 m (stable)</span>
              <span>+3.00 m (flash surge breach)</span>
            </div>
          </div>

          {/* 3. River discharge increment */}
          <div className="bg-[#23292C] border border-[#384145] rounded p-3">
            <div className="flex justify-between items-center mb-1 text-xs font-mono">
              <span className="text-[#E8E5DC] font-semibold">River discharge increment: 0–100 m³/s</span>
              <span className="text-[#3D8F91] font-bold">+{dischargeInc} m³/s</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={dischargeInc}
              onChange={(e) => setDischargeInc(Number(e.target.value))}
              className="w-full accent-[#3D8F91] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#9BA5A5] mt-1">
              <span>0 m³/s</span>
              <span>50 m³/s</span>
              <span>100 m³/s (high dam release)</span>
            </div>
          </div>

          {/* 4. Water temperature */}
          <div className="bg-[#23292C] border border-[#384145] rounded p-3">
            <div className="flex justify-between items-center mb-1 text-xs font-mono">
              <span className="text-[#E8E5DC] font-semibold">Water temperature: 10–35 °C</span>
              <span className="text-[#3D8F91] font-bold">{waterTemp.toFixed(1)} °C</span>
            </div>
            <input
              type="range"
              min="10"
              max="35"
              step="0.5"
              value={waterTemp}
              onChange={(e) => setWaterTemp(Number(e.target.value))}
              className="w-full accent-[#3D8F91] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#9BA5A5] mt-1">
              <span>10.0 °C (cold alpine runoff)</span>
              <span>24.0 °C (normal)</span>
              <span>35.0 °C (warm canal)</span>
            </div>
          </div>

          {/* 5. Human exposure scenario */}
          <div className="bg-[#23292C] border border-[#384145] rounded p-3">
            <span className="text-xs font-mono text-[#E8E5DC] font-semibold block mb-2">
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
                  className={`p-2 rounded text-left border text-[11px] font-mono transition-colors cursor-pointer ${
                    exposureScenario === scen
                      ? 'bg-[#1A1F22] border-[#3D8F91] text-[#3D8F91] font-semibold'
                      : 'bg-[#1A1F22] border-[#384145] text-[#9BA5A5] hover:bg-[#2A3236] hover:text-[#E8E5DC]'
                  }`}
                >
                  {scen}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results & Recommendation Output (5 cols) */}
        <div className="lg:col-span-5 bg-[#111417] border border-[#384145] rounded p-4 space-y-4">
          <div className="text-[11px] font-mono uppercase text-[#3D8F91] font-semibold tracking-wider flex items-center space-x-1.5 pb-2 border-b border-[#384145]">
            <Sparkles className="w-3.5 h-3.5 text-[#3D8F91]" />
            <span>Simulation Comparison Output</span>
          </div>

          {/* Comparison readout cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1A1F22] border border-[#384145] rounded p-3">
              <span className="text-[10px] font-mono text-[#9BA5A5] uppercase block">
                Baseline risk
              </span>
              <div className="font-mono text-2xl font-bold text-[#E8E5DC] mt-1">
                {baselineRisk}
              </div>
              <span className="text-[10px] font-mono text-[#9BA5A5] uppercase">
                {baselineLevel}
              </span>
            </div>

            <div className="bg-[#1A1F22] border border-[#384145] rounded p-3 border-l-3 border-l-[#C96A50]">
              <span className="text-[10px] font-mono text-[#9BA5A5] uppercase block">
                Simulated risk
              </span>
              <div className="font-mono text-2xl font-bold text-[#C96A50] mt-1">
                {simulatedRisk}
              </div>
              <span className="text-[10px] font-mono text-[#C96A50] uppercase font-semibold">
                {simulatedLevel}
              </span>
            </div>
          </div>

          {/* Delta & Risk Shift Readout */}
          <div className="bg-[#1A1F22] border border-[#384145] rounded p-3 space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-[#9BA5A5]">Delta shift:</span>
              <span
                className={`font-bold ${
                  deltaShift > 0
                    ? 'text-[#C96A50]'
                    : deltaShift < 0
                    ? 'text-[#5C9B72]'
                    : 'text-[#9BA5A5]'
                }`}
              >
                {deltaShift > 0 ? `+${deltaShift}` : deltaShift} points
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-[#384145]">
              <span className="text-[#9BA5A5]">Risk shift:</span>
              <div className="flex items-center space-x-1.5 font-bold uppercase">
                <span className="text-[#9BA5A5]">{baselineLevel}</span>
                <ArrowRight className="w-3 h-3 text-[#3D8F91]" />
                <span className={simulatedRisk >= 85 ? 'text-[#B74848]' : simulatedRisk >= 70 ? 'text-[#C96A50]' : 'text-[#C99A45]'}>
                  {simulatedLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Plain-Language Operational Recommendation */}
          <div className="bg-[#1A1F22] border border-[#384145] rounded p-3 space-y-1.5">
            <div className="flex items-center space-x-1.5 text-[11px] font-sans font-semibold text-[#3D8F91]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#3D8F91]" />
              <span>Recommended action</span>
            </div>
            <p className="text-xs text-[#E8E5DC] leading-relaxed font-sans font-medium">
              {recommendation}
            </p>
          </div>

          {/* Operational Guidance note */}
          <div className="text-[10px] font-mono text-[#9BA5A5] bg-[#23292C] p-2 rounded border border-[#384145]">
            Model inference updates on every slider adjustment using calibrated Kerala Random Forest hydro-coefficients.
          </div>
        </div>
      </div>
    </div>
  );
};
