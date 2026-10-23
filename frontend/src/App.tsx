import React, { useState, useEffect } from 'react';
import { OpsHeader } from './components/ops/Header';
import { OpsSidebar, OpsNavSection } from './components/ops/Sidebar';
import { KPICards } from './components/ops/KPICards';
import { StatusTicker } from './components/ops/StatusTicker';
import { ExposureRiskPanel } from './components/ops/ExposureRiskPanel';
import { OperationsMap } from './components/ops/OperationsMap';
import { OperationalWhatIfPanel } from './components/ops/OperationalWhatIfPanel';
import { IncidentActionsConsole } from './components/ops/IncidentActionsConsole';
import { RiverLevelForecastPanel } from './components/ops/RiverLevelForecastPanel';
import { DataModelProvenancePanel } from './components/ops/DataModelProvenancePanel';
import { AllLocationsDirectory } from './components/ops/AllLocationsDirectory';
import { RiskHistoryChart } from './components/ops/RiskHistoryChart';

import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { SummaryCards } from './components/SummaryCards';
import { MapSection } from './components/MapSection';
import { LocationDetailsPanel } from './components/LocationDetailsPanel';
import { WhatIfSimulationPanel } from './components/WhatIfSimulationPanel';
import { RiskTrendChart } from './components/RiskTrendChart';
import { WaterLevelForecastingPanel } from './components/WaterLevelForecastingPanel';
import { DashboardOverview } from './components/DashboardOverview';
import { DrowningRiskAssessmentCard } from './components/DrowningRiskAssessmentCard';
import { DatasetModelStatusPanel } from './components/DatasetModelStatusPanel';
import { LoadingSkeleton, EmptyState, ErrorBanner } from './components/States';
import { BottomSheet } from './components/layout/BottomSheet';

