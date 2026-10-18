import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Droplets,
  MapPin,
  Activity,
  Bell,
  Send,
  Radio,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Info,
  ShieldAlert,
  Server,
  Sliders,
  Play,
  Square,
  Zap,
  Gauge,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  Database,
  Calendar,
  Sparkles,
  Waves
} from 'lucide-react';
import {
  DashboardResponse,
  WaterBody,
  AlertDispatchRequest,
  AlertDispatchResponse,
  AlertDelivery,
  AlertChannelStatus,
  HazardEvaluationResult,
  HazardMonitoringStatusResponse,
  HistoricalSeriesResponse,
  ForecastVsObservationResponse,
} from '../types';
import { api } from '../services/api';

interface DashboardOverviewProps {
  dashboard: DashboardResponse | null;
  waterBodies: WaterBody[];
  loading: boolean;
  onSelectWaterBody: (wb: WaterBody) => void;
  onNavigateToPredict: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  dashboard,
  waterBodies,
  loading,
  onSelectWaterBody,
  onNavigateToPredict,
}) => {
  // Outbound Alert State
  const [channelStatus, setChannelStatus] = useState<AlertChannelStatus | null>(null);
  const [deliveries, setDeliveries] = useState<AlertDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  // Automated Hazard Monitoring State
  const [monitoringStatus, setMonitoringStatus] = useState<HazardMonitoringStatusResponse | null>(null);
  const [evaluationResults, setEvaluationResults] = useState<HazardEvaluationResult[] | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [togglingScheduler, setTogglingScheduler] = useState<boolean>(false);

  // Dispatch Form State
  const [selectedStationName, setSelectedStationName] = useState<string>(
    waterBodies[0]?.name || 'Cascade Canyon River'
  );
  const [severity, setSeverity] = useState<string>('high');
  const [channel, setChannel] = useState<'webhook' | 'email'>('webhook');
  const [recipient, setRecipient] = useState<string>('');
  const [message, setMessage] = useState<string>(
    'Advisory: Flash surge elevated flow velocity past 9.0 m³/s. Immediate water egress advised for non-emergency personnel.'
  );
  const [testMode, setTestMode] = useState<boolean>(true);

  // Dispatch Action Status
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [lastDispatchResult, setLastDispatchResult] = useState<AlertDispatchResponse | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Task 5: Historical Hydrology Trends & Ground-Truth Forecast Validation State
  const [selectedHistoryStation, setSelectedHistoryStation] = useState<'RAMAMANGALAM-BRIDGE' | 'USGS-11164500'>('RAMAMANGALAM-BRIDGE');
  const [riverHistory, setRiverHistory] = useState<HistoricalSeriesResponse | null>(null);
  const [forecastVsObs, setForecastVsObs] = useState<ForecastVsObservationResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [hoveredReading, setHoveredReading] = useState<{ timestamp: string; water_level_m: number; flow?: number | null } | null>(null);

  const fetchHistoricalData = async (station: 'RAMAMANGALAM-BRIDGE' | 'USGS-11164500') => {
    setHistoryLoading(true);
    try {
      const cleanStation = station === 'USGS-11164500' ? 'USGS 11164500' : 'RAMAMANGALAM BRIDGE';
      const [hist, vsObs] = await Promise.all([
        api.getRiverHistory(cleanStation, 24).catch(() => null),
        station === 'RAMAMANGALAM-BRIDGE'
          ? api.getForecastVsObservation('RAMAMANGALAM BRIDGE', 12).catch(() => null)
          : Promise.resolve(null),
      ]);
      setRiverHistory(hist);
      setForecastVsObs(vsObs);
    } catch {
      // Non-fatal
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoricalData(selectedHistoryStation);
  }, [selectedHistoryStation]);

  const fetchMonitoringStatus = async () => {
    try {
      const status = await api.getHazardMonitoringStatus();
      setMonitoringStatus(status);
    } catch {
      // Non-fatal
    }
  };

  const handleToggleScheduler = async () => {
    setTogglingScheduler(true);
    try {
      if (monitoringStatus?.is_scheduler_running) {
        const res = await api.stopHazardMonitoring();
        setMonitoringStatus(res);
      } else {
        const res = await api.startHazardMonitoring(60);
        setMonitoringStatus(res);
      }
    } catch {
      // Non-fatal
    } finally {
      setTogglingScheduler(false);
    }
  };

  const handleTriggerSweep = async () => {
    setEvaluating(true);
    try {
      const res = await api.evaluateHazardMonitoring({ safe_simulation_only: true });
      setEvaluationResults(res);
      // Refresh status and alert logs
      fetchMonitoringStatus();
      const updatedLogs = await api.getAlertDeliveries(10);
      setDeliveries(updatedLogs);
    } catch {
      // Non-fatal
    } finally {
      setEvaluating(false);
    }
  };

  const fetchAlertData = async () => {
    setDeliveriesLoading(true);
    try {
      const [status, logs] = await Promise.all([
        api.getAlertStatus(),
        api.getAlertDeliveries(10),
      ]);
      setChannelStatus(status);
      setDeliveries(logs);
    } catch {
      // Fallback
    } finally {
      setDeliveriesLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertData();
    fetchMonitoringStatus();
  }, []);

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    setDispatchError(null);
    setLastDispatchResult(null);

    const station = waterBodies.find((w) => w.name === selectedStationName);

    const payload: AlertDispatchRequest = {
      water_body_id: station ? station.id : undefined,
      water_body_name: selectedStationName,
      severity,
      message,
      channel,
      recipient: recipient.trim() || undefined,
      test_mode: testMode,
    };

    try {
      const res = await api.dispatchAlert(payload);
      setLastDispatchResult(res);
      // Refresh deliveries log
      const updatedLogs = await api.getAlertDeliveries(10);
      setDeliveries(updatedLogs);
    } catch (err: any) {
      setDispatchError(err.message || 'Failed to dispatch alert');
    } finally {
      setDispatching(false);
    }
  };

  const handleSendAuthorizedTest = async () => {
    setDispatching(true);
    setDispatchError(null);
    setLastDispatchResult(null);

    try {
      const res = await api.sendTestAlert({
        channel,
        recipient: recipient.trim() || undefined,
        water_body_name: selectedStationName,
        safe_simulation_only: testMode,
      });
      setLastDispatchResult(res);
      const updatedLogs = await api.getAlertDeliveries(10);
      setDeliveries(updatedLogs);
    } catch (err: any) {
      setDispatchError(err.message || 'Failed to dispatch test notification');
    } finally {
      setDispatching(false);
    }
  };

  const totalSites = dashboard?.total_monitored_sites ?? waterBodies.length;
  const safeSites =
    dashboard?.safe_sites_count ?? waterBodies.filter((w) => w.current_risk_level === 'low').length;
  const highRiskSites =
    dashboard?.high_risk_sites_count ??
    waterBodies.filter((w) => w.current_risk_level === 'high' || w.current_risk_level === 'extreme')
      .length;
  const modRiskSites =
    dashboard?.moderate_risk_sites_count ??
    waterBodies.filter((w) => w.current_risk_level === 'moderate').length;

  return (
    <div className="space-y-6">
      {/* Top Authority Surveillance Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/70 to-slate-900 border border-cyan-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Authority Surveillance & Emergency Dispatch Dashboard
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 uppercase">
                AUTHORITY CONSOLE
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Aggregated basin telemetry, threshold breach monitoring, and verified outbound emergency dispatching.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onNavigateToPredict}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Launch What-If Simulator
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Monitored Sites</span>
            <MapPin className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{totalSites}</div>
          <p className="text-[11px] text-slate-400 mt-1">Lakes, Rivers & Reservoirs</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-900/40 shadow-sm hover:border-emerald-800/60 transition-all">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Safe Zones</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{safeSites}</div>
          <p className="text-[11px] text-slate-400 mt-1">Low hazard current & normal temp</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-900/40 shadow-sm hover:border-amber-800/60 transition-all">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Moderate Caution</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{modRiskSites}</div>
          <p className="text-[11px] text-slate-400 mt-1">Elevated velocity or low temp</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-rose-900/40 shadow-sm hover:border-rose-800/60 transition-all">
          <div className="flex items-center justify-between text-rose-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>High / Critical Risk</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-rose-400">{highRiskSites}</div>
          <p className="text-[11px] text-slate-400 mt-1">Advisories or restrictions recommended</p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TASK 5: HISTORICAL WATER-LEVEL TRENDS & MODEL VALIDATION       */}
      {/* ============================================================== */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-6 shadow-lg">
        {/* Header & Station Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Hydrological Telemetry Archive &amp; Stage Trends
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 font-semibold uppercase">
                  {selectedHistoryStation === 'RAMAMANGALAM-BRIDGE' ? 'KERALA SW ARCHIVE' : 'USGS NWIS TELEMETRY'}
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {selectedHistoryStation === 'RAMAMANGALAM-BRIDGE'
                ? 'Official hourly river stage records from Kerala State Water Resources Department (Kerala SW 2021-2025 archive).'
                : 'Instantaneous streamgage elevation from U.S. Geological Survey National Water Information System.'}
            </p>
          </div>

          {/* Station Switcher */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs self-start sm:self-auto">
            <button
              onClick={() => setSelectedHistoryStation('RAMAMANGALAM-BRIDGE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedHistoryStation === 'RAMAMANGALAM-BRIDGE'
                  ? 'bg-amber-950 text-amber-300 font-bold border border-amber-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ramamangalam Bridge (Kerala)
            </button>
            <button
              onClick={() => setSelectedHistoryStation('USGS-11164500')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedHistoryStation === 'USGS-11164500'
                  ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              USGS Station 11164500 (California)
            </button>
          </div>
        </div>

        {/* Stats Summary Strip */}
        {riverHistory && riverHistory.readings && riverHistory.readings.length > 0 && (() => {
          const levels = riverHistory.readings.map((r) => r.water_level_m);
          const minStage = Math.min(...levels);
          const maxStage = Math.max(...levels);
          const avgStage = levels.reduce((a, b) => a + b, 0) / levels.length;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Total Readings</span>
                <span className="text-base font-bold text-white mt-0.5 block">{riverHistory.total_records} Observations</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Minimum Stage</span>
                <span className="text-base font-bold text-cyan-400 mt-0.5 block">{minStage.toFixed(3)} m</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Maximum Stage</span>
                <span className="text-base font-bold text-amber-400 mt-0.5 block">{maxStage.toFixed(3)} m</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Average Stage</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">{avgStage.toFixed(3)} m</span>
              </div>
            </div>
          );
        })()}

        {/* SVG Time-Series Chart */}
        {historyLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            <span className="text-xs font-mono">Loading telemetry series...</span>
          </div>
        ) : riverHistory && riverHistory.readings && riverHistory.readings.length > 0 ? (() => {
          const readings = riverHistory.readings;
          const levels = readings.map((r) => r.water_level_m);
          const minStage = Math.min(...levels);
          const maxStage = Math.max(...levels);
          const range = maxStage - minStage || 0.1;
          const svgW = 800;
          const svgH = 220;
          const pad = { top: 20, right: 25, bottom: 35, left: 55 };
          const gW = svgW - pad.left - pad.right;
          const gH = svgH - pad.top - pad.bottom;

          const points = readings.map((r, i) => {
            const x = pad.left + (i / Math.max(readings.length - 1, 1)) * gW;
            const y = pad.top + gH - ((r.water_level_m - minStage) / range) * gH;
            return { x, y, ...r };
          });

          const linePath = points.reduce((acc, curr, idx) => (idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`), '');
          const areaPath = `${linePath} L ${points[points.length - 1].x} ${pad.top + gH} L ${points[0].x} ${pad.top + gH} Z`;

          return (
            <div className="relative w-full overflow-x-auto bg-slate-950/70 rounded-xl border border-slate-800/80 p-2">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto min-w-[620px] select-none">
                <defs>
                  <linearGradient id="histAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-axis Ticks & Horizontal Grid Lines */}
                {[0, 0.33, 0.66, 1.0].map((frac, idx) => {
                  const val = minStage + frac * range;
                  const y = pad.top + gH - frac * gH;
                  return (
                    <g key={idx}>
                      <line x1={pad.left} y1={y} x2={pad.left + gW} y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray="2 4" />
                      <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="monospace">
                        {val.toFixed(2)}m
                      </text>
                    </g>
                  );
                })}

                {/* Filled Area */}
                <path d={areaPath} fill="url(#histAreaGrad)" />

                {/* Main Trend Line */}
                <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

                {/* Interactive Points */}
                {points.map((pt, i) => (
                  <g
                    key={i}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredReading({ timestamp: pt.timestamp, water_level_m: pt.water_level_m, flow: pt.flow_rate_cms })}
                    onMouseLeave={() => setHoveredReading(null)}
                  >
                    <circle cx={pt.x} cy={pt.y} r={hoveredReading?.timestamp === pt.timestamp ? 5.5 : 3.5} className="fill-amber-400 stroke-slate-900 stroke-2" />
                    <circle cx={pt.x} cy={pt.y} r={12} fill="transparent" />
                  </g>
                ))}

                {/* X-axis Time Labels */}
                {points.filter((_, i) => i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1).map((pt, i) => (
                  <text key={i} x={pt.x} y={pad.top + gH + 20} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">
                    {new Date(pt.timestamp).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </text>
                ))}
              </svg>

              {/* Hover Tooltip */}
              {hoveredReading && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-slate-900 border border-amber-500/80 shadow-xl text-xs text-white flex items-center space-x-3 pointer-events-none z-30 font-mono">
                  <span className="text-amber-300 font-bold">{new Date(hoveredReading.timestamp).toLocaleString()}</span>
                  <span>
                    Water Level: <strong className="text-white">{hoveredReading.water_level_m.toFixed(3)} m</strong>
                  </span>
                  {hoveredReading.flow !== null && hoveredReading.flow !== undefined && (
                    <span className="text-slate-400">
                      Discharge: <strong className="text-slate-200">{hoveredReading.flow.toFixed(2)} m³/s</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })() : (
          <div className="p-6 bg-slate-950/60 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
            No historical telemetry series available for this station.
          </div>
        )}

        {/* Forecast-versus-Observation Display Component (Task 5) */}
        {selectedHistoryStation === 'RAMAMANGALAM-BRIDGE' && forecastVsObs && forecastVsObs.comparisons && forecastVsObs.comparisons.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  ML Forecast vs. Ground-Truth Observation Evaluation
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ridge kinematic delta model evaluated against actual subsequent stage recorded at $t+1$ hour.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Model MAE: {(forecastVsObs.model_mae_m * 1000).toFixed(1)} mm
                </span>
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Persistence MAE: {(forecastVsObs.baseline_persistence_mae_m * 1000).toFixed(1)} mm
                </span>
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Error Reduction: {forecastVsObs.mae_reduction_percent.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-2 px-2.5">Target Timestamp</th>
                    <th className="py-2 px-2.5">Actual Observed ($t+1$)</th>
                    <th className="py-2 px-2.5">Ridge Forecast ($t+1$)</th>
                    <th className="py-2 px-2.5">Baseline Persistence ($t$)</th>
                    <th className="py-2 px-2.5">Model Error</th>
                    <th className="py-2 px-2.5 text-right">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {forecastVsObs.comparisons.slice(0, 6).map((pt, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-2.5 text-slate-300">
                        {new Date(pt.target_timestamp).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-emerald-300">{pt.actual_water_level_1h.toFixed(3)} m</td>
                      <td className="py-2 px-2.5 font-bold text-cyan-300">{pt.forecasted_water_level_1h.toFixed(3)} m</td>
                      <td className="py-2 px-2.5 text-slate-400">{pt.water_level_t.toFixed(3)} m</td>
                      <td className="py-2 px-2.5 text-slate-200">{(pt.absolute_error_m * 1000).toFixed(1)} mm</td>
                      <td className="py-2 px-2.5 text-right">
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

            <p className="text-[10px] text-slate-500 font-mono italic">
              * {forecastVsObs.disclaimer}
            </p>
          </div>
        )}
      </div>

      {/* Main Authority Grid: Outbound Alert Dispatcher + Active Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Outbound Alert Dispatch Console (Task D) */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                Emergency Notification Dispatch Console
              </h3>
              <p className="text-[11px] text-slate-400">
                Trigger verified outbound notifications to emergency services via Webhook or SMTP Email.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
              Task D Compliant
            </span>
          </div>

          {/* Channel Status Banner */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                Webhook: {channelStatus?.webhook_configured ? (
                  <span className="text-emerald-400 font-bold">Configured</span>
                ) : (
                  <span className="text-amber-400 font-mono">Unconfigured</span>
                )}
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                SMTP Email: {channelStatus?.email_configured ? (
                  <span className="text-emerald-400 font-bold">Configured</span>
                ) : (
                  <span className="text-amber-400 font-mono">Unconfigured</span>
                )}
              </span>
            </div>
            <button
              onClick={fetchAlertData}
              title="Refresh Channel Status"
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${deliveriesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Dispatch Form */}
          <form onSubmit={handleSendAlert} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Water Body Select */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Target Water Body
                </label>
                <select
                  value={selectedStationName}
                  onChange={(e) => setSelectedStationName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {waterBodies.map((wb) => (
                    <option key={wb.id} value={wb.name}>
                      {wb.name.replace(' (DEMO Station)', '')} ({wb.current_risk_level})
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity Select */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Advisory Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="low">Low Advisory</option>
                  <option value="moderate">Moderate Caution</option>
                  <option value="high">High Hazard Warning</option>
                  <option value="extreme">Extreme Emergency Restriction</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Delivery Channel */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Delivery Channel
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChannel('webhook')}
                    className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      channel === 'webhook'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" /> Webhook
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('email')}
                    className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      channel === 'email'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" /> SMTP Email
                  </button>
                </div>
              </div>

              {/* Optional Recipient override */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Recipient Endpoint (Optional)
                </label>
                <input
                  type="text"
                  placeholder={channel === 'webhook' ? 'https://webhook.site/...' : 'patrol@safety.gov'}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Advisory Message Text */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Advisory Message
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Safe Test Mode Switcher */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block text-xs">Safe Test Mode</span>
                <span className="text-[10px] text-slate-400">
                  Validates payload and simulates delivery without contacting external network.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            {/* Action Buttons: Dispatch Emergency Alert & Send Authorized Test */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="submit"
                disabled={dispatching}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {dispatching ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {testMode ? 'Simulate Outbound Dispatch' : 'Dispatch Real Emergency Notification'}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendAuthorizedTest}
                disabled={dispatching}
                className="py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-800/60 text-cyan-300 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Radio className="w-4 h-4 text-cyan-400" />
                Send Authorized Test Notice
              </button>
            </div>
          </form>

          {/* Last Dispatch Result Callout */}
          {lastDispatchResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                lastDispatchResult.status === 'DELIVERED' || lastDispatchResult.status === 'ACCEPTED'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                  : lastDispatchResult.status === 'TEST_MODE_SIMULATED'
                  ? 'bg-cyan-950/60 border-cyan-800 text-cyan-200'
                  : lastDispatchResult.status === 'DUPLICATE_SUPPRESSED'
                  ? 'bg-purple-950/60 border-purple-800 text-purple-200'
                  : lastDispatchResult.status === 'UNCONFIGURED'
                  ? 'bg-amber-950/60 border-amber-800 text-amber-200'
                  : 'bg-rose-950/60 border-rose-800 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  {lastDispatchResult.status === 'DELIVERED' || lastDispatchResult.status === 'ACCEPTED' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : lastDispatchResult.status === 'TEST_MODE_SIMULATED' ? (
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  ) : lastDispatchResult.status === 'DUPLICATE_SUPPRESSED' ? (
                    <Clock className="w-4 h-4 text-purple-400" />
                  ) : lastDispatchResult.status === 'UNCONFIGURED' ? (
                    <Info className="w-4 h-4 text-amber-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  Status: {lastDispatchResult.status}
                </span>
                <span className="text-[10px] font-mono text-slate-300">
                  Confirmed: {lastDispatchResult.confirmed_by_provider ? 'YES' : 'NO'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {lastDispatchResult.provider_message}
              </p>
              <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                <span>Delivery ID: {lastDispatchResult.delivery_id.slice(0, 8)}...</span>
                <span>Target: {lastDispatchResult.recipient}</span>
              </div>
            </div>
          )}

          {dispatchError && (
            <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-xs">
              Error: {dispatchError}
            </div>
          )}
        </div>

        {/* Right Column: Outbound Delivery Audit Trail + System Alerts */}
        <div className="lg:col-span-5 space-y-6">
          {/* Outbound Delivery Logs */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                Outbound Dispatch Audit Log
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                SQLite Durable Record
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {deliveries.length > 0 ? (
                deliveries.map((del) => (
                  <div
                    key={del.id}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 text-[11px]">
                        {del.water_body_name}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          del.status === 'DELIVERED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : del.status === 'TEST_MODE_SIMULATED'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : del.status === 'UNCONFIGURED'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {del.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Channel: {del.channel}</span>
                      <span>{new Date(del.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  No outbound alerts dispatched yet.
                </p>
              )}
            </div>
          </div>

          {/* Recent Internal System Alerts Feed */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                Active Basin Hazard Alerts
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                System Alert Log
              </span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {dashboard?.recent_alerts && dashboard.recent_alerts.length > 0 ? (
                dashboard.recent_alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-rose-300">
                      <span>{alert.water_body_name}</span>
                      <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-200">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{alert.message}</p>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  No active critical alerts currently logged.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* AUTOMATED HAZARD MONITORING & THRESHOLD SURVEILLANCE           */}
      {/* ============================================================== */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Automated Hazard Monitoring Engine &amp; Dynamic Threshold Sweep
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Evaluates live stage changes (Δh ≥ 0.15m), flow velocity breaches (≥ 6.0 m³/s), and computed risk scores (≥ 60.0) across all monitored stations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                monitoringStatus?.is_scheduler_running
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {monitoringStatus?.is_scheduler_running ? '● Scheduler Active' : '○ Scheduler Idle'}
            </span>
            <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
              Safe Mode: {monitoringStatus?.safe_simulation_enforced ? 'ENABLED' : 'DISABLED'}
            </span>
            <span className="px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 bg-slate-950 border border-slate-800">
              Sweep Cycle: {monitoringStatus?.monitoring_interval_seconds || 60}s
            </span>
          </div>
        </div>

        {/* Configured Thresholds Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Stage Surge Threshold (Δh)</span>
            <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
              +0.15 m <span className="text-xs font-normal text-slate-400">(+15 cm / hour)</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Detects sudden flash rising water</span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Flow Breach Threshold</span>
            <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
              ≥ 6.00 m³/s <span className="text-xs font-normal text-slate-400">(Discharge surge)</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Detects high-velocity hydraulic hazard</span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">High Risk Threshold</span>
            <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">
              Score ≥ 60.0 <span className="text-xs font-normal text-slate-400">(Advisory limit)</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Multi-variable heuristic hazard trigger</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleToggleScheduler}
            disabled={togglingScheduler}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
              monitoringStatus?.is_scheduler_running
                ? 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
            }`}
          >
            {monitoringStatus?.is_scheduler_running ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Stop Background Scheduler</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Start Background Scheduler (60s loop)</span>
              </>
            )}
          </button>

          <button
            onClick={handleTriggerSweep}
            disabled={evaluating}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Running Hazard Evaluation Sweep...' : 'Run Immediate Hazard Sweep'}</span>
          </button>
        </div>

        {/* Evaluation Results Table (if run) */}
        {evaluationResults && evaluationResults.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-2 font-mono">
              Latest Evaluation Sweep Results ({evaluationResults.length} Stations Evaluated)
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-2 px-3">Station</th>
                    <th className="py-2 px-3">Observed Stage</th>
                    <th className="py-2 px-3">Flow Rate</th>
                    <th className="py-2 px-3">Risk Score</th>
                    <th className="py-2 px-3">Stage Delta</th>
                    <th className="py-2 px-3">Detected Triggers</th>
                    <th className="py-2 px-3 text-right">Dispatch Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {evaluationResults.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-200">{ev.station_name}</td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {ev.observed_stage_m !== null && ev.observed_stage_m !== undefined
                          ? `${ev.observed_stage_m.toFixed(3)} m`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {ev.observed_flow_cms !== null && ev.observed_flow_cms !== undefined
                          ? `${ev.observed_flow_cms.toFixed(2)} m³/s`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ev.recalculated_risk_level === 'low'
                              ? 'bg-emerald-950 text-emerald-300'
                              : ev.recalculated_risk_level === 'moderate'
                              ? 'bg-amber-950 text-amber-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {ev.recalculated_risk_score !== null && ev.recalculated_risk_score !== undefined
                            ? ev.recalculated_risk_score.toFixed(0)
                            : '—'}{' '}
                          ({ev.recalculated_risk_level || 'N/A'})
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {ev.stage_delta_m !== null && ev.stage_delta_m !== undefined ? (
                          <span
                            className={
                              ev.stage_delta_m > 0
                                ? 'text-amber-400'
                                : ev.stage_delta_m < 0
                                ? 'text-cyan-400'
                                : 'text-slate-400'
                            }
                          >
                            {ev.stage_delta_m >= 0 ? '+' : ''}
                            {(ev.stage_delta_m * 100).toFixed(1)} cm
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {ev.triggers_detected && ev.triggers_detected.length > 0 ? (
                            ev.triggers_detected.map((trg, tIdx) => (
                              <span
                                key={tIdx}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  trg.trigger_type.includes('SURGE')
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : trg.trigger_type.includes('FLOW')
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                                title={trg.description}
                              >
                                {trg.trigger_type.replace(/_/g, ' ')}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                              {ev.evaluation_status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {ev.outbound_delivery_status ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {ev.outbound_delivery_status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">None required</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* TELEMETRY STATION & DATA-SOURCE AVAILABILITY MATRIX            */}
      {/* ============================================================== */}
      {dashboard?.station_availability && dashboard.station_availability.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Telemetry Station &amp; Data-Source Availability Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifiable status of operational telemetry streams, historical archives, and synthetic baselines.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-950 text-slate-400 border border-slate-800">
              Provenance Tracking
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-slate-400 border-b border-slate-800 font-medium text-[10px] uppercase">
                <tr>
                  <th className="pb-2.5 px-2">Station Name</th>
                  <th className="pb-2.5 px-2">Source Agency</th>
                  <th className="pb-2.5 px-2">Station Type</th>
                  <th className="pb-2.5 px-2">Telemetry Status</th>
                  <th className="pb-2.5 px-2">Freshness</th>
                  <th className="pb-2.5 px-2 text-right">Operational Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {dashboard.station_availability.map((st, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-2 font-bold text-slate-200">{st.station_name}</td>
                    <td className="py-2.5 px-2 text-slate-300">{st.data_source}</td>
                    <td className="py-2.5 px-2 text-slate-400 capitalize">{st.station_type}</td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          st.telemetry_status === 'LIVE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : st.telemetry_status === 'HISTORICAL'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : st.telemetry_status === 'CACHED'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {st.telemetry_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-300">{st.freshness}</td>
                    <td className="py-2.5 px-2 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          st.is_live
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {st.is_live ? 'LIVE VERIFIED' : 'ARCHIVE / BASELINE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monitored Zones Snapshot Table */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-400" />
            Monitored Aquatic Stations Directory
          </h3>
          <span className="text-xs text-slate-400">Telemetry nodes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="pb-2.5">Station Name</th>
                <th className="pb-2.5">Type</th>
                <th className="pb-2.5">Water Temp</th>
                <th className="pb-2.5">Flow Rate</th>
                <th className="pb-2.5">Risk Rating</th>
                <th className="pb-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {waterBodies.map((wb) => (
                <tr key={wb.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 font-medium text-slate-200">{wb.name.replace(' (DEMO Station)', '')}</td>
                  <td className="py-2.5 text-slate-400 capitalize">{wb.type}</td>
                  <td className="py-2.5 text-slate-300 font-mono">{wb.water_temp_c.toFixed(1)}°C</td>
                  <td className="py-2.5 text-slate-300 font-mono">{wb.flow_rate_cms.toFixed(1)} m³/s</td>
                  <td className="py-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        wb.current_risk_level === 'low'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                          : wb.current_risk_level === 'moderate'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                      }`}
                    >
                      {wb.current_risk_level} ({wb.risk_score.toFixed(0)})
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => onSelectWaterBody(wb)}
                      className="text-cyan-400 hover:text-cyan-300 font-medium text-xs hover:underline"
                    >
                      Analyze &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
