import React, { useState } from 'react';
import {
  Send,
  Radio,
  Mail,
  Smartphone,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RefreshCw,
  Info,
} from 'lucide-react';
import { WaterBody, RiskLevel } from '../../types';

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
  // Form State
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

  // Thresholds & Scheduler State
  const [isSweepActive, setIsSweepActive] = useState<boolean>(true);
  const [lastEvalTime, setLastEvalTime] = useState<string>('13:20:10 IST');
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Delivery Audit Log State
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
    <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded p-4 shadow-xs" id="incident-actions-section">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#D2DDDA] gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Send className="w-4 h-4 text-[#197F80]" />
            <h3 className="font-sans font-semibold text-[18px] text-[#203235]">
              Incident Actions Console
            </h3>
          </div>
          <p className="text-xs text-[#667678] font-sans mt-0.5">
            Review monitored telemetry sites and issue multi-channel emergency notices.
          </p>
        </div>

        {/* Channel Status Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5 px-2 py-1 bg-[#E8EFEC] border border-[#D2DDDA] rounded text-[11px]">
            <Radio className="w-3 h-3 text-[#3F8F64]" />
            <span className="text-[#667678]">Webhook:</span>
            <span className="font-semibold text-[#125B61]">ALERT_WEBHOOK_URL</span>
            <span className="text-[#3F8F64] font-bold">· Active</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2 py-1 bg-[#E8EFEC] border border-[#D2DDDA] rounded text-[11px]">
            <Mail className="w-3 h-3 text-[#3F8F64]" />
            <span className="text-[#667678]">SMTP:</span>
            <span className="font-semibold text-[#125B61]">SMTP_HOST</span>
            <span className="text-[#3F8F64] font-bold">· Ready</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2 py-1 bg-[#E8EFEC] border border-[#D2DDDA] rounded text-[11px]">
            <Smartphone className="w-3 h-3 text-[#B98225]" />
            <span className="text-[#667678]">SMS:</span>
            <span className="font-semibold text-[#125B61]">TWILIO GATEWAY</span>
            <span className="text-[#B98225] font-bold">· Simulated</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Form Column (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <form onSubmit={handleIssueNotice} className="bg-[#FAFBF9] border border-[#D2DDDA] rounded p-4 space-y-3">
            <div className="text-[11px] font-mono uppercase text-[#125B61] font-semibold tracking-wider pb-1 border-b border-[#D2DDDA]">
              Emergency Alert Dispatch Form
            </div>

            {/* Test Mode Switch & Banner */}
            <div className="flex items-center justify-between p-2 rounded bg-[#FFFFFF] border border-[#D2DDDA]">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-sans font-semibold text-[#203235]">
                  Test Mode Simulation
                </span>
                <span className="text-[10px] font-mono text-[#82908F]">
                  (Safety Interlock)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#D2DDDA] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#125B61]"></div>
              </label>
            </div>

            {testMode && (
              <div className="p-2.5 rounded bg-[#FAF4E8] border border-[#EADBBE] text-xs text-[#7C5311] flex items-start space-x-2 font-sans">
                <Info className="w-4 h-4 text-[#B98225] shrink-0 mt-0.5" />
                <p className="leading-snug">
                  Outbound dispatches will be recorded in the audit trail without triggering real external network alerts.
                </p>
              </div>
            )}

            {/* Location selector */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#667678] mb-1 font-semibold">
                Location selector
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#D2DDDA] rounded px-3 py-1.5 text-xs text-[#203235] focus:outline-none focus:border-[#197F80] font-sans"
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
              <label className="block text-[11px] font-mono uppercase text-[#667678] mb-1 font-semibold">
                Severity
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Advisory', 'Warning', 'Critical Breach'] as AlertSeverity[]).map((lvl) => {
                  const isSel = severity === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSeverity(lvl)}
                      className={`py-1.5 px-2 rounded text-xs font-mono transition-colors border ${
                        isSel
                          ? lvl === 'Critical Breach'
                            ? 'bg-[#FBECEE] border-[#A83E45] text-[#A83E45] font-bold'
                            : lvl === 'Warning'
                            ? 'bg-[#FDF1EE] border-[#C8644D] text-[#C8644D] font-bold'
                            : 'bg-[#FAF4E8] border-[#B98225] text-[#B98225] font-bold'
                          : 'bg-[#FFFFFF] border-[#D2DDDA] text-[#667678] hover:bg-[#E8EFEC]'
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
              <label className="block text-[11px] font-mono uppercase text-[#667678] mb-1 font-semibold">
                Alert Title
              </label>
              <input
                type="text"
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#D2DDDA] rounded px-3 py-1.5 text-xs text-[#203235] focus:outline-none focus:border-[#197F80] font-sans"
              />
            </div>

            {/* Advisory Message */}
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#667678] mb-1 font-semibold">
                Advisory Message
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#D2DDDA] rounded p-2 text-xs text-[#203235] focus:outline-none focus:border-[#197F80] font-sans"
              />
            </div>

            {/* Primary Dispatch Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#125B61] hover:bg-[#197F80] text-white text-xs font-sans font-semibold py-2 px-4 rounded transition-colors shadow-xs flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Dispatching Notice...' : 'Issue incident notice'}</span>
            </button>

            {successBanner && (
              <div className="p-2 rounded bg-[#EDF5F0] border border-[#C5DFD0] text-xs text-[#25583E] flex items-center space-x-1.5 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3F8F64]" />
                <span>{successBanner}</span>
              </div>
            )}
          </form>

          {/* Threshold Monitoring Block */}
          <div className="bg-[#FAFBF9] border border-[#D2DDDA] rounded p-4 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#D2DDDA]">
              <span className="text-[11px] font-mono uppercase text-[#125B61] font-semibold tracking-wider">
                Automated Threshold Monitoring
              </span>
              <button
                type="button"
                onClick={() => setIsSweepActive(!isSweepActive)}
                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border transition-colors ${
                  isSweepActive
                    ? 'bg-[#EDF5F0] text-[#25583E] border-[#C5DFD0]'
                    : 'bg-[#FBECEE] text-[#732227] border-[#EEC2C6]'
                }`}
              >
                {isSweepActive ? <Play className="w-2.5 h-2.5 text-[#3F8F64]" /> : <Pause className="w-2.5 h-2.5 text-[#A83E45]" />}
                <span>{isSweepActive ? 'Active sweep' : 'Suspended'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-[#FFFFFF] border border-[#D2DDDA] p-2 rounded">
                <span className="text-[10px] text-[#82908F] block">Surge Limit</span>
                <span className="text-[#203235] font-semibold">Stage surge ≥ +0.15 m/h</span>
              </div>
              <div className="bg-[#FFFFFF] border border-[#D2DDDA] p-2 rounded">
                <span className="text-[10px] text-[#82908F] block">Discharge Limit</span>
                <span className="text-[#203235] font-semibold">Flow breach ≥ 6.00 m³/s</span>
              </div>
              <div className="bg-[#FFFFFF] border border-[#D2DDDA] p-2 rounded">
                <span className="text-[10px] text-[#82908F] block">Composite Risk</span>
                <span className="text-[#203235] font-semibold">Risk score ≥ 60.0</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[10px] font-mono text-[#667678]">
                Last evaluation: {lastEvalTime}
              </span>
              <button
                onClick={handleEvaluateThresholds}
                disabled={evaluating}
                className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#E8EFEC] hover:bg-[#DCEBE7] text-[#125B61] border border-[#D2DDDA] rounded text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${evaluating ? 'animate-spin' : ''}`} />
                <span>Evaluate thresholds</span>
              </button>
            </div>
          </div>
        </div>

        {/* Audit Log Table Column (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#D2DDDA]">
            <span className="text-[11px] font-mono uppercase text-[#667678] font-semibold tracking-wider">
              Delivery Audit Log
            </span>
            <span className="text-[10px] font-mono text-[#82908F]">
              {auditLog.length} dispatches logged
            </span>
          </div>

          <div className="overflow-x-auto border border-[#D2DDDA] rounded">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#FAFBF9] border-b border-[#D2DDDA] text-[10px] text-[#667678] uppercase">
                <tr>
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Location / Severity</th>
                  <th className="p-2.5">Channel / Status</th>
                  <th className="p-2.5 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D2DDDA] bg-[#FFFFFF]">
                {auditLog.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAFBF9] transition-colors">
                    <td className="p-2.5 text-[#82908F] whitespace-nowrap text-[11px]">
                      {log.time}
                    </td>
                    <td className="p-2.5">
                      <div className="text-[#203235] font-semibold">{log.location}</div>
                      <span
                        className={`inline-block px-1 rounded text-[9px] uppercase ${
                          log.severity === 'Critical Breach'
                            ? 'bg-[#FBECEE] text-[#A83E45]'
                            : log.severity === 'Warning'
                            ? 'bg-[#FDF1EE] text-[#C8644D]'
                            : 'bg-[#FAF4E8] text-[#B98225]'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="text-[#667678] text-[11px]">{log.channel}</div>
                      <span
                        className={`inline-block text-[10px] font-bold ${
                          log.status === 'DELIVERED'
                            ? 'text-[#3F8F64]'
                            : log.status === 'ACCEPTED'
                            ? 'text-[#125B61]'
                            : log.status === 'TEST_MODE_SIMULATED'
                            ? 'text-[#B98225]'
                            : 'text-[#667678]'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-right text-[#82908F] text-[11px]">
                      {log.latency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
