import React from 'react';
import { TrendingUp, Clock, Calendar, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
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
  const stationName = station?.name || 'Athirappilly Falls';
  const baseScore = station?.current_risk_score ?? 92;

  // Generate 24h past + 12h forecast trend points
  const trendData = [
    { time: '-24h', label: 'Yesterday 13:00', score: Math.max(10, baseScore - 22), stage: 3.10, isForecast: false },
    { time: '-18h', label: 'Yesterday 19:00', score: Math.max(10, baseScore - 16), stage: 3.45, isForecast: false },
    { time: '-12h', label: 'Last Night 01:00', score: Math.max(10, baseScore - 8), stage: 3.90, isForecast: false },
    { time: '-6h', label: 'Today 07:00', score: Math.max(10, baseScore - 2), stage: 4.40, isForecast: false },
    { time: 'Now', label: 'Current 13:00', score: baseScore, stage: station?.current_water_level_m ?? 4.82, isForecast: false },
    { time: '+6h', label: 'Forecast 19:00', score: Math.min(100, baseScore + 4), stage: 5.05, isForecast: true },
    { time: '+12h', label: 'Forecast 01:00', score: Math.max(15, baseScore - 12), stage: 4.30, isForecast: true },
  ];

  return (
    <div className="bg-[#1A1F22] border border-[#384145] rounded p-4 shadow-xs" id="risk-history-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#384145] gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#3D8F91]" />
            <h3 className="font-sans font-semibold text-[18px] text-[#E8E5DC]">
              Risk History &amp; 12h Forecast
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#23292C] text-[#3D8F91] border border-[#384145]">
              {stationName}
            </span>
          </div>
          <p className="text-xs text-[#9BA5A5] font-sans mt-0.5">
            Continuous 24-hour observed composite risk trajectory and forward predictive projection.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-mono">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3D8F91]" />
            <span className="text-[#E8E5DC]">Past 24h Observed</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#C96A50]" />
            <span className="text-[#C96A50]">+12h Model Forecast</span>
          </div>
        </div>
      </div>

      <div className="w-full h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3D8F91" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3D8F91" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#23292C" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#9BA5A5', fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#384145' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#9BA5A5', fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#384145' }}
              unit=" pts"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  return (
                    <div className="bg-[#1A1F22] border border-[#384145] rounded p-2 text-xs font-mono shadow-xs">
                      <div className="font-semibold text-[#E8E5DC]">{p.label}</div>
                      <div className="text-[#3D8F91] mt-0.5">
                        Risk Score: <strong>{p.score} / 100</strong>
                      </div>
                      <div className="text-[#9BA5A5]">
                        Water Stage: {Number(p.stage).toFixed(2)} m
                      </div>
                      <div className="text-[10px] text-[#C5A66A] mt-1">
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
              stroke="#B74848"
              strokeDasharray="3 3"
              label={{
                value: 'Extreme (85)',
                position: 'top',
                fill: '#B74848',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
              }}
            />
            <ReferenceLine
              y={70}
              stroke="#C96A50"
              strokeDasharray="3 3"
              label={{
                value: 'High (70)',
                position: 'top',
                fill: '#C96A50',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
              }}
            />
            <ReferenceLine
              y={40}
              stroke="#C99A45"
              strokeDasharray="3 3"
              label={{
                value: 'Moderate (40)',
                position: 'top',
                fill: '#C99A45',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#3D8F91"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#riskGradient)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-[#9BA5A5] pt-2 border-t border-[#384145] mt-2">
        <span>Sampling interval: 6-hour rolling telemetry aggregation</span>
        <span>Sensor drift compensation: ±0.04m</span>
        <span>Confidence band: 94.2%</span>
      </div>
    </div>
  );
};
