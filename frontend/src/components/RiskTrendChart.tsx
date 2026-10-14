import React, { useState } from 'react';
import { TrendingUp, Clock, Calendar, Sparkles, Droplets, CloudRain } from 'lucide-react';
import { WaterBody, TrendDataPoint } from '../types';
import { api } from '../services/api';

interface RiskTrendChartProps {
  station: WaterBody | null;
}

export const RiskTrendChart: React.FC<RiskTrendChartProps> = ({ station }) => {
  const [activePoint, setActivePoint] = useState<TrendDataPoint | null>(null);

  // Generate synthetic 24h history + 12h forecast trend points
  const baseScore = station ? station.risk_score : 45.0;
  const baseFlow = station ? station.flow_rate_cms : 3.5;
  const trendPoints: TrendDataPoint[] = api.generateTrendData(baseScore, baseFlow);

  // Chart dimensions
  const svgWidth = 800;
  const svgHeight = 220;
  const padding = { top: 25, right: 30, bottom: 35, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Convert points to coordinates
  const getCoordinates = (point: TrendDataPoint, index: number) => {
    const x = padding.left + (index / (trendPoints.length - 1)) * graphWidth;
    const y = padding.top + graphHeight - (point.riskScore / 100) * graphHeight;
    return { x, y };
  };

  const pointsWithCoords = trendPoints.map((pt, i) => ({
    ...pt,
    ...getCoordinates(pt, i),
  }));

  // Split into historical line and forecast line
  const nowIndex = trendPoints.findIndex((p) => p.timeLabel === 'Now');
  const historicalCoords = pointsWithCoords.slice(0, nowIndex + 1);
  const forecastCoords = pointsWithCoords.slice(nowIndex);

  const makePath = (coords: { x: number; y: number }[]) => {
    if (coords.length === 0) return '';
    return coords.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');
  };

  const historicalPath = makePath(historicalCoords);
  const forecastPath = makePath(forecastCoords);

  // Gradient area path for historical
  const areaPath = `${historicalPath} L ${
    historicalCoords[historicalCoords.length - 1].x
  } ${padding.top + graphHeight} L ${historicalCoords[0].x} ${
    padding.top + graphHeight
  } Z`;

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md p-5 space-y-4">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/40">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Hydrodynamic Risk Trajectory &amp; 12h Projection
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 font-semibold uppercase">
                DEMO TREND
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Multi-point hazard tracking across precipitation pulses and diurnal current shifts.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400 rounded-full" />
            <span>24h Historical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-blue-400" />
            <span className="text-blue-300">12h Forecast</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-x-auto bg-slate-950/60 rounded-xl border border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[600px] select-none"
        >
          <defs>
            {/* Area gradient */}
            <linearGradient id="riskAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>

            {/* Threshold line pattern */}
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect
            x={padding.left}
            y={padding.top}
            width={graphWidth}
            height={graphHeight}
            fill="url(#gridPattern)"
          />

          {/* Danger Zone Horizontal Bands */}
          {/* Extreme (>80) */}
          <rect
            x={padding.left}
            y={padding.top}
            width={graphWidth}
            height={graphHeight * 0.2}
            fill="#e11d48"
            fillOpacity="0.06"
          />
          {/* High (60 - 80) */}
          <rect
            x={padding.left}
            y={padding.top + graphHeight * 0.2}
            width={graphWidth}
            height={graphHeight * 0.2}
            fill="#f43f5e"
            fillOpacity="0.04"
          />
          {/* Moderate (30 - 60) */}
          <rect
            x={padding.left}
            y={padding.top + graphHeight * 0.4}
            width={graphWidth}
            height={graphHeight * 0.3}
            fill="#f59e0b"
            fillOpacity="0.03"
          />
          {/* Low (<30) */}
          <rect
            x={padding.left}
            y={padding.top + graphHeight * 0.7}
            width={graphWidth}
            height={graphHeight * 0.3}
            fill="#10b981"
            fillOpacity="0.04"
          />

          {/* Y Axis Grid Lines & Labels */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = padding.top + graphHeight - (val / 100) * graphHeight;
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + graphWidth}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="0.5"
                  strokeDasharray="2 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Now Divider Line */}
          {nowIndex >= 0 && (
            <g>
              <line
                x1={historicalCoords[nowIndex].x}
                y1={padding.top}
                x2={historicalCoords[nowIndex].x}
                y2={padding.top + graphHeight}
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className="opacity-70"
              />
              <text
                x={historicalCoords[nowIndex].x}
                y={padding.top - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#22d3ee"
                fontWeight="bold"
                fontFamily="monospace"
              >
                LIVE CURRENT
              </text>
            </g>
          )}

          {/* Historical Filled Area */}
          <path d={areaPath} fill="url(#riskAreaGrad)" />

          {/* Historical Trend Line (Solid Cyan) */}
          <path
            d={historicalPath}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Forecast Trend Line (Dashed Blue) */}
          <path
            d={forecastPath}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />

          {/* Interactive Data Point Dots */}
          {pointsWithCoords.map((pt, i) => (
            <g
              key={i}
              className="cursor-pointer group"
              onMouseEnter={() => setActivePoint(pt)}
              onMouseLeave={() => setActivePoint(null)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={activePoint?.timestamp === pt.timestamp ? 6 : 4}
                className={`transition-all ${
                  pt.isForecast
                    ? 'fill-blue-500 stroke-blue-200 stroke-2'
                    : 'fill-cyan-400 stroke-slate-900 stroke-2'
                }`}
              />
              {/* Invisible larger hover hitbox */}
              <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />
            </g>
          ))}

          {/* X Axis Time Labels */}
          {pointsWithCoords.map((pt, i) => (
            <text
              key={i}
              x={pt.x}
              y={padding.top + graphHeight + 20}
              textAnchor="middle"
              fontSize="10"
              fill={pt.isForecast ? '#93c5fd' : '#94a3b8'}
              fontWeight={pt.timeLabel === 'Now' ? 'bold' : 'normal'}
              fontFamily="monospace"
            >
              {pt.timeLabel}
            </text>
          ))}
        </svg>

        {/* Hovered Point Tooltip */}
        {activePoint && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/80 shadow-xl text-xs text-white flex items-center space-x-4 pointer-events-none z-30 font-mono">
            <span className="font-bold text-cyan-300">{activePoint.timeLabel}</span>
            <span>
              Risk Score:{' '}
              <strong className="text-white">{activePoint.riskScore}</strong> / 100
            </span>
            <span className="text-slate-400">
              Flow: <strong className="text-slate-200">{activePoint.flowRate} m³/s</strong>
            </span>
            <span className="text-slate-400">
              Rain: <strong className="text-slate-200">{activePoint.rainfall} mm</strong>
            </span>
            {activePoint.isForecast && (
              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                AI Forecast
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
