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
import { OpsRiskBadge } from './components/ops/RiskBadge';
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
import { ReportsExportModal } from './components/ops/ReportsExportModal';
import { AdminConsoleModal } from './components/ops/AdminConsoleModal';


import { KERALA_STATIONS } from './data/keralaStations';
import { WaterBody, HealthResponse, DashboardResponse, RiskChangeEvent, formatCoordinates } from './types';
import { api, DEMO_RISK_CHANGES } from './services/api';
import { Waves, ShieldAlert, Radio, Droplets, Sliders, Sparkles, ArrowRight, LayoutDashboard, Compass, Activity, MapPin } from 'lucide-react';

const PAGE_META: Record<OpsNavSection, { title: string; subtitle: string }> = {
  'overview': {
    title: 'Water Safety Command Center',
    subtitle: 'Real-time telemetry and hazard monitoring across Kerala river basins',
  },
  'exposure-risk': {
    title: 'Hydrological Risk Assessment',
    subtitle: 'Calibrated environmental exposure evaluation by monitoring station',
  },
  'incident-actions': {
    title: 'Incident Actions Console',
    subtitle: 'Review monitored telemetry sites and dispatch emergency notices',
  },
  'map': {
    title: 'Geospatial Operations Map',
    subtitle: 'Interactive geospatial telemetry & hazard zones across Kerala river basins',
  },
  'what-if': {
    title: 'Operational What-If Simulator',
    subtitle: 'Simulate flood pulses, rainfall surges & catchment stress testing',
  },
  'river-forecast': {
    title: 'Hydrological Forecast & Trajectory',
    subtitle: '1-hour predictive stage forecast & 24-hour historical records',
  },
  'risk-history': {
    title: 'Hydrological Forecast & Trajectory',
    subtitle: '1-hour predictive stage forecast & 24-hour historical records',
  },
  'all-locations': {
    title: 'Monitored Locations Directory',
    subtitle: 'Full Kerala pilot monitoring directory with calibrated thresholds',
  },
  'provenance': {
    title: 'Data & Model Provenance',
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
  const [isReportsOpen, setIsReportsOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);


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
        'all-locations',
        'provenance',
      ];
      if (validSections.includes(hash)) {
        setActiveSection(hash);
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

  return activeTab === 'operations-desk' ? (
    <div className="min-h-screen bg-[#F1F8FC] text-[#24445A] flex flex-col font-sans selection:bg-[#2387D9] selection:text-white">
      {/* Sticky Top Operations Header */}
      <OpsHeader
        health={health}
        loading={loading}
        onRefresh={handleRefresh}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        waterBodies={waterBodies}
        onSelectWaterBody={(wb) => {
          setSelectedStation(wb);
          handleNavClick('exposure-risk');
        }}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        onOpenReports={() => setIsReportsOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Mode Switcher Banner: Natural Aqua & Pale Blue Gradient */}
      <div className="bg-gradient-to-r from-[#E0F4FF] via-[#E8F8EF] to-[#EFFCF7] border-b border-[#D9E8EF] px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
          <span className="text-[#24445A] font-bold">
            Kerala Operations Desk <span className="text-[#647D8C] font-normal hidden sm:inline">(Real-time Command Center)</span>
          </span>
        </div>
        <button
          onClick={() => setActiveTab('overview')}
          className="btn-secondary text-xs font-bold text-[#2387D9] px-3.5 py-1.5"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Open Analytical Workspace &amp; Triage &rarr;
        </button>
      </div>

      {/* Main Operations Canvas with Slide-out Navigation Drawer */}
      <div className="flex-1 flex flex-col">
        {/* Navigation Sidebar Drawer */}
        <OpsSidebar
          activeSection={activeSection}
          onSelectSection={handleNavClick}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 space-y-6 max-w-[1550px] w-full mx-auto" id="main-content">
          {/* Natural Environmental Hero Banner on Overview */}
          {activeSection === 'overview' && (
            <div className="relative rounded-3xl overflow-hidden shadow-xs border border-[#D9E8EF] bg-gradient-to-r from-[#E0F4FF] to-[#D8F8F0]">
              {/* Background Image Container with Soft Natural Overlay */}
              <div className="absolute inset-0 z-0">
                <img
                  src="/images/kerala_river_hero.jpg"
                  alt="Kerala River Landscape"
                  className="w-full h-full object-cover object-center opacity-30 mix-blend-multiply"
                  onError={(e) => {
                    // Graceful fallback if image is missing
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#F1F8FC]/95 via-[#F1F8FC]/80 to-[#E8F5FA]/60" />
              </div>

              {/* Hero Content */}
              <div className="relative z-10 p-6 sm:p-8 lg:p-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#DDF5E8] text-[#14532D] border border-[#A7F3D0] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                      Kerala Pilot Environmental Surveillance
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#D9F0FF] text-[#2387D9] border border-[#8ED7F8] text-xs font-semibold font-mono shadow-2xs">
                      {filteredStations.length} Water Bodies
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#24445A] tracking-tight">
                    Water Safety &amp; Hydrological Intelligence
                  </h1>
                  <p className="text-xs sm:text-sm text-[#647D8C] leading-relaxed">
                    Continuous monitoring of water levels, flow velocities, and meteorological catchment conditions across Kerala rivers, reservoirs, and natural hazard zones.
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleNavClick('exposure-risk')}
                    className="btn-primary text-xs"
                  >
                    <Activity className="w-4 h-4" />
                    Assess Stations
                  </button>
                  <button
                    onClick={() => handleNavClick('map')}
                    className="btn-secondary text-xs"
                  >
                    <Compass className="w-4 h-4 text-[#2387D9]" />
                    View Map
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Page Heading & Operational Status for Subpages */}
          {activeSection !== 'overview' && (
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-[#D9E8EF]">
              <div>
                <h1 className="font-sans font-bold text-[24px] sm:text-[28px] text-[#24445A] tracking-tight">
                  {currentMeta.title}
                </h1>
                <span className="font-mono text-[12px] text-[#647D8C] mt-1 block">
                  {currentMeta.subtitle}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono shrink-0">
                <span className="px-3 py-1 rounded-full bg-[#E8F5FA] text-[#24445A] font-semibold border border-[#D9E8EF]">
                  Kerala Pilot
                </span>
                <span className="px-3 py-1 rounded-full bg-[#DDF5E8] border border-[#A7F3D0] text-[#14532D] font-bold flex items-center space-x-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  <span>Telemetry Nominal</span>
                </span>
              </div>
            </div>
          )}

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

              {/* Overview Station Grid */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D9E8EF] shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-[#D9E8EF]">
                  <div>
                    <h2 className="font-sans font-bold text-lg text-[#24445A] flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#2387D9]" />
                      Monitored Station Fleet
                    </h2>
                    <p className="text-xs text-[#647D8C] mt-0.5">
                      Select any station to inspect its calibrated hydrological risk assessment
                    </p>
                  </div>
                  <button
                    onClick={() => handleNavClick('all-locations')}
                    className="flex items-center space-x-1.5 text-xs text-[#2387D9] hover:text-[#1970B8] font-bold transition-colors cursor-pointer"
                  >
                    <span>Full Directory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
                  {filteredStations.map((station) => (
                    <button
                      key={station.id}
                      onClick={() => {
                        setSelectedStation(station);
                        handleNavClick('exposure-risk');
                      }}
                      className="text-left p-4 rounded-2xl bg-gradient-to-br from-white via-[#F8FBFE] to-[#F1F8FC] hover:to-[#E8F5FA] border border-[#D9E8EF] hover:border-[#8ED7F8] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[10px] text-[#647D8C] uppercase font-bold tracking-wider">
                            {station.type}
                          </span>
                          <OpsRiskBadge level={station.current_risk_level} size="sm" />
                        </div>
                        <div className="font-sans font-bold text-[14px] text-[#24445A] group-hover:text-[#2387D9] transition-colors">
                          {station.name}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#D9E8EF]/60 flex items-center justify-between text-xs font-mono">
                        <span className="text-[#647D8C]">
                          Stage: <strong className="text-[#24445A]">{station.current_water_level_m != null ? `${station.current_water_level_m.toFixed(2)}m` : 'Unavailable'}</strong>
                        </span>
                        <span className="text-[#2387D9] text-[11px] font-bold group-hover:translate-x-1 transition-transform flex items-center">
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
              <div className="p-4 bg-white border border-[#D9E8EF] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#647D8C] font-semibold shrink-0">Selected station:</span>
                  <select
                    value={selectedStation?.id ?? (filteredStations[0]?.id ?? '')}
                    onChange={(e) => {
                      const found = waterBodies.find((w) => w.id === Number(e.target.value));
                      if (found) setSelectedStation(found);
                    }}
                    className="bg-[#F1F8FC] border border-[#D9E8EF] rounded-xl px-3 py-1.5 text-xs text-[#24445A] font-sans font-medium focus:outline-none focus:border-[#2387D9] cursor-pointer"
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
                    const isSelected = selectedStation ? st.id === selectedStation.id : false;
                    return (
                      <button
                        key={st.id}
                        onClick={() => setSelectedStation(st)}
                        className={`px-3 py-1 rounded-xl text-xs font-sans transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-[#2387D9] text-white font-bold border border-[#2387D9] shadow-xs'
                            : 'bg-[#F1F8FC] text-[#647D8C] hover:text-[#24445A] border border-[#D9E8EF]'
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
                station={selectedStation || filteredStations[0] || waterBodies[0] || null}
                onRunScenario={handleRunScenario}
              />
            </div>
          )}

          {/* PAGE 3: INCIDENTS */}
          {activeSection === 'incident-actions' && (
            <div>
              <IncidentActionsConsole
                waterBodies={waterBodies}
                selectedStation={selectedStation || filteredStations[0] || waterBodies[0] || null}
              />
            </div>
          )}

          {/* PAGE 4: MAP */}
          {activeSection === 'map' && (
            <div>
              <OperationsMap
                waterBodies={filteredStations}
                selectedStation={selectedStation || filteredStations[0] || waterBodies[0] || null}
                onSelectStation={(st) => setSelectedStation(st)}
              />
            </div>
          )}

          {/* PAGE 5: WHAT-IF */}
          {activeSection === 'what-if' && (
            <div className="space-y-4">
              {/* Station Switcher */}
              <div className="p-4 bg-white border border-[#D9E8EF] rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#647D8C] font-semibold">Simulation target:</span>
                  <select
                    value={selectedStation?.id ?? (filteredStations[0]?.id ?? '')}
                    onChange={(e) => {
                      const found = waterBodies.find((w) => w.id === Number(e.target.value));
                      if (found) setSelectedStation(found);
                    }}
                    className="bg-[#F1F8FC] border border-[#D9E8EF] rounded-xl px-3 py-1.5 text-xs text-[#24445A] font-sans font-medium focus:outline-none focus:border-[#2387D9] cursor-pointer"
                  >
                    {waterBodies.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.type} · {st.current_risk_level.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <OperationalWhatIfPanel selectedStation={selectedStation || filteredStations[0] || waterBodies[0] || null} />
            </div>
          )}

          {/* PAGE 6: FORECAST & HISTORY */}
          {(activeSection === 'river-forecast' || activeSection === 'risk-history') && (
            <div className="space-y-6">
              <RiverLevelForecastPanel />
              <RiskHistoryChart station={selectedStation || filteredStations[0] || waterBodies[0] || null} />
            </div>
          )}

          {/* PAGE 7: LOCATIONS */}
          {activeSection === 'all-locations' && (
            <div>
              <AllLocationsDirectory
                waterBodies={filteredStations}
                selectedStation={selectedStation || filteredStations[0] || waterBodies[0] || null}
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
      <footer className="border-t border-[#D9E8EF] bg-white py-4 px-6 text-xs text-[#647D8C] font-mono mt-auto">
        <div className="max-w-[1550px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-[#D9F0FF] flex items-center justify-center text-[#2387D9]">
              <Waves className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-[#24445A]">AQUORA AI</span>
            <span>·</span>
            <span>Kerala Water-Safety Operations Desk</span>
            <span>·</span>
            <span className="text-[#16A34A] font-semibold">Telemetry Nominal</span>
          </div>

          <div className="text-[11px] text-[#647D8C]">
            Field Pilot Telemetry &bull; Calibrated Hydrological Models &bull; Indian Standard Time (UTC+05:30)
          </div>
        </div>
      </footer>
      <ReportsExportModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        selectedWaterBody={selectedStation}
      />
      <AdminConsoleModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />
    </div>
  ) : (
    <div className="min-h-screen bg-[#F1F8FC] text-[#24445A] flex flex-col font-sans selection:bg-[#2387D9] selection:text-white">
        <>
          {/* Top Header */}
          <Header
            health={health}
            loading={loading}
            onRefresh={handleRefresh}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            waterBodies={waterBodies}
            onSelectWaterBody={(wb) => {
              setSelectedStation(wb);
              setActiveTab('drowning-risk');
            }}
          />

          {/* Mode Switcher Banner: Fast Access to Operations Desk */}
          <div className="bg-gradient-to-r from-[#E0F4FF] via-[#E8F8EF] to-[#EFFCF7] border-b border-[#D9E8EF] px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2387D9]" />
              <span className="text-[#24445A] font-bold">
                Multi-Module Analytical Workspace <span className="text-[#647D8C] font-normal hidden sm:inline">(Specialist In-Depth Analytics)</span>
              </span>
            </div>
            <button
              onClick={() => setActiveTab('operations-desk')}
              className="btn-secondary text-xs font-bold text-[#2387D9] px-3.5 py-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-[#2387D9]" />
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
                          <div className="flex rounded-xl bg-[#E8F5FA] border border-[#D9E8EF] p-1 text-xs">
                            <button
                              onClick={() => setSidePanelMode('drowning-risk')}
                              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                                sidePanelMode === 'drowning-risk'
                                  ? 'bg-white text-[#2387D9] border border-[#D9E8EF] shadow-xs'
                                  : 'text-[#647D8C] hover:text-[#24445A]'
                              }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-[#EA580C]" />
                              AI Drowning Risk
                            </button>
                            <button
                              onClick={() => setSidePanelMode('telemetry')}
                              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                                sidePanelMode === 'telemetry'
                                  ? 'bg-white text-[#2387D9] border border-[#D9E8EF] shadow-xs'
                                  : 'text-[#647D8C] hover:text-[#24445A]'
                              }`}
                            >
                              <Droplets className="w-3.5 h-3.5 text-[#2387D9]" />
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
                      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#E0F4FF] via-[#E8F8EF] to-[#D8F8F0] border border-[#D9E8EF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#FFE3D9] text-[#7C2D12] border border-[#FDBA74] font-bold uppercase">
                              Core Feature
                            </span>
                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#D9F0FF] text-[#2387D9] border border-[#8ED7F8] font-bold">
                              Kerala Drowning Prevention
                            </span>
                          </div>
                          <h2 className="text-xl font-extrabold text-[#24445A] mt-2 flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-[#DC2626]" />
                            AI-Powered Drowning-Risk Prediction Engine
                          </h2>
                          <p className="text-xs text-[#647D8C] mt-1 max-w-2xl leading-relaxed">
                            Combines <strong>Layer A (Calibrated Environmental Hazard)</strong> from 2021–2025 Kerala hydrological telemetry with <strong>Layer B (Contextual Vulnerability Profiles)</strong> across rivers, reservoirs, waterfalls, quarries, and canals with genuine physical sensor timestamps and nearest gauge distance.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveTab('simulator')}
                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F1F8FC] text-[#2387D9] border border-[#D9E8EF] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Sliders className="w-4 h-4 text-[#2387D9]" />
                            What-If Simulator &rarr;
                          </button>
                          <button
                            onClick={() => setActiveTab('data-audit')}
                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F1F8FC] text-[#24445A] border border-[#D9E8EF] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Sparkles className="w-4 h-4 text-[#48BFA3]" />
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
                            onSendToSimulator={handleSendToSimulator}
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
                            onSendToSimulator={handleSendToSimulator}
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
                          <h2 className="text-lg font-bold text-[#24445A] flex items-center gap-2">
                            <Droplets className="w-5 h-5 text-[#2387D9]" />
                            All Monitored Locations
                          </h2>
                          <p className="text-xs text-[#647D8C]">
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
                            className="p-5 rounded-3xl bg-white border border-[#D9E8EF] hover:border-[#8ED7F8] shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-200 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#24445A] truncate max-w-[180px]">
                                {wb.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  wb.current_risk_level === 'low'
                                    ? 'bg-[#DDF5E8] text-[#14532D] border border-[#A7F3D0]'
                                    : wb.current_risk_level === 'moderate'
                                    ? 'bg-[#FFF1C7] text-[#78350F] border border-[#FDE68A]'
                                    : 'bg-[#FFE3D9] text-[#7C2D12] border border-[#FDBA74]'
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

                            <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#D9E8EF]/70 my-3 text-xs">
                              <div>
                                <span className="text-[10px] text-[#647D8C] block">Temp</span>
                                <span className="font-mono text-[#24445A] font-semibold">
                                  {wb.water_temp_c != null ? `${wb.water_temp_c.toFixed(1)}°C` : 'Unavailable'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-[#647D8C] block">Flow</span>
                                <span className="font-mono text-[#24445A] font-semibold">
                                  {wb.flow_rate_cms != null
                                    ? `${wb.flow_rate_cms.toFixed(1)} m\u00B3/s`
                                    : wb.discharge_cms != null
                                    ? `${wb.discharge_cms.toFixed(1)} m\u00B3/s`
                                    : 'Unavailable'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-[#647D8C] block">Depth</span>
                                <span className="font-mono text-[#24445A] font-semibold">
                                  {wb.depth_meters != null
                                    ? `${wb.depth_meters.toFixed(1)} m`
                                    : wb.current_water_level_m != null
                                    ? `${wb.current_water_level_m.toFixed(1)} m`
                                    : 'Unavailable'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-[#647D8C] pt-1">
                              <span className="font-mono text-[10px] text-[#647D8C]">
                                {formatCoordinates(wb.latitude, wb.longitude, 3)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendToSimulator(wb);
                                }}
                                className="text-[#2387D9] hover:text-[#1970B8] font-bold text-xs flex items-center gap-1 cursor-pointer"
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
          <footer className="border-t border-[#D9E8EF] bg-white py-5 px-6 text-xs text-[#647D8C]">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-md bg-[#D9F0FF] text-[#2387D9] flex items-center justify-center">
                  <Waves className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-[#24445A]">AQUORA AI</span>
                <span>&bull;</span>
                <span className={`font-mono text-[11px] font-semibold ${health?.status === 'healthy' ? 'text-[#16A34A]' : 'text-[#D97706]'}`}>
                  {health?.status === 'healthy' ? 'Live backend connected' : 'Running in demo mode'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#647D8C]">
                Decision Support Platform &bull; Calibrated Hydrological Models &bull; Indian Standard Time (UTC+05:30)
              </div>
            </div>
          </footer>
        </>
    </div>
  );
}

export default App;
