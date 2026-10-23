import React from 'react';
import { Table, ArrowUpRight } from 'lucide-react';
import { WaterBody } from '../../types';
import { OpsRiskBadge, RISK_TOKENS } from './RiskBadge';

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
    const el = document.getElementById('exposure-risk-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-[#84B3CE] rounded-xl p-5 shadow-xs" id="all-locations-section">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#6A9AB6] gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Table className="w-5 h-5 text-[#0B3F5A]" style={{ strokeWidth: 1.5 }} />
            <h3 className="font-sans font-semibold text-[18px] text-[#082536]">
              All monitored locations
            </h3>
          </div>
          <p className="text-[13px] text-[#134059] font-sans mt-0.5">
            Full Kerala pilot monitoring directory with calibrated hydrological thresholds.
          </p>
        </div>

        <span className="text-[12px] font-mono text-[#134059]">
          Showing {waterBodies.length} active stations
        </span>
      </div>

      {/* Full-width Table */}
      <div className="overflow-x-auto mt-4 rounded-xl border border-[#6A9AB6]">
        <table className="w-full text-left text-[12px] font-mono">
          <thead className="bg-[#6A9AB6] text-[#082536] uppercase text-[10px]">
            <tr>
              <th className="p-3 font-semibold">Station</th>
              <th className="p-3 font-semibold">Type</th>
              <th className="p-3 font-semibold">Stage / Normal</th>
              <th className="p-3 font-semibold">Flow velocity</th>
              <th className="p-3 font-semibold">Risk</th>
              <th className="p-3 font-semibold">Review state</th>
              <th className="p-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#6A9AB6] bg-[#F5EEDD]">
            {waterBodies.map((st) => {
              const isSelected = selectedStation?.id === st.id;
              const reviewState =
                st.review_state ||
                (st.current_risk_level === 'extreme' || st.current_risk_level === 'high'
                  ? 'Immediate operator review'
                  : st.current_risk_level === 'moderate'
                  ? 'Under advisory'
                  : 'No active intervention');

              const token = RISK_TOKENS[st.current_risk_level] || RISK_TOKENS.low;
              const reviewColor =
                st.current_risk_level === 'extreme'
                  ? '#D12F3B'
                  : st.current_risk_level === 'high'
                  ? '#D9631E'
                  : st.current_risk_level === 'moderate'
                  ? '#C79A12'
                  : '#17895C';

              return (
                <tr
                  key={st.id}
                  onClick={() => handleRowClick(st)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#EAE0CA]'
                      : 'hover:bg-[#FAF6EC]'
                  }`}
                  style={{
                    borderLeft: `3px solid ${token.surfaceColor}`,
                  }}
                >
                  {/* Station Name & Coordinates */}
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-sans font-semibold text-[13px] text-[#082536]">
                        {st.name}
                      </span>
                      {st.station_id && (
                        <span className="text-[10px] bg-[#84B3CE] text-[#082536] px-1.5 py-0.5 rounded font-mono font-medium">
                          {st.station_id}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#134059] mt-0.5">
                      {st.latitude.toFixed(4)}° N, {st.longitude.toFixed(4)}° E · Elevation {st.elevation_m}m
                    </div>
                  </td>

                  {/* Type */}
                  <td className="p-3">
                    <span className="capitalize px-2 py-0.5 rounded bg-[#84B3CE] text-[#082536] text-[10px] font-sans font-medium">
                      {st.type}
                    </span>
                  </td>

                  {/* Stage / Normal */}
                  <td className="p-3">
                    <span className="text-[#082536] font-semibold">
                      {st.current_water_level_m.toFixed(2)} m
                    </span>
                    <span className="text-[#134059] text-[11px] block">
                      Normal: {st.normal_water_level_m.toFixed(2)} m
                    </span>
                  </td>

                  {/* Flow Velocity & Discharge */}
                  <td className="p-3">
                    <span className="text-[#082536] font-semibold">
                      {st.flow_velocity_mps.toFixed(2)} m/s
                    </span>
                    <span className="text-[#134059] text-[11px] block">
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
                      className="inline-block text-[11px] font-sans font-medium"
                      style={{ color: reviewColor }}
                    >
                      {reviewState}
                    </span>
                  </td>

                  {/* Action Link */}
                  <td className="p-3 text-right">
                    <span className="inline-flex items-center space-x-1 text-[11px] font-sans text-[#0B3F5A] hover:text-[#16587B] font-semibold">
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
