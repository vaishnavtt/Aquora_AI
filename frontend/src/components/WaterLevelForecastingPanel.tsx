import React, { useState, useEffect } from 'react';
import {
  Waves,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Info,
  Clock,
  Database,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Radio,
  RefreshCw,
  Key,
  Calendar,
  MapPin,
  ExternalLink,
  Activity
} from 'lucide-react';
import { api, HISTORICAL_SAMPLE_SCENARIOS, HistoricalScenario } from '../services/api';
import {
  WaterLevelForecastResponse,
  HourlyReading,
  RiverDataResponse,
  RiverDataStatus,
  ForecastVsObservationResponse,
  HistoricalSeriesResponse
} from '../types';

export const WaterLevelForecastingPanel: React.FC = () => {
  // Telemetry Station Status State
  const [stationQuery, setStationQuery] = useState<'RAMAMANGALAM-BRIDGE' | 'USGS-11164500'>('RAMAMANGALAM-BRIDGE');
  const [riverData, setRiverData] = useState<RiverDataResponse | null>(null);
  const [riverLoading, setRiverLoading] = useState<boolean>(true);
  const [riverError, setRiverError] = useState<string | null>(null);
  const [telemetryMode, setTelemetryMode] = useState<'auto' | 'historical'>('auto');

  // Ground-Truth Evaluation & Historical Series State
  const [forecastVsObs, setForecastVsObs] = useState<ForecastVsObservationResponse | null>(null);
  const [historySeries, setHistorySeries] = useState<HistoricalSeriesResponse | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState<boolean>(false);

  // Forecasting Pipeline State
  const [selectedScenario, setSelectedScenario] = useState<HistoricalScenario>(
    HISTORICAL_SAMPLE_SCENARIOS[0]
  );
  const [readings, setReadings] = useState<HourlyReading[]>(HISTORICAL_SAMPLE_SCENARIOS[0].readings);
  const [loading, setLoading] = useState<boolean>(false);
  const [forecastResult, setForecastResult] = useState<WaterLevelForecastResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch ground-truth evaluation and historical series
  const fetchEvaluationData = async (targetStation: string) => {
    setEvaluationLoading(true);
    try {
      const cleanName = targetStation === 'USGS-11164500' ? 'USGS 11164500' : 'RAMAMANGALAM BRIDGE';
      const [vsObs, hist] = await Promise.all([
        api.getForecastVsObservation(cleanName, 8).catch(() => null),
        api.getRiverHistory(cleanName, 12).catch(() => null)
      ]);
      setForecastVsObs(vsObs);
      setHistorySeries(hist);
    } catch {
      // Non-fatal
    } finally {
      setEvaluationLoading(false);
    }
  };

  // Fetch river station telemetry on mount, station change, or mode change
  const fetchRiverTelemetry = async (
    targetStation: 'RAMAMANGALAM-BRIDGE' | 'USGS-11164500' = stationQuery,
    mode: 'auto' | 'historical' = telemetryMode
  ) => {
    setRiverLoading(true);
    setRiverError(null);
    try {
      const data = await api.getRiverData(targetStation, mode);
      setRiverData(data);
    } catch (err: any) {
      setRiverError(err.message || 'Failed to fetch river telemetry status');
    } finally {
      setRiverLoading(false);
    }
  };

  useEffect(() => {
    fetchRiverTelemetry(stationQuery, telemetryMode);
    fetchEvaluationData(stationQuery);
  }, [stationQuery, telemetryMode]);

  const handleScenarioChange = (scenario: HistoricalScenario) => {
    setSelectedScenario(scenario);
    setReadings(scenario.readings);
    setForecastResult(null);
    setErrorMsg(null);
  };

  const handleRunForecast = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.forecastWaterLevel({
        station_name: selectedScenario.station_name,
        readings: readings,
      });
      setForecastResult(response);
    } catch (err: any) {
      setErrorMsg(err.message || 'Forecast calculation failed');
    } finally {
      setLoading(false);
    }
  };

  // Helper to render status badge with distinct colors & icons
  const renderStatusBadge = (status?: RiverDataStatus) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-700/80 shadow-sm shadow-emerald-950">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -ml-3" />
            LIVE TELEMETRY
          </span>
        );
      case 'CACHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-700/80">
            <Database className="w-3 h-3 text-cyan-400" />
            CACHED TELEMETRY
          </span>
        );
      case 'HISTORICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-700/80">
            <Calendar className="w-3 h-3 text-amber-400" />
            HISTORICAL ARCHIVE
          </span>
        );
      case 'UNAVAILABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-rose-300 border border-rose-800/80">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            LIVE FEED UNAVAILABLE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* TOP BANNER & ETHICAL NOTICE                                   */}
      {/* ============================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800">
                Hydrodynamic Forecasting Engine
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-950 text-purple-400 border border-purple-800 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                Station: RAMAMANGALAM BRIDGE
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                District: ERNAKULAM, KERALA
              </span>
            </div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Waves className="w-6 h-6 text-cyan-400" />
              River Water-Level Telemetry &amp; AI/ML Forecasting
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Official hydrological telemetry integration for Kerala State Water Resources Department (Kerala SW).
              Clearly distinguishes genuine live streams, cached responses, confirmed historical telemetry, and service availability.
            </p>
          </div>

          <button
            onClick={handleRunForecast}
            disabled={loading}
            className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
              loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20 active:scale-95'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Computing Stage Forecast...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run Forecast (POST /api/v1/forecast/water-level)</span>
              </>
            )}
          </button>
        </div>

        {/* Mandatory Hydrological & Data Ethics Notice */}
        <div className="mt-4 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start gap-3">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400 leading-relaxed">
            <span className="text-cyan-300 font-semibold">Hydrological Scope &amp; Ethical Guardrails:</span>{' '}
            This pipeline computes an experimental <span className="text-slate-200 font-semibold">1-hour-ahead river water level (stage height in metres)</span> using hydrodynamic momentum features.
            It does <span className="text-slate-200 font-semibold">NOT predict drowning incidents</span>, does not assess swimmer vulnerability, and does <span className="text-slate-200 font-semibold">NOT issue validated public flood warnings</span>.
            Sensor readings are never fabricated or relabeled as live telemetry without genuine government telemetry authentication.
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: RIVER TELEMETRY STATUS & CURRENT READING            */}
      {/* Dedicated endpoint: GET /api/v1/river-data/RAMAMANGALAM-BRIDGE */}
      {/* ============================================================== */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                River Telemetry Station Status: {stationQuery === 'RAMAMANGALAM-BRIDGE' ? 'RAMAMANGALAM BRIDGE (Kerala SW)' : 'STANFORD CREEK (USGS NWIS)'}
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Dedicated Endpoint: GET /api/v1/river-data/{stationQuery}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Station Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setStationQuery('RAMAMANGALAM-BRIDGE')}
                className={`px-2.5 py-1 rounded font-semibold transition-all ${
                  stationQuery === 'RAMAMANGALAM-BRIDGE'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ramamangalam (Kerala SW)
              </button>
              <button
                onClick={() => setStationQuery('USGS-11164500')}
                className={`px-2.5 py-1 rounded font-semibold transition-all ${
                  stationQuery === 'USGS-11164500'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Stanford Creek (USGS Live)
              </button>
            </div>

            {/* Mode Selector (applicable to Ramamangalam) */}
            {stationQuery === 'RAMAMANGALAM-BRIDGE' && (
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => setTelemetryMode('auto')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    telemetryMode === 'auto'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Live Feed Check
                </button>
                <button
                  onClick={() => setTelemetryMode('historical')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    telemetryMode === 'historical'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Historical Archive
                </button>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => fetchRiverTelemetry(stationQuery, telemetryMode)}
              disabled={riverLoading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
              title="Refresh telemetry status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${riverLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Telemetry Status Grid */}
        {riverLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Querying upstream river telemetry provider...</span>
          </div>
        ) : riverError ? (
          <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            <div>
              <div className="font-bold">Telemetry Service Failure:</div>
              <div>{riverError}</div>
            </div>
          </div>
        ) : riverData ? (
          <div className="space-y-4">
            {/* Top Cards: Status, Current Observed, Time, Agency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Feed Status */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Telemetry Feed Status</span>
                <div className="mt-2">{renderStatusBadge(riverData.status)}</div>
                <span className="text-[11px] text-slate-400 mt-2 block font-mono">
                  {riverData.data_freshness}
                </span>
              </div>

              {/* Card 2: Observed Water Level (if genuine) */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Current Observed Stage</span>
                <div className="mt-1">
                  {riverData.water_level_m !== null && riverData.water_level_m !== undefined ? (
                    <div className="text-2xl font-bold font-mono text-emerald-300">
                      {riverData.water_level_m.toFixed(3)}{' '}
                      <span className="text-xs font-normal text-slate-400">m</span>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold font-mono text-slate-600">
                      —{' '}
                      <span className="text-[10px] font-normal text-rose-400/90 font-sans block mt-0.5">
                        Live stream unavailable
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                  {riverData.observation_timestamp
                    ? new Date(riverData.observation_timestamp).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'No real-time ping'}
                </span>
              </div>

              {/* Card 3: Originating Agency */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Originating Agency</span>
                <div className="text-xs font-bold text-slate-200 mt-2 line-clamp-2">
                  {riverData.data_source}
                </div>
                <span className="text-[10px] text-cyan-400/90 mt-1.5 block font-mono">
                  Basin: Muvattupuzha River
                </span>
              </div>

              {/* Card 4: Confirmed Historical Telemetry Record */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Confirmed Archive Benchmark</span>
                {riverData.latest_historical_reading ? (
                  <div className="mt-1">
                    <div className="text-2xl font-bold font-mono text-amber-300">
                      {riverData.latest_historical_reading.water_level_m.toFixed(3)}{' '}
                      <span className="text-xs font-normal text-slate-400">m</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                      {riverData.latest_historical_reading.timestamp}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 mt-1 block">Archive reference loaded</span>
                )}
              </div>
            </div>

            {/* Advisory Notice & Official Access Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Telemetry Notice */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-start gap-2.5 text-xs text-slate-400">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-300 font-semibold block mb-0.5">Telemetry Provider Advisory:</span>
                  <span>{riverData.notice}</span>
                </div>
              </div>

              {/* Official Gateway Access Requirements */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-start gap-2.5 text-xs text-slate-400">
                <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-amber-300 font-semibold block mb-0.5">Official Live Access Requirements:</span>
                  <span>
                    {riverData.access_requirements ||
                      'National Water Data Portal (NWDP / NWIC) Ministry of Jal Shakti clearance required for streaming endpoints.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ============================================================== */}
      {/* SECTION 2: HISTORICAL DEMONSTRATION SEQUENCES (INPUT DATA)     */}
      {/* ============================================================== */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
              Historical Telemetry Demonstration Sequences (Kerala SW 2024 Records)
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              These verified 13-hour historical sequences demonstrate model behavior across rising, falling, and baseflow hydrological regimes.
            </p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800 self-start sm:self-auto">
            13 Consecutive Hourly Pings ($t-12$ to $t$)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {HISTORICAL_SAMPLE_SCENARIOS.map((sc) => {
            const isSelected = selectedScenario.id === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => handleScenarioChange(sc)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-500/80 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{sc.title}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{sc.description}</p>
                <div className="mt-2 text-[10px] font-mono text-cyan-400">
                  Range: {sc.readings[0].water_level_m.toFixed(2)}m &rarr;{' '}
                  {sc.readings[sc.readings.length - 1].water_level_m.toFixed(2)}m
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 3: EXPERIMENTAL 1-HOUR-AHEAD FORECAST (OUTPUT)         */}
      {/* ============================================================== */}
      {forecastResult && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/50 rounded-2xl p-6 shadow-xl shadow-cyan-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                1-Hour-Ahead Stage Forecast Output ({forecastResult.forecast_horizon})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-800">
                Champion Model: {forecastResult.model_type}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Metric 1: Current Level */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Current Stage (wl_t)</span>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                {forecastResult.current_water_level_m.toFixed(3)}{' '}
                <span className="text-xs font-normal text-slate-400">m</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                Observation: {new Date(forecastResult.latest_observation_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Metric 2: Persistence Baseline */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Persistence Benchmark</span>
              <div className="text-2xl font-bold font-mono text-slate-300 mt-1">
                {forecastResult.persistence_baseline_m.toFixed(3)}{' '}
                <span className="text-xs font-normal text-slate-400">m</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Naive persistence (wl_t+1 = wl_t)</span>
            </div>

            {/* Metric 3: ML Forecasted Level */}
            <div className="bg-gradient-to-br from-cyan-950/50 to-blue-950/50 border border-cyan-600/70 rounded-xl p-4">
              <span className="text-[10px] text-cyan-400 uppercase font-mono block font-bold">
                Forecasted Next Hour (t+1)
              </span>
              <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">
                {forecastResult.forecasted_water_level_m.toFixed(3)}{' '}
                <span className="text-xs font-normal text-cyan-400">m</span>
              </div>
              <span className="text-[10px] text-cyan-400/90 mt-1 block font-mono">
                Target: {new Date(forecastResult.forecast_target_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Metric 4: Predicted Delta / Trend */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Predicted Hourly Rate</span>
              <div className="flex items-center gap-1.5 mt-1">
                {forecastResult.rate_of_change_trend === 'rising' ? (
                  <TrendingUp className="w-5 h-5 text-amber-400 shrink-0" />
                ) : forecastResult.rate_of_change_trend === 'falling' ? (
                  <TrendingDown className="w-5 h-5 text-cyan-400 shrink-0" />
                ) : (
                  <Minus className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <div
                  className={`text-2xl font-bold font-mono ${
                    forecastResult.rate_of_change_trend === 'rising'
                      ? 'text-amber-400'
                      : forecastResult.rate_of_change_trend === 'falling'
                      ? 'text-cyan-400'
                      : 'text-slate-300'
                  }`}
                >
                  {forecastResult.predicted_delta_m >= 0 ? '+' : ''}
                  {(forecastResult.predicted_delta_m * 100).toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-400">cm</span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 block tracking-wider font-mono">
                Trend: {forecastResult.rate_of_change_trend}
              </span>
            </div>
          </div>

          {/* Model Accuracy Benchmark Strip */}
          <div className="mt-4 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong className="text-slate-200">Test Set Benchmark (2024 Monsoon):</strong> MAE = 1.04 cm vs Persistence 1.71 cm (39.1% error reduction) | RMSE = 1.45 cm (48.3% error reduction).
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 self-start md:self-auto shrink-0">
              Zero Lookahead Leakage
            </span>
          </div>

          <div className="mt-2.5 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{forecastResult.notice}</span>
          </div>
        </div>
      )}

      {/* Error Message if API fails */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <div>
            <div className="font-bold">Forecast Inference Error:</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 4: GROUND-TRUTH EVALUATION: FORECAST VS ACTUAL         */}
      {/* ============================================================== */}
      {forecastVsObs && forecastVsObs.comparisons && forecastVsObs.comparisons.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Ground-Truth Model Evaluation: Forecast vs. Actual Observation
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates the Ridge hydrodynamic momentum model against consecutive ground-truth observations (wl_t+1) recorded at {forecastVsObs.station_name}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800">
                Model MAE: {(forecastVsObs.model_mae_m * 1000).toFixed(1)} mm
              </span>
              <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                Persistence MAE: {(forecastVsObs.baseline_persistence_mae_m * 1000).toFixed(1)} mm
              </span>
              <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                Error Reduction: {forecastVsObs.mae_reduction_percent.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Target Time</th>
                  <th className="py-2.5 px-3">Actual (wl_t+1)</th>
                  <th className="py-2.5 px-3">Ridge Forecast (t+1)</th>
                  <th className="py-2.5 px-3">Persistence (wl_t)</th>
                  <th className="py-2.5 px-3">Model Error</th>
                  <th className="py-2.5 px-3">Persistence Error</th>
                  <th className="py-2.5 px-3 text-right">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {forecastVsObs.comparisons.map((pt, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-300">
                      {new Date(pt.target_timestamp).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-300">
                      {pt.actual_water_level_1h.toFixed(3)} m
                    </td>
                    <td className="py-2.5 px-3 font-bold text-cyan-300">
                      {pt.forecasted_water_level_1h.toFixed(3)} m
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {pt.water_level_t.toFixed(3)} m
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      {(pt.absolute_error_m * 1000).toFixed(1)} mm
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {(pt.baseline_persistence_error_m * 1000).toFixed(1)} mm
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {pt.model_beat_persistence ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Outperformed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          <Minus className="w-3 h-3" />
                          Par
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-[10px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Basis: {forecastVsObs.evaluation_dataset}</span>
            <span>Evaluated: {forecastVsObs.comparisons.length} ground-truth intervals</span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 5: HISTORICAL WATER LEVEL & DISCHARGE ARCHIVE          */}
      {/* ============================================================== */}
      {historySeries && historySeries.readings && historySeries.readings.length > 0 && (() => {
        const levels = historySeries.readings.map(r => r.water_level_m);
        const minStage = Math.min(...levels);
        const maxStage = Math.max(...levels);
        const avgStage = levels.reduce((a, b) => a + b, 0) / levels.length;

        return (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Historical Water Level &amp; Discharge Trend Archive
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official hydrological records from {historySeries.data_source} ({historySeries.total_records} hourly data points).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Min Stage: {minStage.toFixed(3)} m
                </span>
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Max Stage: {maxStage.toFixed(3)} m
                </span>
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  Avg Stage: {avgStage.toFixed(3)} m
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Water Level (m)</th>
                    <th className="py-2 px-3">Discharge (m³/s)</th>
                    <th className="py-2 px-3">Source Provider</th>
                    <th className="py-2 px-3 text-right">Stage Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {historySeries.readings.map((item, idx) => {
                    const prevLevel = idx > 0 ? historySeries.readings[idx - 1].water_level_m : item.water_level_m;
                    const delta = item.water_level_m - prevLevel;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2 px-3 text-slate-300">
                          {new Date(item.timestamp).toLocaleString([], {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2 px-3 font-bold text-amber-300">
                          {item.water_level_m.toFixed(3)} m
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {item.flow_rate_cms !== null && item.flow_rate_cms !== undefined
                            ? `${item.flow_rate_cms.toFixed(2)} m³/s`
                            : '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[10px]">
                          {item.source}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {idx === 0 ? (
                            <span className="text-slate-600">—</span>
                          ) : (
                            <span className={delta > 0 ? 'text-amber-400' : delta < 0 ? 'text-cyan-400' : 'text-slate-500'}>
                              {delta >= 0 ? '+' : ''}{(delta * 100).toFixed(1)} cm
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* OBSERVATIONS INPUT SEQUENCE TABLE                              */}
      {/* ============================================================== */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Consecutive Hourly Telemetry Input Sequence ({readings.length} Observations)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              These 13 readings compute 25 lagged, rolling, and kinematic features ($t-12$ to $t$).
            </p>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-800/60 self-start sm:self-auto">
            Station: RAMAMANGALAM BRIDGE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
                <th className="py-2 px-3">Step</th>
                <th className="py-2 px-3">Observation Time (UTC)</th>
                <th className="py-2 px-3">Water Level (m)</th>
                <th className="py-2 px-3">Lag Role</th>
                <th className="py-2 px-3 text-right">Hourly Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {readings.map((r, i) => {
                const prev = i > 0 ? readings[i - 1].water_level_m : r.water_level_m;
                const diff = r.water_level_m - prev;
                const isCurrent = i === readings.length - 1;
                return (
                  <tr
                    key={r.timestamp}
                    className={isCurrent ? 'bg-cyan-950/30 text-cyan-200 font-bold' : 'text-slate-300 hover:bg-slate-800/40'}
                  >
                    <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                    <td className="py-2 px-3 text-slate-300">{r.timestamp}</td>
                    <td className="py-2 px-3 text-white font-bold">{r.water_level_m.toFixed(3)} m</td>
                    <td className="py-2 px-3 text-slate-400">
                      {isCurrent ? (
                        <span className="text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded text-[10px] border border-cyan-800">
                          Current (wl_t)
                        </span>
                      ) : i === readings.length - 2 ? (
                        'lag_1h (t-1)'
                      ) : i === readings.length - 3 ? (
                        'lag_2h (t-2)'
                      ) : i === readings.length - 4 ? (
                        'lag_3h (t-3)'
                      ) : i === readings.length - 7 ? (
                        'lag_6h (t-6)'
                      ) : i === 0 ? (
                        'lag_12h (t-12)'
                      ) : (
                        `t-${readings.length - 1 - i}h`
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {i === 0 ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <span className={diff > 0 ? 'text-amber-400' : diff < 0 ? 'text-cyan-400' : 'text-slate-500'}>
                          {diff >= 0 ? '+' : ''}
                          {(diff * 100).toFixed(1)} cm
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
