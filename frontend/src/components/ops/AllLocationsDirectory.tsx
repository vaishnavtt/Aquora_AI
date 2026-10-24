import React from 'react';
import { ArrowUpRight, Table } from 'lucide-react';
import { WaterBody } from '../../types';
import { OpsRiskBadge, RISK_TOKENS } from './RiskBadge';

interface AllLocationsDirectoryProps {
  stations?: WaterBody[];
  waterBodies?: WaterBody[];
  selectedStation: WaterBody | null;
  onSelectStation: (station: WaterBody) => void;
}

export const AllLocationsDirectory: React.FC<AllLocationsDirectoryProps> = ({
  stations: stationsProp,
  waterBodies,
  selectedStation,
  onSelectStation,
}) => {
  const stations = stationsProp || waterBodies || [];
  const handleRowClick = (station: WaterBody) => {
    onSelectStation(station);
    // Smooth scroll to exposure risk panel if in view
    const target = document.getElementById('exposure-risk-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1677D2]">
            <Table className="w-4 h-4" />
          </div>
          <h3 className="font-sans font-bold text-lg text-[#172B4D] tracking-tight">
            All Monitored Locations Directory
          </h3>
        </div>

        <span className="text-xs font-mono text-[#64748B] px-3 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
          Showing {stations.length} active stations
        </span>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto mt-5 rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[10px] font-semibold tracking-wider border-b border-[#E2E8F0]">
            <tr>
              <th className="p-3.5 font-bold">Location / Station</th>
              <th className="p-3.5 font-bold">Type</th>
              <th className="p-3.5 font-bold">Stage / Normal</th>
              <th className="p-3.5 font-bold">Flow velocity</th>
              <th className="p-3.5 font-bold">Risk</th>
              <th className="p-3.5 font-bold">Review state</th>
              <th className="p-3.5 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {stations.map((st) => {
              const isSelected = selectedStation?.id === st.id;
              const reviewState =
                st.review_state ||
                (st.current_risk_level === 'extreme' || st.current_risk_level === 'high'
                  ? 'Immediate operator review'
                  : st.current_risk_level === 'moderate'
                  ? 'Under advisory'
                  : 'No active intervention');

              const token = RISK_TOKENS[st.current_risk_level] || RISK_TOKENS.low;
              const reviewColorClass =
                st.current_risk_level === 'extreme'
                  ? 'text-[#DC2626] font-semibold'
                  : st.current_risk_level === 'high'
                  ? 'text-[#EA580C] font-semibold'
                  : st.current_risk_level === 'moderate'
                  ? 'text-[#EAB308] font-semibold'
                  : 'text-[#16A34A] font-semibold';

              return (
                <tr
                  key={st.id}
                  onClick={() => handleRowClick(st)}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#EFF6FF] border-l-4 border-l-[#1677D2]'
                      : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  {/* Station Name & Coordinates */}
                  <td className="p-3.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-sans font-bold text-xs text-[#172B4D]">
                        {st.name}
                      </span>
                      {st.station_id && (
                        <span className="text-[10px] bg-[#F1F5F9] text-[#64748B] px-1.5 py-0.5 rounded font-mono font-medium border border-[#E2E8F0]">
                          {st.station_id}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5 font-sans">
                      {st.latitude != null && st.longitude != null
                        ? `${st.latitude.toFixed(4)}° N, ${st.longitude.toFixed(4)}° E`
                        : 'Coordinates Unavailable'}{' '}
                      · Elevation{' '}
                      {st.elevation_m != null
                        ? `${st.elevation_m}m`
                        : st.elevation_meters != null
                        ? `${st.elevation_meters}m`
                        : 'Unavailable'}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="p-3.5">
                    <span className="capitalize px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#172B4D] text-[10px] font-sans font-medium border border-[#E2E8F0]">
                      {st.type}
                    </span>
                  </td>

                  {/* Stage / Normal */}
                  <td className="p-3.5">
                    <span className="text-[#172B4D] font-bold">
                      {st.current_water_level_m != null
                        ? `${st.current_water_level_m.toFixed(2)} m`
                        : st.depth_meters != null
                        ? `${st.depth_meters.toFixed(2)} m`
                        : 'Unavailable'}
                    </span>
                    <span className="text-[#64748B] text-[11px] block mt-0.5">
                      Normal: {st.normal_water_level_m != null ? `${st.normal_water_level_m.toFixed(2)} m` : 'Uncalibrated'}
                    </span>
                  </td>

                  {/* Flow Velocity & Discharge */}
                  <td className="p-3.5">
                    <span className="text-[#172B4D] font-bold">
                      {st.flow_velocity_mps != null
                        ? `${st.flow_velocity_mps.toFixed(2)} m/s`
                        : 'Not Monitored'}
                    </span>
                    <span className="text-[#64748B] text-[11px] block mt-0.5">
                      {st.discharge_cms != null
                        ? `${st.discharge_cms.toFixed(1)} m³/s`
                        : st.flow_rate_cms != null
                        ? `${st.flow_rate_cms.toFixed(1)} m³/s`
                        : 'Not Monitored'}
                    </span>
                  </td>

                  {/* Risk Badge */}
                  <td className="p-3.5">
                    <OpsRiskBadge
                      level={st.current_risk_level}
                      score={st.current_risk_score ?? st.risk_score}
                      showScore={true}
                      size="sm"
                    />
                  </td>

                  {/* Review State */}
                  <td className="p-3.5">
                    <span className={`inline-block text-[11px] font-sans ${reviewColorClass}`}>
                      {reviewState}
                    </span>
                  </td>

                  {/* Action Link */}
                  <td className="p-3.5 text-right">
                    <span className="inline-flex items-center space-x-1 text-xs font-sans text-[#1677D2] hover:text-[#125FA8] font-bold transition-colors">
                      <span>Assess</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
