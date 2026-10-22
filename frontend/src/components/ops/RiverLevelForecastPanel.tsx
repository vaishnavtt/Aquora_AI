import React, { useState } from 'react';
import {
  Waves,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Info,
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
  currentStage: number; // h_t
  predictedStage: number; // h_t+1
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
    thresholdNormal: number;
    thresholdDanger: number;
  }>;
}

const FORECAST_STATIONS: Record<ForecastStationKey, ForecastStationData> = {
  RAMAMANGALAM: {
    key: 'RAMAMANGALAM',
    label: 'RAMAMANGALAM-BRIDGE',
    sub: 'Kerala SW',
    district: 'Ernakulam District · Kerala SW Basin',
    currentStage: 3.42,
    predictedStage: 3.60,
    trend: 'Rising Surge',
    trendDelta: '+0.18 m/h',
    normalThreshold: 1.80,
    dangerThreshold: 3.20,
    mae: 0.042,
    rmse: 0.058,
    persistenceOutperformance: '+31.4%',
    chartData: [
      { time: '08:00', observed: 2.80, thresholdNormal: 1.80, thresholdDanger: 3.20 },
      { time: '09:00', observed: 2.92, thresholdNormal: 1.80, thresholdDanger: 3.20 },
      { time: '10:00', observed: 3.08, thresholdNormal: 1.80, thresholdDanger: 3.20 },
      { time: '11:00', observed: 3.22, thresholdNormal: 1.80, thresholdDanger: 3.20 },
      { time: '12:00', observed: 3.34, thresholdNormal: 1.80, thresholdDanger: 3.20 },
      { time: '13:00 (Now)', observed: 3.42, forecast: 3.42, thresholdNormal: 1.80, thresholdDanger: 3.20 },
      { time: '14:00 (h+1)', forecast: 3.60, thresholdNormal: 1.80, thresholdDanger: 3.20 },
      { time: '15:00 (h+2)', forecast: 3.71, thresholdNormal: 1.80, thresholdDanger: 3.20 },
    ],
  },
  PALA: {
    key: 'PALA',
    label: 'PALA',
    sub: 'Kerala SW',
    district: 'Kottayam District · Meenachil Basin',
    currentStage: 2.65,
    predictedStage: 2.73,
    trend: 'Steady Inflow',
    trendDelta: '+0.08 m/h',
    normalThreshold: 1.90,
    dangerThreshold: 3.50,
    mae: 0.038,
    rmse: 0.049,
    persistenceOutperformance: '+28.7%',
    chartData: [
      { time: '08:00', observed: 2.35, thresholdNormal: 1.90, thresholdDanger: 3.50 },
      { time: '09:00', observed: 2.42, thresholdNormal: 1.90, thresholdDanger: 3.50 },
      { time: '10:00', observed: 2.48, thresholdNormal: 1.90, thresholdDanger: 3.50 },
      { time: '11:00', observed: 2.54, thresholdNormal: 1.90, thresholdDanger: 3.50 },
      { time: '12:00', observed: 2.60, thresholdNormal: 1.90, thresholdDanger: 3.50 },
      { time: '13:00 (Now)', observed: 2.65, forecast: 2.65, thresholdNormal: 1.90, thresholdDanger: 3.50 },
      { time: '14:00 (h+1)', forecast: 2.73, thresholdNormal: 1.90, thresholdDanger: 3.50 },
      { time: '15:00 (h+2)', forecast: 2.79, thresholdNormal: 1.90, thresholdDanger: 3.50 },
    ],
  },
  USGS: {
    key: 'USGS',
    label: 'USGS-11164500',
    sub: 'San Francisquito Creek',
    district: 'San Mateo / Santa Clara · USGS Ground-Truth Benchmark',
    currentStage: 1.48,
    predictedStage: 1.51,
    trend: 'Nominal Flow',
    trendDelta: '+0.03 m/h',
    normalThreshold: 1.20,
    dangerThreshold: 2.80,
    mae: 0.031,
    rmse: 0.041,
    persistenceOutperformance: '+34.2%',
    chartData: [
      { time: '08:00', observed: 1.35, thresholdNormal: 1.20, thresholdDanger: 2.80 },
      { time: '09:00', observed: 1.39, thresholdNormal: 1.20, thresholdDanger: 2.80 },
      { time: '10:00', observed: 1.42, thresholdNormal: 1.20, thresholdDanger: 2.80 },
      { time: '11:00', observed: 1.44, thresholdNormal: 1.20, thresholdDanger: 2.80 },
      { time: '12:00', observed: 1.46, thresholdNormal: 1.20, thresholdDanger: 2.80 },
      { time: '13:00 (Now)', observed: 1.48, forecast: 1.48, thresholdNormal: 1.20, thresholdDanger: 2.80 },
      { time: '14:00 (h+1)', forecast: 1.51, thresholdNormal: 1.20, thresholdDanger: 2.80 },
      { time: '15:00 (h+2)', forecast: 1.52, thresholdNormal: 1.20, thresholdDanger: 2.80 },
    ],
  },
};

