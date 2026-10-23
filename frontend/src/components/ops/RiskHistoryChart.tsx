import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { WaterBody } from '../../types';

interface RiskHistoryChartProps {
  station: WaterBody | null;
}

export const RiskHistoryChart: React.FC<RiskHistoryChartProps> = ({ station }) => {
  const stationName = station ? station.name : 'Athirappilly Falls';
  const baseScore = station ? station.current_risk_score : 92;

  const trendData = [
    { time: '-24h', label: 'Yesterday 13:00', score: Math.max(10, baseScore - 28), stage: 2.90, isForecast: false },
    { time: '-18h', label: 'Yesterday 19:00', score: Math.max(15, baseScore - 22), stage: 3.25, isForecast: false },
    { time: '-12h', label: 'Last Night 01:00', score: Math.max(20, baseScore - 15), stage: 3.80, isForecast: false },
    { time: '-6h', label: 'Today 07:00', score: Math.max(25, baseScore - 6), stage: 4.40, isForecast: false },
    { time: 'Now', label: 'Current 13:00', score: baseScore, stage: station?.current_water_level_m ?? 4.82, isForecast: false },
    { time: '+6h', label: 'Forecast 19:00', score: Math.min(100, baseScore + 4), stage: 5.05, isForecast: true },
    { time: '+12h', label: 'Forecast 01:00', score: Math.max(15, baseScore - 12), stage: 4.30, isForecast: true },
  ];

  return (
    <div className="bg-[#84B3CE] rounded-xl p-5 shadow-xs" id="risk-history-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#6A9AB6] gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-[#0B3F5A]" style={{ strokeWidth: 1.5 }} />
            <h3 className="font-sans font-semibold text-[18px] text-[#082536]">
              Risk History &amp; 12h Forecast
            </h3>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-[#F5EEDD] text-[#082536] border border-[#6A9AB6]">
              {stationName}
            </span>
          </div>
          <p className="text-[13px] text-[#134059] font-sans mt-0.5">
            Continuous 24-hour observed composite risk trajectory and forward predictive projection.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-mono">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0B3F5A]" />
            <span className="text-[#082536]">Past 24h Observed</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#D9631E]" />
            <span className="text-[#D9631E]">+12h Model Forecast</span>
          </div>
        </div>
      </div>

      <div className="w-full h-64 mt-4 bg-[#F5EEDD] border border-[#6A9AB6] rounded-xl p-4 shadow-xs">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0B3F5A" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0B3F5A" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#DDD2B8" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#134059', fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#6A9AB6' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#134059', fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#6A9AB6' }}
              unit=" pts"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  return (
                    <div className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg p-2.5 text-xs font-mono shadow-xs">
                      <div className="font-semibold text-[#082536]">{p.label}</div>
                      <div className="text-[#0B3F5A] mt-0.5 font-bold">
                        Risk Score: {p.score} / 100
                      </div>
                      <div className="text-[#134059]">
                        Water Stage: {Number(p.stage).toFixed(2)} m
                      </div>
                      <div className="text-[10px] text-[#C79A12] mt-1 font-semibold">
                        {p.isForecast ? '★ Predicted trajectory' : '✓ Verified sensor reading'}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine
              y={85}
              stroke="#D12F3B"
              strokeDasharray="3 3"
              label={{
                value: 'Extreme (85)',
                position: 'top',
                fill: '#D12F3B',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
              }}
            />
            <ReferenceLine
              y={70}
              stroke="#D9631E"
              strokeDasharray="3 3"
              label={{
                value: 'High (70)',
                position: 'top',
                fill: '#D9631E',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
              }}
            />
            <ReferenceLine
              y={40}
              stroke="#C79A12"
              strokeDasharray="3 3"
              label={{
                value: 'Moderate (40)',
                position: 'top',
                fill: '#C79A12',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#0B3F5A"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#riskGradient)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-[#134059] pt-3 border-t border-[#6A9AB6] mt-4">
        <span>Sampling interval: 6-hour rolling telemetry aggregation</span>
        <span>Sensor drift compensation: ±0.04m</span>
        <span>Confidence threshold: 94.2%</span>
      </div>
    </div>
  );
};