import { KERALA_STATIONS } from './data/keralaStations';
import { WaterBody, HealthResponse, DashboardResponse, RiskChangeEvent, formatCoordinates } from './types';
import { api, DEMO_WATER_BODIES, DEMO_RISK_CHANGES } from './services/api';
import { Waves, ShieldAlert, Radio, Droplets, Sliders, Sparkles, Layers, ArrowRight, LayoutDashboard } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('operations-desk');
  const [activeSection, setActiveSection] = useState<OpsNavSection>('overview');

  const [waterBodies, setWaterBodies] = useState<WaterBody[]>(KERALA_STATIONS);
  const [selectedStation, setSelectedStation] = useState<WaterBody | null>(KERALA_STATIONS[0]);
  const [riskChanges, setRiskChanges] = useState<RiskChangeEvent[]>(DEMO_RISK_CHANGES);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [sidePanelMode, setSidePanelMode] = useState<'drowning-risk' | 'telemetry'>('drowning-risk');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isUsingDemoData, setIsUsingDemoData] = useState<boolean>(true);

  // Synchronize health, water bodies, and dashboard on boot
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
        setIsUsingDemoData(stationsData.every((wb) => wb.is_demonstration_data === true));
      }
      setRiskChanges(api.getRecentRiskChanges());
    } catch {
      setError('Operating in offline demonstration mode. Live backend sync is reconnecting.');
      setHealth({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0-pilot',
        database: 'connected',
        ml_model_loaded: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData();
  };

  // Filter stations based on search query
  const filteredStations = waterBodies.filter((st) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      st.name.toLowerCase().includes(q) ||
      st.type.toLowerCase().includes(q) ||
      (st.station_id && st.station_id.toLowerCase().includes(q))
    );
  });

  const highRiskCount = waterBodies.filter(
    (w) => w.current_risk_level === 'high' || w.current_risk_level === 'extreme'
  ).length;

  const handleSelectStationByName = (name: string) => {
    const found = waterBodies.find(
      (w) => w.name.toLowerCase() === name.toLowerCase()
    );
    if (found) {
      setSelectedStation(found);
      const el = document.getElementById('exposure-risk-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleRunScenario = (station: WaterBody) => {
    setSelectedStation(station);
    setActiveSection('what-if');
    const el = document.getElementById('what-if-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSendToSimulator = (wb: WaterBody) => {
    setSelectedStation(wb);
    setActiveTab('simulator');
  };

  const handleNavClick = (section: OpsNavSection) => {
    setActiveSection(section);
    let targetId = '';
    switch (section) {
      case 'overview':
        targetId = 'overview-top';
        break;
      case 'exposure-risk':
        targetId = 'exposure-risk-section';
        break;
      case 'incident-actions':
        targetId = 'incident-actions-section';
        break;
      case 'map':
        targetId = 'map-section';
        break;
      case 'what-if':
        targetId = 'what-if-section';
        break;
      case 'risk-history':
        targetId = 'risk-history-section';
        break;
      case 'all-locations':
        targetId = 'all-locations-section';
        break;
      case 'river-forecast':
        targetId = 'river-forecast-section';
        break;
      case 'provenance':
        targetId = 'provenance-section';
        break;
    }
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#111417] text-[#E8E5DC] flex flex-col font-sans selection:bg-[#3D8F91] selection:text-[#111417]">
      {/* =========================================================================
          VIEW MODE 1: KERALA WATER-SAFETY OPERATIONS DESK (COMMAND CENTER)
          ========================================================================= */}
      {activeTab === 'operations-desk' ? (
        <>
          {/* Sticky Top Operations Header */}
          <OpsHeader
            health={health}
            loading={loading}
            onRefresh={handleRefresh}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />

          {/* Mode Switcher Banner: Fast Access to Analytical Workspace */}
          <div className="bg-[#1A1F22] border-b border-[#384145] px-4 py-2 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#3D8F91] animate-pulse" />
              <span className="text-[#E8E5DC] font-semibold">Mode: Kerala Operations Desk (Command Center)</span>
            </div>
            <button
              onClick={() => setActiveTab('overview')}
              className="px-3 py-1 rounded bg-[#23292C] hover:bg-[#253638] text-[#3D8F91] border border-[#384145] hover:border-[#3D8F91] flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Open Analytical Workspace &amp; Triage &rarr;
            </button>
          </div>

          {/* Main Operations Canvas with Navigation Rail */}
          <div className="flex-1 flex flex-col lg:flex-row">
            {/* Navigation Sidebar */}
            <OpsSidebar
              activeSection={activeSection}
              onSelectSection={handleNavClick}
            />

            {/* Content Viewport */}
            <main className="flex-1 p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1550px] w-full mx-auto" id="overview-top">
              {/* Page Heading & Operational Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#384145]">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-[#3D8F91] bg-[#23292C] px-2 py-0.5 rounded border border-[#384145]">
                      Kerala Hydrology Operations Desk
                    </span>
                    <span className="font-mono text-[10px] text-[#9BA5A5]">
                      State Disaster Management Network
                    </span>
                  </div>
                  <h1 className="font-sans font-semibold text-[24px] text-[#E8E5DC] tracking-tight mt-1">
                    Water safety command center
                  </h1>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="px-2 py-1 rounded bg-[#1A1F22] border border-[#384145] text-[#9BA5A5]">
                    Pilot Surface: <strong className="text-[#3D8F91]">8 Primary Stations</strong>
                  </span>
                  <span className="px-2 py-1 rounded bg-[rgba(92,155,114,0.16)] border border-[rgba(92,155,114,0.35)] text-[#5C9B72] font-medium flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5C9B72]" />
                    <span>Nominal Telemetry Sweep</span>
                  </span>
                </div>
              </div>

              {/* Operational KPI Strip */}
              <KPICards
                waterBodies={filteredStations}
                onSelectStationByName={handleSelectStationByName}
              />

              {/* Station Status Changes Ticker */}
              <StatusTicker
                onViewRiskHistory={() => handleNavClick('risk-history')}
                onSelectStationByName={handleSelectStationByName}
              />

              {/* Primary Panel: Exposure Risk Assessment */}
              <ExposureRiskPanel
                station={selectedStation || filteredStations[0]}
                onRunScenario={handleRunScenario}
              />

              {/* Interactive Map & Operational Scenario Panels */}
              <OperationsMap
                waterBodies={filteredStations}
                selectedStation={selectedStation || filteredStations[0]}
                onSelectStation={(st) => setSelectedStation(st)}
              />

              {/* Operational What-If Panel */}
              <OperationalWhatIfPanel selectedStation={selectedStation || filteredStations[0]} />

              {/* Incident Actions Console */}
              <IncidentActionsConsole
                waterBodies={waterBodies}
                selectedStation={selectedStation || filteredStations[0]}
              />

              {/* River Level Forecast Panel */}
              <RiverLevelForecastPanel />

              {/* Data & Model Provenance Panel */}
              <DataModelProvenancePanel />

              {/* Full Monitored Directory */}
              <AllLocationsDirectory
                waterBodies={filteredStations}
                selectedStation={selectedStation || filteredStations[0]}
                onSelectStation={(st) => setSelectedStation(st)}
              />

              {/* Risk History & Forecast Trajectory */}
              <RiskHistoryChart station={selectedStation || filteredStations[0]} />
            </main>
          </div>

          {/* Operational Desk Footer */}
          <footer className="border-t border-[#384145] bg-[#1A1F22] py-4 px-6 text-xs text-[#9BA5A5] font-mono">
            <div className="max-w-[1550px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded bg-[#23292C] border border-[#384145] flex items-center justify-center text-[#3D8F91]">
                  <Waves className="w-3 h-3 text-[#3D8F91]" />
                </div>
                <span className="font-semibold text-[#E8E5DC]">AQUORA AI</span>
                <span>·</span>
                <span>Kerala Water-Safety Operations Desk</span>
                <span>·</span>
                <span className="text-[#5C9B72]">Telemetry Online</span>
              </div>

              <div className="text-[11px] text-[#9BA5A5]">
                Field Pilot Telemetry &bull; Calibrated Hydrological Models &bull; Indian Standard Time (UTC+05:30)
              </div>
            </div>
          </footer>
        </>
      ) : (
        /* =========================================================================
            VIEW MODE 2: MODULAR ANALYTICAL WORKSPACE (TABBED ARCHITECTURE)
            ========================================================================= */
        <>
          {/* Top Header */}
          <Header
            health={health}
            loading={loading}
            onRefresh={handleRefresh}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />

          {/* Mode Switcher Banner: Fast Access to Operations Desk */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-slate-300 font-medium">Mode: Multi-Module Analytical Workspace</span>
            </div>
            <button
              onClick={() => setActiveTab('operations-desk')}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500 flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Switch to Kerala Operations Desk &rarr;
            </button>
          </div>

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
              ) : filteredStations.length === 0 ? (
                /* Empty State */
                <EmptyState
                  searchTerm={searchTerm}
                  onReset={() => setSearchTerm('')}
                />
              ) : (
                <>
                  {/* TAB 1: EXECUTIVE OVERVIEW & TRIAGE */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Summary Metric Cards */}
                      <SummaryCards
                        waterBodies={waterBodies}
                        riskChanges={riskChanges}
                        onSelectStation={(wb) => setSelectedStation(wb)}
                        isUsingDemoData={isUsingDemoData}
                      />

                      {/* Authority Inspection Prioritization Queue */}
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

                      {/* Geospatial Map + Location Details Split */}
                      <BottomSheet
                        isOpen={!!selectedStation}
                        onClose={() => setSelectedStation(null)}
                        title={selectedStation?.name}
                      >
                        <LocationDetailsPanel
                          station={selectedStation}
                          onSendToSimulator={handleSendToSimulator}
                        />
                      </BottomSheet>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-8">
                          <MapSection
                            waterBodies={filteredStations}
                            selectedStation={selectedStation}
                            onSelectStation={(wb) => setSelectedStation(wb)}
                          />
                        </div>
                        <div className="hidden lg:block lg:col-span-4 space-y-3">
                          <div className="flex rounded-xl bg-slate-900/90 border border-slate-800 p-1 text-xs">
                            <button
                              onClick={() => setSidePanelMode('drowning-risk')}
                              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                sidePanelMode === 'drowning-risk'
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-sm'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              AI Drowning Risk
                            </button>
                            <button
                              onClick={() => setSidePanelMode('telemetry')}
                              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                sidePanelMode === 'telemetry'
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-sm'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <Droplets className="w-3.5 h-3.5" />
                              Telemetry &amp; Audit
                            </button>
                          </div>

                          {sidePanelMode === 'drowning-risk' ? (
                            <DrowningRiskAssessmentCard
                              station={selectedStation}
                              onSendToSimulator={handleSendToSimulator}
                              onOpenModelStatus={() => setActiveTab('data-audit')}
                            />
                          ) : (
                            <LocationDetailsPanel
                              station={selectedStation}
                              onSendToSimulator={handleSendToSimulator}
                            />
                          )}
                        </div>
                      </div>

                      {/* 24h History & 12h Forecast Trend Chart */}
                      <RiskTrendChart station={selectedStation} />

                      {/* What-If Simulation Panel */}
                      <WhatIfSimulationPanel selectedStation={selectedStation} />
                    </div>
                  )}

                  {/* TAB 2: DROWNING RISK ASSESSMENT (TWO-LAYER AI ENGINE & PROVENANCE) */}
                  {activeTab === 'drowning-risk' && (
                    <div className="space-y-6">
                      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 font-bold uppercase">
                              Core Feature
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                              Kerala Drowning Prevention
                            </span>
                          </div>
                          <h2 className="text-xl font-black text-white mt-2 flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-rose-400" />
                            AI-Powered Drowning-Risk Prediction Engine
                          </h2>
                          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                            Combines <strong>Layer A (Calibrated Environmental Hazard)</strong> from 2021–2025 Kerala hydrological telemetry with <strong>Layer B (Contextual Vulnerability Profiles)</strong> across rivers, reservoirs, waterfalls, quarries, and canals with genuine physical sensor timestamps and nearest gauge distance.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveTab('simulator')}
                            className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Sliders className="w-4 h-4" />
                            What-If Simulator &rarr;
                          </button>
                          <button
                            onClick={() => setActiveTab('data-audit')}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            Audit Report
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-7">
                          <MapSection
                            waterBodies={filteredStations}
                            selectedStation={selectedStation}
                            onSelectStation={(wb) => setSelectedStation(wb)}
                          />
                        </div>
                        <div className="lg:col-span-5">
                          <DrowningRiskAssessmentCard
                            station={selectedStation}
                            onSendToSimulator={handleSendToSimulator}
                            onOpenModelStatus={() => setActiveTab('data-audit')}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: AUTHORITY DASHBOARD & OUTBOUND ALERTS */}
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

                  {/* TAB 4: GEOSPATIAL MAP */}
                  {activeTab === 'map' && (
                    <div className="space-y-0">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-8">
                          <MapSection
                            waterBodies={filteredStations}
                            selectedStation={selectedStation}
                            onSelectStation={(wb) => setSelectedStation(wb)}
                          />
                        </div>
                        <div className="hidden lg:block lg:col-span-4">
                          <DrowningRiskAssessmentCard
                            station={selectedStation}
                            onSendToSimulator={handleSendToSimulator}
                            onOpenModelStatus={() => setActiveTab('data-audit')}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: WHAT-IF SIMULATOR */}
                  {activeTab === 'simulator' && (
                    <div className="space-y-6">
                      <WhatIfSimulationPanel selectedStation={selectedStation} />
                      <RiskTrendChart station={selectedStation} />
                    </div>
                  )}

                  {/* TAB 6: RISK TREND ANALYTICS */}
                  {activeTab === 'trends' && (
                    <div className="space-y-6">
                      <RiskTrendChart station={selectedStation} />
                      <SummaryCards
                        waterBodies={waterBodies}
                        riskChanges={riskChanges}
                        onSelectStation={(wb) => setSelectedStation(wb)}
                        isUsingDemoData={isUsingDemoData}
                      />
                    </div>
                  )}

                  {/* TAB 7: TELEMETRY STATIONS DIRECTORY */}
                  {activeTab === 'stations' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Droplets className="w-5 h-5 text-cyan-400" />
                            All monitored locations
                          </h2>
                          <p className="text-xs text-slate-400">
                            Full directory of water bodies currently in the monitoring system.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredStations.map((wb) => (
                          <div
                            key={wb.id}
                            onClick={() => {
                              setSelectedStation(wb);
                              setActiveTab('drowning-risk');
                            }}
                            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/50 cursor-pointer transition-all space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white truncate max-w-[180px]">
                                {wb.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                  wb.current_risk_level === 'low'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : wb.current_risk_level === 'moderate'
                                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                                }`}
                              >
                                {wb.current_risk_level}{' '}
                                {wb.risk_score != null
                                  ? `(${wb.risk_score.toFixed(0)})`
                                  : wb.current_risk_score != null
                                  ? `(${wb.current_risk_score.toFixed(0)})`
                                  : '(Unrated)'}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 my-3 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-500 block">Temp</span>
                                <span className="font-mono text-slate-200">
                                  {wb.water_temp_c != null ? `${wb.water_temp_c.toFixed(1)}°C` : 'Unavailable'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block">Flow</span>
                                <span className="font-mono text-slate-200">
                                  {wb.flow_rate_cms != null
                                    ? `${wb.flow_rate_cms.toFixed(1)} m³/s`
                                    : wb.discharge_cms != null
                                    ? `${wb.discharge_cms.toFixed(1)} m³/s`
                                    : 'Unavailable'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block">Depth</span>
                                <span className="font-mono text-slate-200">
                                  {wb.depth_meters != null
                                    ? `${wb.depth_meters.toFixed(1)} m`
                                    : wb.current_water_level_m != null
                                    ? `${wb.current_water_level_m.toFixed(1)} m`
                                    : 'Unavailable'}
                                </span>
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
                                className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                Simulate &rarr;
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 8: EXPERIMENTAL WATER LEVEL FORECASTING */}
                  {activeTab === 'forecasting' && (
                    <div className="space-y-6">
                      <WaterLevelForecastingPanel />
                    </div>
                  )}

                  {/* TAB 9: DATASET AUDIT & ML PERFORMANCE */}
                  {activeTab === 'data-audit' && (
                    <div className="space-y-6">
                      <DatasetModelStatusPanel />
                    </div>
                  )}
                </>
              )}
            </main>
          </div>

          {/* Footer & Attribution */}
          <footer className="border-t border-slate-900 bg-slate-950/90 py-5 px-6 text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Waves className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-400">AQUORA AI</span>
                <span>&bull;</span>
                <span className={`font-mono text-[11px] ${health?.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400/90'}`}>
                  {health?.status === 'healthy' ? 'Live backend connected' : 'Running in demo mode'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Decision Support Platform &bull; Calibrated Hydrological Models &bull; Indian Standard Time (UTC+05:30)
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
