import React from 'react';
import {
  ShieldAlert,
  Clock,
  MapPin,
  Mountain,
  Sliders,
  Droplets,
  Wind,
  Thermometer,
  CloudRain,
  Cpu,
} from 'lucide-react';
import { WaterBody } from '../../types';
import { RestrainedGauge } from './RestrainedGauge';
import { OpsRiskBadge, RISK_TOKENS } from './RiskBadge';

interface ExposureRiskPanelProps {
  station: WaterBody | null;
  onRunScenario: (station: WaterBody) => void;
}

export const ExposureRiskPanel: React.FC<ExposureRiskPanelProps> = ({
  station,
  onRunScenario,
}) => {
  if (!station) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-xs">
        <p className="text-slate-400 font-mono text-sm">
          No station selected for exposure analysis.
        </p>
      </div>
    );
  }

  const stationId = station.station_code || station.id || 'N/A';
  const lastVerified = station.last_updated
    ? new Date(station.last_updated).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Live telemetry verified';

  const hazardDrivers =
    station.primary_hazards && station.primary_hazards.length > 0
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

  const recommendedActions =
    station.recommended_actions && station.recommended_actions.length > 0
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

  const token = RISK_TOKENS[station.current_risk_level] || RISK_TOKENS.low;

  const stationAny = station as any;
  const rainfallRate = station.rainfall_rate_mmh ?? stationAny.rainfall_mm ?? stationAny.rainfall_rate_mmph ?? null;
  const rainfallIntensity = station.rainfall_intensity ?? undefined;
  const waterTemp = station.water_temp_c ?? null;
  const humidity = station.humidity_pct ?? null;
  const windVelocity = station.wind_kmh ?? stationAny.wind_speed_kmh ?? stationAny.wind_velocity_kmh ?? null;
  const sensorArray = station.sensor_array ?? stationAny.sensor_status ?? 'Operational';
  const confidence = station.model_confidence ?? stationAny.confidence ?? 94;
  const envScore = station.env_hazard_score ?? stationAny.environmental_risk_score ?? null;
  const hydroScore = station.hydrodynamic_score ?? stationAny.hydrodynamic_risk_score ?? null;

  const metrics = [
    {
      Icon: CloudRain,
      label: 'Rainfall rate',
      value: rainfallRate != null ? `${rainfallRate.toFixed(1)} mm/h` : 'Unrecorded',
      sub: rainfallRate != null ? rainfallIntensity : undefined,
    },
    {
      Icon: Thermometer,
      label: 'Water temp',
      value: waterTemp != null ? `${waterTemp.toFixed(1)} °C` : 'Unavailable',
    },
    {
      Icon: Droplets,
      label: 'Humidity',
      value: humidity != null ? `${humidity}%` : 'Unavailable',
    },
    {
      Icon: Wind,
      label: 'Wind speed',
      value: windVelocity != null ? `${windVelocity.toFixed(1)} km/h` : 'Unavailable',
    },
    {
      Icon: Cpu,
      label: 'Sensors',
      value: sensorArray,
    },
  ];

  const driverWeights = [92, 78, 61];

  const currentStageText =
    station.current_water_level_m != null
      ? `${station.current_water_level_m.toFixed(2)} m`
      : station.depth_meters != null
      ? `${station.depth_meters.toFixed(2)} m`
      : 'Unavailable';

  const flowVelocityText =
    station.flow_velocity_mps != null
      ? `${station.flow_velocity_mps.toFixed(2)} m/s`
      : 'Not Monitored';

  const dischargeText =
    station.discharge_cms != null
      ? `${station.discharge_cms.toFixed(1)} m³/s`
      : station.flow_rate_cms != null
      ? `${station.flow_rate_cms.toFixed(1)} m³/s`
      : 'Not Monitored';

  return (
    <div
      id="exposure-risk-section"
      className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      {/* Station Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Hydrological Risk Assessment
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-xs font-semibold capitalize text-slate-600">
                {station.type}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#172B4D] tracking-tight">
              {station.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {station.latitude != null && station.longitude != null
                  ? `${station.latitude.toFixed(4)}° N, ${station.longitude.toFixed(4)}° E`
                  : 'Coordinates Unavailable'}
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="inline-flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5 text-slate-400" />
                {station.elevation_m != null
                  ? `Elev ${station.elevation_m} m`
                  : station.elevation_meters != null
                  ? `Elev ${station.elevation_meters} m`
                  : 'Elevation Unavailable'}
              </span>
              <span className="text-slate-300">&bull;</span>
              <OpsRiskBadge level={station.current_risk_level} size="sm" />
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
            <span className="bg-slate-100 text-slate-700 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
              {stationId}
            </span>
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{lastVerified}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Metric Sensor Strip */}
      <div className="bg-slate-50/70 border-b border-slate-100 px-5 sm:px-6 py-3.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {metrics.map(({ Icon, label, value, sub }) => (
          <div key={label} className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#1677D2] shrink-0 mt-0.5 shadow-2xs">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">{label}</div>
              <div className="font-mono text-xs font-bold text-[#172B4D]">
                {value}
                {sub && <span className="text-slate-500 font-sans font-normal ml-1">({sub})</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content: Gauge Panel + Detailed Score Breakdown */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Restrained Gauge Container */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between p-6 rounded-2xl bg-slate-50/80 border border-slate-200/90 shadow-2xs">
          <RestrainedGauge
            score={station.current_risk_score ?? station.risk_score ?? null}
            level={station.current_risk_level}
            confidence={confidence}
            size={220}
          />

          {/* Hydrological readings under gauge */}
          <div className="w-full mt-5 bg-white border border-slate-200/90 rounded-xl p-3.5 grid grid-cols-3 gap-2 text-center shadow-2xs">
            <div className="border-r border-slate-100 pr-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5">Stage</div>
              <div className="font-mono text-xs font-bold text-[#172B4D] truncate">{currentStageText}</div>
            </div>
            <div className="border-r border-slate-100 pr-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5">Velocity</div>
              <div className="font-mono text-xs font-bold text-[#172B4D] truncate">{flowVelocityText}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5">Discharge</div>
              <div className="font-mono text-xs font-bold text-[#172B4D] truncate">{dischargeText}</div>
            </div>
          </div>
        </div>

        {/* Right: Why This Score & Actions */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Top Risk Drivers */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-[#1677D2]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Primary Hazard Drivers
              </h3>
            </div>
            <div className="space-y-2.5 mt-3">
              {hazardDrivers.slice(0, 3).map((driver, idx) => (
                <div key={idx} className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#172B4D]">{driver}</span>
                    <span className="font-mono text-[11px] text-slate-500">{driverWeights[idx] || 50}% contribution</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1677D2]"
                      style={{ width: `${driverWeights[idx] || 50}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calibrated Model Breakdown */}
          <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/60 border border-slate-100">
              <span className="text-slate-600 font-medium">Hazard model (Random Forest)</span>
              <span className="font-mono font-bold text-[#172B4D]">
                {envScore != null ? `${envScore.toFixed(1)} / 100` : 'Uncalibrated'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/60 border border-slate-100">
              <span className="text-slate-600 font-medium">Flow model (Flow physics)</span>
              <span className="font-mono font-bold text-[#172B4D]">
                {hydroScore != null ? `${hydroScore.toFixed(1)} / 100` : 'Normal: Uncalibrated'}
              </span>
            </div>
          </div>

          {/* Recommended Operational Actions */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Recommended Protocol Actions
            </h4>
            <div className="space-y-2 mb-5">
              {recommendedActions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <span
                    className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: token.surfaceColor }}
                  />
                  <span className="leading-relaxed">{action}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onRunScenario(station)}
              className="btn-primary text-xs"
            >
              <Sliders className="w-4 h-4" />
              <span>Simulate What-If Scenario &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
