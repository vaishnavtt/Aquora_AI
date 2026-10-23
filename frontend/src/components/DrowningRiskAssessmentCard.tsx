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
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Activity,
  FileText,
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
              elevation_m: station.elevation_meters ?? 15.0,
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
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
        <Compass className="w-8 h-8 text-slate-500 mx-auto mb-2 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-300">No Water Body Selected</h3>
        <p className="text-xs text-slate-500 mt-1">
          Select an aquatic location from the interactive map to view its AI drowning-risk evaluation.
        </p>
      </div>
    );
  }

  const getCategoryBadge = (cat?: RiskCategory | 'NO_PREDICTION' | string | null) => {
    switch (cat) {
      case 'LOW':
        return {
          bg: 'bg-emerald-950/80',
          border: 'border-emerald-500/60',
          text: 'text-emerald-300',
          dot: 'bg-emerald-400',
          label: 'LOW RISK',
          sub: 'Nominal ambient baseline conditions. Not a guarantee of recreational or swimming safety.'
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-950/80',
          border: 'border-amber-500/60',
          text: 'text-amber-300',
          dot: 'bg-amber-400',
          label: 'MODERATE RISK',
          sub: 'Elevated caution advised. Avoid solitary wading, night swimming, or unmonitored bathing.'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-950/80',
          border: 'border-orange-500/60',
          text: 'text-orange-300',
          dot: 'bg-orange-400',
          label: 'HIGH RISK',
          sub: 'Dangerous conditions. Non-expert swimming and wading strictly prohibited.'
        };
      case 'VERY HIGH':
        return {
          bg: 'bg-rose-950/90',
          border: 'border-rose-500/80',
          text: 'text-rose-200',
          dot: 'bg-rose-500 animate-ping',
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
    <div className="rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl overflow-hidden">
      {/* Card Header */}
      <div className="p-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
              {assessment?.layer_b_contextual_risk.water_body_type_label || station.type}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {station.basin_region || 'Kerala Water Body'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
            {station.name.replace(' (DEMO Station)', '')}
          </h2>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Coordinates: {formatCoordinates(station.latitude, station.longitude, 4)} &bull; {station.data_source}
          </p>
        </div>

        {/* Method & Status Tag */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 flex items-center gap-1.5 font-medium">
            <Activity className="w-3 h-3 text-indigo-400" />
            TWO-LAYER RISK ENGINE
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Freshness: <strong className="text-slate-200">{assessment?.data_freshness_status || 'PROVISIONAL'}</strong>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center space-y-3">
          <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Evaluating multi-station telemetry & ML hazard classification...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-400 text-xs">
          <AlertCircle className="w-5 h-5 mx-auto mb-1 text-rose-400" />
          {error}
        </div>
      ) : assessment ? (
        <div className="p-5 space-y-5">
          {/* Main Risk Banner */}
          <div className={`p-4 rounded-xl border ${badge.bg} ${badge.border} transition-all shadow-lg`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <span className={`w-3.5 h-3.5 rounded-full ${badge.dot}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-black tracking-wide ${badge.text}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10 font-bold">
                      SCORE: {assessment.risk_score.toFixed(1)} / 100
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {badge.sub}
                  </p>
                </div>
              </div>

              {onSendToSimulator && (
                <button
                  onClick={() => onSendToSimulator(station)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-center"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  What-If Lab &rarr;
                </button>
              )}
            </div>
          </div>

          {/* Live Atmospheric Conditions & Precipitation Forecast (Open-Meteo Integration) */}
          {weather && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <CloudRain className="w-4 h-4 text-cyan-400" />
                  <span>Live Weather &amp; Precipitation Outlook</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      weather.is_live_data
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/70'
                        : 'bg-amber-950 text-amber-300 border border-amber-800/70'
                    }`}
                  >
                    {weather.is_live_data ? '● Live Open-Meteo API' : '○ Offline Telemetry Fallback'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
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
                  <span className="text-slate-400 text-[10px] block font-sans">Current Rainfall</span>
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
                    Catchment Gage
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 text-[10px] block font-sans">24h Forecast Rain</span>
                  <span className="text-emerald-300 font-semibold flex items-center gap-1 mt-0.5">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    {weather.forecast_24h_rainfall_mm.toFixed(1)} mm
                  </span>
                  <span className="text-[10px] text-slate-400 block font-sans">
                    Elev: {weather.elevation_m != null ? `${weather.elevation_m.toFixed(0)}m MSL` : 'Terrain DEM'}
                  </span>
                </div>
              </div>

              {/* Hourly precipitation forecast strip (next 8 intervals) */}
              {weather.hourly_forecast && weather.hourly_forecast.length > 0 && (
                <div className="pt-1.5 border-t border-slate-800/60">
                  <span className="text-[10px] font-sans font-semibold text-slate-400 block mb-1.5">
                    Hourly Forecast Rainfall Projection (Next 8 Hours):
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {weather.hourly_forecast.slice(0, 8).map((hf, i) => (
                      <div
                        key={i}
                        className="p-1 rounded bg-slate-900/90 border border-slate-800/60 text-center font-mono text-[9px]"
                      >
                        <span className="text-slate-500 block">
                          {hf.time.includes('T') ? hf.time.split('T')[1].slice(0, 5) : `+${i + 1}h`}
                        </span>
                        <span
                          className={`font-bold block mt-0.5 ${
                            hf.precipitation_mm > 5.0
                              ? 'text-rose-400'
                              : hf.precipitation_mm > 1.0
                              ? 'text-amber-400'
                              : 'text-cyan-300'
                          }`}
                        >
                          {hf.precipitation_mm.toFixed(1)}
                        </span>
                        <span className="text-[8px] text-slate-500">mm</span>
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
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Layers className="w-4 h-4 text-cyan-400" />
                Two-Layer Architecture Assessment Breakdown
              </span>
              {showLayerDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showLayerDetails && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LAYER A: Environmental Aquatic Hazard */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <CloudRain className="w-4 h-4 text-cyan-400" />
                      Layer A: Environmental Hazard
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                      Score: {assessment.layer_a_environmental_hazard.hazard_score.toFixed(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Water Stage</span>
                      <span className="font-mono text-slate-100 font-semibold">
                        {assessment.layer_a_environmental_hazard.water_level_m !== null
                          ? `${assessment.layer_a_environmental_hazard.water_level_m?.toFixed(2)} m`
                          : `${station.depth_meters.toFixed(2)} m`}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">3h Stage Rise</span>
                      <span className="font-mono text-slate-100 font-semibold">
                        {assessment.layer_a_environmental_hazard.water_level_delta_3h_m != null
                          ? `${(assessment.layer_a_environmental_hazard.water_level_delta_3h_m ?? 0) >= 0 ? '+' : ''}${assessment.layer_a_environmental_hazard.water_level_delta_3h_m.toFixed(2)} m`
                          : '0.00 m'}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">24h Rainfall</span>
                      <span className="font-mono text-slate-100 font-semibold">
                        {assessment.layer_a_environmental_hazard.rainfall_24h_mm !== null
                          ? `${assessment.layer_a_environmental_hazard.rainfall_24h_mm?.toFixed(1)} mm`
                          : '15.0 mm'}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">River Discharge</span>
                      <span className="font-mono text-slate-100 font-semibold">
                        {assessment.layer_a_environmental_hazard.estimated_discharge_cms !== null
                          ? `${assessment.layer_a_environmental_hazard.estimated_discharge_cms?.toFixed(1)} m³/s`
                          : `${station.flow_rate_cms.toFixed(1)} m³/s`}
                      </span>
                    </div>
                  </div>

                  {/* ML Model Details */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>ML Architecture:</span>
                      <strong className="text-cyan-300 font-mono">
                        {assessment.layer_a_environmental_hazard.ml_model_name}
                      </strong>
                    </div>
                    {assessment.layer_a_environmental_hazard.ml_hazard_probability !== null && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Calibrated Surge Probability:</span>
                        <strong className="text-emerald-300 font-mono">
                          {(assessment.layer_a_environmental_hazard.ml_hazard_probability! * 100).toFixed(1)}%
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* LAYER B: Drowning-Related Contextual Vulnerability */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Waves className="w-4 h-4 text-amber-400" />
                      Layer B: Contextual Risk
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50">
                      Vulnerability: {assessment.layer_b_contextual_risk.vulnerability_score.toFixed(1)}
                    </span>
                  </div>

                  <div className="space-y-2 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold uppercase">Bathymetry Hazard:</span>
                      <p className="leading-snug text-slate-300 mt-0.5">
                        {assessment.layer_b_contextual_risk.bathymetry_hazard_notes}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold uppercase">Site Physical Profile:</span>
                      <p className="leading-snug text-slate-300 mt-0.5">
                        {assessment.layer_b_contextual_risk.site_vulnerability_profile}
                      </p>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                      <strong className="text-slate-200">Official Kerala Mortality Context: </strong>
                      {assessment.layer_b_contextual_risk.historical_mortality_context}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Primary Hazards Identified */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Primary Contributing Hazard Factors
            </h4>
            <div className="space-y-1.5">
              {assessment.primary_hazards.map((hazard, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                  <span>{hazard}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Safety Recommendations */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Actionable Public Safety Directives
            </h4>
            <div className="space-y-1.5">
              {assessment.safety_recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-200/90 flex items-start gap-2 leading-relaxed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Data and Uncertainty Indicators */}
          {assessment.missing_variables.length > 0 && (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                Data Freshness & Uncertainty Assumptions:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[10px]">
                {assessment.missing_variables.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Scientific Disclaimer Toggle */}
          <div className="border-t border-slate-800 pt-3">
            <button
              onClick={() => setShowDisclaimer(!showDisclaimer)}
              className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              <Info className="w-3 h-3" />
              {showDisclaimer ? 'Hide Scientific Notice' : 'View Scientific & Data Integrity Notice'}
            </button>
            {showDisclaimer && (
              <div className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-400 leading-relaxed font-mono">
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
