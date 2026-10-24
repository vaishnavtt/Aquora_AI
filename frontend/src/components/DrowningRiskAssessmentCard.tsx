import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CloudRain,
  Waves,
  Gauge,
  Thermometer,
  Layers,
  Compass,
  Info,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertCircle
} from 'lucide-react';
import { WaterBody, DrowningRiskAssessment, RiskCategory, formatCoordinates, LiveWeatherResponse } from '../types';
import { api } from '../services/api';

interface DrowningRiskAssessmentCardProps {
  station: WaterBody | null;
  onSendToSimulator?: (wb: WaterBody) => void;
  onOpenModelStatus?: () => void;
}

export const DrowningRiskAssessmentCard: React.FC<DrowningRiskAssessmentCardProps> = ({
  station,
  onSendToSimulator,
  onOpenModelStatus,
}) => {
  const [assessment, setAssessment] = useState<DrowningRiskAssessment | null>(null);
  const [weather, setWeather] = useState<LiveWeatherResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);
  const [showLayerDetails, setShowLayerDetails] = useState<boolean>(true);

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
      setWeather(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    // If this is an unmonitored OpenStreetMap geographic feature, do not fabricate a risk assessment
    if (isUnmonitored) {
      setAssessment(null);
      setLoading(false);
      api.getLiveWeather(station.latitude, station.longitude, station.name)
        .then((wData) => {
          if (isMounted) setWeather(wData);
        })
        .catch(() => {
          if (isMounted) setWeather(null);
        });
      return () => {
        isMounted = false;
      };
    }

    api.getWeatherForWaterBody(station.id)
      .then((wData) => {
        if (isMounted) setWeather(wData);
      })
      .catch(() => {
        if (isMounted) setWeather(null);
      });

    api.getDrowningRiskForWaterBody(station.id)
      .then((data) => {
        if (isMounted) {
          setAssessment(data);
          setError(null);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          // If endpoint has error, fallback to client-side evaluation call only if monitored
          if (!isUnmonitored) {
            api.assessDrowningRisk({
              water_body_id: station.id,
              water_body_type: station.type,
              water_level_m: station.depth_meters,
              discharge_cms: station.flow_rate_cms,
              water_temp_c: station.water_temp_c,
              elevation_m: station.elevation_meters ?? (station as any).elevation_m ?? 15.0,
            })
              .then((res) => {
                if (isMounted) setAssessment(res);
              })
              .catch((fallbackErr: any) => {
                if (isMounted) setError(fallbackErr.message || 'Risk assessment calculation failed');
              });
          } else {
            setError(null);
          }
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
      <div className="p-8 rounded-2xl bg-white border border-[#E2E8F0] text-center shadow-xs">
        <Compass className="w-8 h-8 text-[#94A3B8] mx-auto mb-2.5 animate-pulse" />
        <h3 className="text-sm font-bold text-[#172B4D]">No Water Body Selected</h3>
        <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto leading-relaxed">
          Select an aquatic location from the interactive map to view its AI drowning-risk evaluation.
        </p>
      </div>
    );
  }

  const getCategoryBadge = (cat?: RiskCategory | 'NO_PREDICTION' | string | null) => {
    switch (cat) {
      case 'LOW':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-800',
          dot: 'bg-emerald-600',
          scoreBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          label: 'LOW RISK',
          sub: 'Nominal ambient baseline conditions. Not a guarantee of recreational or swimming safety.'
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          dot: 'bg-amber-500',
          scoreBadge: 'bg-amber-100 text-amber-900 border-amber-300',
          label: 'MODERATE RISK',
          sub: 'Elevated caution advised. Avoid solitary wading, night swimming, or unmonitored bathing.'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-800',
          dot: 'bg-orange-600',
          scoreBadge: 'bg-orange-100 text-orange-900 border-orange-300',
          label: 'HIGH RISK',
          sub: 'Dangerous conditions. Non-expert swimming and wading strictly prohibited.'
        };
      case 'VERY HIGH':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-800',
          dot: 'bg-rose-600 animate-ping',
          scoreBadge: 'bg-rose-100 text-rose-900 border-rose-300',
          label: 'VERY HIGH RISK',
          sub: 'Critical danger: Absolute water entry ban strongly recommended.'
        };
      case 'NO_PREDICTION':
      default:
        return {
          bg: 'bg-slate-900/90',
          border: 'border-slate-700/80',
          text: 'text-slate-300',
          dot: 'bg-slate-500',
          label: 'NO PREDICTION AVAILABLE',
          sub: 'Unmonitored geographic feature or insufficient telemetry. Point-level models cannot be extrapolated.'
        };
    }
  };

  const badge = assessment
    ? getCategoryBadge(assessment.risk_category)
    : getCategoryBadge('NO_PREDICTION');

  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="p-5 sm:p-6 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1677D2] border border-[#BFDBFE]">
              {assessment?.layer_b_contextual_risk.water_body_type_label || station.type}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#64748B] border border-[#E2E8F0]">
              {station.basin_region || 'Kerala Water Body'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#172B4D] mt-1.5 flex items-center gap-2">
            {station.name.replace(' (DEMO Station)', '')}
          </h2>
          <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
            Coordinates: {formatCoordinates(station.latitude, station.longitude, 4)} &bull; {station.data_source}
          </p>
        </div>

        {/* Method & Status Tag */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#EFF6FF] text-[#1677D2] border border-[#BFDBFE] flex items-center gap-1.5 font-bold">
            <Activity className="w-3 h-3 text-[#1677D2]" />
            TWO-LAYER RISK ENGINE
          </span>
          <span className="text-[10px] text-[#64748B] font-mono">
            Freshness: <strong className="text-[#172B4D]">{assessment?.data_freshness_status || 'PROVISIONAL'}</strong>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center space-y-3">
          <div className="w-7 h-7 border-2 border-[#1677D2] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#64748B]">Evaluating multi-station telemetry & ML hazard classification...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-600 text-xs">
          <AlertCircle className="w-5 h-5 mx-auto mb-1 text-rose-600" />
          {error}
        </div>
      ) : assessment ? (
        <div className="p-5 sm:p-6 space-y-5">
          {/* Main Risk Banner */}
          <div className={`p-4 rounded-xl border ${badge.bg} ${badge.border} transition-all shadow-xs`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <span className={`w-3.5 h-3.5 rounded-full ${badge.dot}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-extrabold tracking-wide ${badge.text}`}>
                      {badge.label}
                    </span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded border font-bold ${badge.scoreBadge}`}>
                      SCORE: {assessment.risk_score.toFixed(1)} / 100
                    </span>
                  </div>
                  <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                    {badge.sub}
                  </p>
                </div>
              </div>

              {onSendToSimulator && (
                <button
                  onClick={() => onSendToSimulator(station)}
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] text-[#1677D2] border border-[#CBD5E1] text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-center shadow-xs cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#1677D2]" />
                  What-If Lab &rarr;
                </button>
              )}
            </div>
          </div>

          {/* Live Atmospheric Conditions & Precipitation Forecast (Open-Meteo Integration) */}
          {weather && (
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#172B4D]">
                  <CloudRain className="w-4 h-4 text-[#1677D2]" />
                  <span>Live Weather &amp; Precipitation Outlook</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      weather.is_live_data
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {weather.is_live_data ? '● Live Open-Meteo API' : '○ Offline Telemetry Fallback'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-xs">
                  <span className="text-[#64748B] text-[10px] block font-sans">Condition &amp; Temp</span>
                  <span className="text-[#172B4D] font-bold flex items-center gap-1 mt-0.5">
                    <Thermometer className="w-3 h-3 text-amber-500" />
                    {weather.current_temperature_c.toFixed(1)}°C
                  </span>
                  <span className="text-[10px] text-[#64748B] block truncate font-sans">
                    {weather.weather_condition}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-xs">
                  <span className="text-[#64748B] text-[10px] block font-sans">Current Rainfall</span>
                  <span className="text-[#1677D2] font-bold flex items-center gap-1 mt-0.5">
                    <CloudRain className="w-3 h-3 text-[#1677D2]" />
                    {weather.current_precipitation_mm_h.toFixed(1)} mm/h
                  </span>
                  <span className="text-[10px] text-[#64748B] block font-sans">
                    Wind: {weather.wind_speed_kmh.toFixed(0)} km/h
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-xs">
                  <span className="text-[#64748B] text-[10px] block font-sans">Past 24h Rain</span>
                  <span className="text-[#0D9488] font-bold flex items-center gap-1 mt-0.5">
                    <Gauge className="w-3 h-3 text-[#0D9488]" />
                    {weather.accumulated_24h_rainfall_mm.toFixed(1)} mm
                  </span>
                  <span className="text-[10px] text-[#64748B] block font-sans">
                    Catchment Gage
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-xs">
                  <span className="text-[#64748B] text-[10px] block font-sans">24h Forecast Rain</span>
                  <span className="text-[#16A34A] font-bold flex items-center gap-1 mt-0.5">
                    <Activity className="w-3 h-3 text-[#16A34A]" />
                    {weather.forecast_24h_rainfall_mm.toFixed(1)} mm
                  </span>
                  <span className="text-[10px] text-[#64748B] block font-sans">
                    Elev: {weather.elevation_m != null ? `${weather.elevation_m.toFixed(0)}m MSL` : 'Terrain DEM'}
                  </span>
                </div>
              </div>

              {/* Hourly precipitation forecast strip (next 8 intervals) */}
              {weather.hourly_forecast && weather.hourly_forecast.length > 0 && (
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <span className="text-[10px] font-sans font-bold text-[#64748B] block mb-1.5">
                    Hourly Forecast Rainfall Projection (Next 8 Hours):
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {weather.hourly_forecast.slice(0, 8).map((hf, i) => (
                      <div
                        key={i}
                        className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-center font-mono text-[9px] shadow-xs"
                      >
                        <span className="text-[#64748B] block">
                          {hf.time.includes('T') ? hf.time.split('T')[1].slice(0, 5) : `+${i + 1}h`}
                        </span>
                        <span
                          className={`font-bold block mt-0.5 ${
                            hf.precipitation_mm > 5.0
                              ? 'text-rose-600'
                              : hf.precipitation_mm > 1.0
                              ? 'text-amber-600'
                              : 'text-[#1677D2]'
                          }`}
                        >
                          {hf.precipitation_mm.toFixed(1)}
                        </span>
                        <span className="text-[8px] text-[#64748B]">mm</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Toggle Layer Breakdown */}
          <div>
            <button
              onClick={() => setShowLayerDetails(!showLayerDetails)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#172B4D] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 font-bold">
                <Layers className="w-4 h-4 text-[#1677D2]" />
                Two-Layer Architecture Assessment Breakdown
              </span>
              {showLayerDetails ? <ChevronUp className="w-4 h-4 text-[#64748B]" /> : <ChevronDown className="w-4 h-4 text-[#64748B]" />}
            </button>

            {showLayerDetails && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LAYER A: Environmental Aquatic Hazard */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-bold text-[#1677D2] flex items-center gap-1.5">
                      <CloudRain className="w-4 h-4 text-[#1677D2]" />
                      Layer A: Environmental Hazard
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1677D2] border border-[#BFDBFE] font-bold">
                      Score: {assessment.layer_a_environmental_hazard.hazard_score.toFixed(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0] shadow-xs">
                      <span className="text-[#64748B] block text-[10px]">Water Stage</span>
                      <span className="font-mono text-[#172B4D] font-bold">
                        {assessment.layer_a_environmental_hazard.water_level_m != null
                          ? `${assessment.layer_a_environmental_hazard.water_level_m.toFixed(2)} m`
                          : station?.depth_meters != null
                          ? `${station.depth_meters.toFixed(2)} m`
                          : 'Unavailable'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0] shadow-xs">
                      <span className="text-[#64748B] block text-[10px]">3h Stage Rise</span>
                      <span className="font-mono text-[#172B4D] font-bold">
                        {assessment.layer_a_environmental_hazard.water_level_delta_3h_m != null
                          ? `${assessment.layer_a_environmental_hazard.water_level_delta_3h_m >= 0 ? '+' : ''}${assessment.layer_a_environmental_hazard.water_level_delta_3h_m.toFixed(2)} m`
                          : 'No observation'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0] shadow-xs">
                      <span className="text-[#64748B] block text-[10px]">24h Rainfall</span>
                      <span className="font-mono text-[#172B4D] font-bold">
                        {assessment.layer_a_environmental_hazard.rainfall_24h_mm != null
                          ? `${assessment.layer_a_environmental_hazard.rainfall_24h_mm.toFixed(1)} mm`
                          : 'No observation'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0] shadow-xs">
                      <span className="text-[#64748B] block text-[10px]">River Discharge</span>
                      <span className="font-mono text-[#172B4D] font-bold">
                        {assessment.layer_a_environmental_hazard.estimated_discharge_cms != null
                          ? `${assessment.layer_a_environmental_hazard.estimated_discharge_cms.toFixed(1)} m³/s`
                          : station?.flow_rate_cms != null
                          ? `${station.flow_rate_cms.toFixed(1)} m³/s`
                          : 'Not Monitored'}
                      </span>
                    </div>
                  </div>

                  {/* ML Model Details */}
                  <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-[10px] space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span>ML Architecture:</span>
                      <strong className="text-[#1677D2] font-mono font-bold">
                        {assessment.layer_a_environmental_hazard.ml_model_name}
                      </strong>
                    </div>
                    {assessment.layer_a_environmental_hazard.ml_hazard_probability !== null && (
                      <div className="flex items-center justify-between text-[#64748B]">
                        <span>Calibrated Surge Probability:</span>
                        <strong className="text-[#16A34A] font-mono font-bold">
                          {(assessment.layer_a_environmental_hazard.ml_hazard_probability! * 100).toFixed(1)}%
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* LAYER B: Drowning-Related Contextual Vulnerability */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                      <Waves className="w-4 h-4 text-amber-600" />
                      Layer B: Contextual Risk
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                      Vulnerability: {assessment.layer_b_contextual_risk.vulnerability_score.toFixed(1)}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-[#475569]">
                    <div>
                      <span className="text-[#64748B] text-[10px] block font-bold uppercase">Bathymetry Hazard:</span>
                      <p className="leading-relaxed text-[#172B4D] mt-0.5">
                        {assessment.layer_b_contextual_risk.bathymetry_hazard_notes}
                      </p>
                    </div>

                    <div>
                      <span className="text-[#64748B] text-[10px] block font-bold uppercase">Site Physical Profile:</span>
                      <p className="leading-relaxed text-[#172B4D] mt-0.5">
                        {assessment.layer_b_contextual_risk.site_vulnerability_profile}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-[10px] text-[#64748B] shadow-xs">
                      <strong className="text-[#172B4D]">Official Kerala Mortality Context: </strong>
                      {assessment.layer_b_contextual_risk.historical_mortality_context}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Primary Hazards Identified */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#172B4D] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Primary Contributing Hazard Factors
            </h4>
            <div className="space-y-1.5">
              {assessment.primary_hazards.map((hazard, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#172B4D] flex items-start gap-2 shadow-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1677D2] shrink-0 mt-1.5" />
                  <span>{hazard}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Safety Recommendations */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#172B4D] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
              Actionable Public Safety Directives
            </h4>
            <div className="space-y-1.5">
              {assessment.safety_recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2 leading-relaxed shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Timestamps & Provenance Auditing */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 text-xs">
            <div className="font-bold text-[#172B4D] flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <span className="flex items-center gap-1.5 text-[#1677D2]">
                <Activity className="w-3.5 h-3.5 text-[#1677D2]" />
                Data Timestamps &amp; Provenance
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#64748B] border border-[#E2E8F0]">
                Status: {assessment.data_freshness_status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[10px] font-mono">
              <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-xs">
                <span className="text-[#64748B] block font-sans">Observation Timestamp:</span>
                <span className="text-[#172B4D] font-bold block mt-0.5">
                  {assessment.observation_timestamp
                    ? new Date(assessment.observation_timestamp).toUTCString()
                    : 'Unknown (Historical Survey Baseline)'}
                </span>
                <span className="text-[9px] text-[#64748B] font-sans block mt-0.5">
                  Underlying physical sensor measurement time
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-xs">
                <span className="text-[#64748B] block font-sans">Retrieval / Inference Time:</span>
                <span className="text-[#172B4D] font-bold block mt-0.5">
                  {assessment.retrieval_timestamp
                    ? new Date(assessment.retrieval_timestamp).toUTCString()
                    : new Date().toUTCString()}
                </span>
                <span className="text-[9px] text-[#64748B] font-sans block mt-0.5">
                  AQUORA platform evaluation query time
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-xs">
                <span className="text-[#64748B] block font-sans">Data Source:</span>
                <span className="text-[#172B4D] font-bold block mt-0.5 truncate">
                  {assessment.data_source || station.data_source || 'Kerala Water Resources Registry'}
                </span>
                <span className="text-[9px] text-[#64748B] font-sans block mt-0.5">
                  Authority repository or telemetry provider
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-xs">
                <span className="text-[#64748B] block font-sans">Nearest River Telemetry Station:</span>
                <span className="text-[#1677D2] font-bold block mt-0.5">
                  {assessment.nearest_telemetry_station
                    ? `${assessment.nearest_telemetry_station} (${assessment.monitoring_station_distance_km != null ? `${assessment.monitoring_station_distance_km.toFixed(1)} km` : ''})`
                    : 'Calibrated Kerala Gauge Network'}
                </span>
                <span className="text-[9px] text-[#64748B] font-sans block mt-0.5">
                  Reference gauge distance for spatial uncertainty
                </span>
              </div>
            </div>

            {assessment.missing_variables.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-[#E2E8F0]">
                <span className="text-[10px] font-sans font-bold text-amber-800 flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Observational Gaps &amp; Limiting Assumptions:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[#64748B] text-[10px]">
                  {assessment.missing_variables.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Scientific Disclaimer Toggle */}
          <div className="border-t border-[#E2E8F0] pt-3">
            <button
              onClick={() => setShowDisclaimer(!showDisclaimer)}
              className="text-xs text-[#64748B] hover:text-[#172B4D] flex items-center gap-1 transition-colors cursor-pointer font-medium"
            >
              <Info className="w-3.5 h-3.5" />
              {showDisclaimer ? 'Hide Scientific Notice' : 'View Scientific & Data Integrity Notice'}
            </button>
            {showDisclaimer && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] text-[#64748B] leading-relaxed font-mono">
                {assessment.scientific_disclaimer}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Unmonitored / No Prediction Banner */}
          <div className="p-4 rounded-xl border bg-slate-900/90 border-slate-700/80 shadow-lg">
            <div className="flex items-center space-x-3">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-500" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-wide text-slate-300">
                    NO PREDICTION AVAILABLE
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 text-slate-400 border border-white/10 font-bold">
                    UNMONITORED FEATURE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  OpenStreetMap geographic waterway without dedicated in-situ hydrological telemetry. Hazard classification is unassessed.
                </p>
              </div>
            </div>
          </div>

          {/* Model Scope & Geographic Limitation Notice */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              Geographic Scope &amp; Scientific Assessment Boundary
            </h4>
            <p className="text-slate-400 leading-relaxed">
              AQUORA AI machine learning and hydrodynamic models are trained specifically for <strong>point-level monitored sensor stations</strong> with calibrated bathymetry, continuous stage sensors, and verified discharge rating curves.
            </p>
            <p className="text-slate-400 leading-relaxed">
              In accordance with hydrological integrity standards, <strong>point-level predictions cannot be extrapolated across an entire river course</strong> or assigned to unmonitored waterways without physical cross-section data.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-cyan-400/90 border-t border-slate-800">
              <span>Data Source: <strong>{station.data_source || 'OpenStreetMap (OSM waterways)'}</strong></span>
              <span>&bull;</span>
              <span>Coordinates: <strong>{formatCoordinates(station.latitude, station.longitude, 4)}</strong></span>
              {station.basin_region && (
                <>
                  <span>&bull;</span>
                  <span>Basin: <strong>{station.basin_region}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Live Weather Observation for the Unmonitored River Reach */}
          {weather && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <CloudRain className="w-4 h-4 text-cyan-400" />
                  <span>Live Atmospheric Observations (Open-Meteo API)</span>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800/70">
                  ● Live Coordinates
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 text-[10px] block font-sans">Condition &amp; Temp</span>
                  <span className="text-white font-semibold flex items-center gap-1 mt-0.5">
                    <Thermometer className="w-3 h-3 text-amber-400" />
                    {weather.current_temperature_c.toFixed(1)}°C
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate font-sans">
                    {weather.weather_condition}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 text-[10px] block font-sans">Current Rain</span>
                  <span className="text-cyan-300 font-semibold flex items-center gap-1 mt-0.5">
                    <CloudRain className="w-3 h-3 text-cyan-400" />
                    {weather.current_precipitation_mm_h.toFixed(1)} mm/h
                  </span>
                  <span className="text-[10px] text-slate-400 block font-sans">
                    Wind: {weather.wind_speed_kmh.toFixed(0)} km/h
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 text-[10px] block font-sans">Past 24h Rain</span>
                  <span className="text-indigo-300 font-semibold flex items-center gap-1 mt-0.5">
                    <Gauge className="w-3 h-3 text-indigo-400" />
                    {weather.accumulated_24h_rainfall_mm.toFixed(1)} mm
                  </span>
                  <span className="text-[10px] text-slate-400 block font-sans">
                    Forecast: {weather.forecast_24h_rainfall_mm.toFixed(1)} mm
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
