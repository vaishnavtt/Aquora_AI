import React from 'react';
import { ShieldCheck, AlertTriangle, Droplets, MapPin, Activity, Bell } from 'lucide-react';
import { DashboardResponse, WaterBody } from '../types';

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
  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <Activity className="w-6 h-6 animate-spin mr-3 text-cyan-400" />
        Loading telemetry data...
      </div>
    );
  }

  const totalSites = dashboard?.total_monitored_sites ?? waterBodies.length;
  const safeSites = dashboard?.safe_sites_count ?? waterBodies.filter(w => w.current_risk_level === 'low').length;
  const highRiskSites = dashboard?.high_risk_sites_count ?? waterBodies.filter(w => w.current_risk_level === 'high' || w.current_risk_level === 'extreme').length;
  const modRiskSites = dashboard?.moderate_risk_sites_count ?? waterBodies.filter(w => w.current_risk_level === 'moderate').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/60 border border-cyan-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            Active Water Hazard Surveillance
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Real-time hydrodynamic analytics, hypothermia thresholds, and environmental current predictions.
          </p>
        </div>
        <button
          onClick={onNavigateToPredict}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all whitespace-nowrap"
        >
          Run Predictive Model
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Monitored Sites</span>
            <MapPin className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{totalSites}</div>
          <p className="text-[11px] text-slate-400 mt-1">Lakes, Rivers & Reservoirs</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/90 border border-emerald-900/40 shadow-sm hover:border-emerald-800/60 transition-all">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Safe Zones</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{safeSites}</div>
          <p className="text-[11px] text-slate-400 mt-1">Low hazard current & normal temp</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/90 border border-amber-900/40 shadow-sm hover:border-amber-800/60 transition-all">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Moderate Caution</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{modRiskSites}</div>
          <p className="text-[11px] text-slate-400 mt-1">Elevated velocity or low temp</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/90 border border-rose-900/40 shadow-sm hover:border-rose-800/60 transition-all">
          <div className="flex items-center justify-between text-rose-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>High / Critical Risk</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-rose-400">{highRiskSites}</div>
          <p className="text-[11px] text-slate-400 mt-1">Advisory or restrictions recommended</p>
        </div>
      </div>

      {/* Alerts and Priority Water Bodies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts Feed */}
        <div className="lg:col-span-1 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Active System Alerts
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Live Feed
            </span>
          </div>

          <div className="space-y-3">
            {dashboard?.recent_alerts && dashboard.recent_alerts.length > 0 ? (
              dashboard.recent_alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold text-rose-300">
                    <span>{alert.water_body_name}</span>
                    <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-200">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-slate-300">{alert.message}</p>
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

        {/* Monitored Zones Snapshot */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              Monitored Aquatic Stations
            </h3>
            <span className="text-xs text-slate-400">Showing top locations</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th className="pb-2">Station Name</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Water Temp</th>
                  <th className="pb-2">Flow Rate</th>
                  <th className="pb-2">Risk Rating</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {waterBodies.slice(0, 5).map((wb) => (
                  <tr key={wb.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-medium text-slate-200">{wb.name}</td>
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
                        {wb.current_risk_level}
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
    </div>
  );
};
