import React from 'react';
import { Table, MapPin, ExternalLink, ArrowUpRight } from 'lucide-react';
import { WaterBody } from '../../types';
import { OpsRiskBadge } from './RiskBadge';

interface AllLocationsDirectoryProps {
  waterBodies: WaterBody[];
  selectedStation: WaterBody | null;
  onSelectStation: (station: WaterBody) => void;
}

export const AllLocationsDirectory: React.FC<AllLocationsDirectoryProps> = ({
  waterBodies = [],
  selectedStation,
  onSelectStation,
}) => {
  const stations = waterBodies || [];
  const handleRowClick = (station: WaterBody) => {
    onSelectStation(station);
    // Smooth scroll to exposure-risk-section
    const el = document.getElementById('exposure-risk-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-[#1A1F22] border border-[#384145] rounded p-4 shadow-xs" id="all-locations-section">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#384145] gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Table className="w-4 h-4 text-[#3D8F91]" />
            <h3 className="font-sans font-semibold text-[18px] text-[#E8E5DC]">
              All Monitored Locations Directory
            </h3>
          </div>
          <p className="text-xs text-[#9BA5A5] font-sans mt-0.5">
            Full Kerala pilot monitoring directory with calibrated hydrological thresholds.
          </p>
        </div>

        <span className="text-xs font-mono text-[#9BA5A5]">
          Showing {stations.length} active stations
        </span>
      </div>

      {/* Full-width Table */}
      <div className="overflow-x-auto mt-3 border border-[#384145] rounded">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#23292C] border-b border-[#384145] text-[10px] text-[#9BA5A5] uppercase">
            <tr>
              <th className="p-3 font-semibold">Station</th>
              <th className="p-3 font-semibold">Type</th>
              <th className="p-3 font-semibold">Stage / Normal</th>
              <th className="p-3 font-semibold">Flow Velocity</th>
              <th className="p-3 font-semibold">Risk</th>
              <th className="p-3 font-semibold">Review State</th>
              <th className="p-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#384145] bg-[#1A1F22]">
            {stations.map((st) => {
              const isSelected = selectedStation?.id === st.id;
              const reviewState =
                st.review_state ||
                (st.current_risk_level === 'extreme' || st.current_risk_level === 'high'
                  ? 'Immediate operator review'
                  : st.current_risk_level === 'moderate'
                  ? 'Under advisory'
                  : 'No active intervention');

              return (
                <tr
                  key={st.id}
                  onClick={() => handleRowClick(st)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#253638] font-medium'
                      : 'hover:bg-[#23292C]'
                  }`}
                >
                  {/* Station Name & Coordinates */}
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-sans font-semibold text-xs text-[#E8E5DC]">
                        {st.name}
                      </span>
                      {st.station_id && (
                        <span className="text-[10px] bg-[#23292C] text-[#3D8F91] px-1.5 py-0.5 rounded border border-[#384145]">
                          {st.station_id}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#9BA5A5] mt-0.5">
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
                  <td className="p-3">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-[#23292C] text-[#3D8F91] text-[10px] border border-[#384145]">
                      {st.type}
                    </span>
                  </td>

                  {/* Stage / Normal */}
                  <td className="p-3">
                    <span className="text-[#E8E5DC] font-semibold">
                      {st.current_water_level_m != null
                        ? `${st.current_water_level_m.toFixed(2)} m`
                        : st.depth_meters != null
                        ? `${st.depth_meters.toFixed(2)} m`
                        : 'Unavailable'}
                    </span>
                    <span className="text-[#9BA5A5] text-[11px] block">
                      Normal: {st.normal_water_level_m != null ? `${st.normal_water_level_m.toFixed(2)} m` : 'Uncalibrated'}
                    </span>
                  </td>

                  {/* Flow Velocity & Discharge */}
                  <td className="p-3">
                    <span className="text-[#E8E5DC] font-semibold">
                      {st.flow_velocity_mps != null
                        ? `${st.flow_velocity_mps.toFixed(2)} m/s`
                        : 'Not Monitored'}
                    </span>
                    <span className="text-[#9BA5A5] text-[11px] block">
                      {st.discharge_cms != null
                        ? `${st.discharge_cms.toFixed(1)} m³/s`
                        : st.flow_rate_cms != null
                        ? `${st.flow_rate_cms.toFixed(1)} m³/s`
                        : 'Not Monitored'}
                    </span>
                  </td>

                  {/* Risk Badge */}
                  <td className="p-3">
                    <OpsRiskBadge
                      level={st.current_risk_level}
                      score={st.current_risk_score ?? st.risk_score}
                      showScore={true}
                      size="sm"
                    />
                  </td>

                  {/* Review State */}
                  <td className="p-3">
                    <span
                      className={`inline-block text-[11px] font-sans font-medium ${
                        st.current_risk_level === 'extreme' || st.current_risk_level === 'high'
                          ? 'text-[#C96A50]'
                          : st.current_risk_level === 'moderate'
                          ? 'text-[#C99A45]'
                          : 'text-[#5C9B72]'
                      }`}
                    >
                      {reviewState}
                    </span>
                  </td>

                  {/* Action Link */}
                  <td className="p-3 text-right">
                    <span className="inline-flex items-center space-x-1 text-[11px] font-sans text-[#3D8F91] hover:text-[#4CA1A3] font-medium">
                      <span>Assess</span>
                      <ArrowUpRight className="w-3 h-3" />
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
