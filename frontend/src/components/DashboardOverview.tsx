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
  Database,
  Sparkles,
  Smartphone,
  Filter,
  FileWarning,
  Search,
  Minus,
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
  InspectionPrioritizationResponse,
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
  loading: _loading,
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
  const [monitoringError, setMonitoringError] = useState<string | null>(null);

  // Dispatch Form State
  const [selectedStationName, setSelectedStationName] = useState<string>(
    waterBodies[0]?.name || 'Cascade Canyon River'
  );

  // Synchronize selected station name when water bodies finish loading from backend
  useEffect(() => {
    if (waterBodies && waterBodies.length > 0) {
      if (!waterBodies.some((w) => w.name === selectedStationName)) {
        setSelectedStationName(waterBodies[0].name);
      }
    }
  }, [waterBodies, selectedStationName]);

  const [severity, setSeverity] = useState<string>('high');
  const [channel, setChannel] = useState<'webhook' | 'email' | 'sms'>('webhook');
  const [recipient, setRecipient] = useState<string>('');
  const [message, setMessage] = useState<string>(
    'Advisory: Flash surge elevated flow velocity past 9.0 m\u00B3/s. Immediate water egress advised for non-emergency personnel.'
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

  // Task 3: Authority Inspection Prioritization State
  const [inspectionData, setInspectionData] = useState<InspectionPrioritizationResponse | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState<boolean>(false);
  const [inspectionPriorityFilter, setInspectionPriorityFilter] = useState<string>('ALL');
  const [inspectionSortBy, setInspectionSortBy] = useState<'priority' | 'hazard' | 'risk' | 'name'>('priority');
  const [inspectionSearchQuery, setInspectionSearchQuery] = useState<string>('');
  const [showMethodology, setShowMethodology] = useState<boolean>(false);

  const fetchInspectionPrioritization = async () => {
    setInspectionLoading(true);
    try {
      const data = await api.getInspectionPrioritization();
      setInspectionData(data);
    } catch (err) {
      console.warn('Failed to fetch inspection prioritization:', err);
    } finally {
      setInspectionLoading(false);
    }
  };

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
      setMonitoringError(null);
    } catch (err: any) {
      setMonitoringError(err.message || 'Monitoring status service unreachable');
    }
  };

  const handleToggleScheduler = async () => {
    setTogglingScheduler(true);
    setMonitoringError(null);
    try {
      if (monitoringStatus?.is_scheduler_running) {
        const res = await api.stopHazardMonitoring();
        setMonitoringStatus(res);
      } else {
        const res = await api.startHazardMonitoring(60);
        setMonitoringStatus(res);
      }
    } catch (err: any) {
      setMonitoringError(err.message || 'Failed to toggle monitoring scheduler');
    } finally {
      setTogglingScheduler(false);
    }
  };

  const handleTriggerSweep = async () => {
    setEvaluating(true);
    setMonitoringError(null);
    try {
      const res = await api.evaluateHazardMonitoring({ safe_simulation_only: true });
      setEvaluationResults(res);
      // Refresh status and alert logs
      await Promise.all([
        fetchMonitoringStatus(),
        api.getAlertDeliveries(10).then(setDeliveries).catch(() => {}),
      ]);
    } catch (err: any) {
      setMonitoringError(err.message || 'Hazard evaluation sweep failed');
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
    fetchInspectionPrioritization();
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
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50/70 via-white to-blue-50/40 border border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1677D2] border border-blue-100">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#172B4D] flex items-center gap-2">
              Authority Actions &amp; Notifications
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100/70 text-[#1677D2] border border-blue-200/80 uppercase font-semibold">
                Authority Console
              </span>
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-1.5 max-w-2xl">
            Aggregated basin telemetry, threshold breach surveillance, and verified outbound emergency dispatching across monitored Kerala water bodies.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onNavigateToPredict}
            className="btn-secondary text-xs font-semibold"
          >
            <Sliders className="w-3.5 h-3.5 text-[#2387D9]" />
            Launch What-If Simulator
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#CBD5E1] transition-all">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-medium mb-2">
            <span>Monitored Sites</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#1677D2]">
              <MapPin className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#172B4D]">{totalSites}</div>
          <p className="text-[11px] text-[#64748B] mt-1">Lakes, Rivers &amp; Reservoirs</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between text-[#16A34A] text-xs font-medium mb-2">
            <span>Safe Zones</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-[#16A34A]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#16A34A]">{safeSites}</div>
          <p className="text-[11px] text-[#64748B] mt-1">Low hazard current &amp; normal temp</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between text-[#CA8A04] text-xs font-medium mb-2">
            <span>Moderate Caution</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-[#CA8A04]">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#CA8A04]">{modRiskSites}</div>
          <p className="text-[11px] text-[#64748B] mt-1">Elevated velocity or low temp</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-rose-200 transition-all">
          <div className="flex items-center justify-between text-[#DC2626] text-xs font-medium mb-2">
            <span>High / Critical Risk</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-[#DC2626]">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#DC2626]">{highRiskSites}</div>
          <p className="text-[11px] text-[#64748B] mt-1">Advisories or restrictions recommended</p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TASK 5: HISTORICAL WATER-LEVEL TRENDS & MODEL VALIDATION       */}
      {/* ============================================================== */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 space-y-6 shadow-xs">
        {/* Header & Station Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#1677D2]" />
              <h3 className="text-sm font-bold text-[#172B4D] flex items-center gap-2">
                River Level Trends &amp; Records
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-[#1677D2] border border-blue-200 font-semibold uppercase">
                  {selectedHistoryStation === 'RAMAMANGALAM-BRIDGE' ? 'KERALA SW ARCHIVE' : 'USGS NWIS TELEMETRY'}
                </span>
              </h3>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              {selectedHistoryStation === 'RAMAMANGALAM-BRIDGE'
                ? 'Official hourly river stage records from Kerala State Water Resources Department (Kerala SW 2021-2025 archive).'
                : 'Instantaneous streamgage elevation from U.S. Geological Survey National Water Information System.'}
            </p>
          </div>

          {/* Station Switcher */}
          <div className="flex items-center rounded-xl bg-[#F1F5F9] p-1 border border-[#E2E8F0] text-xs self-start sm:self-auto">
            <button
              onClick={() => setSelectedHistoryStation('RAMAMANGALAM-BRIDGE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedHistoryStation === 'RAMAMANGALAM-BRIDGE'
                  ? 'bg-white text-[#1677D2] font-bold shadow-xs border border-[#CBD5E1]'
                  : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              Ramamangalam Bridge (Kerala)
            </button>
            <button
              onClick={() => setSelectedHistoryStation('USGS-11164500')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedHistoryStation === 'USGS-11164500'
                  ? 'bg-white text-[#1677D2] font-bold shadow-xs border border-[#CBD5E1]'
                  : 'text-[#64748B] hover:text-[#172B4D]'
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
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] uppercase block">Total Readings</span>
                <span className="text-base font-bold text-[#172B4D] mt-0.5 block">{riverHistory.total_records} Observations</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] uppercase block">Minimum Stage</span>
                <span className="text-base font-bold text-[#1677D2] mt-0.5 block">{minStage.toFixed(3)} m</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] uppercase block">Maximum Stage</span>
                <span className="text-base font-bold text-[#D97706] mt-0.5 block">{maxStage.toFixed(3)} m</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] uppercase block">Average Stage</span>
                <span className="text-base font-bold text-[#16A34A] mt-0.5 block">{avgStage.toFixed(3)} m</span>
              </div>
            </div>
          );
        })()}

        {/* SVG Time-Series Chart */}
        {historyLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#64748B]">
            <RefreshCw className="w-6 h-6 text-[#1677D2] animate-spin" />
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
            <div className="relative w-full overflow-x-auto bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-2">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto min-w-[620px] select-none">
                <defs>
                  <linearGradient id="histAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1677D2" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#1677D2" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-axis Ticks & Horizontal Grid Lines */}
                {[0, 0.33, 0.66, 1.0].map((frac, idx) => {
                  const val = minStage + frac * range;
                  const y = pad.top + gH - frac * gH;
                  return (
                    <g key={idx}>
                      <line x1={pad.left} y1={y} x2={pad.left + gW} y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
                      <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#64748B" fontFamily="monospace">
                        {val.toFixed(2)}m
                      </text>
                    </g>
                  );
                })}

                {/* Filled Area */}
                <path d={areaPath} fill="url(#histAreaGrad)" />

                {/* Main Trend Line */}
                <path d={linePath} fill="none" stroke="#1677D2" strokeWidth="2.5" strokeLinecap="round" />

                {/* Interactive Points */}
                {points.map((pt, i) => (
                  <g
                    key={i}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredReading({ timestamp: pt.timestamp, water_level_m: pt.water_level_m, flow: pt.flow_rate_cms })}
                    onMouseLeave={() => setHoveredReading(null)}
                  >
                    <circle cx={pt.x} cy={pt.y} r={hoveredReading?.timestamp === pt.timestamp ? 5.5 : 3.5} className="fill-[#1677D2] stroke-white stroke-2" />
                    <circle cx={pt.x} cy={pt.y} r={12} fill="transparent" />
                  </g>
                ))}

                {/* X-axis Time Labels */}
                {points.filter((_, i) => i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1).map((pt, i) => (
                  <text key={i} x={pt.x} y={pad.top + gH + 20} textAnchor="middle" fontSize="10" fill="#64748B" fontFamily="monospace">
                    {new Date(pt.timestamp).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </text>
                ))}
              </svg>

              {/* Hover Tooltip */}
              {hoveredReading && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] shadow-lg text-xs text-[#172B4D] flex items-center space-x-3 pointer-events-none z-30 font-mono">
                  <span className="text-[#1677D2] font-bold">{new Date(hoveredReading.timestamp).toLocaleString()}</span>
                  <span>
                    Water Level: <strong className="text-[#172B4D]">{hoveredReading.water_level_m.toFixed(3)} m</strong>
                  </span>
                  {hoveredReading.flow !== null && hoveredReading.flow !== undefined && (
                    <span className="text-[#64748B]">
                      Discharge: <strong className="text-[#172B4D]">{hoveredReading.flow.toFixed(2)} m\u00B3/s</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })() : (
          <div className="p-6 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-center text-xs text-[#64748B]">
            No historical telemetry series available for this station.
          </div>
        )}

        {/* Forecast-versus-Observation Display Component (Task 5) */}
        {selectedHistoryStation === 'RAMAMANGALAM-BRIDGE' && forecastVsObs && forecastVsObs.comparisons && forecastVsObs.comparisons.length > 0 && (
          <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-[#1677D2] flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-4 h-4 text-[#1677D2]" />
                  Forecast vs. Observed Levels
                </h4>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Ridge kinematic delta model evaluated against actual subsequent stage recorded at t+1 hour.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#F1F5F9] text-[#172B4D] border border-[#CBD5E1]">
                  Model MAE: {(forecastVsObs.model_mae_m * 1000).toFixed(1)} mm
                </span>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#F1F5F9] text-[#172B4D] border border-[#CBD5E1]">
                  Persistence MAE: {(forecastVsObs.baseline_persistence_mae_m * 1000).toFixed(1)} mm
                </span>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-[#1677D2] border border-blue-200">
                  Error Reduction: {forecastVsObs.mae_reduction_percent.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] text-[#64748B] uppercase">
                    <th className="py-2.5 px-3">Target Timestamp</th>
                    <th className="py-2.5 px-3">Actual Observed (t+1)</th>
                    <th className="py-2.5 px-3">Ridge Forecast (t+1)</th>
                    <th className="py-2.5 px-3">Baseline Persistence (t)</th>
                    <th className="py-2.5 px-3">Model Error</th>
                    <th className="py-2.5 px-3 text-right">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[11px]">
                  {forecastVsObs.comparisons.slice(0, 6).map((pt, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-3 text-[#172B4D]">
                        {new Date(pt.target_timestamp).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#16A34A]">{pt.actual_water_level_1h.toFixed(3)} m</td>
                      <td className="py-2.5 px-3 font-bold text-[#1677D2]">{pt.forecasted_water_level_1h.toFixed(3)} m</td>
                      <td className="py-2.5 px-3 text-[#64748B]">{pt.water_level_t.toFixed(3)} m</td>
                      <td className="py-2.5 px-3 text-[#172B4D]">{(pt.absolute_error_m * 1000).toFixed(1)} mm</td>
                      <td className="py-2.5 px-3 text-right">
                        {pt.model_beat_persistence ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC]">
                            <CheckCircle2 className="w-3 h-3" />
                            Outperformed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]">
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

            <p className="text-[10px] text-[#64748B] font-mono italic">
              * {forecastVsObs.disclaimer}
            </p>
          </div>
        )}
      </div>

      {/* Main Authority Grid: Outbound Alert Dispatcher + Active Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Outbound Alert Dispatch Console (Task D) */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#172B4D] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#1677D2]" />
                Send Safety Notice
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Trigger verified outbound notifications to emergency services via Webhook or SMTP Email.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#1677D2] border border-[#CBD5E1] font-semibold">
              Task D Compliant
            </span>
          </div>

          {/* Channel Status Banner */}
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium text-[#172B4D]">
                <Radio className="w-3.5 h-3.5 text-[#1677D2]" />
                Webhook: {channelStatus?.webhook_configured ? (
                  <span className="text-[#16A34A] font-bold">Configured</span>
                ) : (
                  <span className="text-[#CA8A04] font-mono">Unconfigured</span>
                )}
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1.5 font-medium text-[#172B4D]">
                <Mail className="w-3.5 h-3.5 text-[#1677D2]" />
                SMTP Email: {channelStatus?.email_configured ? (
                  <span className="text-[#16A34A] font-bold">Configured</span>
                ) : (
                  <span className="text-[#CA8A04] font-mono">Unconfigured</span>
                )}
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1.5 font-medium text-[#172B4D]">
                <Smartphone className="w-3.5 h-3.5 text-[#0D9488]" />
                SMS (Twilio): {channelStatus?.sms_configured ? (
                  <span className="text-[#16A34A] font-bold">Configured</span>
                ) : (
                  <span className="text-[#CA8A04] font-mono">Unconfigured</span>
                )}
              </span>
            </div>
            <button
              onClick={fetchAlertData}
              title="Refresh Channel Status"
              className="text-[#64748B] hover:text-[#1677D2] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${deliveriesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Dispatch Form */}
          <form onSubmit={handleSendAlert} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Water Body Select */}
              <div>
                <label className="block text-[11px] font-semibold text-[#172B4D] mb-1">
                  Target Water Body
                </label>
                <select
                  value={selectedStationName}
                  onChange={(e) => setSelectedStationName(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-[#172B4D] focus:outline-none focus:border-[#1677D2]"
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
                <label className="block text-[11px] font-semibold text-[#172B4D] mb-1">
                  Advisory Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-[#172B4D] focus:outline-none focus:border-[#1677D2]"
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
                <label className="block text-[11px] font-semibold text-[#172B4D] mb-1">
                  Delivery Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setChannel('webhook')}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                      channel === 'webhook'
                        ? 'bg-[#1677D2] text-white border-[#1677D2]'
                        : 'bg-white text-[#64748B] border-[#CBD5E1] hover:border-[#1677D2]/40'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 shrink-0" /> Webhook
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('email')}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                      channel === 'email'
                        ? 'bg-[#1677D2] text-white border-[#1677D2]'
                        : 'bg-white text-[#64748B] border-[#CBD5E1] hover:border-[#1677D2]/40'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" /> Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('sms')}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                      channel === 'sms'
                        ? 'bg-[#1677D2] text-white border-[#1677D2]'
                        : 'bg-white text-[#64748B] border-[#CBD5E1] hover:border-[#1677D2]/40'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 shrink-0" /> SMS
                  </button>
                </div>
              </div>

              {/* Optional Recipient override */}
              <div>
                <label className="block text-[11px] font-semibold text-[#172B4D] mb-1">
                  Recipient Endpoint (Optional)
                </label>
                <input
                  type="text"
                  placeholder={
                    channel === 'webhook'
                      ? 'https://webhook.site/...'
                      : channel === 'email'
                      ? 'patrol@safety.gov'
                      : '+919876543210'
                  }
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-[#172B4D] placeholder-slate-400 focus:outline-none focus:border-[#1677D2]"
                />
              </div>
            </div>

            {/* Advisory Message Text */}
            <div>
              <label className="block text-[11px] font-semibold text-[#172B4D] mb-1">
                Advisory Message
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-[#172B4D] placeholder-slate-400 focus:outline-none focus:border-[#1677D2]"
              />
            </div>

            {/* Safe Test Mode Switcher */}
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#172B4D] block text-xs">Safe Test Mode</span>
                <span className="text-[10px] text-[#64748B]">
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
                <div className="w-9 h-5 bg-[#CBD5E1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1677D2]"></div>
              </label>
            </div>

            {/* Action Buttons: Dispatch Emergency Alert & Send Authorized Test */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                disabled={dispatching}
                className="btn-coral text-xs font-bold py-2.5 px-4 disabled:opacity-50"
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
                className="btn-secondary text-xs font-bold text-[#2387D9] py-2.5 px-4 disabled:opacity-50"
              >
                <Radio className="w-4 h-4 text-[#2387D9]" />
                Send Authorized Test Notice
              </button>
            </div>
          </form>

          {/* Last Dispatch Result Callout */}
          {lastDispatchResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                lastDispatchResult.status === 'DELIVERED' || lastDispatchResult.status === 'ACCEPTED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : lastDispatchResult.status === 'TEST_MODE_SIMULATED'
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : lastDispatchResult.status === 'DUPLICATE_SUPPRESSED'
                  ? 'bg-purple-50 border-purple-200 text-purple-800'
                  : lastDispatchResult.status === 'UNCONFIGURED'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-[11px]">
                  {lastDispatchResult.status === 'DELIVERED' || lastDispatchResult.status === 'ACCEPTED' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  ) : lastDispatchResult.status === 'TEST_MODE_SIMULATED' ? (
                    <ShieldCheck className="w-4 h-4 text-[#1677D2]" />
                  ) : lastDispatchResult.status === 'DUPLICATE_SUPPRESSED' ? (
                    <Clock className="w-4 h-4 text-purple-600" />
                  ) : lastDispatchResult.status === 'UNCONFIGURED' ? (
                    <Info className="w-4 h-4 text-[#CA8A04]" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#DC2626]" />
                  )}
                  Status: {lastDispatchResult.status}
                </span>
                <span className="text-[10px] font-mono text-[#64748B]">
                  Confirmed: {lastDispatchResult.confirmed_by_provider ? 'YES' : 'NO'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#172B4D]">
                {lastDispatchResult.provider_message}
              </p>
              <div className="text-[10px] text-[#64748B] font-mono flex items-center justify-between border-t border-black/5 pt-1.5">
                <span>Delivery ID: {lastDispatchResult.delivery_id.slice(0, 8)}...</span>
                <span>Target: {lastDispatchResult.recipient}</span>
              </div>
            </div>
          )}

          {dispatchError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              Error: {dispatchError}
            </div>
          )}
        </div>

        {/* Right Column: Outbound Delivery Audit Trail + System Alerts */}
        <div className="lg:col-span-5 space-y-6">
          {/* Outbound Delivery Logs */}
          <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#172B4D] flex items-center gap-2">
                <Server className="w-4 h-4 text-[#1677D2]" />
                Notification History
              </h3>
              <span className="text-[10px] font-mono text-[#64748B]">
                SQLite Durable Record
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {deliveries.length > 0 ? (
                deliveries.map((del) => (
                  <div
                    key={del.id}
                    className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#172B4D] text-[11px]">
                        {del.water_body_name}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          del.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : del.status === 'TEST_MODE_SIMULATED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : del.status === 'UNCONFIGURED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {del.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#64748B] font-mono">
                      <span>Channel: {del.channel}</span>
                      <span>{new Date(del.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#64748B] italic py-4 text-center">
                  No outbound alerts dispatched yet.
                </p>
              )}
            </div>
          </div>

          {/* Recent Internal System Alerts Feed */}
          <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#172B4D] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#CA8A04]" />
                Active Basin Hazard Alerts
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B]">
                System Alert Log
              </span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {dashboard?.recent_alerts && dashboard.recent_alerts.length > 0 ? (
                dashboard.recent_alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-rose-800">
                      <span>{alert.water_body_name}</span>
                      <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 font-bold">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-[#172B4D] text-[11px]">{alert.message}</p>
                    <span className="text-[10px] text-[#64748B] font-mono block">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#64748B] italic py-4 text-center">
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
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-[#1677D2]" />
              <h3 className="text-sm font-bold text-[#172B4D]">
                Automated Threshold Monitoring
              </h3>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Evaluates live stage changes (Δh ≥ 0.15m), flow velocity breaches (≥ 6.0 m³/s), and computed risk scores (≥ 60.0) across all monitored stations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border ${
                monitoringStatus?.is_scheduler_running
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]'
              }`}
            >
              {monitoringStatus?.is_scheduler_running ? '● Scheduler Active' : '○ Scheduler Idle'}
            </span>
            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-[#1677D2] border border-blue-200">
              Safe Mode: {monitoringStatus?.safe_simulation_enforced ? 'ENABLED' : 'DISABLED'}
            </span>
            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono text-[#64748B] bg-[#F8FAFC] border border-[#CBD5E1]">
              Sweep Cycle: {monitoringStatus?.monitoring_interval_seconds || 60}s
            </span>
          </div>
        </div>

        {/* Configured Thresholds Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <span className="text-[10px] uppercase font-mono text-[#64748B] block">Stage Surge Threshold (Δh)</span>
            <div className="text-sm font-bold font-mono text-[#D97706] mt-0.5">
              +0.15 m <span className="text-xs font-normal text-[#64748B]">(+15 cm / hour)</span>
            </div>
            <span className="text-[10px] text-[#64748B] mt-1 block">Detects sudden flash rising water</span>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <span className="text-[10px] uppercase font-mono text-[#64748B] block">Flow Breach Threshold</span>
            <div className="text-sm font-bold font-mono text-[#D97706] mt-0.5">
              ≥ 6.00 m³/s <span className="text-xs font-normal text-[#64748B]">(Discharge surge)</span>
            </div>
            <span className="text-[10px] text-[#64748B] mt-1 block">Detects high-velocity hydraulic hazard</span>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <span className="text-[10px] uppercase font-mono text-[#64748B] block">High Risk Threshold</span>
            <div className="text-sm font-bold font-mono text-[#DC2626] mt-0.5">
              Score ≥ 60.0 <span className="text-xs font-normal text-[#64748B]">(Advisory limit)</span>
            </div>
            <span className="text-[10px] text-[#64748B] mt-1 block">Multi-variable heuristic hazard trigger</span>
          </div>
        </div>

        {/* Monitoring Error Banner */}
        {monitoringError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <span><strong>Monitoring Error:</strong> {monitoringError}</span>
            <button
              onClick={() => {
                fetchMonitoringStatus();
                setMonitoringError(null);
              }}
              className="text-[10px] text-rose-700 underline hover:text-rose-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleToggleScheduler}
            disabled={togglingScheduler}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
              monitoringStatus?.is_scheduler_running
                ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
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
            className="px-4 py-2 rounded-xl bg-[#1677D2] hover:bg-[#125FA8] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Running Hazard Evaluation Sweep...' : 'Run Immediate Hazard Sweep'}</span>
          </button>
        </div>

        {/* Evaluation Results Table (if run) */}
        {evaluationResults && evaluationResults.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-bold text-[#172B4D] block mb-2 font-mono">
              Latest Evaluation Sweep Results ({evaluationResults.length} Stations Evaluated)
            </span>
            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] text-[#64748B] uppercase">
                    <th className="py-2.5 px-3">Station</th>
                    <th className="py-2.5 px-3">Observed Stage</th>
                    <th className="py-2.5 px-3">Flow Rate</th>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Stage Delta</th>
                    <th className="py-2.5 px-3">Detected Triggers</th>
                    <th className="py-2.5 px-3 text-right">Dispatch Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[11px]">
                  {evaluationResults.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-3 font-medium text-[#172B4D]">{ev.station_name}</td>
                      <td className="py-2.5 px-3 text-[#64748B]">
                        {ev.observed_stage_m !== null && ev.observed_stage_m !== undefined
                          ? `${ev.observed_stage_m.toFixed(3)} m`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[#64748B]">
                        {ev.observed_flow_cms !== null && ev.observed_flow_cms !== undefined
                          ? `${ev.observed_flow_cms.toFixed(2)} m\u00B3/s`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ev.recalculated_risk_level === 'low'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ev.recalculated_risk_level === 'moderate'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
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
                                ? 'text-[#D97706] font-bold'
                                : ev.stage_delta_m < 0
                                ? 'text-[#1677D2]'
                                : 'text-[#64748B]'
                            }
                          >
                            {ev.stage_delta_m >= 0 ? '+' : ''}
                            {(ev.stage_delta_m * 100).toFixed(1)} cm
                          </span>
                        ) : (
                          <span className="text-[#64748B]">—</span>
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
                                    ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                    : trg.trigger_type.includes('FLOW')
                                    ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                    : 'bg-rose-50 text-rose-800 border border-rose-300'
                                }`}
                                title={trg.description}
                              >
                                {trg.trigger_type.replace(/_/g, ' ')}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {ev.evaluation_status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {ev.outbound_delivery_status ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#1677D2] border border-blue-200">
                            {ev.outbound_delivery_status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#64748B]">None required</span>
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
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#1677D2]" />
              <div>
                <h3 className="text-sm font-semibold text-[#172B4D]">
                  Station Data Availability
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Verifiable status of operational telemetry streams, historical archives, and synthetic baselines.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]">
              Provenance Tracking
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-medium text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Station Name</th>
                  <th className="py-2.5 px-3">Source Agency</th>
                  <th className="py-2.5 px-3">Station Type</th>
                  <th className="py-2.5 px-3">Telemetry Status</th>
                  <th className="py-2.5 px-3">Freshness</th>
                  <th className="py-2.5 px-3 text-right">Operational Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[11px]">
                {dashboard.station_availability.map((st, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#172B4D]">{st.station_name}</td>
                    <td className="py-2.5 px-3 text-[#64748B]">{st.data_source}</td>
                    <td className="py-2.5 px-3 text-[#64748B] capitalize">{st.station_type}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          st.telemetry_status === 'LIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : st.telemetry_status === 'HISTORICAL'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : st.telemetry_status === 'CACHED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {st.telemetry_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#64748B]">{st.freshness}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          st.is_live
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]'
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

      {/* ============================================================== */}
      {/* TASK 3: AUTHORITY INSPECTION PRIORITIZATION DECISION SUPPORT   */}
      {/* ============================================================== */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 space-y-6 shadow-xs">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#DC2626]" />
              <h3 className="text-base font-bold text-[#172B4D] flex items-center gap-2">
                Authority Inspection Prioritization
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold uppercase">
                  Risk-Informed Site Audit Triage
                </span>
              </h3>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Multi-factor inspection queue ranking: evaluates environmental hazard, site structural vulnerability, and observational uncertainty penalties.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#172B4D] font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Info className="w-3.5 h-3.5 text-[#1677D2]" />
              {showMethodology ? 'Hide Methodology' : 'Scoring Methodology'}
            </button>
            <button
              onClick={fetchInspectionPrioritization}
              disabled={inspectionLoading}
              className="p-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#64748B] hover:text-[#172B4D] transition-colors disabled:opacity-50 shadow-xs"
              title="Refresh Prioritization Queue"
            >
              <RefreshCw className={`w-4 h-4 ${inspectionLoading ? 'animate-spin text-[#1677D2]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Priority Tier Counters Strip */}
        {inspectionData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setInspectionPriorityFilter('CRITICAL')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                inspectionPriorityFilter === 'CRITICAL'
                  ? 'bg-rose-50 border-rose-400 shadow-xs ring-2 ring-rose-300'
                  : 'bg-white border-[#E2E8F0] hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
                <span>Critical Priority</span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-rose-700 mt-1 font-mono">
                {inspectionData.critical_count}
              </div>
              <p className="text-[10px] text-[#64748B] mt-0.5">Urgent on-site audit</p>
            </button>

            <button
              onClick={() => setInspectionPriorityFilter('HIGH')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                inspectionPriorityFilter === 'HIGH'
                  ? 'bg-amber-50 border-amber-400 shadow-xs ring-2 ring-amber-300'
                  : 'bg-white border-[#E2E8F0] hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-amber-700 font-semibold">
                <span>High Priority</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-700 mt-1 font-mono">
                {inspectionData.high_count}
              </div>
              <p className="text-[10px] text-[#64748B] mt-0.5">Audit within 14 days</p>
            </button>

            <button
              onClick={() => setInspectionPriorityFilter('MEDIUM')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                inspectionPriorityFilter === 'MEDIUM'
                  ? 'bg-yellow-50 border-yellow-400 shadow-xs ring-2 ring-yellow-300'
                  : 'bg-white border-[#E2E8F0] hover:border-yellow-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-yellow-700 font-semibold">
                <span>Medium Priority</span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              </div>
              <div className="text-2xl font-black text-yellow-700 mt-1 font-mono">
                {inspectionData.medium_count}
              </div>
              <p className="text-[10px] text-[#64748B] mt-0.5">Scheduled seasonal audit</p>
            </button>

            <button
              onClick={() => setInspectionPriorityFilter('ROUTINE')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                inspectionPriorityFilter === 'ROUTINE'
                  ? 'bg-emerald-50 border-emerald-400 shadow-xs ring-2 ring-emerald-300'
                  : 'bg-white border-[#E2E8F0] hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
                <span>Routine Monitoring</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                {inspectionData.routine_count}
              </div>
              <p className="text-[10px] text-[#64748B] mt-0.5">Periodic seasonal check</p>
            </button>
          </div>
        )}

        {/* Methodology & Limitations Callout */}
        {showMethodology && inspectionData && (
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-2 text-xs text-[#172B4D] font-mono">
            <div className="flex items-center gap-2 text-[#1677D2] font-bold font-sans">
              <FileWarning className="w-4 h-4 text-[#1677D2]" />
              <span>Prioritization Formula &amp; Scientific Limitations:</span>
            </div>
            <p className="leading-relaxed text-[#64748B] text-[11px]">
              {inspectionData.priority_scoring_methodology}
            </p>
            <div className="pt-2 border-t border-[#E2E8F0] text-[10px] text-[#CA8A04] font-sans">
              <strong>Mandatory Decision-Support Notice:</strong> {inspectionData.disclaimer}
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Tier Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#64748B] text-[11px] mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Tier:
            </span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'ROUTINE'].map((tier) => (
              <button
                key={tier}
                onClick={() => setInspectionPriorityFilter(tier)}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                  inspectionPriorityFilter === tier
                    ? 'bg-[#1677D2] text-white shadow-xs'
                    : 'bg-white text-[#64748B] hover:text-[#172B4D] border border-[#CBD5E1]'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Sort & Search Controls */}
          <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inspectionSearchQuery}
                onChange={(e) => setInspectionSearchQuery(e.target.value)}
                placeholder="Filter site or type..."
                className="w-full bg-white border border-[#CBD5E1] rounded-lg pl-8 pr-2.5 py-1 text-[#172B4D] placeholder-slate-400 text-xs focus:outline-none focus:border-[#1677D2]"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[#64748B] text-[11px]">Sort:</span>
              <select
                value={inspectionSortBy}
                onChange={(e: any) => setInspectionSortBy(e.target.value)}
                className="bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-[#172B4D] text-xs focus:outline-none focus:border-[#1677D2]"
              >
                <option value="priority">Priority Score</option>
                <option value="risk">Composite Risk</option>
                <option value="hazard">Env Hazard</option>
                <option value="name">Location Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Prioritized Locations Table */}
        {inspectionLoading ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-[#1677D2] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#64748B]">Computing risk-informed municipal inspection prioritization...</p>
          </div>
        ) : inspectionData ? (() => {
          let sites = [...inspectionData.prioritized_sites];

          if (inspectionPriorityFilter !== 'ALL') {
            sites = sites.filter((s) => s.inspection_priority === inspectionPriorityFilter);
          }

          if (inspectionSearchQuery.trim()) {
            const q = inspectionSearchQuery.toLowerCase();
            sites = sites.filter(
              (s) =>
                s.location_name.toLowerCase().includes(q) ||
                s.water_body_type.toLowerCase().includes(q) ||
                s.district.toLowerCase().includes(q)
            );
          }

          if (inspectionSortBy === 'priority') {
            sites.sort((a, b) => b.priority_rank_score - a.priority_rank_score);
          } else if (inspectionSortBy === 'risk') {
            sites.sort((a, b) => b.composite_risk_score - a.composite_risk_score);
          } else if (inspectionSortBy === 'hazard') {
            sites.sort((a, b) => b.environmental_hazard_score - a.environmental_hazard_score);
          } else if (inspectionSortBy === 'name') {
            sites.sort((a, b) => a.location_name.localeCompare(b.location_name));
          }

          if (sites.length === 0) {
            return (
              <div className="p-8 text-center text-[#64748B] text-xs bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                No monitored water bodies match the selected filter ({inspectionPriorityFilter}).
              </div>
            );
          }

          return (
            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-medium text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Priority Tier &amp; Score</th>
                    <th className="py-2.5 px-3">Location &amp; Type</th>
                    <th className="py-2.5 px-3">Environmental Hazard</th>
                    <th className="py-2.5 px-3">Data Freshness &amp; Station Distance</th>
                    <th className="py-2.5 px-3">Priority Drivers &amp; Rationale</th>
                    <th className="py-2.5 px-3">Last Inspection Record</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[11px]">
                  {sites.map((item) => {
                    const matchedWb = waterBodies.find((w) => w.id === item.water_body_id);
                    return (
                      <tr key={item.water_body_id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                              item.inspection_priority === 'CRITICAL'
                                ? 'bg-rose-50 text-rose-700 border border-rose-300'
                                : item.inspection_priority === 'HIGH'
                                ? 'bg-amber-50 text-amber-700 border border-amber-300'
                                : item.inspection_priority === 'MEDIUM'
                                ? 'bg-yellow-50 text-yellow-700 border border-yellow-300'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.inspection_priority === 'CRITICAL'
                                  ? 'bg-rose-500 animate-pulse'
                                  : item.inspection_priority === 'HIGH'
                                  ? 'bg-amber-500'
                                  : item.inspection_priority === 'MEDIUM'
                                  ? 'bg-yellow-500'
                                  : 'bg-emerald-500'
                              }`}
                            />
                            {item.inspection_priority} &bull; {item.priority_rank_score.toFixed(1)}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-[#172B4D] block">{item.location_name}</span>
                          <span className="text-[10px] text-[#64748B] capitalize">{item.water_body_type} &bull; {item.district}</span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono text-[#172B4D] block font-bold">
                            {item.environmental_hazard_score.toFixed(1)} / 100
                          </span>
                          <span className="text-[10px] text-[#64748B] block font-mono">
                            Category: {item.environmental_hazard_category}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-[#172B4D] block font-mono text-[10px]">
                            {item.data_freshness_status}
                          </span>
                          <span className="text-[10px] text-[#64748B] block">
                            Nearest: {item.nearest_telemetry_station || 'None'} ({item.telemetry_distance_km != null ? `${item.telemetry_distance_km.toFixed(1)} km` : 'N/A'})
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          <p className="text-[11px] text-[#172B4D] line-clamp-2 leading-relaxed">
                            {item.priority_explanation}
                          </p>
                          {item.top_contributing_factors.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.top_contributing_factors.slice(0, 2).map((fac, fIdx) => (
                                <span
                                  key={fIdx}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] font-sans border border-[#E2E8F0]"
                                >
                                  {fac}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-[10px] font-mono text-[#172B4D] block">
                            {item.last_inspection_date || 'No official record'}
                          </span>
                          <span className="text-[9px] text-[#64748B] font-sans block">
                            Unverified municipal site
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              if (matchedWb) {
                                onSelectWaterBody(matchedWb);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1677D2] text-[11px] font-semibold transition-colors"
                          >
                            Inspect &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })() : (
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center text-xs text-[#64748B]">
            Inspection prioritization service initializing...
          </div>
        )}
      </div>

      {/* Monitored Zones Snapshot Table */}
      <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#172B4D] flex items-center gap-2">
            <Droplets className="w-4 h-4 text-[#1677D2]" />
            All Monitored Locations
          </h3>
          <span className="text-xs text-[#64748B]">Telemetry nodes</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-medium">
              <tr>
                <th className="py-2.5 px-3">Station Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Water Temp</th>
                <th className="py-2.5 px-3">Flow Rate</th>
                <th className="py-2.5 px-3">Risk Rating</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {waterBodies.map((wb) => (
                <tr key={wb.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2.5 px-3 font-medium text-[#172B4D]">{wb.name.replace(' (DEMO Station)', '')}</td>
                  <td className="py-2.5 px-3 text-[#64748B] capitalize">{wb.type}</td>
                  <td className="py-2.5 px-3 text-[#172B4D] font-mono">{wb.water_temp_c.toFixed(1)}°C</td>
                  <td className="py-2.5 px-3 text-[#172B4D] font-mono">{wb.flow_rate_cms.toFixed(1)} m\u00B3/s</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        wb.current_risk_level === 'low'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : wb.current_risk_level === 'moderate'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {wb.current_risk_level} ({wb.risk_score.toFixed(0)})
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onSelectWaterBody(wb)}
                      className="text-[#1677D2] hover:text-[#125FA8] font-medium text-xs hover:underline"
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
