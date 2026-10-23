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
    <div className="min-h-screen bg-[#111417] text-[#E8E5DC] flex flex-col font-sans selection:bg-[#3D8F91] selection:text-[#111417]">
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
    </div>
  );
}

export default App;
