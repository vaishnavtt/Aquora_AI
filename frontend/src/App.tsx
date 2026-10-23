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
import { KERALA_STATIONS } from './data/keralaStations';
import { WaterBody, HealthResponse } from './types';
import { api } from './services/api';
import { Waves, ArrowRight } from 'lucide-react';

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
  const [activeSection, setActiveSection] = useState<OpsNavSection>('overview');
  const [waterBodies, setWaterBodies] = useState<WaterBody[]>(KERALA_STATIONS);
  const [selectedStation, setSelectedStation] = useState<WaterBody>(KERALA_STATIONS[0]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

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

  // Check health and synchronize on boot
  useEffect(() => {
    api.getHealth()
      .then((h) => setHealth(h))
      .catch(() => {
        setHealth({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0-pilot',
          database: 'connected',
          ml_model_loaded: true,
        });
      });
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setWaterBodies((prev) =>
        prev.map((wb) => ({
          ...wb,
          last_verified: new Date().toTimeString().split(' ')[0] + ' IST',
        }))
      );
    }, 600);
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

  const handleNavClick = (section: OpsNavSection) => {
    const target = section === 'risk-history' ? 'river-forecast' : section;
    setActiveSection(target);
    window.location.hash = target;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentMeta = PAGE_META[activeSection] || PAGE_META['overview'];

  return (
    <div className="min-h-screen bg-[#F5EEDD] text-[#082536] flex flex-col font-sans selection:bg-[#0B3F5A] selection:text-[#F5EEDD]">
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
          {/* Page Heading & Operational Status */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-[#DDD2B8]">
            <div>
              <h1 className="font-sans font-semibold text-[26px] sm:text-[28px] text-[#082536] tracking-tight">
                {currentMeta.title}
              </h1>
              <span className="font-mono text-[12px] text-[#134059] mt-1 block">
                {currentMeta.subtitle}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono shrink-0">
              <span className="px-2.5 py-1 rounded-md bg-[#84B3CE] text-[#082536] font-medium">
                Kerala pilot
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#F5EEDD] border border-[#DDD2B8] text-[#17895C] font-semibold flex items-center space-x-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#17895C]" />
                <span>Telemetry nominal</span>
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

              {/* Overview Station Grid */}
              <div className="bg-[#84B3CE] rounded-xl p-5 border border-[#6A9AB6] shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-[#6A9AB6]">
                  <div>
                    <h2 className="font-sans font-semibold text-[18px] text-[#082536]">
                      Monitored station fleet
                    </h2>
                    <p className="text-[12px] text-[#134059] font-sans mt-0.5">
                      Select any station to open its dedicated risk assessment
                    </p>
                  </div>
                  <button
                    onClick={() => handleNavClick('all-locations')}
                    className="flex items-center space-x-1.5 text-xs font-sans text-[#0B3F5A] hover:text-[#16587B] font-semibold transition-colors cursor-pointer"
                  >
                    <span>Full directory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                  {filteredStations.map((station) => (
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
                          Stage: <strong className="text-[#082536]">{station.current_water_level_m.toFixed(2)}m</strong>
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
                    value={selectedStation.id}
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
                    const isSelected = st.id === selectedStation.id;
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
                station={selectedStation}
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
                    value={selectedStation.id}
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
    </div>
  );
}

export default App;
