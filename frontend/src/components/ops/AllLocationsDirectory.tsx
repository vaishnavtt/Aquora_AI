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
  waterBodies,
  selectedStation,
  onSelectStation,
}) => {
  const handleRowClick = (station: WaterBody) => {
    onSelectStation(station);
    // Smooth scroll to exposure-risk-section
    const el = document.getElementById('exposure-risk-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded p-4 shadow-xs" id="all-locations-section">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#D2DDDA] gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Table className="w-4 h-4 text-[#197F80]" />
            <h3 className="font-sans font-semibold text-[18px] text-[#203235]">
              All Monitored Locations Directory
            </h3>
          </div>
          <p className="text-xs text-[#667678] font-sans mt-0.5">
            Full Kerala pilot monitoring directory with calibrated hydrological thresholds.
          </p>
        </div>

        <span className="text-xs font-mono text-[#82908F]">
          Showing {waterBodies.length} active stations
        </span>
      </div>

      {/* Full-width Table */}
      <div className="overflow-x-auto mt-3 border border-[#D2DDDA] rounded">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#FAFBF9] border-b border-[#D2DDDA] text-[10px] text-[#667678] uppercase">
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
          <tbody className="divide-y divide-[#D2DDDA] bg-[#FFFFFF]">
            {waterBodies.map((st) => {
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
                      ? 'bg-[#DCEBE7]/70 font-medium'
                      : 'hover:bg-[#FAFBF9]'
                  }`}
                >
                  {/* Station Name & Coordinates */}
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-sans font-semibold text-xs text-[#203235]">
                        {st.name}
                      </span>
                      {st.station_id && (
                        <span className="text-[10px] bg-[#E8EFEC] text-[#125B61] px-1.5 py-0.2 rounded border border-[#D2DDDA]">
                          {st.station_id}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#82908F] mt-0.5">
                      {st.latitude.toFixed(4)}° N, {st.longitude.toFixed(4)}° E · Elevation {st.elevation_m}m
                    </div>
                  </td>

                  {/* Type */}
                  <td className="p-3">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-[#E8EFEC] text-[#125B61] text-[10px] border border-[#D2DDDA]">
                      {st.type}
                    </span>
                  </td>

                  {/* Stage / Normal */}
                  <td className="p-3">
                    <span className="text-[#203235] font-semibold">
                      {st.current_water_level_m.toFixed(2)} m
                    </span>
                    <span className="text-[#82908F] text-[11px] block">
                      Normal: {st.normal_water_level_m.toFixed(2)} m
                    </span>
                  </td>

                  {/* Flow Velocity & Discharge */}
                  <td className="p-3">
                    <span className="text-[#203235] font-semibold">
                      {st.flow_velocity_mps.toFixed(2)} m/s
                    </span>
                    <span className="text-[#82908F] text-[11px] block">
                      {st.discharge_cms.toFixed(1)} m³/s
                    </span>
                  </td>

                  {/* Risk Badge */}
                  <td className="p-3">
                    <OpsRiskBadge
                      level={st.current_risk_level}
                      score={st.current_risk_score}
                      showScore={true}
                      size="sm"
                    />
                  </td>

                  {/* Review State */}
                  <td className="p-3">
                    <span
                      className={`inline-block text-[11px] font-sans font-medium ${
                        st.current_risk_level === 'extreme' || st.current_risk_level === 'high'
                          ? 'text-[#C8644D]'
                          : st.current_risk_level === 'moderate'
                          ? 'text-[#B98225]'
                          : 'text-[#3F8F64]'
                      }`}
                    >
                      {reviewState}
                    </span>
                  </td>

                  {/* Action Link */}
                  <td className="p-3 text-right">
                    <span className="inline-flex items-center space-x-1 text-[11px] font-sans text-[#197F80] hover:text-[#125B61] font-medium">
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