export const RiverLevelForecastPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ForecastStationKey>('RAMAMANGALAM');
  const data = FORECAST_STATIONS[activeTab];

  const isDangerBreached = data.predictedStage >= data.dangerThreshold;

  return (
    <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded p-4 shadow-xs" id="river-forecast-section">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#D2DDDA] gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Waves className="w-4 h-4 text-[#197F80]" />
            <h3 className="font-sans font-semibold text-[18px] text-[#203235]">
              River level forecast
            </h3>
          </div>
          <p className="text-xs text-[#667678] font-sans mt-0.5">
            Autoregressive hydrological stage forecast with ground-truth persistence benchmark.
          </p>
        </div>

        {/* Station tabs */}
        <div className="flex items-center space-x-1 bg-[#E8EFEC] p-1 rounded border border-[#D2DDDA] overflow-x-auto">
          {(Object.keys(FORECAST_STATIONS) as ForecastStationKey[]).map((stKey) => {
            const st = FORECAST_STATIONS[stKey];
            const isSelected = activeTab === stKey;
            return (
              <button
                key={stKey}
                onClick={() => setActiveTab(stKey)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#FFFFFF] text-[#125B61] border border-[#D2DDDA] shadow-xs'
                    : 'text-[#667678] hover:text-[#203235]'
                }`}
              >
                <span>{st.label}</span>
                <span className="text-[10px] text-[#82908F] ml-1">· {st.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Forecast Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 items-stretch">
        {/* Left Column: Metrics & One-Hour Gauge (4 cols) */}
        <div className="lg:col-span-4 bg-[#FAFBF9] border border-[#D2DDDA] rounded p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-[10px] font-mono text-[#82908F] uppercase tracking-wider">
              {data.district}
            </div>

            {/* Stages Grid */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {/* Current stage h_t */}
              <div className="bg-[#FFFFFF] border border-[#D2DDDA] p-2.5 rounded">
                <span className="text-[10px] font-mono uppercase text-[#82908F] block">
                  Current stage h_t
                </span>
                <div className="font-mono text-2xl font-bold text-[#203235] mt-0.5">
                  {data.currentStage.toFixed(2)} <span className="text-xs font-normal">m</span>
                </div>
                <span className="text-[10px] font-mono text-[#667678]">Observed now</span>
              </div>

              {/* Next-hour predicted stage h_t+1 */}
              <div
                className={`p-2.5 rounded border ${
                  isDangerBreached
                    ? 'bg-[#FDF1EE] border-[#F4D2C9] text-[#8C3926]'
                    : 'bg-[#FFFFFF] border-[#D2DDDA] text-[#125B61]'
                }`}
              >
                <span className="text-[10px] font-mono uppercase text-[#82908F] block">
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
            <div className="mt-3 p-2.5 rounded bg-[#FFFFFF] border border-[#D2DDDA] space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#667678]">Normal threshold:</span>
                <span className="text-[#3F8F64] font-semibold">{data.normalThreshold.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#D2DDDA]">
                <span className="text-[#667678]">Danger threshold:</span>
                <span className="text-[#C8644D] font-semibold">{data.dangerThreshold.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#D2DDDA]">
                <span className="text-[#667678]">Stage trend:</span>
                <span className="font-semibold text-[#203235]">{data.trend}</span>
              </div>
            </div>
          </div>

          {/* Model Metrics Benchmarks */}
          <div className="p-2.5 rounded bg-[#E8EFEC]/60 border border-[#D2DDDA] space-y-1 text-[11px] font-mono">
            <div className="text-[10px] uppercase font-semibold text-[#125B61] mb-1">
              Model Precision Metrics
            </div>
            <div className="flex justify-between">
              <span className="text-[#667678]">MAE:</span>
              <span className="text-[#203235] font-semibold">{data.mae.toFixed(3)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667678]">RMSE:</span>
              <span className="text-[#203235] font-semibold">{data.rmse.toFixed(3)} m</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#D2DDDA]">
              <span className="text-[#667678]">Outperformance vs persistence:</span>
              <span className="text-[#3F8F64] font-bold">{data.persistenceOutperformance}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Historical versus Forecast Chart (8 cols) */}
        <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#D2DDDA] rounded p-4 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#D2DDDA]">
            <span className="text-[11px] font-mono uppercase text-[#667678] font-semibold tracking-wider">
              Historical versus Forecast Stage Chart (6h Past + 2h Prediction)
            </span>
            <div className="flex items-center space-x-3 text-[10px] font-mono">
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-0.5 bg-[#125B61]" />
                <span className="text-[#203235]">Observed stage</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#C8644D]" />
                <span className="text-[#C8644D]">Forecast</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#3F8F64]" />
                <span className="text-[#667678]">Normal ({data.normalThreshold}m)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-[#C8644D]" />
                <span className="text-[#667678]">Danger ({data.dangerThreshold}m)</span>
              </div>
            </div>
          </div>

          <div className="w-full h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#E8EFEC" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: '#667678', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false}
                  axisLine={{ stroke: '#D2DDDA' }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#667678', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false}
                  axisLine={{ stroke: '#D2DDDA' }}
                  unit="m"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#FFFFFF] border border-[#D2DDDA] rounded p-2 text-xs font-mono shadow-xs">
                          <div className="font-semibold text-[#203235]">{label}</div>
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
                  stroke="#C8644D"
                  strokeDasharray="4 4"
                  label={{
                    value: `Danger (${data.dangerThreshold}m)`,
                    position: 'top',
                    fill: '#C8644D',
                    fontSize: 10,
                    fontFamily: 'IBM Plex Mono',
                  }}
                />
                <ReferenceLine
                  y={data.normalThreshold}
                  stroke="#3F8F64"
                  strokeDasharray="4 4"
                  label={{
                    value: `Normal (${data.normalThreshold}m)`,
                    position: 'bottom',
                    fill: '#3F8F64',
                    fontSize: 10,
                    fontFamily: 'IBM Plex Mono',
                  }}
                />
                {/* Observed stage */}
                <Line
                  type="monotone"
                  dataKey="observed"
                  name="Observed stage"
                  stroke="#125B61"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#125B61' }}
                  activeDot={{ r: 5 }}
                />
                {/* Forecast stage */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#C8644D"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#C8644D' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[#82908F] pt-2 border-t border-[#D2DDDA] mt-2">
            <span>Observed stage: past 6 hours</span>
            <span className="font-semibold text-[#203235]">Current stage: {data.currentStage.toFixed(2)} m</span>
            <span className="text-[#C8644D] font-semibold">Next hour prediction: {data.predictedStage.toFixed(2)} m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
