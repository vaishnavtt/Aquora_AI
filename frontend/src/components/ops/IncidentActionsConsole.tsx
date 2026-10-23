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

  const severityColor = (sev: AlertSeverity | string) =>
    sev === 'Critical Breach'
      ? { bg: '#0B2C40', border: 'transparent', text: '#FF8F9B' }
      : sev === 'Warning'
      ? { bg: '#0B2C40', border: 'transparent', text: '#FFA564' }
      : { bg: '#0B2C40', border: 'transparent', text: '#F4CD6B' };

  return (
    <div className="bg-[#84B3CE] rounded-xl p-5 shadow-xs" id="incident-actions-section">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#6A9AB6] gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Send className="w-5 h-5 text-[#0B3F5A]" style={{ strokeWidth: 1.5 }} />
            <h3 className="font-sans font-semibold text-[18px] text-[#082536]">
              Incident Actions Console
            </h3>
          </div>
          <p className="text-[13px] text-[#134059] font-sans mt-0.5">
            Review monitored telemetry sites and issue multi-channel emergency notices.
          </p>
        </div>

        {/* Channel Status Strip */}
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-mono">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg text-[11px]">
            <Radio className="w-3 h-3 text-[#17895C]" />
            <span className="text-[#134059]">Webhook:</span>
            <span className="font-semibold text-[#0B3F5A]">ALERT_WEBHOOK_URL</span>
            <span className="text-[#17895C] font-bold">· Active</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg text-[11px]">
            <Mail className="w-3 h-3 text-[#17895C]" />
            <span className="text-[#134059]">SMTP:</span>
            <span className="font-semibold text-[#0B3F5A]">SMTP_HOST</span>
            <span className="text-[#17895C] font-bold">· Ready</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg text-[11px]">
            <Smartphone className="w-3 h-3 text-[#C79A12]" />
            <span className="text-[#134059]">SMS:</span>
            <span className="font-semibold text-[#0B3F5A]">TWILIO GATEWAY</span>
            <span className="text-[#C79A12] font-bold">· Simulated</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        {/* Form Column (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <form onSubmit={handleIssueNotice} className="bg-[#F5EEDD] rounded-xl p-5 space-y-3 border border-[#6A9AB6]">
            <div className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#0F3A52] pb-2 border-b border-[#6A9AB6]">
              Emergency alert dispatch form
            </div>

            {/* Test Mode Switch & Banner */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#84B3CE]/20 border border-[#6A9AB6]">
              <div className="flex items-center space-x-2">
                <span className="text-[13px] font-sans font-medium text-[#082536]">
                  Test mode simulation
                </span>
                <span className="text-[11px] font-mono text-[#134059]">
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
                <div className="w-9 h-5 bg-[#6A9AB6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0B3F5A]"></div>
              </label>
            </div>

            {testMode && (
              <div className="p-2.5 rounded-lg bg-[#0B2C40] text-[12px] text-[#F4CD6B] flex items-start space-x-2 font-sans">
                <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#F4CD6B' }} />
                <p className="leading-snug">
                  Outbound dispatches will be recorded in the audit trail without triggering real external network alerts.
                </p>
              </div>
            )}

            {/* Location selector */}
            <div>
              <label className="block text-[12px] font-sans font-medium text-[#0F3A52] mb-1.5">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg px-3 py-2 text-[13px] text-[#082536] focus:outline-none focus:border-[#0B3F5A] font-sans transition-colors cursor-pointer"
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
              <label className="block text-[12px] font-sans font-medium text-[#0F3A52] mb-1.5">
                Severity
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Advisory', 'Warning', 'Critical Breach'] as AlertSeverity[]).map((lvl) => {
                  const isSel = severity === lvl;
                  const sc = severityColor(lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSeverity(lvl)}
                      className={`py-2 px-2 rounded-lg text-[12px] font-sans transition-colors border cursor-pointer ${
                        isSel
                          ? 'font-semibold shadow-xs'
                          : 'bg-[#F5EEDD] border-[#6A9AB6] text-[#0F3A52] hover:bg-[#EAE0CA]'
                      }`}
                      style={
                        isSel
                          ? { backgroundColor: sc.bg, borderColor: sc.border, color: sc.text }
                          : undefined
                      }
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Alert Title */}
            <div>
              <label className="block text-[12px] font-sans font-medium text-[#0F3A52] mb-1.5">
                Alert title
              </label>
              <input
                type="text"
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                className="w-full bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg px-3 py-2 text-[13px] text-[#082536] focus:outline-none focus:border-[#0B3F5A] font-sans transition-colors"
              />
            </div>

            {/* Advisory Message */}
            <div>
              <label className="block text-[12px] font-sans font-medium text-[#0F3A52] mb-1.5">
                Advisory message
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg p-2.5 text-[13px] text-[#082536] focus:outline-none focus:border-[#0B3F5A] font-sans transition-colors resize-none"
              />
            </div>

            {/* Primary Dispatch Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#0B3F5A] hover:bg-[#16587B] text-[#F5EEDD] text-[13px] font-sans font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Dispatching...' : 'Issue incident notice'}</span>
            </button>

            {successBanner && (
              <div className="p-2.5 rounded-lg bg-[#0B2C40] text-[12px] text-[#5FDDB4] flex items-center space-x-1.5 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#5FDDB4]" />
                <span>{successBanner}</span>
              </div>
            )}
          </form>

          {/* Threshold Monitoring Block */}
          <div className="bg-[#F5EEDD] rounded-xl p-5 space-y-3 border border-[#6A9AB6]">
            <div className="flex items-center justify-between pb-2 border-b border-[#6A9AB6]">
              <span className="text-[12px] font-sans font-semibold text-[#082536]">
                Automated threshold monitoring
              </span>
              <button
                type="button"
                onClick={() => setIsSweepActive(!isSweepActive)}
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                  isSweepActive
                    ? 'bg-[#0B2C40] text-[#5FDDB4]'
                    : 'bg-[#0B2C40] text-[#FF8F9B]'
                }`}
              >
                {isSweepActive ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                <span>{isSweepActive ? 'Active sweep' : 'Suspended'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px] font-mono">
              <div className="bg-[#84B3CE]/20 border border-[#6A9AB6] p-2.5 rounded-lg">
                <span className="text-[10px] text-[#134059] block mb-0.5">Surge limit</span>
                <span className="text-[#082536] font-semibold">Stage surge ≥ +0.15 m/h</span>
              </div>
              <div className="bg-[#84B3CE]/20 border border-[#6A9AB6] p-2.5 rounded-lg">
                <span className="text-[10px] text-[#134059] block mb-0.5">Discharge limit</span>
                <span className="text-[#082536] font-semibold">Flow breach ≥ 6.00 m³/s</span>
              </div>
              <div className="bg-[#84B3CE]/20 border border-[#6A9AB6] p-2.5 rounded-lg">
                <span className="text-[10px] text-[#134059] block mb-0.5">Composite risk</span>
                <span className="text-[#082536] font-semibold">Risk score ≥ 60.0</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[12px]">
              <span className="font-mono text-[11px] text-[#134059]">
                Last evaluation: {lastEvalTime}
              </span>
              <button
                onClick={handleEvaluateThresholds}
                disabled={evaluating}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#F5EEDD] hover:bg-[#EAE0CA] text-[#0B3F5A] border border-[#6A9AB6] rounded-lg text-[12px] font-sans font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${evaluating ? 'animate-spin' : ''}`} />
                <span>Evaluate thresholds</span>
              </button>
            </div>
          </div>
        </div>

        {/* Audit Log Table Column (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#6A9AB6]">
            <span className="text-[12px] font-sans font-semibold text-[#082536]">
              Delivery audit log
            </span>
            <span className="text-[11px] font-mono text-[#134059]">
              {auditLog.length} dispatches logged
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#6A9AB6]">
            <table className="w-full text-left text-[12px] font-mono">
              <thead className="bg-[#6A9AB6] text-[#082536] uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Location / Severity</th>
                  <th className="p-2.5">Channel / Status</th>
                  <th className="p-2.5 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#6A9AB6] bg-[#F5EEDD]">
                {auditLog.map((log) => {
                  const sc = severityColor(log.severity);
                  return (
                    <tr key={log.id} className="hover:bg-[#FAF6EC] transition-colors">
                      <td className="p-2.5 text-[#134059] whitespace-nowrap text-[11px]">
                        {log.time}
                      </td>
                      <td className="p-2.5">
                        <div className="text-[#082536] font-semibold text-[12px]">{log.location}</div>
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[9px] font-medium uppercase mt-0.5"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="text-[#134059] text-[11px]">{log.channel}</div>
                        <span
                          className={`inline-block text-[10px] font-bold ${
                            log.status === 'DELIVERED'
                              ? 'text-[#17895C]'
                              : log.status === 'ACCEPTED'
                              ? 'text-[#0B3F5A]'
                              : log.status === 'TEST_MODE_SIMULATED'
                              ? 'text-[#C79A12]'
                              : 'text-[#134059]'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right text-[#134059] text-[11px]">
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
