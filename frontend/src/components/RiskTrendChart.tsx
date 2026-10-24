import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
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
    <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-xs p-6 space-y-4">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1677D2] border border-[#BFDBFE] flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#172B4D] flex items-center gap-2 flex-wrap">
              Risk Score - Past 24h &amp; 12h Forecast
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold uppercase">
                Demo data
              </span>
            </h3>
            <p className="text-xs text-[#64748B]">
              Estimated risk over time based on rainfall, flow speed and water temperature.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs font-mono text-[#64748B]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-[#1677D2] rounded-full" />
            <span className="text-[#172B4D] font-medium">24h Historical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-[#EA580C]" />
            <span className="text-[#EA580C] font-semibold">12h Forecast</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-x-auto bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-3 shadow-xs">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[600px] select-none"
        >
          <defs>
            {/* Area gradient */}
            <linearGradient id="riskAreaGradLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1677D2" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1677D2" stopOpacity="0.0" />
            </linearGradient>

            {/* Threshold line pattern */}
            <pattern id="gridPatternLight" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.8" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect
            x={padding.left}
            y={padding.top}
            width={graphWidth}
            height={graphHeight}
            fill="url(#gridPatternLight)"
          />

          {/* Danger Zone Horizontal Bands */}
          <rect
            x={padding.left}
            y={padding.top}
            width={graphWidth}
            height={graphHeight * 0.2}
            fill="#DC2626"
            fillOpacity="0.05"
          />
          <rect
            x={padding.left}
            y={padding.top + graphHeight * 0.2}
            width={graphWidth}
            height={graphHeight * 0.2}
            fill="#EA580C"
            fillOpacity="0.04"
          />
          <rect
            x={padding.left}
            y={padding.top + graphHeight * 0.4}
            width={graphWidth}
            height={graphHeight * 0.3}
            fill="#EAB308"
            fillOpacity="0.03"
          />
          <rect
            x={padding.left}
            y={padding.top + graphHeight * 0.7}
            width={graphWidth}
            height={graphHeight * 0.3}
            fill="#16A34A"
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
                  stroke="#CBD5E1"
                  strokeWidth="0.5"
                  strokeDasharray="2 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748B"
                  fontFamily="JetBrains Mono, monospace"
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
                stroke="#1677D2"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className="opacity-70"
              />
              <text
                x={historicalCoords[nowIndex].x}
                y={padding.top - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#1677D2"
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
              >
                Now
              </text>
            </g>
          )}

          {/* Historical Filled Area */}
          <path d={areaPath} fill="url(#riskAreaGradLight)" />

          {/* Historical Trend Line (Solid Blue) */}
          <path
            d={historicalPath}
            fill="none"
            stroke="#1677D2"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Forecast Trend Line (Dashed Orange) */}
          <path
            d={forecastPath}
            fill="none"
            stroke="#EA580C"
            strokeWidth="2.2"
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
                    ? 'fill-[#EA580C] stroke-white stroke-2'
                    : 'fill-[#1677D2] stroke-white stroke-2'
                }`}
              />
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
              fill={pt.isForecast ? '#EA580C' : '#64748B'}
              fontWeight={pt.timeLabel === 'Now' ? 'bold' : 'normal'}
              fontFamily="JetBrains Mono, monospace"
            >
              {pt.timeLabel}
            </text>
          ))}
        </svg>

        {/* Hovered Point Tooltip */}
        {activePoint && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] shadow-xl text-xs text-[#172B4D] flex items-center space-x-4 pointer-events-none z-30 font-mono">
            <span className="font-bold text-[#1677D2]">{activePoint.timeLabel}</span>
            <span>
              Risk Score:{' '}
              <strong className="text-[#172B4D]">{activePoint.riskScore}</strong> / 100
            </span>
            <span className="text-[#64748B]">
              Flow: <strong className="text-[#172B4D]">{activePoint.flowRate} m³/s</strong>
            </span>
            <span className="text-[#64748B]">
              Rain: <strong className="text-[#172B4D]">{activePoint.rainfall} mm</strong>
            </span>
            {activePoint.isForecast && (
              <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 font-bold">
                AI Forecast
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
