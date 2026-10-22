import React from 'react';
import {
  ShieldAlert,
  Thermometer,
  CloudRain,
  Wind,
  Droplets,
  Cpu,
  Layers,
  AlertTriangle,
  PlayCircle,
  Clock,
  Compass,
  CheckCircle2,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { WaterBody } from '../../types';
import { RestrainedGauge } from './RestrainedGauge';
import { OpsRiskBadge } from './RiskBadge';

interface ExposureRiskPanelProps {
  station: WaterBody;
  onRunScenario: (station: WaterBody) => void;
}

export const ExposureRiskPanel: React.FC<ExposureRiskPanelProps> = ({
  station,
  onRunScenario,
}) => {
  const stationId = station.station_id || 'KA-04';
  const lastVerified = station.last_verified || '13:24:08 IST';
  const rainfallRate = station.rainfall_rate_mmh ?? 18.5;
  const rainfallIntensity = station.rainfall_intensity ?? 'Heavy';
  const waterTemp = station.water_temp_c ?? 24.2;
  const humidity = station.humidity_pct ?? 88;
  const windVelocity = station.wind_kmh ?? 14.2;
  const sensorArray = station.sensor_array || stationId;
  const confidence = station.model_confidence ?? 94.2;
  const envScore = station.env_hazard_score ?? 84.0;
  const hydroScore = station.hydrodynamic_score ?? 96.7;

  const hazardDrivers = station.primary_hazards && station.primary_hazards.length > 0
    ? station.primary_hazards
    : [
        'Rapid water level surge +0.28 m/h',
        'Extreme discharge velocity 2.45 m/s',
        'Bank slope slippage index 0.81',
      ];

  const recommendedActions = station.recommended_actions && station.recommended_actions.length > 0
    ? station.recommended_actions
    : [
        'Evacuate immediate riverbanks',
        'Swimming & wading prohibited',
        'Review access restrictions before 14:00 IST',
      ];

  return (
    <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded shadow-xs" id="exposure-risk-section">
      {/* Top Header Bar */}
      <div className="border-b border-[#D2DDDA] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FAFBF9]">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#125B61] font-semibold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#197F80]" />
            <span>EXPOSURE RISK ASSESSMENT</span>
          </div>
          <h2 className="font-sans text-[20px] font-semibold text-[#203235] mt-0.5">
            {station.name}
          </h2>
          <div className="text-xs text-[#667678] font-mono flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
            <span className="capitalize">{station.type}</span>
            <span>·</span>
            <span>
              {station.latitude.toFixed(4)}° N, {station.longitude.toFixed(4)}° E
            </span>
            <span>·</span>
            <span>Elevation {station.elevation_m} m</span>
          </div>
        </div>

        <div className="flex flex-col sm:items-end text-xs font-mono text-[#667678]">
          <div className="flex items-center space-x-1.5">
            <span className="text-[#82908F]">Station ID:</span>
            <span className="font-semibold text-[#203235] bg-[#E8EFEC] px-1.5 py-0.5 rounded border border-[#D2DDDA]">
              {stationId}
            </span>
          </div>
          <div className="text-[10px] text-[#82908F] mt-1 flex items-center space-x-1">
            <Clock className="w-3 h-3 text-[#82908F]" />
            <span>Last verified: {lastVerified}</span>
          </div>
        </div>
      </div>

      {/* Weather and Telemetry Strip */}
      <div className="border-b border-[#D2DDDA] bg-[#E8EFEC]/60 px-4 py-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
        <div>
          <span className="text-[10px] font-mono uppercase text-[#667678] block">Rainfall rate</span>
          <span className="font-mono text-[#203235] font-medium">
            {rainfallRate.toFixed(1)} mm/h <span className="text-[#82908F] font-sans">· {rainfallIntensity}</span>
          </span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-[#667678] block">Water temperature</span>
          <span className="font-mono text-[#203235] font-medium">{waterTemp.toFixed(1)} °C</span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-[#667678] block">Humidity</span>
          <span className="font-mono text-[#203235] font-medium">{humidity}%</span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-[#667678] block">Wind velocity</span>
          <span className="font-mono text-[#203235] font-medium">{windVelocity.toFixed(1)} km/h</span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-[#667678] block">Sensor array</span>
          <span className="font-mono text-[#125B61] font-semibold">{sensorArray}</span>
        </div>
      </div>

      {/* Main Content Grid: Gauge + Hydrology Model + Actions */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Composite Risk Gauge */}
        <div className="lg:col-span-4 bg-[#F3F5F1] border border-[#D2DDDA] rounded p-4 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between pb-2 border-b border-[#D2DDDA]">
            <span className="text-[11px] font-mono uppercase text-[#667678] font-semibold">
              Composite Risk Score
            </span>
            <OpsRiskBadge level={station.current_risk_level} size="sm" />
          </div>

          <RestrainedGauge
            score={station.current_risk_score}
            level={station.current_risk_level}
            confidence={confidence}
            size={160}
          />

          <div className="w-full text-[11px] font-mono text-[#667678] space-y-1 bg-[#FFFFFF] border border-[#D2DDDA] p-2.5 rounded mt-2">
            <div className="flex justify-between">
              <span>Current Stage:</span>
              <span className="text-[#203235] font-semibold">{station.current_water_level_m.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between">
              <span>Flow Velocity:</span>
              <span className="text-[#203235] font-semibold">{station.flow_velocity_mps.toFixed(2)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span>Discharge:</span>
              <span className="text-[#203235] font-semibold">{station.discharge_cms.toFixed(1)} m³/s</span>
            </div>
          </div>
        </div>

        {/* Center & Right Column: Composite Model & Directives */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          {/* Composite Hydrology Model Evidence Rows */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#667678] font-semibold flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-[#197F80]" />
              <span>Composite Hydrology Model Evidence</span>
            </div>

            {/* Row 1: Environmental hazard model */}
            <div className="p-3 rounded border border-[#D2DDDA] bg-[#FFFFFF] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-sans font-semibold text-xs text-[#203235]">
                    Environmental hazard model
                  </span>
                  <span className="font-mono text-[10px] bg-[#E8EFEC] text-[#125B61] px-1.5 py-0.2 rounded border border-[#D2DDDA]">
                    Random Forest
                  </span>
                </div>
                <div className="text-[11px] text-[#667678] font-sans mt-0.5">
                  Kerala hydrological records · 1991–2025
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-[#82908F] font-mono uppercase block">Score</span>
                <span className="font-mono text-base font-semibold text-[#203235]">
                  {envScore.toFixed(1)} <span className="text-xs text-[#82908F]">/ 100</span>
                </span>
              </div>
            </div>

            {/* Row 2: Hydrodynamic vulnerability */}
            <div className="p-3 rounded border border-[#D2DDDA] bg-[#FFFFFF] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-sans font-semibold text-xs text-[#203235]">
                    Hydrodynamic vulnerability
                  </span>
                  <span className="font-mono text-[10px] bg-[#E8EFEC] text-[#125B61] px-1.5 py-0.2 rounded border border-[#D2DDDA]">
                    Flow physics
                  </span>
                </div>
                <div className="text-[11px] text-[#667678] font-sans mt-0.5">
                  Velocity, stage depth, undertow &amp; bank slope
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-[#82908F] font-mono uppercase block">Score</span>
                <span className="font-mono text-base font-semibold text-[#203235]">
                  {hydroScore.toFixed(1)} <span className="text-xs text-[#82908F]">/ 100</span>
                </span>
              </div>
            </div>
          </div>

          {/* Primary Hazard Drivers */}
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#667678] font-semibold block mb-1.5">
              Primary Hazard Drivers
            </span>
            <div className="flex flex-wrap gap-1.5">
              {hazardDrivers.map((driver, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded border border-[#D2DDDA] bg-[#FAFBF9] text-[#203235] text-[11px] font-mono font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8644D]" />
                  <span>{driver}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Operational Recommended Action Section */}
          <div className="border-t border-[#D2DDDA] pt-3 bg-[#FAFBF9] p-3 rounded border">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#125B61] font-semibold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-[#B98225]" />
                <span>RECOMMENDED ACTION</span>
              </div>
              <span className="text-[10px] font-mono text-[#82908F]">
                Standard Operating Procedure SOP-KL-03
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              {recommendedActions.map((directive, idx) => (
                <div
                  key={idx}
                  className="bg-[#FFFFFF] border border-[#D2DDDA] rounded p-2 text-xs flex items-start space-x-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#197F80] shrink-0 mt-0.5" />
                  <span className="text-[#203235] font-medium leading-tight">{directive}</span>
                </div>
              ))}
            </div>

            {/* Action Trigger Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#667678]">
                Execute real-time hydrological stress test on this station:
              </span>
              <button
                onClick={() => onRunScenario(station)}
                className="inline-flex items-center space-x-1.5 bg-[#125B61] hover:bg-[#197F80] text-white text-xs font-sans font-medium px-3.5 py-1.5 rounded transition-colors shadow-xs cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Run operational scenario</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
