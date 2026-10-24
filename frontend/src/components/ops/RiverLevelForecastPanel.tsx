import React, { useState } from 'react';
import {
  Waves,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

type ForecastStationKey = 'RAMAMANGALAM' | 'PALA' | 'USGS';

interface ForecastStationData {
  key: ForecastStationKey;
  label: string;
  sub: string;
  district: string;
  currentStage: number;
  predictedStage: number;
  trend: string;
  trendDelta: string;
  normalThreshold: number;
  dangerThreshold: number;
  mae: number;
  rmse: number;
  persistenceOutperformance: string;
  chartData: Array<{
    time: string;
    observed?: number;
    forecast?: number;
  }>;
}

const FORECAST_STATIONS: Record<ForecastStationKey, ForecastStationData> = {
  RAMAMANGALAM: {
    key: 'RAMAMANGALAM',
    label: 'Ramamangalam Bridge',
    sub: 'Muvattupuzha River',
    district: 'Ernakulam District · Station KL-RM-01',
    currentStage: 3.42,
    predictedStage: 3.65,
    trend: 'Rising +0.23 m/h',
    trendDelta: '+0.23 m in 1h',
    normalThreshold: 1.80,
    dangerThreshold: 3.20,
    mae: 0.042,
    rmse: 0.058,
    persistenceOutperformance: '+38.4%',
    chartData: [
      { time: '08:00', observed: 2.10 },
      { time: '09:00', observed: 2.25 },
      { time: '10:00', observed: 2.50 },
      { time: '11:00', observed: 2.80 },
      { time: '12:00', observed: 3.15 },
      { time: '13:00', observed: 3.42, forecast: 3.42 },
      { time: '14:00 (1h)', forecast: 3.65 },
      { time: '15:00 (2h)', forecast: 3.82 },
    ],
  },
  PALA: {
    key: 'PALA',
    label: 'Pala Station',
    sub: 'Meenachil River',
    district: 'Kottayam District · Station KL-MN-03',
    currentStage: 2.65,
    predictedStage: 2.78,
    trend: 'Rising +0.13 m/h',
    trendDelta: '+0.13 m in 1h',
    normalThreshold: 1.90,
    dangerThreshold: 3.50,
    mae: 0.038,
    rmse: 0.049,
    persistenceOutperformance: '+41.2%',
    chartData: [
      { time: '08:00', observed: 2.05 },
      { time: '09:00', observed: 2.15 },
      { time: '10:00', observed: 2.28 },
      { time: '11:00', observed: 2.42 },
      { time: '12:00', observed: 2.54 },
      { time: '13:00', observed: 2.65, forecast: 2.65 },
      { time: '14:00 (1h)', forecast: 2.78 },
      { time: '15:00 (2h)', forecast: 2.89 },
    ],
  },
  USGS: {
    key: 'USGS',
    label: 'Potomac Benchmark',
    sub: 'USGS Streamgage 01646500',
    district: 'Calibrated Benchmark Reference Feed',
    currentStage: 4.12,
    predictedStage: 4.21,
    trend: 'Stable +0.09 m/h',
    trendDelta: '+0.09 m in 1h',
    normalThreshold: 3.20,
    dangerThreshold: 5.50,
    mae: 0.029,
    rmse: 0.041,
    persistenceOutperformance: '+44.7%',
    chartData: [
      { time: '08:00', observed: 3.80 },
      { time: '09:00', observed: 3.88 },
      { time: '10:00', observed: 3.95 },
      { time: '11:00', observed: 4.02 },
      { time: '12:00', observed: 4.08 },
      { time: '13:00', observed: 4.12, forecast: 4.12 },
      { time: '14:00 (1h)', forecast: 4.21 },
      { time: '15:00 (2h)', forecast: 4.28 },
    ],
  },
};

export const RiverLevelForecastPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ForecastStationKey>('RAMAMANGALAM');
  const data = FORECAST_STATIONS[activeTab];
  const isDangerBreached = data.predictedStage >= data.dangerThreshold;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs" id="river-forecast-section">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#E2E8F0] gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1677D2]">
              <Waves className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-bold text-lg text-[#172B4D] tracking-tight">
              River level forecast
            </h3>
          </div>
          <p className="text-xs text-[#64748B] font-sans mt-1">
            Autoregressive hydrological stage forecast with ground-truth persistence benchmark.
          </p>
        </div>

        {/* Station tabs */}
        <div className="flex items-center space-x-1.5 bg-[#F8FAFC] p-1.5 rounded-xl border border-[#E2E8F0] overflow-x-auto shadow-xs">
          {(Object.keys(FORECAST_STATIONS) as ForecastStationKey[]).map((stKey) => {
            const st = FORECAST_STATIONS[stKey];
            const isSelected = activeTab === stKey;
            return (
              <button
                key={stKey}
                onClick={() => setActiveTab(stKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'btn-primary font-bold shadow-xs'
                    : 'btn-secondary text-[#647D8C] hover:text-[#24445A]'
                }`}
              >
                <span>{st.label}</span>
                <span className="text-[10px] opacity-80 ml-1">· {st.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Forecast Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-stretch">
        {/* Left Column: Metrics & One-Hour Gauge (4 cols) */}
        <div className="lg:col-span-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div>
            <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider font-semibold">
              {data.district}
            </div>

            {/* Stages Grid */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {/* Current stage h_t */}
              <div className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl shadow-xs">
                <span className="text-[10px] font-mono uppercase text-[#64748B] block font-medium">
                  Current stage h_t
                </span>
                <div className="font-mono text-2xl font-bold text-[#172B4D] mt-1">
                  {data.currentStage.toFixed(2)} <span className="text-xs font-normal text-[#64748B]">m</span>
                </div>
                <span className="text-[10px] font-mono text-[#64748B] mt-0.5 block">Observed now</span>
              </div>

              {/* Next-hour predicted stage h_t+1 */}
              <div
                className={`p-3.5 rounded-xl border shadow-xs ${
                  isDangerBreached
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-white border-[#E2E8F0] text-[#1677D2]'
                }`}
              >
                <span className="text-[10px] font-mono uppercase opacity-85 block font-medium">
                  Next-hour predicted h_t+1
                </span>
                <div className="font-mono text-2xl font-bold mt-1">
                  {data.predictedStage.toFixed(2)} <span className="text-xs font-normal opacity-75">m</span>
                </div>
                <span className="text-[10px] font-mono font-semibold mt-0.5 block">
                  {data.trendDelta}
                </span>
              </div>
            </div>

            {/* Threshold Indicators */}
            <div className="mt-4 p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-2 text-xs font-mono shadow-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Normal threshold:</span>
                <span className="text-[#16A34A] font-bold">{data.normalThreshold.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-[#F1F5F9]">
                <span className="text-[#64748B]">Danger threshold:</span>
                <span className="text-[#DC2626] font-bold">{data.dangerThreshold.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-[#F1F5F9]">
                <span className="text-[#64748B]">Stage trend:</span>
                <span className="font-semibold text-[#172B4D]">{data.trend}</span>
              </div>
            </div>
          </div>

          {/* Model Metrics Benchmarks */}
          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5 text-xs font-mono shadow-xs">
            <div className="text-[10px] uppercase font-bold text-[#1677D2] mb-1">
              Model Precision Metrics
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">MAE:</span>
              <span className="text-[#172B4D] font-bold">{data.mae.toFixed(3)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">RMSE:</span>
              <span className="text-[#172B4D] font-bold">{data.rmse.toFixed(3)} m</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-[#F1F5F9]">
              <span className="text-[#64748B]">Outperformance vs persistence:</span>
              <span className="text-[#16A34A] font-bold">{data.persistenceOutperformance}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Historical versus Forecast Chart (8 cols) */}
        <div className="lg:col-span-8 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
            <span className="text-[11px] font-mono uppercase text-[#172B4D] font-bold tracking-wider">
              Historical versus Forecast Stage Chart (6h Past + 2h Prediction)
            </span>
            <div className="flex items-center space-x-3 text-[10px] font-mono">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-1 bg-[#1677D2] rounded-full" />
                <span className="text-[#172B4D] font-medium">Observed stage</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#EA580C]" />
                <span className="text-[#EA580C] font-semibold">Forecast</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                <span className="text-[#64748B]">Normal ({data.normalThreshold}m)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                <span className="text-[#64748B]">Danger ({data.dangerThreshold}m)</span>
              </div>
            </div>
          </div>

          <div className="w-full h-72 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.chartData} margin={{ top: 12, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  unit="m"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 text-xs font-mono shadow-lg">
                          <div className="font-bold text-[#172B4D]">{label}</div>
                          {payload.map((entry, idx) => (
                            <div key={idx} style={{ color: entry.color }} className="mt-1 font-semibold">
                              {entry.name}: {Number(entry.value).toFixed(2)} m
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={data.dangerThreshold}
                  stroke="#DC2626"
                  strokeDasharray="4 4"
                  label={{
                    value: `Danger (${data.dangerThreshold}m)`,
                    position: 'top',
                    fill: '#DC2626',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
                <ReferenceLine
                  y={data.normalThreshold}
                  stroke="#16A34A"
                  strokeDasharray="4 4"
                  label={{
                    value: `Normal (${data.normalThreshold}m)`,
                    position: 'bottom',
                    fill: '#16A34A',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
                {/* Observed stage */}
                <Line
                  type="monotone"
                  dataKey="observed"
                  name="Observed stage"
                  stroke="#1677D2"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#1677D2' }}
                  activeDot={{ r: 5 }}
                />
                {/* Forecast stage */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#EA580C"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3.5, fill: '#EA580C' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-[#64748B] pt-3 border-t border-[#E2E8F0] mt-2">
            <span>Observed stage: past 6 hours</span>
            <span className="font-semibold text-[#172B4D]">Current stage: {data.currentStage.toFixed(2)} m</span>
            <span className="text-[#EA580C] font-bold">Next hour prediction: {data.predictedStage.toFixed(2)} m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
