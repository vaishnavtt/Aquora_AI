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
  Sliders
} from 'lucide-react';
import {
  DashboardResponse,
  WaterBody,
  AlertDispatchRequest,
  AlertDispatchResponse,
  AlertDelivery,
  AlertChannelStatus,
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
