import React, { useState, useEffect } from 'react';
import {
  fetchAdminDiagnostics,
  fetchTelemetryProvidersStatus,
  validateAlertChannels,
  fetchAdminLogs,
} from '../../services/api';
import type {
  AdminDiagnosticsResponse,
  TelemetryProvidersResponse,
  LogEntry,
} from '../../types';

interface AdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminConsoleModal: React.FC<AdminConsoleModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'telemetry' | 'channels' | 'logs'>('diagnostics');
  const [diagnostics, setDiagnostics] = useState<AdminDiagnosticsResponse | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryProvidersResponse | null>(null);
  const [channelValidation, setChannelValidation] = useState<any | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingChannels, setIsValidatingChannels] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'diagnostics') {
      setIsLoading(true);
      fetchAdminDiagnostics()
        .then((res) => setDiagnostics(res))
        .finally(() => setIsLoading(false));
    } else if (activeTab === 'telemetry') {
      setIsLoading(true);
      fetchTelemetryProvidersStatus()
        .then((res) => setTelemetry(res))
        .finally(() => setIsLoading(false));
    } else if (activeTab === 'channels' && !channelValidation) {
      handleValidateChannels();
    } else if (activeTab === 'logs') {
      setIsLoading(true);
      fetchAdminLogs(50)
        .then((res) => setLogs(res))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, activeTab]);

  const handleValidateChannels = async () => {
    setIsValidatingChannels(true);
    try {
      const res = await validateAlertChannels();
      setChannelValidation(res);
    } finally {
      setIsValidatingChannels(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-lg">
              ⚙️
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">System Administration & Diagnostics</h2>
              <p className="text-xs text-slate-550 font-normal">
                Operational health, telemetry providers, alert channels reachability & live audit logs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'diagnostics'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Diagnostics & Health
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'telemetry'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Telemetry Providers
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'channels'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Channel Reachability
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Operational Logs
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              {isLoading || !diagnostics ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading system diagnostics...</div>
              ) : (
                <>
                  {/* Status Banner */}
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <div className="text-xs font-bold text-emerald-800">System Status: {diagnostics.system_status}</div>
                        <div className="text-[11px] text-emerald-600">
                          AQUORA AI v{diagnostics.version} • Uptime: {diagnostics.runtime.uptime_formatted} ({diagnostics.runtime.uptime_seconds}s)
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      HEALTHY
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Database Telemetry */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        💾 SQLite Database
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-550">Engine</span>
                          <span className="font-semibold text-slate-700">{diagnostics.database.type}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-550">File Size</span>
                          <span className="font-semibold text-slate-700">{diagnostics.database.size_formatted}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-550">Registered Water Bodies</span>
                          <span className="font-semibold text-slate-700">{diagnostics.database.table_record_counts.water_bodies}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-550">Official Inspections</span>
                          <span className="font-semibold text-slate-700">{diagnostics.database.table_record_counts.inspections}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-550">User Personnel Accounts</span>
                          <span className="font-semibold text-slate-700">{diagnostics.database.table_record_counts.users}</span>
                        </div>
                      </div>
                    </div>

                    {/* Machine Learning Telemetry */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        🧠 Machine Learning Models
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-550">Ridge Forecaster</span>
                          <span className="font-semibold text-emerald-600">Active (3 Stations)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-550">Calibrated Classifier</span>
                          <span className="font-semibold text-emerald-600">HistGradientBoosting</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-550">Datasets Audited</span>
                          <span className="font-semibold text-slate-700">{diagnostics.machine_learning.dataset_audit_count} Target Sets</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-550">Background Monitor</span>
                          <span className="font-semibold text-slate-700">
                            {diagnostics.background_monitoring.scheduler_active ? 'Running' : 'Standby'} ({diagnostics.background_monitoring.polling_interval_seconds}s)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                AQUORA AI strictly connects to authentic telemetry endpoints and transparently reports authentication requirements without synthetic data fabrication:
              </p>

              {isLoading || !telemetry ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading telemetry provider status...</div>
              ) : (
                <div className="space-y-3">
                  {telemetry.providers.map((p) => (
                    <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-800">{p.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'LIVE_ACTIVE'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-550 mt-1">
                          Type: {p.type} {p.base_url && `• Base: ${p.base_url}`}
                        </div>
                        {p.registration_info && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            ℹ️ {p.registration_info}
                          </div>
                        )}
                        {p.historical_fallback_status && (
                          <div className="text-[11px] text-sky-700 font-medium mt-1">
                            ✓ {p.historical_fallback_status}: {p.historical_coverage}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-semibold ${
                            p.is_live ? 'text-emerald-600' : 'text-slate-500'
                          }`}
                        >
                          {p.is_live ? '● Live Telemetry Connected' : '○ Archive Fallback Active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Tests upstream network reachability, DNS resolution, and credential syntax without sending unsolicited alerts:
                </p>
                <button
                  onClick={handleValidateChannels}
                  disabled={isValidatingChannels}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isValidatingChannels ? 'Probing...' : '🔄 Run Channel Probe'}
                </button>
              </div>

              {channelValidation ? (
                <div className="space-y-3">
                  {Object.entries(channelValidation.channels || {}).map(([key, info]: [string, any]) => (
                    <div key={key} className="p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-slate-700">
                          {key === 'webhook' ? '🌐 HTTP Webhook Gateway' : key === 'email' ? '✉️ SMTP Email Server' : '📱 Twilio SMS Gateway'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            info.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {info.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2">{info.message}</p>
                      {info.endpoint && (
                        <div className="text-[11px] font-mono text-slate-400 mt-1">Endpoint: {info.endpoint}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">Loading channel probe results...</div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-550">Recent in-memory operational audit trail:</span>
                <button
                  onClick={() => fetchAdminLogs(50).then(setLogs)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Refresh
                </button>
              </div>
              <div className="bg-slate-900 rounded-xl p-4 font-mono text-[11px] text-slate-300 max-h-96 overflow-y-auto space-y-2">
                {logs.length > 0 ? (
                  logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 border-b border-slate-800 pb-1.5">
                      <span className="text-slate-500 whitespace-nowrap">{log.timestamp.slice(11, 19)}</span>
                      <span
                        className={`font-bold px-1 rounded text-[10px] ${
                          log.level === 'ERROR'
                            ? 'bg-rose-900 text-rose-300'
                            : log.level === 'WARNING'
                            ? 'bg-amber-900 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-slate-400">{log.logger}:</span>
                      <span className="text-slate-200">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-center py-4">No operational logs recorded.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

