import React from 'react';
import {
  Thermometer,
  CloudRain,
  Wind,
  Droplets,
  Cpu,
  Clock,
  Sliders,
} from 'lucide-react';
import { WaterBody } from '../../types';
import { RestrainedGauge } from './RestrainedGauge';
import { OpsRiskBadge, RISK_TOKENS } from './RiskBadge';

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

  const hazardDrivers =
    station.primary_hazards && station.primary_hazards.length > 0
      ? station.primary_hazards
      : [
          'Rapid water level surge +0.28 m/h',
          'Extreme discharge velocity 2.45 m/s',
          'Bank slope slippage index 0.81',
        ];

  const recommendedActions =
    station.recommended_actions && station.recommended_actions.length > 0
      ? station.recommended_actions
      : [
          'Evacuate immediate riverbanks',
          'Swimming & wading prohibited',
          'Review access restrictions before 14:00 IST',
        ];

  const token = RISK_TOKENS[station.current_risk_level] || RISK_TOKENS.low;

  const metrics = [
    { Icon: CloudRain, label: 'Rainfall rate', value: `${rainfallRate.toFixed(1)} mm/h`, sub: rainfallIntensity },
    { Icon: Thermometer, label: 'Water temp', value: `${waterTemp.toFixed(1)} °C` },
    { Icon: Droplets, label: 'Humidity', value: `${humidity}%` },
    { Icon: Wind, label: 'Wind speed', value: `${windVelocity.toFixed(1)} km/h` },
    { Icon: Cpu, label: 'Sensors', value: sensorArray },
  ];

  const driverWeights = [92, 78, 61];

  return (
    <div
      id="exposure-risk-section"
      className="rounded-xl overflow-hidden bg-[#84B3CE]"
      style={{
        borderLeft: `3px solid ${token.surfaceColor}`,
      }}
    >
      {/* Station header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#6A9AB6]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#134059] mb-1">
              Risk assessment
            </div>
            <h2 className="font-sans font-semibold text-[20px] text-[#082536] leading-tight">
              {station.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[12px] font-mono text-[#134059]">
              <span className="capitalize">{station.type}</span>
              <span className="text-[#6A9AB6]">·</span>
              <span>
                {station.latitude.toFixed(4)}° N, {station.longitude.toFixed(4)}° E
              </span>
              <span className="text-[#6A9AB6]">·</span>
              <span>Elev {station.elevation_m} m</span>
              <span className="text-[#6A9AB6]">·</span>
              <OpsRiskBadge level={station.current_risk_level} size="sm" />
            </div>
          </div>

          <div className="flex flex-col items-end text-[12px] font-mono text-[#134059] shrink-0 gap-1">
            <span className="bg-[#F5EEDD] px-2.5 py-1 rounded-md text-[#082536] font-medium border border-[#6A9AB6]">
              {stationId}
            </span>
            <div className="flex items-center space-x-1 text-[11px]">
              <Clock className="w-3 h-3 text-[#134059]" />
              <span>{lastVerified}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5-metric strip */}
      <div className="border-b border-[#6A9AB6] bg-[#F5EEDD]/50 px-5 py-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {metrics.map(({ Icon, label, value, sub }) => (
          <div key={label} className="flex items-start gap-2">
            <Icon className="w-4 h-4 text-[#0B3F5A] shrink-0 mt-0.5" style={{ strokeWidth: 1.5 }} />
            <div>
              <div className="text-[11px] font-sans font-medium text-[#0F3A52] leading-none mb-0.5">{label}</div>
              <div className="font-mono text-[13px] text-[#082536] font-medium leading-snug">
                {value}
                {sub && <span className="text-[#134059] font-sans ml-1 text-[11px]">· {sub}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content: gauge panel + why this score */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gauge panel (dark #0E3F5C, text #F5EEDD) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-[#0E3F5C] text-[#F5EEDD]">
          <RestrainedGauge
            score={station.current_risk_score}
            level={station.current_risk_level}
            confidence={confidence}
            size={220}
          />

          {/* Hydrological readings under gauge */}
          <div className="w-full mt-4 bg-[#16587B] rounded-lg p-3 grid grid-cols-3 gap-3 text-[12px] font-mono text-[#F5EEDD]">
            <div>
              <div className="text-[10px] text-[#D6E3EA] mb-0.5">Stage</div>
              <div className="text-[#F5EEDD] font-semibold">{station.current_water_level_m.toFixed(2)} m</div>
            </div>
            <div>
              <div className="text-[10px] text-[#D6E3EA] mb-0.5">Velocity</div>
              <div className="text-[#F5EEDD] font-semibold">{station.flow_velocity_mps.toFixed(2)} m/s</div>
            </div>
            <div>
              <div className="text-[10px] text-[#D6E3EA] mb-0.5">Discharge</div>
              <div className="text-[#F5EEDD] font-semibold">{station.discharge_cms.toFixed(1)} m³/s</div>
            </div>
          </div>
        </div>

        {/* Why this score column */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Top risk drivers */}
          <div>
            <div className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#0F3A52] mb-3">
              Why this score
            </div>
            <div className="text-[11px] font-sans font-medium text-[#134059] mb-2 uppercase tracking-wide">
              Top risk drivers
            </div>
            <div className="space-y-2">
              {hazardDrivers.slice(0, 3).map((driver, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-[#134059] w-4 shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[#082536] mb-1 leading-snug">{driver}</div>
                    <div className="h-1.5 bg-[#F5EEDD] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${driverWeights[idx] || 50}%`,
                          backgroundColor: '#134059',
                          opacity: 0.75,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model rows */}
          <div className="border-t border-[#6A9AB6] pt-4 space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#0F3A52]">Hazard model (Random Forest)</span>
              <span className="font-mono text-[#082536] font-medium">{envScore.toFixed(1)} / 100</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#0F3A52]">Flow model (Flow physics)</span>
              <span className="font-mono text-[#082536] font-medium">{hydroScore.toFixed(1)} / 100</span>
            </div>
          </div>

          {/* Recommended actions */}
          <div className="border-t border-[#6A9AB6] pt-4">
            <div className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#0F3A52] mb-2">
              Recommended action
            </div>
            <div className="space-y-1.5 mb-4">
              {recommendedActions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[12px]">
                  <span
                    className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: token.surfaceColor }}
                  />
                  <span className="text-[#082536]">{action}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onRunScenario(station)}
              className="inline-flex items-center space-x-2 bg-[#0B3F5A] hover:bg-[#16587B] text-[#F5EEDD] text-[13px] font-sans font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Sliders className="w-4 h-4" style={{ strokeWidth: 1.5 }} />
              <span>Run operational scenario</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
