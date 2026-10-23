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
    <div className="bg-[#84B3CE] rounded-xl p-5 shadow-xs" id="river-forecast-section">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#6A9AB6] gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Waves className="w-5 h-5 text-[#0B3F5A]" style={{ strokeWidth: 1.5 }} />
            <h3 className="font-sans font-semibold text-[18px] text-[#082536]">
              River level forecast
            </h3>
          </div>
          <p className="text-[13px] text-[#134059] font-sans mt-0.5">
            Autoregressive hydrological stage forecast with ground-truth persistence benchmark.
          </p>
        </div>

        {/* Station tabs */}
        <div className="flex items-center space-x-1.5 bg-[#F5EEDD] p-1.5 rounded-lg border border-[#6A9AB6] overflow-x-auto shadow-xs">
          {(Object.keys(FORECAST_STATIONS) as ForecastStationKey[]).map((stKey) => {
            const st = FORECAST_STATIONS[stKey];
            const isSelected = activeTab === stKey;
            return (
              <button
                key={stKey}
                onClick={() => setActiveTab(stKey)}
                className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#0B3F5A] text-[#F5EEDD] shadow-xs'
                    : 'text-[#0F3A52] hover:text-[#082536]'
                }`}
              >
                <span>{st.label}</span>
                <span className="text-[10px] opacity-75 ml-1">· {st.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Forecast Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 items-stretch">
        {/* Left Column: Metrics & One-Hour Gauge (4 cols) */}
        <div className="lg:col-span-4 bg-[#F5EEDD] border border-[#6A9AB6] rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-xs">
          <div>
            <div className="text-[10px] font-mono text-[#134059] uppercase tracking-wider font-semibold">
              {data.district}
            </div>

            {/* Stages Grid */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {/* Current stage h_t */}
              <div className="bg-[#84B3CE]/20 border border-[#6A9AB6] p-3 rounded-lg">
                <span className="text-[10px] font-mono uppercase text-[#134059] block font-medium">
                  Current stage h_t
                </span>
                <div className="font-mono text-2xl font-bold text-[#082536] mt-0.5">
                  {data.currentStage.toFixed(2)} <span className="text-xs font-normal">m</span>
                </div>
                <span className="text-[10px] font-mono text-[#134059]">Observed now</span>
              </div>

              {/* Next-hour predicted stage h_t+1 */}
              <div
                className={`p-3 rounded-lg border ${
                  isDangerBreached
                    ? 'bg-[#0B2C40] border-transparent text-[#FF8F9B]'
                    : 'bg-[#84B3CE]/20 border-[#6A9AB6] text-[#0B3F5A]'
                }`}
              >
                <span className="text-[10px] font-mono uppercase opacity-85 block font-medium">
                  Next-hour predicted h_t+1
                </span>
                <div className="font-mono text-2xl font-bold mt-0.5">
                  {data.predictedStage.toFixed(2)} <span className="text-xs font-normal">m</span>
                </div>
                <span className="text-[10px] font-mono font-semibold">
                  {data.trendDelta}
                </span>
              </div>
            </div>

            {/* Threshold Indicators */}
            <div className="mt-3 p-3 rounded-lg bg-[#84B3CE]/20 border border-[#6A9AB6] space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#134059]">Normal threshold:</span>
                <span className="text-[#17895C] font-semibold">{data.normalThreshold.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#6A9AB6]">
                <span className="text-[#134059]">Danger threshold:</span>
                <span className="text-[#D12F3B] font-semibold">{data.dangerThreshold.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#6A9AB6]">
                <span className="text-[#134059]">Stage trend:</span>
                <span className="font-semibold text-[#082536]">{data.trend}</span>
              </div>
            </div>
          </div>

          {/* Model Metrics Benchmarks */}
          <div className="p-3 rounded-lg bg-[#84B3CE]/30 border border-[#6A9AB6] space-y-1 text-[11px] font-mono">
            <div className="text-[10px] uppercase font-semibold text-[#0B3F5A] mb-1">
              Model Precision Metrics
            </div>
            <div className="flex justify-between">
              <span className="text-[#134059]">MAE:</span>
              <span className="text-[#082536] font-semibold">{data.mae.toFixed(3)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#134059]">RMSE:</span>
              <span className="text-[#082536] font-semibold">{data.rmse.toFixed(3)} m</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#6A9AB6]">
              <span className="text-[#134059]">Outperformance vs persistence:</span>
              <span className="text-[#17895C] font-bold">{data.persistenceOutperformance}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Historical versus Forecast Chart (8 cols) */}
        <div className="lg:col-span-8 bg-[#F5EEDD] border border-[#6A9AB6] rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#6A9AB6]">
            <span className="text-[11px] font-mono uppercase text-[#0F3A52] font-semibold tracking-wider">
              Historical versus Forecast Stage Chart (6h Past + 2h Prediction)
            </span>
            <div className="flex items-center space-x-3 text-[10px] font-mono">
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-0.5 bg-[#0B3F5A]" />
                <span className="text-[#082536]">Observed stage</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#D9631E]" />
                <span className="text-[#D9631E]">Forecast</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#17895C]" />
                <span className="text-[#134059]">Normal ({data.normalThreshold}m)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#D12F3B]" />
                <span className="text-[#134059]">Danger ({data.dangerThreshold}m)</span>
              </div>
            </div>
          </div>

          <div className="w-full h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#DDD2B8" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: '#134059', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false}
                  axisLine={{ stroke: '#6A9AB6' }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#134059', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false}
                  axisLine={{ stroke: '#6A9AB6' }}
                  unit="m"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg p-2.5 text-xs font-mono shadow-xs">
                          <div className="font-semibold text-[#082536]">{label}</div>
                          {payload.map((entry, idx) => (
                            <div key={idx} style={{ color: entry.color }} className="mt-0.5">
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
                  stroke="#D12F3B"
                  strokeDasharray="4 4"
                  label={{
                    value: `Danger (${data.dangerThreshold}m)`,
                    position: 'top',
                    fill: '#D12F3B',
                    fontSize: 10,
                    fontFamily: 'IBM Plex Mono',
                  }}
                />
                <ReferenceLine
                  y={data.normalThreshold}
                  stroke="#17895C"
                  strokeDasharray="4 4"
                  label={{
                    value: `Normal (${data.normalThreshold}m)`,
                    position: 'bottom',
                    fill: '#17895C',
                    fontSize: 10,
                    fontFamily: 'IBM Plex Mono',
                  }}
                />
                {/* Observed stage */}
                <Line
                  type="monotone"
                  dataKey="observed"
                  name="Observed stage"
                  stroke="#0B3F5A"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0B3F5A' }}
                  activeDot={{ r: 5 }}
                />
                {/* Forecast stage */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#D9631E"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#D9631E' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[#134059] pt-2 border-t border-[#6A9AB6] mt-2">
            <span>Observed stage: past 6 hours</span>
            <span className="font-semibold text-[#082536]">Current stage: {data.currentStage.toFixed(2)} m</span>
            <span className="text-[#D9631E] font-semibold">Next hour prediction: {data.predictedStage.toFixed(2)} m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
