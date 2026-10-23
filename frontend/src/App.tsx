import React, { useState, useEffect } from 'react';

// Member 2 Operations Desk Components
import { OpsHeader } from './components/ops/Header';
import { OpsSidebar, OpsNavSection } from './components/ops/Sidebar';
import { KPICards } from './components/ops/KPICards';
import { StatusTicker } from './components/ops/StatusTicker';
import { ExposureRiskPanel } from './components/ops/ExposureRiskPanel';
import { IncidentActionsConsole } from './components/ops/IncidentActionsConsole';
import { OperationsMap } from './components/ops/OperationsMap';
import { OperationalWhatIfPanel } from './components/ops/OperationalWhatIfPanel';
import { RiverLevelForecastPanel } from './components/ops/RiverLevelForecastPanel';
import { DataModelProvenancePanel } from './components/ops/DataModelProvenancePanel';
import { AllLocationsDirectory } from './components/ops/AllLocationsDirectory';
import { RiskHistoryChart } from './components/ops/RiskHistoryChart';
import { OpsRiskBadge } from './components/ops/RiskBadge';

// Member 3 Analytical Workspace Components
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

// Types & Data
import { KERALA_STATIONS } from './data/keralaStations';
import { WaterBody, HealthResponse, DashboardResponse, RiskChangeEvent, formatCoordinates } from './types';
import { api, DEMO_RISK_CHANGES } from './services/api';
import {
  Waves,
  ShieldAlert,
  Radio,
  Droplets,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  LayoutDashboard,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

const PAGE_META: Record<OpsNavSection, { title: string; subtitle: string }> = {
  'overview': {
    title: 'Water safety command center',
    subtitle: '8 stations',
  },
  'exposure-risk': {
    title: 'Hydrological risk assessment',
    subtitle: 'Real-time multi-model exposure evaluation by station',
  },
  'incident-actions': {
    title: 'Incident actions console',
    subtitle: 'Review monitored telemetry sites and dispatch emergency notices',
  },
  'map': {
    title: 'Operations map',
    subtitle: 'Interactive geospatial telemetry & hazard zones across Kerala river basins',
  },
  'what-if': {
    title: 'Operational what-if simulation',
    subtitle: 'Simulate flood pulses, rainfall surges & catchment stress testing',
  },
  'river-forecast': {
    title: 'Hydrological forecast & trajectory',
    subtitle: '1-hour predictive stage forecast & 24-hour historical records',
  },
  'risk-history': {
    title: 'Hydrological forecast & trajectory',
    subtitle: '1-hour predictive stage forecast & 24-hour historical records',
  },
  'all-locations': {
    title: 'All monitored locations directory',
    subtitle: 'Full Kerala pilot monitoring directory with calibrated thresholds',
  },
  'provenance': {
    title: 'Data & model provenance',
    subtitle: 'Verified historical telemetry archives & model benchmarks',
  },
};

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('operations-desk');
  const [activeSection, setActiveSection] = useState<OpsNavSection>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

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

  // Sync URL hash with active section
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as OpsNavSection;
      const validSections: OpsNavSection[] = [
        'overview',
        'exposure-risk',
        'incident-actions',
        'map',
        'what-if',
        'river-forecast',
        'risk-history',
        'all-locations',
        'provenance',
      ];
      if (validSections.includes(hash)) {
        setActiveSection(hash === 'risk-history' ? 'river-forecast' : hash);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
      handleNavClick('exposure-risk');
    }
  };

  const handleRunScenario = (station: WaterBody) => {
    setSelectedStation(station);
    handleNavClick('what-if');
  };

  const handleSendToSimulator = (wb: WaterBody) => {
    setSelectedStation(wb);
    setActiveTab('simulator');
  };

  const handleNavClick = (section: OpsNavSection) => {
    const target = section === 'risk-history' ? 'river-forecast' : section;
    setActiveSection(target);
    window.location.hash = target;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentMeta = PAGE_META[activeSection] || PAGE_META['overview'];

  return (
    <div className="min-h-screen bg-[#F5EEDD] text-[#082536] flex flex-col font-sans selection:bg-[#84B3CE] selection:text-[#082536]">
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
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            isSidebarOpen={isSidebarOpen}
          />

          {/* Mode Switcher Banner: Fast Access to Analytical Workspace */}
          <div className="bg-[#84B3CE] border-b border-[#6A9AB6] px-4 py-2 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#0B3F5A] animate-pulse" />
              <span className="text-[#082536] font-semibold">Mode: Kerala Operations Desk (Command Center)</span>
            </div>
            <button
              onClick={() => setActiveTab('overview')}
              className="px-3 py-1 rounded bg-[#F5EEDD] hover:bg-[#FAF6EC] text-[#0B3F5A] border border-[#6A9AB6] hover:border-[#0B3F5A] flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Open Analytical Workspace &amp; Triage &rarr;
            </button>
          </div>

          {/* Main Operations Canvas with Navigation Rail */}
          <div className="flex-1 flex flex-col lg:flex-row">
            {/* Navigation Sidebar Drawer */}
            <OpsSidebar
              activeSection={activeSection}
              onSelectSection={handleNavClick}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />

            {/* Content Viewport */}
            <main className="flex-1 p-4 sm:p-6 lg:p-7 space-y-6 max-w-[1550px] w-full mx-auto" id="overview-top">
              {/* Dynamic Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#6A9AB6]">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-[#0B3F5A] bg-[#84B3CE] px-2 py-0.5 rounded">
                      Kerala Hydrology Operations Desk
                    </span>
                    <span className="font-mono text-[10px] text-[#134059]">
                      State Disaster Management Network
                    </span>
                  </div>
                  <h1 className="font-sans font-semibold text-[22px] sm:text-[24px] text-[#082536] tracking-tight mt-1">
                    {currentMeta.title}
                  </h1>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-[#84B3CE] border border-[#6A9AB6] text-[#082536] font-medium">
                    {currentMeta.subtitle}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#17895C]/15 border border-[#17895C]/30 text-[#17895C] font-semibold flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#17895C]" />
                    <span>Nominal Sweep</span>
                  </span>
                </div>
              </div>

              {/* PAGE 1: OVERVIEW */}
              {activeSection === 'overview' && (
                <div className="space-y-6">
                  {/* Situation Card */}
                  <KPICards
                    waterBodies={filteredStations}
                    onSelectStationByName={handleSelectStationByName}
                  />

                  {/* Recent Changes Timeline */}
                  <StatusTicker
                    onViewRiskHistory={() => handleNavClick('river-forecast')}
                    onSelectStationByName={handleSelectStationByName}
                  />

                  {/* Primary Grid: 8 Stations Summary Cards */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-sans font-semibold text-[16px] text-[#082536]">
                          Primary pilot stations
                        </h3>
                        <p className="text-xs text-[#134059] font-sans">
                          Click any station to inspect its multi-layer hazard assessment.
                        </p>
                      </div>
                      <button
                        onClick={() => handleNavClick('all-locations')}
                        className="text-xs font-mono font-semibold text-[#0B3F5A] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        All locations &rarr;
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {filteredStations.slice(0, 8).map((station) => (
                        <button
                          key={station.id}
                          onClick={() => {
                            setSelectedStation(station);
                            handleNavClick('exposure-risk');
                          }}
                          className="text-left p-4 rounded-lg bg-[#F5EEDD] hover:bg-[#FAF6EC] border border-[#6A9AB6] hover:border-[#0B3F5A] transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-[10px] text-[#134059] uppercase font-semibold">
                                {station.type}
                              </span>
                              <OpsRiskBadge level={station.current_risk_level} size="sm" />
                            </div>
                            <div className="font-sans font-semibold text-[14px] text-[#082536] group-hover:text-[#0B3F5A] transition-colors">
                              {station.name}
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-[#6A9AB6] flex items-center justify-between text-xs font-mono">
                            <span className="text-[#134059]">
                              Stage: <strong className="text-[#082536]">{station.current_water_level_m != null ? `${station.current_water_level_m.toFixed(2)}m` : 'Unavailable'}</strong>
                            </span>
                            <span className="text-[#0B3F5A] text-[11px] font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                              Assess &rarr;
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 2: RISK ASSESSMENT */}
              {activeSection === 'exposure-risk' && (
                <div className="space-y-4">
                  {/* Station Switcher Bar */}
                  <div className="p-3.5 bg-[#84B3CE] border border-[#6A9AB6] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#0F3A52] font-semibold shrink-0">Selected station:</span>
                      <select
                        value={selectedStation?.id ?? filteredStations[0]?.id ?? KERALA_STATIONS[0].id}
                        onChange={(e) => {
                          const found = waterBodies.find((w) => w.id === Number(e.target.value));
                          if (found) setSelectedStation(found);
                        }}
                        className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg px-3 py-1.5 text-xs text-[#082536] font-sans font-medium focus:outline-none focus:border-[#0B3F5A] cursor-pointer"
                      >
                        {waterBodies.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.type} · {st.current_risk_level.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Station Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                      {waterBodies.map((st) => {
                        const isSelected = st.id === (selectedStation?.id ?? filteredStations[0]?.id);
                        return (
                          <button
                            key={st.id}
                            onClick={() => setSelectedStation(st)}
                            className={`px-3 py-1 rounded-lg text-xs font-sans transition-colors cursor-pointer shrink-0 ${
                              isSelected
                                ? 'bg-[#0B3F5A] text-[#F5EEDD] font-medium border border-[#0B3F5A] shadow-xs'
                                : 'bg-[#F5EEDD] text-[#0F3A52] hover:text-[#082536] border border-[#6A9AB6]'
                            }`}
                          >
                            {st.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Exposure Risk Panel Hero */}
                  <ExposureRiskPanel
                    station={selectedStation || filteredStations[0] || KERALA_STATIONS[0]}
                    onRunScenario={handleRunScenario}
                  />
                </div>
              )}

              {/* PAGE 3: INCIDENTS */}
              {activeSection === 'incident-actions' && (
                <div>
                  <IncidentActionsConsole
                    waterBodies={waterBodies}
                    selectedStation={selectedStation}
                  />
                </div>
              )}

              {/* PAGE 4: MAP */}
              {activeSection === 'map' && (
                <div>
                  <OperationsMap
                    waterBodies={filteredStations}
                    selectedStation={selectedStation}
                    onSelectStation={(st) => setSelectedStation(st)}
                  />
                </div>
              )}

              {/* PAGE 5: WHAT-IF */}
              {activeSection === 'what-if' && (
                <div className="space-y-4">
                  {/* Station Switcher */}
                  <div className="p-3.5 bg-[#84B3CE] border border-[#6A9AB6] rounded-xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#0F3A52] font-semibold">Simulation target:</span>
                      <select
                        value={selectedStation?.id ?? filteredStations[0]?.id ?? KERALA_STATIONS[0].id}
                        onChange={(e) => {
                          const found = waterBodies.find((w) => w.id === Number(e.target.value));
                          if (found) setSelectedStation(found);
                        }}
                        className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-lg px-3 py-1.5 text-xs text-[#082536] font-sans font-medium focus:outline-none focus:border-[#0B3F5A] cursor-pointer"
                      >
                        {waterBodies.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.type} · {st.current_risk_level.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <OperationalWhatIfPanel selectedStation={selectedStation} />
                </div>
              )}

              {/* PAGE 6: FORECAST & HISTORY */}
              {(activeSection === 'river-forecast' || activeSection === 'risk-history') && (
                <div className="space-y-6">
                  <RiverLevelForecastPanel />
                  <RiskHistoryChart station={selectedStation} />
                </div>
              )}

              {/* PAGE 7: LOCATIONS */}
              {activeSection === 'all-locations' && (
                <div>
                  <AllLocationsDirectory
                    waterBodies={filteredStations}
                    selectedStation={selectedStation}
                    onSelectStation={(st) => {
                      setSelectedStation(st);
                      handleNavClick('exposure-risk');
                    }}
                  />
                </div>
              )}

              {/* PAGE 8: DATA & MODELS */}
              {activeSection === 'provenance' && (
                <div>
                  <DataModelProvenancePanel />
                </div>
              )}
            </main>
          </div>

          {/* Operational Desk Footer */}
          <footer className="border-t border-[#DDD2B8] bg-[#F5EEDD] py-4 px-6 text-xs text-[#134059] font-mono mt-auto">
            <div className="max-w-[1550px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded bg-[#16587B] flex items-center justify-center text-[#F5EEDD]">
                  <Waves className="w-3.5 h-3.5 text-[#F5EEDD]" />
                </div>
                <span className="font-semibold text-[#082536]">AQUORA AI</span>
                <span>·</span>
                <span>Kerala Water-Safety Operations Desk</span>
                <span>·</span>
                <span className="text-[#17895C] font-semibold">Telemetry Online</span>
              </div>

              <div className="text-[11px] text-[#134059]">
                Field Pilot Telemetry &bull; Calibrated Hydrological Models &bull; Indian Standard Time (UTC+05:30)
              </div>
            </div>
          </footer>
        </>
      ) : (
        /* =========================================================================
            VIEW MODE 2: MODULAR ANALYTICAL WORKSPACE (TABBED ARCHITECTURE)
            ========================================================================= */
        <div className="min-h-screen bg-[#111417] text-[#E8E5DC] flex flex-col font-sans selection:bg-[#3D8F91] selection:text-[#111417]">
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
                            onSendToSimulator={handleSendToSimulator}
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
                    </div>
                  )}

                  {/* TAB 2: AI DROWNING RISK ASSESSMENT */}
                  {activeTab === 'drowning-risk' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-7">
                          <DrowningRiskAssessmentCard
                            station={selectedStation}
                            onSendToSimulator={handleSendToSimulator}
                            onOpenModelStatus={() => setActiveTab('data-audit')}
                          />
                        </div>
                        <div className="lg:col-span-5 space-y-4">
                          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                              <Layers className="w-4 h-4 text-cyan-400" />
                              Switch Station
                            </h3>
                            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                              {waterBodies.map((wb) => (
                                <button
                                  key={wb.id}
                                  onClick={() => setSelectedStation(wb)}
                                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                    selectedStation?.id === wb.id
                                      ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-700/60 font-semibold'
                                      : 'bg-slate-900/40 text-slate-300 hover:bg-slate-800/60 border border-slate-800/60'
                                  }`}
                                >
                                  <span className="truncate max-w-[200px]">{wb.name}</span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                      wb.current_risk_level === 'low'
                                        ? 'bg-emerald-950 text-emerald-400'
                                        : wb.current_risk_level === 'moderate'
                                        ? 'bg-amber-950 text-amber-400'
                                        : 'bg-rose-950 text-rose-400'
                                    }`}
                                  >
                                    {wb.current_risk_level}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: AUTHORITY INSPECTION PRIORITIZATION */}
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
                    <div className="space-y-6">
                      <MapSection
                        waterBodies={filteredStations}
                        selectedStation={selectedStation}
                        onSelectStation={(wb) => setSelectedStation(wb)}
                        onSendToSimulator={handleSendToSimulator}
                      />
                    </div>
                  )}

                  {/* TAB 5: WHAT-IF SIMULATOR */}
                  {activeTab === 'simulator' && (
                    <div className="space-y-6">
                      <WhatIfSimulationPanel
                        selectedStation={selectedStation}
                      />
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
        </div>
      )}
    </div>
  );
}

export default App;
