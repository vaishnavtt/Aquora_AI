import React, { useState, useEffect } from 'react';
import {
  getExportWaterBodiesUrl,
  getExportInspectionsUrl,
  getDatabaseBackupUrl,
  getHazardReportHtmlUrl,
  importWaterBodiesCsv,
  fetchDistrictSummary,
} from '../../services/api';
import type { DistrictSummaryResponse, WaterBody } from '../../types';

interface ReportsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWaterBody: WaterBody | null;
}

export const ReportsExportModal: React.FC<ReportsExportModalProps> = ({
  isOpen,
  onClose,
  selectedWaterBody,
}) => {
  const [districtSummary, setDistrictSummary] = useState<DistrictSummaryResponse | null>(null);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'exports' | 'import' | 'districts'>('exports');

  useEffect(() => {
    if (isOpen && activeTab === 'districts' && !districtSummary) {
      setIsLoadingDistricts(true);
      fetchDistrictSummary()
        .then((data) => setDistrictSummary(data))
        .finally(() => setIsLoadingDistricts(false));
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleImport = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    setImportStatus(null);
    try {
      const res = await importWaterBodiesCsv(importText);
      setImportStatus(
        `✓ Import complete: ${res.imported_count} sites added, ${res.skipped_duplicates_count} duplicates skipped. ${res.errors?.length || 0} validation errors.`
      );
      setImportText('');
    } catch (err: any) {
      setImportStatus(`⚠️ Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const currentWbId = selectedWaterBody?.id || 1;
  const currentWbName = selectedWaterBody?.name || 'Ramamangalam Bridge';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold text-lg">
              📊
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Reports, Data Management & Analytics</h2>
              <p className="text-xs text-slate-550 font-normal">
                Disaster management dossiers, official datasets export, and Kerala district aggregations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('exports')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'exports'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Official Downloads & PDF Dossiers
          </button>
          <button
            onClick={() => setActiveTab('districts')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'districts'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            14-District Risk Summary
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Dataset Ingestion (CSV)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'exports' && (
            <div className="space-y-6">
              {/* Printable PDF Dossier Banner */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent border border-sky-200/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-100 text-sky-700 font-bold text-[10px] tracking-wider uppercase mb-1.5">
                    Official Decision Support Dossier
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Printable Safety Assessment: {currentWbName}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xl mt-0.5">
                    Generates a formal executive dossier containing physics-calibrated Layer A hazard analysis, Layer B structural vulnerability, contributing factors, and authority sign-off seals.
                  </p>
                </div>
                <a
                  href={getHazardReportHtmlUrl(currentWbId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-sm shadow-sky-600/20 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <span>🖨️ Open Print-to-PDF Dossier</span>
                </a>
              </div>

              {/* Download Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-sky-300 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="text-2xl mb-2">📁</div>
                    <h4 className="text-sm font-bold text-slate-800">Water Bodies Dataset</h4>
                    <p className="text-xs text-slate-550 mt-1">
                      Complete RFC 4180 CSV export of all monitored Kerala aquatic sites, coordinates, and telemetry baselines.
                    </p>
                  </div>
                  <a
                    href={getExportWaterBodiesUrl()}
                    download
                    className="mt-4 w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold text-center transition-colors block"
                  >
                    ⬇️ Download CSV
                  </a>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-sky-300 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="text-2xl mb-2">📋</div>
                    <h4 className="text-sm font-bold text-slate-800">Inspection Ledger</h4>
                    <p className="text-xs text-slate-550 mt-1">
                      Export of all official on-site safety audits, prioritized sites, inspector logs, and mandated remediations.
                    </p>
                  </div>
                  <a
                    href={getExportInspectionsUrl()}
                    download
                    className="mt-4 w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold text-center transition-colors block"
                  >
                    ⬇️ Download CSV
                  </a>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-sky-300 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="text-2xl mb-2">💾</div>
                    <h4 className="text-sm font-bold text-slate-800">Database Backup</h4>
                    <p className="text-xs text-slate-550 mt-1">
                      Atomic snapshot dump of the active SQLite database (`aquora.db`) for operational disaster recovery.
                    </p>
                  </div>
                  <a
                    href={getDatabaseBackupUrl()}
                    download
                    className="mt-4 w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold text-center transition-colors block"
                  >
                    ⬇️ Download Snapshot (.db)
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'districts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-550">
                  Real-time aggregation across all 14 Kerala administrative districts under KSDMA guidelines:
                </p>
              </div>

              {isLoadingDistricts ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading district risk summaries...</div>
              ) : districtSummary ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-3">District</th>
                        <th className="p-3">Monitored Sites</th>
                        <th className="p-3">High / Extreme Risk</th>
                        <th className="p-3">Safe Sites</th>
                        <th className="p-3">Pending Audits</th>
                        <th className="p-3">Completed Audits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {districtSummary.districts.map((d) => (
                        <tr key={d.district} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">{d.district}</td>
                          <td className="p-3">{d.monitored_sites_count}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                d.high_risk_count > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {d.high_risk_count}
                            </span>
                          </td>
                          <td className="p-3 text-emerald-600 font-medium">{d.safe_count}</td>
                          <td className="p-3 text-amber-600">{d.pending_inspections_count}</td>
                          <td className="p-3 text-slate-500">{d.completed_inspections_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">Unable to load district statistics.</div>
              )}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Paste CSV data below to ingest new monitored water bodies. Duplicate names or coordinates within 200m will be safely rejected.
              </p>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-500">
                name,type,latitude,longitude,risk_score,depth_meters,flow_rate_cms,basin_region,description
              </div>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste CSV rows here..."
                rows={6}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              {importStatus && (
                <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-800">
                  {importStatus}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleImport}
                  disabled={isImporting || !importText.trim()}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
                >
                  {isImporting ? 'Ingesting...' : 'Import Dataset'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

