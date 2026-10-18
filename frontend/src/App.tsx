import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { SummaryCards } from './components/SummaryCards';
import { MapSection } from './components/MapSection';
import { LocationDetailsPanel } from './components/LocationDetailsPanel';
import { WhatIfSimulationPanel } from './components/WhatIfSimulationPanel';
import { RiskTrendChart } from './components/RiskTrendChart';
import { WaterLevelForecastingPanel } from './components/WaterLevelForecastingPanel';
import { DashboardOverview } from './components/DashboardOverview';
import { LoadingSkeleton, EmptyState, ErrorBanner } from './components/States';
import { api, DEMO_WATER_BODIES, DEMO_RISK_CHANGES } from './services/api';
import { HealthResponse, WaterBody, RiskChangeEvent, DashboardResponse, formatCoordinates } from './types';
import { Waves, Droplets, Compass, ShieldAlert, Sliders, ExternalLink } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [waterBodies, setWaterBodies] = useState<WaterBody[]>(DEMO_WATER_BODIES);
  const [riskChanges, setRiskChanges] = useState<RiskChangeEvent[]>(DEMO_RISK_CHANGES);
  const [selectedStation, setSelectedStation] = useState<WaterBody | null>(DEMO_WATER_BODIES[1]); // Default to Cascade Canyon River
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load backend data on boot
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthData, stationsData, dashData] = await Promise.all([
        api.getHealth(),
        api.getWaterBodies(),
        api.getDashboard(),
      ]);
      setHealth(healthData);
      setDashboard(dashData);
      if (stationsData && stationsData.length > 0) {
        setWaterBodies(stationsData);
        setSelectedStation(stationsData[0]);
      }
      setRiskChanges(api.getRecentRiskChanges());
    } catch (err: any) {
      setError('Operating in offline demonstration mode. Live backend sync is reconnecting.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter water bodies by search query
  const filteredWaterBodies = waterBodies.filter((wb) =>
    wb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wb.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const highRiskCount = waterBodies.filter(
    (w) => w.current_risk_level === 'high' || w.current_risk_level === 'extreme'
  ).length;

  const handleSendToSimulator = (wb: WaterBody) => {
    setSelectedStation(wb);
    setActiveTab('simulator');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Professional Header */}
      <Header
        health={health}
        loading={loading}
        onRefresh={loadData}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Main Workspace with Sidebar & Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          highRiskCount={highRiskCount}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Error Banner if offline */}
          {error && <ErrorBanner message={error} onRetry={loadData} />}

          {/* Loading State */}
          {loading ? (
            <LoadingSkeleton />
          ) : filteredWaterBodies.length === 0 ? (
            /* Empty State */
            <EmptyState
              searchTerm={searchTerm}
              onReset={() => setSearchTerm('')}
            />
          ) : (
            <>
              {/* TAB 1: EXECUTIVE OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <SummaryCards
                    waterBodies={waterBodies}
                    riskChanges={riskChanges}
                    onSelectStation={setSelectedStation}
                  />

                  {/* Geospatial Map + Location Details Split */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-8">
                      <MapSection
                        waterBodies={filteredWaterBodies}
                        selectedStation={selectedStation}
                        onSelectStation={setSelectedStation}
                      />
                    </div>
                    <div className="lg:col-span-4">
                      <LocationDetailsPanel
                        station={selectedStation}
                        onSendToSimulator={handleSendToSimulator}
                      />
                    </div>
                  </div>

                  {/* 24h History & 12h Forecast Trend Chart */}
                  <RiskTrendChart station={selectedStation} />

                  {/* What-If Simulation Panel */}
                  <WhatIfSimulationPanel selectedStation={selectedStation} />
                </div>
              )}

              {/* TAB 2: AUTHORITY DASHBOARD & OUTBOUND ALERTS */}
              {activeTab === 'authority' && (
                <div className="space-y-6">
                  <DashboardOverview
                    dashboard={dashboard}
                    waterBodies={waterBodies}
                    loading={loading}
                    onSelectWaterBody={(wb) => {
                      setSelectedStation(wb);
                      setActiveTab('simulator');
                    }}
                    onNavigateToPredict={() => setActiveTab('simulator')}
                  />
                </div>
              )}

              {/* TAB 3: GEOSPATIAL MAP */}
              {activeTab === 'map' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-8">
                    <MapSection
                      waterBodies={filteredWaterBodies}
                      selectedStation={selectedStation}
                      onSelectStation={setSelectedStation}
                    />
                  </div>
                  <div className="lg:col-span-4">
                    <LocationDetailsPanel
                      station={selectedStation}
                      onSendToSimulator={handleSendToSimulator}
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: WHAT-IF SIMULATOR */}
              {activeTab === 'simulator' && (
                <div className="space-y-6">
                  <WhatIfSimulationPanel selectedStation={selectedStation} />
                  <RiskTrendChart station={selectedStation} />
                </div>
              )}

              {/* TAB 4: RISK TREND ANALYTICS */}
              {activeTab === 'trends' && (
                <div className="space-y-6">
                  <RiskTrendChart station={selectedStation} />
                  <SummaryCards
                    waterBodies={waterBodies}
                    riskChanges={riskChanges}
                    onSelectStation={setSelectedStation}
                  />
                </div>
              )}

              {/* TAB 5: TELEMETRY STATIONS DIRECTORY */}
              {activeTab === 'stations' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-cyan-400" />
                        Monitored Aquatic Stations Directory
                      </h2>
                      <p className="text-xs text-slate-400">
                        Inspecting telemetry parameters across lakes, rivers, reservoirs and coastal zones.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredWaterBodies.map((wb) => (
                      <div
                        key={wb.id}
                        onClick={() => setSelectedStation(wb)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                          selectedStation?.id === wb.id
                            ? 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/10'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-mono uppercase text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/40">
                              {wb.type}
                            </span>
                            <h3 className="text-base font-bold text-white mt-1.5">
                              {wb.name.replace(' (DEMO Station)', '')}
                            </h3>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              wb.current_risk_level === 'low'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : wb.current_risk_level === 'moderate'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {wb.current_risk_level} ({wb.risk_score.toFixed(0)})
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 my-3 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Temp</span>
                            <span className="font-mono text-slate-200">{wb.water_temp_c.toFixed(1)}°C</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Flow</span>
                            <span className="font-mono text-slate-200">{wb.flow_rate_cms.toFixed(1)} m³/s</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Depth</span>
                            <span className="font-mono text-slate-200">{wb.depth_meters.toFixed(1)} m</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span className="font-mono text-[10px] text-slate-500">
                            {formatCoordinates(wb.latitude, wb.longitude, 3)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendToSimulator(wb);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs"
                          >
                            Simulate &rarr;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: EXPERIMENTAL WATER LEVEL FORECASTING */}
              {activeTab === 'forecasting' && (
                <div className="space-y-6">
                  <WaterLevelForecastingPanel />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Footer & Ownership Attribution */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-5 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Waves className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-400">AQUORA AI Platform</span>
            <span>&bull;</span>
            <span className="text-amber-400/90 font-mono text-[11px]">
              DEMO SYNTHETIC ENVIRONMENT
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            Track 1: ML &amp; Integration | Track 2: Frontend &amp; Maps | Track 3: Backend &amp; DB
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
