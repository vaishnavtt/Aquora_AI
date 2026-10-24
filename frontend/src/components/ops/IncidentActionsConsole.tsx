import React, { useState } from 'react';
import {
  Send,
  Radio,
  Mail,
  Smartphone,
  CheckCircle2,
  Play,
  Pause,
  RefreshCw,
  Info,
} from 'lucide-react';
import { WaterBody } from '../../types';

interface IncidentActionsConsoleProps {
  waterBodies: WaterBody[];
  selectedStation: WaterBody | null;
}

type AlertSeverity = 'Advisory' | 'Warning' | 'Critical Breach';
type DeliveryStatus =
  | 'TEST_MODE_SIMULATED'
  | 'ACCEPTED'
  | 'DELIVERED'
  | 'FAILED'
  | 'DUPLICATE_SUPPRESSED';

interface AuditLogEntry {
  id: string;
  time: string;
  location: string;
  severity: AlertSeverity;
  channel: string;
  status: DeliveryStatus;
  latency: string;
}

export const IncidentActionsConsole: React.FC<IncidentActionsConsoleProps> = ({
  waterBodies,
  selectedStation,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string>(
    selectedStation?.name || waterBodies[0]?.name || 'Athirappilly Falls'
  );
  const [severity, setSeverity] = useState<AlertSeverity>('Warning');
  const [alertTitle, setAlertTitle] = useState<string>(
    'Hydrodynamic Hazard Egress Notice — Kerala River Basin'
  );
  const [message, setMessage] = useState<string>(
    'Advisory: Plunge pool and riverbank surge exceeds threshold. Immediate evacuation of lower footpaths recommended.'
  );
  const [testMode, setTestMode] = useState<boolean>(true);
  const [channel, setChannel] = useState<'webhook' | 'email' | 'sms'>('webhook');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [isSweepActive, setIsSweepActive] = useState<boolean>(true);
  const [lastEvalTime, setLastEvalTime] = useState<string>('13:20:10 IST');
  const [evaluating, setEvaluating] = useState<boolean>(false);

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([
    {
      id: 'log-1',
      time: '13:21:50 IST',
      location: 'Ramamangalam Bridge',
      severity: 'Warning',
      channel: 'Webhook',
      status: 'TEST_MODE_SIMULATED',
      latency: '24ms',
    },
    {
      id: 'log-2',
      time: '13:12:15 IST',
      location: 'Athirappilly Falls',
      severity: 'Critical Breach',
      channel: 'SMTP / Twilio',
      status: 'ACCEPTED',
      latency: '118ms',
    },
    {
      id: 'log-3',
      time: '12:55:30 IST',
      location: 'Vazhachal Rapids',
      severity: 'Warning',
      channel: 'Webhook',
      status: 'DELIVERED',
      latency: '42ms',
    },
    {
      id: 'log-4',
      time: '12:40:02 IST',
      location: 'Pala Station',
      severity: 'Advisory',
      channel: 'SMS Gateway',
      status: 'DUPLICATE_SUPPRESSED',
      latency: '15ms',
    },
  ]);

  const handleIssueNotice = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} IST`;

      const newEntry: AuditLogEntry = {
        id: `log-${Date.now()}`,
        time: timeStr,
        location: selectedLocation,
        severity: severity,
        channel: channel.toUpperCase(),
        status: testMode ? 'TEST_MODE_SIMULATED' : 'DELIVERED',
        latency: `${Math.floor(Math.random() * 60) + 18}ms`,
      };

      setAuditLog([newEntry, ...auditLog]);
      setIsSubmitting(false);
      setSuccessBanner(
        `Notice dispatched: ${selectedLocation} (${severity}) recorded to audit trail.`
      );
      setTimeout(() => setSuccessBanner(null), 5000);
    }, 400);
  };

  const handleEvaluateThresholds = () => {
    setEvaluating(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} IST`;
      setLastEvalTime(timeStr);
      setEvaluating(false);
    }, 500);
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs" id="incident-actions-section">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#E2E8F0] gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1677D2]">
              <Send className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-bold text-lg text-[#172B4D] tracking-tight">
              Incident Actions Console
            </h3>
          </div>
          <p className="text-xs text-[#64748B] font-sans mt-1">
            Review monitored telemetry sites and issue multi-channel emergency notices.
          </p>
        </div>

        {/* Channel Status Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px]">
            <Radio className="w-3.5 h-3.5 text-[#16A34A]" />
            <span className="text-[#64748B]">Webhook:</span>
            <span className="font-semibold text-[#172B4D]">ALERT_WEBHOOK_URL</span>
            <span className="text-[#16A34A] font-bold">· Active</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px]">
            <Mail className="w-3.5 h-3.5 text-[#16A34A]" />
            <span className="text-[#64748B]">SMTP:</span>
            <span className="font-semibold text-[#172B4D]">SMTP_HOST</span>
            <span className="text-[#16A34A] font-bold">· Ready</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px]">
            <Smartphone className="w-3.5 h-3.5 text-[#EAB308]" />
            <span className="text-[#64748B]">SMS:</span>
            <span className="font-semibold text-[#172B4D]">TWILIO GATEWAY</span>
            <span className="text-[#EAB308] font-bold">· Simulated</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Form Column (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <form onSubmit={handleIssueNotice} className="bg-[#F8FAFC] rounded-xl p-5 sm:p-6 space-y-4 border border-[#E2E8F0]">
            <div className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#64748B] pb-2 border-b border-[#E2E8F0]">
              Emergency alert dispatch form
            </div>

            {/* Test Mode Switch & Banner */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E2E8F0]">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-sans font-semibold text-[#172B4D]">
                  Test mode simulation
                </span>
                <span className="text-[11px] font-mono text-[#64748B]">
                  (Safety interlock)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-[#CBD5E1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1677D2]"></div>
              </label>
            </div>

            {testMode && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start space-x-2.5 font-sans">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <p className="leading-relaxed">
                  Outbound dispatches will be recorded in the audit trail without triggering real external network alerts.
                </p>
              </div>
            )}

            {/* Location selector */}
            <div>
              <label className="block text-xs font-sans font-semibold text-[#172B4D] mb-1.5">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#1677D2] focus:ring-1 focus:ring-[#1677D2] font-sans transition-colors cursor-pointer"
              >
                {waterBodies.map((wb) => (
                  <option key={wb.id} value={wb.name}>
                    {wb.name} ({wb.type} · {wb.current_risk_level.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Controls */}
            <div>
              <label className="block text-xs font-sans font-semibold text-[#172B4D] mb-1.5">
                Severity
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Advisory', 'Warning', 'Critical Breach'] as AlertSeverity[]).map((lvl) => {
                  const isSel = severity === lvl;
                  const activeClasses =
                    lvl === 'Critical Breach'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold shadow-xs'
                      : lvl === 'Warning'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 font-bold shadow-xs'
                      : 'bg-yellow-50 text-yellow-800 border-yellow-300 font-bold shadow-xs';

                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSeverity(lvl)}
                      className={`py-2 px-2 rounded-lg text-xs font-sans transition-all border cursor-pointer ${
                        isSel
                          ? activeClasses
                          : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Alert Title */}
            <div>
              <label className="block text-xs font-sans font-semibold text-[#172B4D] mb-1.5">
                Alert title
              </label>
              <input
                type="text"
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#172B4D] focus:outline-none focus:border-[#1677D2] focus:ring-1 focus:ring-[#1677D2] font-sans transition-colors"
              />
            </div>

            {/* Advisory Message */}
            <div>
              <label className="block text-xs font-sans font-semibold text-[#172B4D] mb-1.5">
                Advisory message
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-white border border-[#E2E8F0] rounded-lg p-3 text-xs text-[#172B4D] focus:outline-none focus:border-[#1677D2] focus:ring-1 focus:ring-[#1677D2] font-sans transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Primary Dispatch Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary text-xs font-bold py-3 px-4 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Dispatching...' : 'Issue incident notice'}</span>
            </button>

            {successBanner && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successBanner}</span>
              </div>
            )}
          </form>

          {/* Threshold Monitoring Block */}
          <div className="bg-[#F8FAFC] rounded-xl p-5 space-y-3.5 border border-[#E2E8F0]">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-xs font-sans font-bold text-[#172B4D]">
                Automated threshold monitoring
              </span>
              <button
                type="button"
                onClick={() => setIsSweepActive(!isSweepActive)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium transition-all cursor-pointer ${
                  isSweepActive
                    ? 'btn-mint text-[11px]'
                    : 'btn-coral text-[11px]'
                }`}
              >
                {isSweepActive ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                <span>{isSweepActive ? 'Active sweep' : 'Suspended'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="bg-white border border-[#E2E8F0] p-3 rounded-xl shadow-xs">
                <span className="text-[10px] text-[#64748B] block mb-0.5">Surge limit</span>
                <span className="text-[#172B4D] font-bold">Stage surge ≥ +0.15 m/h</span>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-3 rounded-xl shadow-xs">
                <span className="text-[10px] text-[#64748B] block mb-0.5">Discharge limit</span>
                <span className="text-[#172B4D] font-bold">Flow breach ≥ 6.00 m³/s</span>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-3 rounded-xl shadow-xs">
                <span className="text-[10px] text-[#64748B] block mb-0.5">Composite risk</span>
                <span className="text-[#172B4D] font-bold">Risk score ≥ 60.0</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="font-mono text-[11px] text-[#64748B]">
                Last evaluation: {lastEvalTime}
              </span>
              <button
                onClick={handleEvaluateThresholds}
                disabled={evaluating}
                className="btn-secondary text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${evaluating ? 'animate-spin' : ''}`} />
                <span>Evaluate thresholds</span>
              </button>
            </div>
          </div>
        </div>

        {/* Audit Log Table Column (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <span className="text-xs font-sans font-bold text-[#172B4D]">
              Delivery audit log
            </span>
            <span className="text-xs font-mono text-[#64748B]">
              {auditLog.length} dispatches logged
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[10px] font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Location / Severity</th>
                  <th className="p-3">Channel / Status</th>
                  <th className="p-3 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {auditLog.map((log) => {
                  const severityBadge =
                    log.severity === 'Critical Breach'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : log.severity === 'Warning'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-yellow-50 text-yellow-800 border border-yellow-200';

                  const statusBadge =
                    log.status === 'DELIVERED'
                      ? 'text-[#16A34A] font-bold'
                      : log.status === 'ACCEPTED'
                      ? 'text-[#1677D2] font-bold'
                      : log.status === 'TEST_MODE_SIMULATED'
                      ? 'text-[#EAB308] font-bold'
                      : 'text-[#64748B] font-medium';

                  return (
                    <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3 text-[#64748B] whitespace-nowrap text-[11px]">
                        {log.time}
                      </td>
                      <td className="p-3">
                        <div className="text-[#172B4D] font-bold text-xs">{log.location}</div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-medium uppercase mt-1 ${severityBadge}`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-[#64748B] text-[11px]">{log.channel}</div>
                        <span className={`inline-block text-[10px] mt-0.5 ${statusBadge}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-[#64748B] text-[11px]">
                        {log.latency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
