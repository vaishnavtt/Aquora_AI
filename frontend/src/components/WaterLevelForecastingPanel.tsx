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

type StationQueryType = 'RAMAMANGALAM-BRIDGE' | 'PALA' | 'TRINAYAKUDAM' | 'USGS-11164500' | 'MANIYAR-DAM';

export const WaterLevelForecastingPanel: React.FC = () => {
  // Telemetry Station Status State
  const [stationQuery, setStationQuery] = useState<StationQueryType>('RAMAMANGALAM-BRIDGE');
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
      let cleanName = targetStation;
      if (targetStation === 'USGS-11164500') cleanName = 'USGS 11164500';
      else if (targetStation === 'RAMAMANGALAM-BRIDGE') cleanName = 'RAMAMANGALAM BRIDGE';
      else if (targetStation === 'MANIYAR-DAM') cleanName = 'MANIYAR DAM';
      else if (targetStation === 'PALA') cleanName = 'PALA';
      else if (targetStation === 'TRINAYAKUDAM') cleanName = 'TRINAYAKUDAM';

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
    targetStation: StationQueryType = stationQuery,
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 -ml-2.5" />
            LIVE TELEMETRY
          </span>
        );
      case 'CACHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#1677D2] border border-[#BFDBFE]">
            <Database className="w-3.5 h-3.5 text-[#1677D2]" />
            CACHED TELEMETRY
          </span>
        );
      case 'HISTORICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            HISTORICAL ARCHIVE
          </span>
        );
      case 'UNAVAILABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
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
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1677D2] border border-[#BFDBFE]">
                Hydrodynamic Forecasting Engine
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-purple-600" />
                Station: RAMAMANGALAM BRIDGE
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">
                District: ERNAKULAM, KERALA
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#172B4D] flex items-center gap-2">
              <Waves className="w-6 h-6 text-[#1677D2]" />
              River Water-Level Telemetry &amp; AI/ML Forecasting
            </h1>
            <p className="text-xs text-[#64748B] mt-1 max-w-3xl leading-relaxed">
              Official hydrological telemetry integration for Kerala State Water Resources Department (Kerala SW).
              Clearly distinguishes genuine live streams, cached responses, confirmed historical telemetry, and service availability.
            </p>
          </div>

          <button
            onClick={handleRunForecast}
            disabled={loading}
            className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
              loading
                ? 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed'
                : 'bg-[#1677D2] hover:bg-[#125FA8] text-white active:scale-98'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed font-sans">
            <span className="font-bold text-amber-950">Hydrological Scope &amp; Ethical Guardrails:</span>{' '}
            This pipeline computes an experimental <span className="font-bold">1-hour-ahead river water level (stage height in metres)</span> using hydrodynamic momentum features.
            It does <span className="font-bold text-rose-700">NOT predict drowning incidents</span>, does not assess swimmer vulnerability, and does <span className="font-bold text-rose-700">NOT issue validated public flood warnings</span>.
            Sensor readings are never fabricated or relabeled as live telemetry without genuine government telemetry authentication.
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: RIVER TELEMETRY STATUS & CURRENT READING            */}
      {/* ============================================================== */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#1677D2]" />
              <h2 className="text-sm font-bold text-[#172B4D]">
                Station Status: {stationQuery.replace('-', ' ')}
              </h2>
            </div>
            <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
              Dedicated Endpoint: GET /api/v1/river-data/{stationQuery}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Multi-Station Selector */}
            <div className="flex flex-wrap items-center bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs gap-1">
              <button
                onClick={() => setStationQuery('RAMAMANGALAM-BRIDGE')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  stationQuery === 'RAMAMANGALAM-BRIDGE'
                    ? 'bg-[#1677D2] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#172B4D]'
                }`}
              >
                Ramamangalam
              </button>
              <button
                onClick={() => setStationQuery('PALA')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  stationQuery === 'PALA'
                    ? 'bg-[#1677D2] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#172B4D]'
                }`}
              >
                Pala
              </button>
              <button
                onClick={() => setStationQuery('TRINAYAKUDAM')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  stationQuery === 'TRINAYAKUDAM'
                    ? 'bg-[#1677D2] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#172B4D]'
                }`}
              >
                Trinayakudam
              </button>
              <button
                onClick={() => setStationQuery('MANIYAR-DAM')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  stationQuery === 'MANIYAR-DAM'
                    ? 'bg-[#1677D2] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#172B4D]'
                }`}
              >
                Maniyar Dam
              </button>
              <button
                onClick={() => setStationQuery('USGS-11164500')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  stationQuery === 'USGS-11164500'
                    ? 'bg-[#1677D2] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#172B4D]'
                }`}
              >
                USGS Benchmark
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs">
              <button
                onClick={() => setTelemetryMode('auto')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  telemetryMode === 'auto'
                    ? 'bg-white text-[#1677D2] border border-[#CBD5E1] shadow-xs'
                    : 'text-[#64748B] hover:text-[#172B4D]'
                }`}
              >
                Auto-Detect
              </button>
              <button
                onClick={() => setTelemetryMode('historical')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  telemetryMode === 'historical'
                    ? 'bg-white text-[#1677D2] border border-[#CBD5E1] shadow-xs'
                    : 'text-[#64748B] hover:text-[#172B4D]'
                }`}
              >
                Force Historical
              </button>
            </div>
          </div>
        </div>

        {riverLoading ? (
          <div className="p-8 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-[#1677D2] animate-spin mx-auto" />
            <span className="text-xs text-[#64748B]">Querying station telemetry provider...</span>
          </div>
        ) : riverError ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{riverError}</span>
          </div>
        ) : riverData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Data Status Pill */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
                <span className="text-[10px] text-[#64748B] uppercase font-mono block">Data Stream State</span>
                <div className="mt-2">{renderStatusBadge(riverData.status)}</div>
                <span className="text-[10px] text-[#64748B] mt-2 block font-mono">
                  Source: {riverData.data_source}
                </span>
              </div>

              {/* Card 2: Current Water Level (Stage) */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
                <span className="text-[10px] text-[#64748B] uppercase font-mono block">Current River Stage</span>
                {riverData.water_level_m !== null && riverData.water_level_m !== undefined ? (
                  <div className="mt-1">
                    <div className="text-2xl font-bold font-mono text-[#16A34A]">
                      {riverData.water_level_m.toFixed(3)}{' '}
                      <span className="text-xs font-normal text-[#64748B]">m</span>
                    </div>
                    <span className="text-[10px] text-[#64748B] mt-1 block font-mono">
                      {riverData.observation_timestamp ? new Date(riverData.observation_timestamp).toLocaleString() : 'Timestamp unrecorded'}
                    </span>
                  </div>
                ) : (
                  <div className="mt-1">
                    <span className="text-xs text-[#CA8A04] block font-mono">
                      {riverData.notice || 'Unavailable'}
                    </span>
                    <span className="text-[10px] text-[#64748B] mt-1 block font-mono">
                      {riverData.observation_timestamp ? new Date(riverData.observation_timestamp).toLocaleString() : 'Timestamp unrecorded'}
                    </span>
                  </div>
                )}
              </div>

              {/* Card 3: Discharge / Basin Detail */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
                <span className="text-[10px] text-[#64748B] uppercase font-mono block">Flow Velocity / Discharge</span>
                <div className="mt-1">
                  <div className="text-2xl font-bold font-mono text-[#172B4D]">
                    {riverData.flow_rate_cms !== null && riverData.flow_rate_cms !== undefined
                      ? `${riverData.flow_rate_cms.toFixed(2)}`
                      : '—'}{' '}
                    <span className="text-xs font-normal text-[#64748B]">m³/s</span>
                  </div>
                  <span className="text-[10px] text-[#1677D2] mt-1 block font-mono font-medium">
                    Basin: Muvattupuzha River
                  </span>
                </div>
              </div>

              {/* Card 4: Confirmed Historical Telemetry Record */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
                <span className="text-[10px] text-[#64748B] uppercase font-mono block">Confirmed Archive Benchmark</span>
                {riverData.latest_historical_reading ? (
                  <div className="mt-1">
                    <div className="text-2xl font-bold font-mono text-amber-700">
                      {riverData.latest_historical_reading.water_level_m.toFixed(3)}{' '}
                      <span className="text-xs font-normal text-[#64748B]">m</span>
                    </div>
                    <span className="text-[10px] text-[#64748B] mt-1 block font-mono">
                      {riverData.latest_historical_reading.timestamp}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-[#64748B] mt-1 block">Archive reference loaded</span>
                )}
              </div>
            </div>

            {/* Advisory Notice & Official Access Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-2.5 text-xs text-[#64748B]">
                <Info className="w-4 h-4 text-[#1677D2] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#172B4D] font-bold block mb-0.5">Telemetry Provider Advisory:</span>
                  <span>{riverData.notice}</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-2.5 text-xs text-[#64748B]">
                <Key className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-amber-800 font-bold block mb-0.5">Official Live Access Requirements:</span>
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
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <span className="text-xs font-bold text-[#172B4D]">
              Historical Telemetry Demonstration Sequences (Kerala SW 2024 Records)
            </span>
            <p className="text-xs text-[#64748B] mt-0.5">
              These verified 13-hour historical sequences demonstrate model behavior across rising, falling, and baseflow hydrological regimes.
            </p>
          </div>
          <span className="text-xs text-[#64748B] font-mono bg-[#F8FAFC] px-2.5 py-1 rounded-lg border border-[#E2E8F0] self-start sm:self-auto">
            13 Consecutive Hourly Pings (t-12 to t)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {HISTORICAL_SAMPLE_SCENARIOS.map((sc) => {
            const isSelected = selectedScenario.id === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => handleScenarioChange(sc)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#EFF6FF] border-[#BFDBFE] shadow-xs'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#172B4D]">{sc.title}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#1677D2]" />}
                </div>
                <p className="text-xs text-[#64748B] mt-1 line-clamp-2 leading-relaxed">{sc.description}</p>
                <div className="mt-2 text-xs font-mono text-[#1677D2] font-semibold">
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
        <div className="bg-white border border-[#BFDBFE] rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
              <h2 className="text-base font-bold text-[#172B4D]">
                1-Hour Water Level Forecast ({forecastResult.forecast_horizon})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#1677D2] bg-[#EFF6FF] px-3 py-1 rounded-lg border border-[#BFDBFE] font-bold">
                Champion Model: {forecastResult.model_type}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Metric 1: Current Level */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
              <span className="text-[10px] text-[#64748B] uppercase font-mono block">Current Stage (wl_t)</span>
              <div className="text-2xl font-bold font-mono text-[#172B4D] mt-1">
                {forecastResult.current_water_level_m.toFixed(3)}{' '}
                <span className="text-xs font-normal text-[#64748B]">m</span>
              </div>
              <span className="text-[10px] text-[#64748B] mt-1 block font-mono">
                Observation: {new Date(forecastResult.latest_observation_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Metric 2: Persistence Baseline */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
              <span className="text-[10px] text-[#64748B] uppercase font-mono block">Persistence Benchmark</span>
              <div className="text-2xl font-bold font-mono text-[#172B4D] mt-1">
                {forecastResult.persistence_baseline_m.toFixed(3)}{' '}
                <span className="text-xs font-normal text-[#64748B]">m</span>
              </div>
              <span className="text-[10px] text-[#64748B] mt-1 block">Naive persistence (wl_t+1 = wl_t)</span>
            </div>

            {/* Metric 3: ML Forecasted Level */}
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 shadow-xs">
              <span className="text-[10px] text-[#1677D2] uppercase font-mono block font-bold">
                Forecasted Next Hour (t+1)
              </span>
              <div className="text-2xl font-bold font-mono text-[#1677D2] mt-1">
                {forecastResult.forecasted_water_level_m.toFixed(3)}{' '}
                <span className="text-xs font-normal text-[#1677D2]">m</span>
              </div>
              <span className="text-[10px] text-[#1677D2] mt-1 block font-mono font-medium">
                Target: {new Date(forecastResult.forecast_target_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Metric 4: Predicted Delta / Trend */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
              <span className="text-[10px] text-[#64748B] uppercase font-mono block">Predicted Hourly Rate</span>
              <div className="flex items-center gap-1.5 mt-1">
                {forecastResult.rate_of_change_trend === 'rising' ? (
                  <TrendingUp className="w-5 h-5 text-amber-600 shrink-0" />
                ) : forecastResult.rate_of_change_trend === 'falling' ? (
                  <TrendingDown className="w-5 h-5 text-[#1677D2] shrink-0" />
                ) : (
                  <Minus className="w-5 h-5 text-[#64748B] shrink-0" />
                )}
                <div
                  className={`text-2xl font-bold font-mono ${
                    forecastResult.rate_of_change_trend === 'rising'
                      ? 'text-amber-700'
                      : forecastResult.rate_of_change_trend === 'falling'
                      ? 'text-[#1677D2]'
                      : 'text-[#172B4D]'
                  }`}
                >
                  {forecastResult.predicted_delta_m >= 0 ? '+' : ''}
                  {(forecastResult.predicted_delta_m * 100).toFixed(1)}{' '}
                  <span className="text-xs font-normal text-[#64748B]">cm</span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-[#64748B] mt-1 block tracking-wider font-mono">
                Trend: {forecastResult.rate_of_change_trend}
              </span>
            </div>
          </div>

          {/* Model Accuracy Benchmark Strip */}
          <div className="mt-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#64748B] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span>
                <strong className="text-[#172B4D]">Test Set Benchmark (2024 Monsoon):</strong> MAE = 1.04 cm vs Persistence 1.71 cm (39.1% error reduction) | RMSE = 1.45 cm (48.3% error reduction).
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#16A34A] bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 self-start md:self-auto shrink-0 font-bold">
              Zero Lookahead Leakage
            </span>
          </div>

          <div className="mt-2.5 p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#64748B] flex items-center gap-2 shadow-xs">
            <Info className="w-4 h-4 text-[#64748B] shrink-0" />
            <span>{forecastResult.notice}</span>
          </div>
        </div>
      )}

      {/* Error Message if API fails */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <div>
            <div className="font-bold">Forecast Inference Error:</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 4: GROUND-TRUTH EVALUATION: FORECAST VS ACTUAL         */}
      {/* ============================================================== */}
      {forecastVsObs?.model_name === 'EXCLUDED_DAM_BARRAGE' && (
        <div className="bg-white border border-amber-200 rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center gap-3 mb-3 text-amber-800">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
            <h3 className="text-sm font-bold">
              Dam &amp; Reservoir Station Excluded: {forecastVsObs.station_name}
            </h3>
          </div>
          <p className="text-xs text-[#64748B] leading-relaxed font-mono">
            {forecastVsObs.disclaimer}
          </p>
          <div className="mt-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 p-3 rounded-xl font-mono">
            Empirical Benchmark: Kinematic delta modeling yielded negative R² (-8.53) on MANIYAR DAM due to unmonitored crest gate and spillway operations. Modeling is mathematically unsuitable until operational dam telemetry is integrated.
          </div>
        </div>
      )}

      {forecastVsObs && forecastVsObs.comparisons && forecastVsObs.comparisons.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#16A34A]" />
                <h3 className="text-sm font-bold text-[#172B4D]">
                  Model Accuracy: Forecast vs. Actual Observation
                </h3>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Evaluates the calibrated Ridge hydrodynamic delta model against consecutive ground-truth observations (wl_t+1) recorded at {forecastVsObs.station_name}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Model MAE: {(forecastVsObs.model_mae_m * 1000).toFixed(1)} mm
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">
                Persistence MAE: {(forecastVsObs.baseline_persistence_mae_m * 1000).toFixed(1)} mm
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-[#EFF6FF] text-[#1677D2] border border-[#BFDBFE]">
                Error Reduction: {forecastVsObs.mae_reduction_percent.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#F8FAFC]">
                <tr className="border-b border-[#E2E8F0] text-[10px] text-[#64748B] uppercase font-bold">
                  <th className="py-3 px-3.5">Target Time</th>
                  <th className="py-3 px-3.5">Actual (wl_t+1)</th>
                  <th className="py-3 px-3.5">Ridge Forecast (t+1)</th>
                  <th className="py-3 px-3.5">Persistence (wl_t)</th>
                  <th className="py-3 px-3.5">Model Error</th>
                  <th className="py-3 px-3.5">Persistence Error</th>
                  <th className="py-3 px-3.5 text-right">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white text-xs">
                {forecastVsObs.comparisons.map((pt, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-3.5 text-[#64748B]">
                      {new Date(pt.target_timestamp).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-[#16A34A]">
                      {pt.actual_water_level_1h.toFixed(3)} m
                    </td>
                    <td className="py-3 px-3.5 font-bold text-[#1677D2]">
                      {pt.forecasted_water_level_1h.toFixed(3)} m
                    </td>
                    <td className="py-3 px-3.5 text-[#64748B]">
                      {pt.water_level_t.toFixed(3)} m
                    </td>
                    <td className="py-3 px-3.5 text-[#172B4D] font-medium">
                      {(pt.absolute_error_m * 1000).toFixed(1)} mm
                    </td>
                    <td className="py-3 px-3.5 text-[#64748B]">
                      {(pt.baseline_persistence_error_m * 1000).toFixed(1)} mm
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      {pt.model_beat_persistence ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Outperformed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">
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

          <div className="mt-3.5 text-xs text-[#64748B] font-mono flex items-center justify-between border-t border-[#E2E8F0] pt-3">
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
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E2E8F0]">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-[#172B4D]">
                    Water Level &amp; Flow History
                  </h3>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Official hydrological records from {historySeries.data_source} ({historySeries.total_records} hourly data points).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">
                  Min Stage: {minStage.toFixed(3)} m
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">
                  Max Stage: {maxStage.toFixed(3)} m
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Avg Stage: {avgStage.toFixed(3)} m
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#F8FAFC]">
                  <tr className="border-b border-[#E2E8F0] text-[10px] text-[#64748B] uppercase font-bold">
                    <th className="py-3 px-3.5">Timestamp</th>
                    <th className="py-3 px-3.5">Water Level (m)</th>
                    <th className="py-3 px-3.5">Discharge (m³/s)</th>
                    <th className="py-3 px-3.5">Source Provider</th>
                    <th className="py-3 px-3.5 text-right">Stage Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white text-xs">
                  {historySeries.readings.map((item, idx) => {
                    const prevLevel = idx > 0 ? historySeries.readings[idx - 1].water_level_m : item.water_level_m;
                    const delta = item.water_level_m - prevLevel;
                    return (
                      <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-3.5 text-[#64748B]">
                          {new Date(item.timestamp).toLocaleString([], {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-amber-700">
                          {item.water_level_m.toFixed(3)} m
                        </td>
                        <td className="py-3 px-3.5 text-[#172B4D]">
                          {item.flow_rate_cms !== null && item.flow_rate_cms !== undefined
                            ? `${item.flow_rate_cms.toFixed(2)} m³/s`
                            : '—'}
                        </td>
                        <td className="py-3 px-3.5 text-[#64748B] text-xs">
                          {item.source}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          {idx === 0 ? (
                            <span className="text-[#94A3B8]">—</span>
                          ) : (
                            <span className={delta > 0 ? 'text-amber-700 font-bold' : delta < 0 ? 'text-[#1677D2] font-bold' : 'text-[#64748B]'}>
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
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-xs font-bold text-[#172B4D] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1677D2]" />
              Hourly Observation Sequence ({readings.length} Observations)
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              These 13 readings compute 25 lagged, rolling, and kinematic features (t-12 to t).
            </p>
          </div>
          <span className="text-xs font-mono text-[#1677D2] bg-[#EFF6FF] px-3 py-1 rounded-lg border border-[#BFDBFE] self-start sm:self-auto font-bold">
            Station: {selectedScenario.station_name}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC]">
              <tr className="border-b border-[#E2E8F0] text-[10px] font-mono text-[#64748B] uppercase font-bold">
                <th className="py-3 px-3.5">Step</th>
                <th className="py-3 px-3.5">Observation Time (UTC)</th>
                <th className="py-3 px-3.5">Water Level (m)</th>
                <th className="py-3 px-3.5">Lag Role</th>
                <th className="py-3 px-3.5 text-right">Hourly Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono text-xs bg-white">
              {readings.map((r, i) => {
                const prev = i > 0 ? readings[i - 1].water_level_m : r.water_level_m;
                const diff = r.water_level_m - prev;
                const isCurrent = i === readings.length - 1;
                return (
                  <tr
                    key={r.timestamp}
                    className={isCurrent ? 'bg-[#EFF6FF] text-[#1677D2] font-bold' : 'text-[#172B4D] hover:bg-[#F8FAFC]'}
                  >
                    <td className="py-3 px-3.5 text-[#64748B]">{i + 1}</td>
                    <td className="py-3 px-3.5 text-[#64748B]">{r.timestamp}</td>
                    <td className="py-3 px-3.5 text-[#172B4D] font-bold">{r.water_level_m.toFixed(3)} m</td>
                    <td className="py-3 px-3.5 text-[#64748B]">
                      {isCurrent ? (
                        <span className="text-[#1677D2] bg-white px-2 py-0.5 rounded text-[10px] border border-[#BFDBFE] font-bold">
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
                    <td className="py-3 px-3.5 text-right">
                      {i === 0 ? (
                        <span className="text-[#94A3B8]">—</span>
                      ) : (
                        <span className={diff > 0 ? 'text-amber-700 font-bold' : diff < 0 ? 'text-[#1677D2] font-bold' : 'text-[#64748B]'}>
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
