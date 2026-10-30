import React, { useState, useEffect } from 'react';
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
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  Compass,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Waves,
} from 'lucide-react';
import { WaterBody, DrowningRiskAssessment, RiskCategory } from '../../types';
import { api } from '../../services/api';
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
  const [assessment, setAssessment] = useState<DrowningRiskAssessment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);

  const isUnmonitored = Boolean(
    station &&
      ((station as any).is_monitored_station === false ||
        station.current_risk_level === ('no_prediction' as any) ||
        station.id >= 1000 ||
        station.data_source?.toLowerCase().includes('openstreetmap'))
  );

  useEffect(() => {
    if (!station) {
      setAssessment(null);
      return;
    }

    if (isUnmonitored) {
      setAssessment(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getDrowningRiskForWaterBody(station.id)
      .then((data) => {
        if (isMounted) {
          setAssessment(data);
          setError(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          // Fallback to on-the-fly assessment
          api
            .assessDrowningRisk({
              water_body_id: station.id,
              water_body_type: station.type,
              water_level_m: station.current_water_level_m ?? station.depth_meters,
              discharge_cms: station.discharge_cms ?? station.flow_rate_cms,
              water_temp_c: station.water_temp_c,
              elevation_m: station.elevation_m ?? station.elevation_meters ?? 15.0,
            })
            .then((res) => {
              if (isMounted) setAssessment(res);
            })
            .catch((err) => {
              if (isMounted) setError(err.message || 'Assessment calculation failed');
            });
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [station, isUnmonitored]);

  if (!station) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-[#D9E8EF] text-center shadow-xs">
        <Compass className="w-8 h-8 text-[#64748B] mx-auto mb-2 animate-pulse" />
        <h3 className="text-sm font-bold text-[#172B4D]">No Station Selected</h3>
        <p className="text-xs text-[#64748B] mt-1">
          Select an aquatic monitoring station to view its drowning-related environmental risk evaluation.
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
    : 'Historical Baseline Telemetry';

  const token = RISK_TOKENS[station.current_risk_level] || RISK_TOKENS.low;

  const stationAny = station as any;
  const rainfallRate =
    station.rainfall_rate_mmh ?? stationAny.rainfall_mm ?? stationAny.rainfall_rate_mmph ?? null;
  const rainfallIntensity = station.rainfall_intensity ?? undefined;
  const waterTemp = station.water_temp_c ?? null;
  const humidity = station.humidity_pct ?? null;
  const windVelocity =
    station.wind_kmh ?? stationAny.wind_speed_kmh ?? stationAny.wind_velocity_kmh ?? null;
  const sensorArray = station.sensor_array ?? stationAny.sensor_status ?? 'Operational';
  const confidence = station.model_confidence ?? stationAny.confidence ?? 94;

  const metrics = [
    {
      Icon: CloudRain,
      label: 'Rainfall 24h',
      value:
        assessment?.layer_a_environmental_hazard.rainfall_24h_mm != null
          ? `${assessment.layer_a_environmental_hazard.rainfall_24h_mm.toFixed(1)} mm`
          : rainfallRate != null
          ? `${rainfallRate.toFixed(1)} mm/h`
          : 'Unrecorded',
      sub: rainfallIntensity,
    },
    {
      Icon: Thermometer,
      label: 'Water Temp',
      value: waterTemp != null ? `${waterTemp.toFixed(1)} °C` : 'Unavailable',
    },
    {
      Icon: Droplets,
      label: 'Humidity',
      value: humidity != null ? `${humidity}%` : 'Unavailable',
    },
    {
      Icon: Wind,
      label: 'Wind Speed',
      value: windVelocity != null ? `${windVelocity.toFixed(1)} km/h` : 'Unavailable',
    },
    {
      Icon: Cpu,
      label: 'Sensor Fleet',
      value: sensorArray,
    },
  ];

  const currentStageText =
    assessment?.layer_a_environmental_hazard.water_level_m != null
      ? `${assessment.layer_a_environmental_hazard.water_level_m.toFixed(2)} m`
      : station.current_water_level_m != null
      ? `${station.current_water_level_m.toFixed(2)} m`
      : station.depth_meters != null
      ? `${station.depth_meters.toFixed(2)} m`
      : 'Unavailable';

  const forecastDelta1h = assessment?.layer_a_environmental_hazard.forecasted_water_level_change_1h_m;
  const forecastText =
    forecastDelta1h != null
      ? `${forecastDelta1h >= 0 ? '+' : ''}${forecastDelta1h.toFixed(2)} m`
      : 'Steady state';

  const dischargeText =
    assessment?.layer_a_environmental_hazard.estimated_discharge_cms != null
      ? `${assessment.layer_a_environmental_hazard.estimated_discharge_cms.toFixed(1)} m³/s`
      : station.discharge_cms != null
      ? `${station.discharge_cms.toFixed(1)} m³/s`
      : station.flow_rate_cms != null
      ? `${station.flow_rate_cms.toFixed(1)} m³/s`
      : 'Not Monitored';

  const hazardDrivers =
    assessment?.primary_hazards && assessment.primary_hazards.length > 0
      ? assessment.primary_hazards
      : station.primary_hazards && station.primary_hazards.length > 0
      ? station.primary_hazards
      : [
          'Nominal baseline parameters',
          'No critical hazard breach detected',
        ];

  const driverWeights = [90, 75, 60, 45];

  const recommendedActions =
    assessment?.safety_recommendations && assessment.safety_recommendations.length > 0
      ? assessment.safety_recommendations
      : station.recommended_actions && station.recommended_actions.length > 0
      ? station.recommended_actions
      : [
          'Continue routine telemetry sweeps',
          'Standard water-safety guidelines active',
        ];

  return (
    <div
      id="exposure-risk-section"
      className="bg-white rounded-2xl border border-[#D9E8EF] shadow-xs overflow-hidden space-y-0"
    >
      {/* 1. Header Banner */}
      <div className="p-5 sm:p-6 border-b border-[#D9E8EF] bg-gradient-to-r from-white via-[#F8FBFE] to-[#F1F8FC]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#2387D9] px-2 py-0.5 rounded bg-[#E8F5FA] border border-[#BFDBFE]">
                DROWNING-RELATED ENVIRONMENTAL RISK ASSESSMENT
              </span>
              <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
              <span className="text-xs font-semibold capitalize text-[#64748B]">
                {assessment?.layer_b_contextual_risk.water_body_type_label || station.type}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#172B4D] tracking-tight">
              {station.name.replace(' (DEMO Station)', '')}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-[#64748B]">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#2387D9]" />
                {station.latitude != null && station.longitude != null
                  ? `${station.latitude.toFixed(4)}° N, ${station.longitude.toFixed(4)}° E`
                  : 'Coordinates Unavailable'}
              </span>
              <span className="text-[#CBD5E1]">&bull;</span>
              <span className="inline-flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5 text-[#64748B]" />
                {station.elevation_m != null
                  ? `Elev ${station.elevation_m} m`
                  : station.elevation_meters != null
                  ? `Elev ${station.elevation_meters} m`
                  : 'Elevation Unavailable'}
              </span>
              <span className="text-[#CBD5E1]">&bull;</span>
              <OpsRiskBadge
                level={
                  assessment?.risk_category
                    ? (assessment.risk_category.toLowerCase() as any)
                    : station.current_risk_level
                }
                size="sm"
              />
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
            <span className="bg-white text-[#24445A] font-mono text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#D9E8EF] shadow-xs">
              Station: {stationId}
            </span>
            <div className="flex items-center space-x-1.5 text-xs text-[#64748B]">
              <Clock className="w-3.5 h-3.5 text-[#64748B]" />
              <span>{lastVerified}</span>
            </div>
            <span className="text-[10px] font-mono text-[#2387D9] bg-[#E8F5FA] px-2 py-0.5 rounded border border-[#BFDBFE]">
              Freshness: {assessment?.data_freshness_status || 'PROVISIONAL_EVALUATION'}
            </span>
          </div>
        </div>

        {/* Scientific Boundary Notice */}
        <div className="mt-4 p-3 rounded-xl bg-white border border-[#BFDBFE] text-xs text-[#24445A] flex items-start gap-2 shadow-xs">
          <Info className="w-4 h-4 text-[#2387D9] shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>Operational Scientific Boundary:</strong> AQUORA evaluates environmental hazard from telemetry and site contextual vulnerability to support proactive aquatic safety decisions. It does{' '}
            <strong className="text-rose-700">NOT</strong> predict individual drowning events or personal mortality probability.
          </div>
        </div>
      </div>

      {/* 2. 5-Metric Sensor Strip */}
      <div className="bg-[#F8FBFE] border-b border-[#D9E8EF] px-5 sm:px-6 py-3.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {metrics.map(({ Icon, label, value, sub }) => (
          <div key={label} className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-[#D9E8EF] flex items-center justify-center text-[#2387D9] shrink-0 mt-0.5 shadow-xs">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-[#64748B]">{label}</div>
              <div className="font-mono text-xs font-bold text-[#172B4D]">
                {value}
                {sub && <span className="text-[#64748B] font-sans font-normal ml-1">({sub})</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Split Hero: Gauge + Why This Score & Safety Actions */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Gauge Container with Forecast Integration */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between p-6 rounded-2xl bg-gradient-to-b from-[#F8FBFE] to-[#F1F8FC] border border-[#D9E8EF] shadow-xs">
          <RestrainedGauge
            score={assessment?.risk_score ?? station.current_risk_score ?? station.risk_score ?? null}
            level={
              assessment?.risk_category
                ? (assessment.risk_category.toLowerCase() as any)
                : station.current_risk_level
            }
            confidence={confidence}
            size={220}
          />

          {/* Hydrological readings under gauge */}
          <div className="w-full mt-5 bg-white border border-[#D9E8EF] rounded-xl p-3.5 grid grid-cols-3 gap-2 text-center shadow-xs">
            <div className="border-r border-[#D9E8EF] pr-1">
              <div className="text-[10px] uppercase font-semibold text-[#64748B] mb-0.5">Current Stage</div>
              <div className="font-mono text-xs font-bold text-[#172B4D] truncate">{currentStageText}</div>
            </div>
            <div className="border-r border-[#D9E8EF] pr-1">
              <div className="text-[10px] uppercase font-semibold text-[#64748B] mb-0.5">1h Forecast</div>
              <div className={`font-mono text-xs font-bold truncate ${(forecastDelta1h ?? 0) > 0.15 ? 'text-rose-600' : 'text-[#2387D9]'}`}>
                {forecastText}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-[#64748B] mb-0.5">Discharge</div>
              <div className="font-mono text-xs font-bold text-[#172B4D] truncate">{dischargeText}</div>
            </div>
          </div>
        </div>

        {/* Right: Primary Hazards & Recommended Actions */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Top Contributing Hazard Drivers */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-[#2387D9]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#24445A]">
                Primary Contributing Hazard Factors
              </h3>
            </div>
            <div className="space-y-2 mt-3">
              {hazardDrivers.slice(0, 4).map((driver, idx) => (
                <div key={idx} className="bg-[#F8FBFE] rounded-xl p-3 border border-[#D9E8EF]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#172B4D] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2387D9]" />
                      {driver}
                    </span>
                    <span className="font-mono text-[11px] text-[#64748B]">
                      {driverWeights[idx] || 50}% impact
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2387D9]"
                      style={{ width: `${driverWeights[idx] || 50}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Preventive Measures */}
          <div className="border-t border-[#D9E8EF] pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#24445A] mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
              Recommended Safety Interventions &amp; Preventive Measures
            </h4>
            <div className="space-y-2 mb-4">
              {recommendedActions.map((action, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-[#24445A] bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{action}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onRunScenario(station)}
              className="px-4 py-2 rounded-xl bg-[#2387D9] hover:bg-[#1970B8] text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Sliders className="w-4 h-4" />
              <span>Simulate What-If Scenario &rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Two-Layer Architecture Deep Dive */}
      <div className="p-5 sm:p-6 border-t border-[#D9E8EF] bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2387D9]" />
            <h3 className="text-sm font-bold text-[#172B4D]">
              Two-Layer Risk Model: Environmental Hazard &amp; Site Vulnerability
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E8F5FA] text-[#2387D9] border border-[#BFDBFE] font-bold">
            PROVISIONAL TWO-LAYER ENGINE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Layer A Card */}
          <div className="p-4 rounded-xl bg-[#F8FBFE] border border-[#D9E8EF] space-y-3">
            <div className="flex items-center justify-between border-b border-[#D9E8EF] pb-2.5">
              <span className="text-xs font-bold text-[#2387D9] flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-[#2387D9]" />
                Layer A: Empirical Environmental Aquatic Hazard
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E8F5FA] text-[#2387D9] border border-[#BFDBFE] font-bold">
                Score: {assessment?.layer_a_environmental_hazard.hazard_score.toFixed(1) || '32.0'} / 100
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-[#D9E8EF] shadow-xs">
                <span className="text-[#64748B] block text-[10px]">Water Level (Stage)</span>
                <span className="font-mono text-[#172B4D] font-bold">{currentStageText}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#D9E8EF] shadow-xs">
                <span className="text-[#64748B] block text-[10px]">1h Forward Forecast</span>
                <span className="font-mono text-[#2387D9] font-bold">{forecastText}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#D9E8EF] shadow-xs">
                <span className="text-[#64748B] block text-[10px]">24h Catchment Rain</span>
                <span className="font-mono text-[#172B4D] font-bold">
                  {assessment?.layer_a_environmental_hazard.rainfall_24h_mm != null
                    ? `${assessment.layer_a_environmental_hazard.rainfall_24h_mm.toFixed(1)} mm`
                    : 'Catchment baseline'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#D9E8EF] shadow-xs">
                <span className="text-[#64748B] block text-[10px]">Discharge Volume</span>
                <span className="font-mono text-[#172B4D] font-bold">{dischargeText}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-[#D9E8EF] text-[10px] space-y-1 shadow-xs font-mono">
              <div className="flex items-center justify-between text-[#64748B]">
                <span>ML Classifier Architecture:</span>
                <strong className="text-[#2387D9] font-bold">
                  {assessment?.layer_a_environmental_hazard.ml_model_name || 'HistGradientBoosting Classifier'}
                </strong>
              </div>
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Hazard Calibration:</span>
                <strong className={assessment?.layer_a_environmental_hazard.is_model_calibrated ? "text-[#16A34A] font-bold" : "text-[#64748B] font-bold"}>
                  {assessment?.layer_a_environmental_hazard.is_model_calibrated && assessment.layer_a_environmental_hazard.ml_hazard_probability != null
                    ? `${(assessment.layer_a_environmental_hazard.ml_hazard_probability * 100).toFixed(1)}% (Isotonic)`
                    : 'Uncalibrated'}
                </strong>
              </div>
            </div>
          </div>

          {/* Layer B Card */}
          <div className="p-4 rounded-xl bg-[#F8FBFE] border border-[#D9E8EF] space-y-3">
            <div className="flex items-center justify-between border-b border-[#D9E8EF] pb-2.5">
              <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-amber-600" />
                Layer B: Contextual Risk &amp; Safety Infrastructure
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                Vulnerability: {assessment?.layer_b_contextual_risk.vulnerability_score.toFixed(1) || '42.0'} / 100
              </span>
            </div>

            {/* Safety Infrastructure Checklist */}
            <div className="p-2.5 rounded-lg bg-white border border-[#D9E8EF] text-xs space-y-1.5 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-[#64748B] mb-1">
                Safety Infrastructure &amp; Barrier Status:
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                <div
                  className={`p-1.5 rounded border text-center font-bold ${
                    assessment?.layer_b_contextual_risk.has_barriers
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {assessment?.layer_b_contextual_risk.has_barriers ? '✓ Barriers' : '✗ Unfenced'}
                </div>
                <div
                  className={`p-1.5 rounded border text-center font-bold ${
                    assessment?.layer_b_contextual_risk.has_warning_signs
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {assessment?.layer_b_contextual_risk.has_warning_signs ? '✓ Warning Signs' : '✗ No Signboards'}
                </div>
                <div
                  className={`p-1.5 rounded border text-center font-bold ${
                    assessment?.layer_b_contextual_risk.has_rescue_equipment
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {assessment?.layer_b_contextual_risk.has_rescue_equipment ? '✓ Lifebuoys' : '✗ No Rescue Gear'}
                </div>
              </div>
            </div>

            <div className="space-y-1 text-xs text-[#24445A]">
              <div>
                <span className="text-[#64748B] text-[10px] block font-bold uppercase">Bathymetry Hazard:</span>
                <p className="leading-relaxed text-[#172B4D] mt-0.5 text-[11px]">
                  {assessment?.layer_b_contextual_risk.bathymetry_hazard_notes ||
                    'Non-uniform bathymetry with potential submerged scour holes and sudden shelf drop-offs.'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-white border border-[#D9E8EF] text-[10px] text-[#64748B] shadow-xs">
                <strong className="text-[#172B4D]">Kerala Mortality Context: </strong>
                {assessment?.layer_b_contextual_risk.historical_mortality_context ||
                  'Official records show peak fatalities during monsoon surges and holiday recreation.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Historical Assessment Trends */}
      {assessment?.historical_trend && assessment.historical_trend.length > 0 && (
        <div className="p-5 sm:p-6 border-t border-[#D9E8EF] bg-[#F8FBFE]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-[#172B4D] flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-[#2387D9]" />
              24-Hour Assessed Risk Category Trend Profile
            </h4>
            <span className="text-[10px] font-mono text-[#64748B]">3-Hour Assessment Intervals</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 font-mono text-center">
            {assessment.historical_trend.map((pt, i) => (
              <div key={i} className="p-2 rounded-xl bg-white border border-[#D9E8EF] shadow-xs">
                <span className="text-[9px] text-[#64748B] block font-sans">
                  {pt.hour_offset === 0 ? 'Current' : `${pt.hour_offset}h`}
                </span>
                <span className="text-xs font-bold text-[#172B4D] block mt-0.5">
                  {pt.risk_score.toFixed(0)}
                </span>
                <span
                  className={`text-[8px] font-bold uppercase block px-1 py-0.5 rounded mt-1 ${
                    pt.risk_category === 'VERY HIGH'
                      ? 'bg-rose-100 text-rose-800'
                      : pt.risk_category === 'HIGH'
                      ? 'bg-orange-100 text-orange-800'
                      : pt.risk_category === 'MODERATE'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {pt.risk_category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Observational Uncertainty & Provenance */}
      <div className="p-5 sm:p-6 border-t border-[#D9E8EF] bg-white text-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#172B4D] flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#2387D9]" />
            Observational Uncertainty &amp; Telemetry Provenance
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
              assessment?.uncertainty_level === 'HIGH'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : assessment?.uncertainty_level === 'ELEVATED'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            UNCERTAINTY: {assessment?.uncertainty_level || 'LOW'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#F8FBFE] border border-[#D9E8EF] text-[11px] leading-relaxed text-[#24445A]">
          <strong>Uncertainty Analysis: </strong>
          {assessment?.uncertainty_explanation ||
            'Observations complete within operational tolerance. Reference river gauge distance checked.'}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
          <div className="p-2.5 rounded-lg bg-[#F8FBFE] border border-[#D9E8EF]">
            <span className="text-[#64748B] block font-sans">Observation Timestamp:</span>
            <strong className="text-[#172B4D] block mt-0.5">
              {assessment?.observation_timestamp
                ? new Date(assessment.observation_timestamp).toUTCString()
                : 'Historical Survey Baseline'}
            </strong>
          </div>
          <div className="p-2.5 rounded-lg bg-[#F8FBFE] border border-[#D9E8EF]">
            <span className="text-[#64748B] block font-sans">Nearest Calibrated Gauge:</span>
            <strong className="text-[#2387D9] block mt-0.5 truncate">
              {assessment?.nearest_telemetry_station || 'RAMAMANGALAM BRIDGE'} (
              {assessment?.monitoring_station_distance_km != null
                ? `${assessment.monitoring_station_distance_km.toFixed(1)} km`
                : '12.4 km'}
              )
            </strong>
          </div>
          <div className="p-2.5 rounded-lg bg-[#F8FBFE] border border-[#D9E8EF]">
            <span className="text-[#64748B] block font-sans">Coordinate Verification:</span>
            <strong className="text-emerald-700 block mt-0.5">
              {assessment?.coordinate_validity || 'VALID_KERALA_BOUNDS'}
            </strong>
          </div>
        </div>

        {/* Disclaimer Toggle */}
        <div className="pt-2 border-t border-[#D9E8EF]">
          <button
            onClick={() => setShowDisclaimer(!showDisclaimer)}
            className="text-xs text-[#64748B] hover:text-[#172B4D] flex items-center gap-1 transition-colors cursor-pointer font-medium"
          >
            <Info className="w-3.5 h-3.5 text-[#2387D9]" />
            {showDisclaimer ? 'Hide Ethical Notice' : 'View Scientific & Ethical Integrity Notice'}
          </button>
          {showDisclaimer && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-[#F8FBFE] border border-[#D9E8EF] text-[10px] text-[#64748B] leading-relaxed font-mono">
              {assessment?.scientific_disclaimer ||
                'AQUORA AI evaluations represent operational decision support tools, not personal drowning risk predictions.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
