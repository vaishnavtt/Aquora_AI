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
  const stationId = station.station_id || `ID-${station.id}`;
  const lastVerified = station.last_verified || 'Telemetry Active';
  const rainfallRate = station.rainfall_rate_mmh ?? null;
  const rainfallIntensity = station.rainfall_intensity ?? (rainfallRate != null ? 'Observed' : 'Unrecorded');
  const waterTemp = station.water_temp_c ?? null;
  const humidity = station.humidity_pct ?? null;
  const windVelocity = station.wind_kmh ?? null;
  const sensorArray = station.sensor_array || (station.station_id ? `${station.station_id}-ARRAY` : 'Node Array');
  const confidence = station.model_confidence ?? null;
  const envScore = station.env_hazard_score ?? null;
  const hydroScore = station.hydrodynamic_score ?? null;

  const hazardDrivers = station.primary_hazards && station.primary_hazards.length > 0
    ? station.primary_hazards
    : station.current_risk_level === 'extreme' || station.current_risk_level === 'high'
    ? [
        'Elevated hydrological risk profile',
        'Active telemetry monitoring underway',
      ]
    : [
        'Nominal baseline parameters',
        'No critical hazard breach detected',
      ];

  const recommendedActions = station.recommended_actions && station.recommended_actions.length > 0
    ? station.recommended_actions
    : station.current_risk_level === 'extreme'
    ? [
        'Restrict immediate shoreline entry',
        'Verify downstream access controls',
        'Maintain continuous watch',
      ]
    : station.current_risk_level === 'high'
    ? [
        'Deploy field caution notices',
        'Monitor stage sensors closely',
      ]
    : [
        'Continue routine telemetry sweeps',
        'Standard water-safety guidelines active',
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
              {station.latitude != null && station.longitude != null
                ? `${station.latitude.toFixed(4)}° N, ${station.longitude.toFixed(4)}° E`
                : 'Coordinates Unavailable'}
            </span>
            <span>·</span>
            <span>
              {station.elevation_m != null
                ? `Elevation ${station.elevation_m} m`
                : station.elevation_meters != null
                ? `Elevation ${station.elevation_meters} m`
                : 'Elevation Unavailable'}
            </span>
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
            {rainfallRate != null ? (
              <>
                {rainfallRate.toFixed(1)} mm/h <span className="text-[#9BA5A5] font-sans">· {rainfallIntensity}</span>
              </>
            ) : (
              <span className="text-[#9BA5A5]">Unrecorded</span>
            )}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-[#9BA5A5] block">Water temperature</span>
          <span className="font-mono text-[#E8E5DC] font-medium">
            {waterTemp != null ? `${waterTemp.toFixed(1)} °C` : <span className="text-[#9BA5A5]">Unavailable</span>}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-[#9BA5A5] block">Humidity</span>
          <span className="font-mono text-[#E8E5DC] font-medium">
            {humidity != null ? `${humidity}%` : <span className="text-[#9BA5A5]">Unavailable</span>}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-[#9BA5A5] block">Wind velocity</span>
          <span className="font-mono text-[#E8E5DC] font-medium">
            {windVelocity != null ? `${windVelocity.toFixed(1)} km/h` : <span className="text-[#9BA5A5]">Unavailable</span>}
          </span>
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
            score={station.current_risk_score ?? station.risk_score ?? null}
            level={station.current_risk_level}
            confidence={confidence}
            size={160}
          />

          <div className="w-full text-[11px] font-mono text-[#9BA5A5] space-y-1 bg-[#1A1F22] border border-[#384145] p-2.5 rounded mt-2">
            <div className="flex justify-between">
              <span>Current Stage:</span>
              <span className="text-[#E8E5DC] font-semibold">
                {station.current_water_level_m != null
                  ? `${station.current_water_level_m.toFixed(2)} m`
                  : station.depth_meters != null
                  ? `${station.depth_meters.toFixed(2)} m`
                  : 'Unavailable'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Flow Velocity:</span>
              <span className="text-[#E8E5DC] font-semibold">
                {station.flow_velocity_mps != null
                  ? `${station.flow_velocity_mps.toFixed(2)} m/s`
                  : 'Not Monitored'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Discharge:</span>
              <span className="text-[#E8E5DC] font-semibold">
                {station.discharge_cms != null
                  ? `${station.discharge_cms.toFixed(1)} m³/s`
                  : station.flow_rate_cms != null
                  ? `${station.flow_rate_cms.toFixed(1)} m³/s`
                  : 'Not Monitored'}
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
                  {envScore != null ? (
                    <>
                      {envScore.toFixed(1)} <span className="text-xs text-[#9BA5A5]">/ 100</span>
                    </>
                  ) : (
                    <span className="text-xs text-[#9BA5A5]">Uncalibrated</span>
                  )}
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
                  {hydroScore != null ? (
                    <>
                      {hydroScore.toFixed(1)} <span className="text-xs text-[#9BA5A5]">/ 100</span>
                    </>
                  ) : (
                    <span className="text-xs text-[#9BA5A5]">Uncalibrated</span>
                  )}
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
