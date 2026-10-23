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
    <div className="bg-[#1A1F22] border border-[#384145] rounded shadow-xs" id="exposure-risk-section">
      {/* Top Header Bar */}
      <div className="border-b border-[#384145] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#23292C]">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#3D8F91] font-semibold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3D8F91]" />
            <span>EXPOSURE RISK ASSESSMENT</span>
          </div>
          <h2 className="font-sans text-[20px] font-semibold text-[#E8E5DC] mt-0.5">
            {station.name}
          </h2>
          <div className="text-xs text-[#9BA5A5] font-mono flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
            <span className="capitalize">{station.type}</span>
            <span>·</span>
            <span>
              {(station.latitude ?? 0).toFixed(4)}° N, {(station.longitude ?? 0).toFixed(4)}° E
            </span>
            <span>·</span>
            <span>Elevation {station.elevation_m ?? station.elevation_meters ?? 0} m</span>
          </div>
        </div>

        <div className="flex flex-col sm:items-end text-xs font-mono text-[#9BA5A5]">
          <div className="flex items-center space-x-1.5">
            <span className="text-[#9BA5A5]">Station ID:</span>
            <span className="font-semibold text-[#E8E5DC] bg-[#1A1F22] px-1.5 py-0.5 rounded border border-[#384145]">
              {stationId}
            </span>
          </div>
          <div className="text-[10px] text-[#9BA5A5] mt-1 flex items-center space-x-1">
            <Clock className="w-3 h-3 text-[#9BA5A5]" />
            <span>Last verified: {lastVerified}</span>
          </div>
        </div>
      </div>

      {/* Weather and Telemetry Strip */}
      <div className="border-b border-[#384145] bg-[#111417]/70 px-4 py-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
        <div>
          <span className="text-[10px] font-mono uppercase text-[#9BA5A5] block">Rainfall rate</span>
          <span className="font-mono text-[#E8E5DC] font-medium">
            {(rainfallRate ?? 0).toFixed(1)} mm/h <span className="text-[#9BA5A5] font-sans">· {rainfallIntensity}</span>
          </span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-[#9BA5A5] block">Water temperature</span>
          <span className="font-mono text-[#E8E5DC] font-medium">{(waterTemp ?? 0).toFixed(1)} °C</span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-[#9BA5A5] block">Humidity</span>
          <span className="font-mono text-[#E8E5DC] font-medium">{humidity}%</span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-[#9BA5A5] block">Wind velocity</span>
          <span className="font-mono text-[#E8E5DC] font-medium">{(windVelocity ?? 0).toFixed(1)} km/h</span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-[#9BA5A5] block">Sensor array</span>
          <span className="font-mono text-[#3D8F91] font-semibold">{sensorArray}</span>
        </div>
      </div>

      {/* Main Content Grid: Gauge + Hydrology Model + Actions */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Composite Risk Gauge */}
        <div className="lg:col-span-4 bg-[#111417] border border-[#384145] rounded p-4 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between pb-2 border-b border-[#384145]">
            <span className="text-[11px] font-mono uppercase text-[#9BA5A5] font-semibold">
              Composite Risk Score
            </span>
            <OpsRiskBadge level={station.current_risk_level} size="sm" />
          </div>

          <RestrainedGauge
            score={station.current_risk_score ?? station.risk_score ?? 50}
            level={station.current_risk_level}
            confidence={confidence}
            size={160}
          />

          <div className="w-full text-[11px] font-mono text-[#9BA5A5] space-y-1 bg-[#1A1F22] border border-[#384145] p-2.5 rounded mt-2">
            <div className="flex justify-between">
              <span>Current Stage:</span>
              <span className="text-[#E8E5DC] font-semibold">
                {(station.current_water_level_m ?? station.depth_meters ?? 0).toFixed(2)} m
              </span>
            </div>
            <div className="flex justify-between">
              <span>Flow Velocity:</span>
              <span className="text-[#E8E5DC] font-semibold">
                {(station.flow_velocity_mps ?? (station.flow_rate_cms ? Number((station.flow_rate_cms * 0.4).toFixed(2)) : 0)).toFixed(2)} m/s
              </span>
            </div>
            <div className="flex justify-between">
              <span>Discharge:</span>
              <span className="text-[#E8E5DC] font-semibold">
                {(station.discharge_cms ?? station.flow_rate_cms ?? 0).toFixed(1)} m³/s
              </span>
            </div>
          </div>
        </div>

        {/* Center & Right Column: Composite Model & Directives */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          {/* Composite Hydrology Model Evidence Rows */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#9BA5A5] font-semibold flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-[#3D8F91]" />
              <span>Composite Hydrology Model Evidence</span>
            </div>

            {/* Row 1: Environmental hazard model */}
            <div className="p-3 rounded border border-[#384145] bg-[#23292C] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-sans font-semibold text-xs text-[#E8E5DC]">
                    Environmental hazard model
                  </span>
                  <span className="font-mono text-[10px] bg-[#1A1F22] text-[#3D8F91] px-1.5 py-0.5 rounded border border-[#384145]">
                    Random Forest
                  </span>
                </div>
                <div className="text-[11px] text-[#9BA5A5] font-sans mt-0.5">
                  Kerala hydrological records · 1991–2025
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-[#9BA5A5] font-mono uppercase block">Score</span>
                <span className="font-mono text-base font-semibold text-[#E8E5DC]">
                  {envScore.toFixed(1)} <span className="text-xs text-[#9BA5A5]">/ 100</span>
                </span>
              </div>
            </div>

            {/* Row 2: Hydrodynamic vulnerability */}
            <div className="p-3 rounded border border-[#384145] bg-[#23292C] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-sans font-semibold text-xs text-[#E8E5DC]">
                    Hydrodynamic vulnerability
                  </span>
                  <span className="font-mono text-[10px] bg-[#1A1F22] text-[#3D8F91] px-1.5 py-0.5 rounded border border-[#384145]">
                    Flow physics
                  </span>
                </div>
                <div className="text-[11px] text-[#9BA5A5] font-sans mt-0.5">
                  Velocity, stage depth, undertow &amp; bank slope
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-[#9BA5A5] font-mono uppercase block">Score</span>
                <span className="font-mono text-base font-semibold text-[#E8E5DC]">
                  {hydroScore.toFixed(1)} <span className="text-xs text-[#9BA5A5]">/ 100</span>
                </span>
              </div>
            </div>
          </div>

          {/* Primary Hazard Drivers */}
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#9BA5A5] font-semibold block mb-1.5">
              Primary Hazard Drivers
            </span>
            <div className="flex flex-wrap gap-1.5">
              {hazardDrivers.map((driver, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded border border-[#384145] bg-[#23292C] text-[#E8E5DC] text-[11px] font-mono font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C96A50]" />
                  <span>{driver}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Operational Recommended Action Section */}
          <div className="border border-[#384145] pt-3 bg-[#23292C] p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#C5A66A] font-semibold flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#C99A45]" />
                <span>RECOMMENDED ACTION</span>
              </div>
              <span className="text-[10px] font-mono text-[#9BA5A5]">
                Standard Operating Procedure SOP-KL-03
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              {recommendedActions.map((directive, idx) => (
                <div
                  key={idx}
                  className="bg-[#1A1F22] border border-[#384145] rounded p-2 text-xs flex items-start space-x-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3D8F91] shrink-0 mt-0.5" />
                  <span className="text-[#E8E5DC] font-medium leading-tight">{directive}</span>
                </div>
              ))}
            </div>

            {/* Action Trigger Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#384145]">
              <span className="text-[11px] text-[#9BA5A5]">
                Execute real-time hydrological stress test on this station:
              </span>
              <button
                onClick={() => onRunScenario(station)}
                className="inline-flex items-center space-x-1.5 bg-[#3D8F91] hover:bg-[#4CA1A3] text-[#111417] text-xs font-sans font-semibold px-3.5 py-1.5 rounded transition-colors shadow-xs cursor-pointer"
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
