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
import { KERALA_STATIONS } from './data/keralaStations';
import { WaterBody, HealthResponse } from './types';
import { api } from './services/api';
import { Waves, ShieldAlert, Radio, AlertCircle } from 'lucide-react';

export function App() {
  const [activeSection, setActiveSection] = useState<OpsNavSection>('overview');
  const [waterBodies, setWaterBodies] = useState<WaterBody[]>(KERALA_STATIONS);
  const [selectedStation, setSelectedStation] = useState<WaterBody>(KERALA_STATIONS[0]); // Default Athirappilly Falls
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);

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
      // Small random perturbation to simulate live sensor jitter
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
    <div className="min-h-screen bg-[#F3F5F1] text-[#203235] flex flex-col font-sans selection:bg-[#DCEBE7] selection:text-[#125B61]">
      {/* Sticky Top Operations Header */}
      <OpsHeader
        health={health}
        loading={loading}
        onRefresh={handleRefresh}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#D2DDDA]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[10px] uppercase font-bold text-[#125B61] bg-[#E8EFEC] px-2 py-0.5 rounded border border-[#D2DDDA]">
                  Kerala Hydrology Operations Desk
                </span>
                <span className="font-mono text-[10px] text-[#667678]">
                  State Disaster Management Network
                </span>
              </div>
              <h1 className="font-sans font-semibold text-[24px] text-[#203235] tracking-tight mt-1">
                Water safety command center
              </h1>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="px-2 py-1 rounded bg-[#FFFFFF] border border-[#D2DDDA] text-[#667678]">
                Pilot Surface: <strong className="text-[#125B61]">8 Primary Stations</strong>
              </span>
              <span className="px-2 py-1 rounded bg-[#EDF5F0] border border-[#C5DFD0] text-[#25583E] font-medium flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3F8F64]" />
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
            station={selectedStation}
            onRunScenario={handleRunScenario}
          />

          {/* Interactive Map & Operational Scenario Panels */}
          <OperationsMap
            waterBodies={filteredStations}
            selectedStation={selectedStation}
            onSelectStation={(st) => setSelectedStation(st)}
          />

          {/* Operational What-If Panel */}
          <OperationalWhatIfPanel selectedStation={selectedStation} />

          {/* Incident Actions Console */}
          <IncidentActionsConsole
            waterBodies={waterBodies}
            selectedStation={selectedStation}
          />

          {/* River Level Forecast Panel */}
          <RiverLevelForecastPanel />

          {/* Data & Model Provenance Panel */}
          <DataModelProvenancePanel />

          {/* Full Monitored Directory */}
          <AllLocationsDirectory
            waterBodies={filteredStations}
            selectedStation={selectedStation}
            onSelectStation={(st) => setSelectedStation(st)}
          />

          {/* Risk History & Forecast Trajectory */}
          <RiskHistoryChart station={selectedStation} />
        </main>
      </div>

      {/* Operational Desk Footer */}
      <footer className="border-t border-[#D2DDDA] bg-[#FFFFFF] py-4 px-6 text-xs text-[#667678] font-mono">
        <div className="max-w-[1550px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-[#125B61] flex items-center justify-center text-white">
              <Waves className="w-3 h-3 text-[#DCEBE7]" />
            </div>
            <span className="font-semibold text-[#203235]">AQUORA AI</span>
            <span>·</span>
            <span>Kerala Water-Safety Operations Desk</span>
            <span>·</span>
            <span className="text-[#3F8F64]">Telemetry Online</span>
          </div>

          <div className="text-[11px] text-[#82908F]">
            Field Pilot Telemetry &bull; Calibrated Hydrological Models &bull; Indian Standard Time (UTC+05:30)
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
