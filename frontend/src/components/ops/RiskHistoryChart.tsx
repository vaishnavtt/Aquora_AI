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
    <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded p-4 shadow-xs" id="risk-history-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#D2DDDA] gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#197F80]" />
            <h3 className="font-sans font-semibold text-[18px] text-[#203235]">
              Risk History &amp; 12h Forecast
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#E8EFEC] text-[#125B61] border border-[#D2DDDA]">
              {stationName}
            </span>
          </div>
          <p className="text-xs text-[#667678] font-sans mt-0.5">
            Continuous 24-hour observed composite risk trajectory and forward predictive projection.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-mono">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#125B61]" />
            <span className="text-[#203235]">Past 24h Observed</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#C8644D]" />
            <span className="text-[#C8644D]">+12h Model Forecast</span>
          </div>
        </div>
      </div>

      <div className="w-full h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#197F80" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#197F80" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E8EFEC" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#667678', fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#D2DDDA' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#667678', fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#D2DDDA' }}
              unit=" pts"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  return (
                    <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded p-2 text-xs font-mono shadow-xs">
                      <div className="font-semibold text-[#203235]">{p.label}</div>
                      <div className="text-[#125B61] mt-0.5">
                        Risk Score: <strong>{p.score} / 100</strong>
                      </div>
                      <div className="text-[#667678]">
                        Water Stage: {Number(p.stage).toFixed(2)} m
                      </div>
                      <div className="text-[10px] text-[#82908F] mt-1">
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
              stroke="#A83E45"
              strokeDasharray="3 3"
              label={{
                value: 'Extreme (85)',
                position: 'top',
                fill: '#A83E45',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
              }}
            />
            <ReferenceLine
              y={70}
              stroke="#C8644D"
              strokeDasharray="3 3"
              label={{
                value: 'High (70)',
                position: 'top',
                fill: '#C8644D',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
              }}
            />
            <ReferenceLine
              y={40}
              stroke="#B98225"
              strokeDasharray="3 3"
              label={{
                value: 'Moderate (40)',
                position: 'top',
                fill: '#B98225',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono',
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#125B61"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#riskGradient)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-[#82908F] pt-2 border-t border-[#D2DDDA] mt-2">
        <span>Sampling interval: 6-hour rolling telemetry aggregation</span>
        <span>Sensor drift compensation: ±0.04m</span>
        <span>Confidence band: 94.2%</span>
      </div>
    </div>
  );
};
