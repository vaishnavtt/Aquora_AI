import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  FileText,
  BarChart2,
  Layers,
  ShieldCheck,
  Cpu,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ModelStatusResponse, DatasetAuditItem } from '../types';
import { api } from '../services/api';

export const DatasetModelStatusPanel: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  const fetchStatus = () => {
    setLoading(true);
    setError(null);
    api.getDrowningRiskModelStatus()
      .then((data) => {
        setModelStatus(data);
        setError(null);
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to retrieve dataset audit and model status');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1677D2] border border-[#BFDBFE] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#172B4D] tracking-tight">
              Dataset Audit &amp; ML Model Evaluation Report
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Audit of all five target CSV files from <code className="text-[#1677D2] font-mono bg-[#F8FAFC] px-1.5 py-0.5 rounded border border-[#E2E8F0]">data/raw/</code>,
            supervised machine-learning benchmark results across candidate algorithms, and data provenance.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#1677D2] border border-[#CBD5E1] text-xs font-bold flex items-center gap-2 self-start sm:self-center transition-colors shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center space-y-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="w-7 h-7 border-2 border-[#1677D2] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#64748B]">Loading dataset audits and ML benchmark tables...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          {error}
        </div>
      ) : modelStatus ? (
        <>
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] text-[#64748B] block font-semibold uppercase tracking-wider">Champion ML Model</span>
              <span className="text-base font-bold text-[#1677D2] font-mono mt-1.5 block">
                {modelStatus.champion_model_name}
              </span>
              <span className="text-[10px] text-[#16A34A] font-mono font-semibold mt-1 block">Calibrated (Sigmoid)</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] text-[#64748B] block font-semibold uppercase tracking-wider">Training Samples</span>
              <span className="text-2xl font-bold text-[#172B4D] font-mono mt-1.5 block">
                {modelStatus.training_dataset_records.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono mt-1 block">Kerala SW Integrated Telemetry</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] text-[#64748B] block font-semibold uppercase tracking-wider">Out-of-Time Test F1</span>
              <span className="text-2xl font-bold text-[#16A34A] font-mono mt-1.5 block">
                {modelStatus.metrics_summary?.f1_score != null
                  ? modelStatus.metrics_summary.f1_score.toFixed(4)
                  : 'Pending'}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono mt-1 block">Zero Future Leakage</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] text-[#64748B] block font-semibold uppercase tracking-wider">Out-of-Time PR-AUC</span>
              <span className="text-2xl font-bold text-[#1677D2] font-mono mt-1.5 block">
                {modelStatus.metrics_summary?.pr_auc != null
                  ? modelStatus.metrics_summary.pr_auc.toFixed(4)
                  : 'Pending'}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono mt-1 block">
                Brier:{' '}
                {modelStatus.metrics_summary?.brier_score != null
                  ? modelStatus.metrics_summary.brier_score.toFixed(4)
                  : 'Pending'}
              </span>
            </div>
          </div>

          {/* Individual Dataset Audits */}
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-7 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#172B4D] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1677D2]" />
                  Individual Target Dataset Audit Status
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Inspection of five new files plus existing project telemetry with row counts, dates, and integration roles.
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-lg bg-[#F8FAFC] text-[#172B4D] border border-[#E2E8F0] font-semibold">
                {modelStatus.datasets_audit.length} Files Audited
              </span>
            </div>

            <div className="space-y-3">
              {modelStatus.datasets_audit.map((file: DatasetAuditItem, idx: number) => {
                const isExpanded = expandedFile === file.filename;
                const isExcluded = !file.usable_for_training;

                return (
                  <div
                    key={idx}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isExcluded
                        ? 'bg-rose-50/40 border-rose-200'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#1677D2]'
                    }`}
                  >
                    <div
                      onClick={() => setExpandedFile(isExpanded ? null : file.filename)}
                      className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        {isExcluded ? (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#172B4D]">
                              {file.filename}
                            </span>
                            <span
                              className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                                isExcluded
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {file.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B] mt-0.5">{file.purpose}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-[#172B4D] font-semibold">
                          {file.row_count.toLocaleString()} rows
                        </span>
                        <span className="text-[#64748B]">
                          {(file.size_bytes / 1024).toFixed(1)} KB
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#64748B]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#64748B]" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-[#E2E8F0] text-xs space-y-2.5 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 py-2 text-xs">
                          <div>
                            <span className="text-[#64748B] block text-[10px]">Date Range</span>
                            <span className="font-mono text-[#172B4D] font-semibold">
                              {file.date_range && file.date_range[0]
                                ? `${file.date_range[0]} to ${file.date_range[1]}`
                                : 'No records'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#64748B] block text-[10px]">Station Count</span>
                            <span className="font-mono text-[#172B4D] font-semibold">{file.station_count} stations</span>
                          </div>
                          <div>
                            <span className="text-[#64748B] block text-[10px]">Training Usability</span>
                            <span className={`font-mono font-bold ${file.usable_for_training ? 'text-[#16A34A]' : 'text-rose-600'}`}>
                              {file.usable_for_training ? 'VALID FOR ML PIPELINE' : 'EXCLUDED'}
                            </span>
                          </div>
                        </div>

                        {file.rejection_reason && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                            <strong>Exclusion Reason: </strong>
                            {file.rejection_reason}
                          </div>
                        )}

                        <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#475569]">
                          <strong className="text-[#1677D2]">Contribution to AQUORA AI: </strong>
                          {file.contribution_to_aquora}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ML Benchmark Algorithm Evaluation Table */}
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-7 space-y-4 shadow-xs">
            <div className="border-b border-[#E2E8F0] pb-4">
              <h3 className="text-sm font-bold text-[#172B4D] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#1677D2]" />
                Supervised Model Benchmark Comparison (Out-of-Time Test Set)
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Algorithms evaluated with strict chronological splitting (Train: 2021–2022, Out-of-Time Test: 2024).
                No temporal leakage, class imbalance addressed with balanced weighting.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-3.5 font-bold">Candidate Algorithm</th>
                    <th className="py-3 px-3.5 text-right font-bold">F1-Score</th>
                    <th className="py-3 px-3.5 text-right font-bold">PR-AUC</th>
                    <th className="py-3 px-3.5 text-right font-bold">Recall</th>
                    <th className="py-3 px-3.5 text-right font-bold">Precision</th>
                    <th className="py-3 px-3.5 text-right font-bold">Brier Score</th>
                    <th className="py-3 px-3.5 text-center font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] font-mono text-xs bg-white">
                  {modelStatus.all_models_benchmarks.map((item, idx) => {
                    const test = item.test;
                    const isChampion = test.model === modelStatus.champion_model_name;

                    return (
                      <tr
                        key={idx}
                        className={isChampion ? 'bg-[#EFF6FF] text-[#1677D2] font-semibold' : 'text-[#172B4D] hover:bg-[#F8FAFC]'}
                      >
                        <td className="py-3 px-3.5 flex items-center gap-2 font-bold">
                          {isChampion && <span className="text-amber-500">🏆</span>}
                          {test.model}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold">
                          {test.f1_score.toFixed(4)}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          {test.pr_auc.toFixed(4)}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          {(test.recall * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          {(test.precision * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3.5 text-right text-[#64748B]">
                          {test.brier_score.toFixed(4)}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {isChampion ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] uppercase font-bold">
                              Selected Champion
                            </span>
                          ) : (
                            <span className="text-[#94A3B8] text-[10px]">Baseline</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feature Importances */}
          {Object.keys(modelStatus.feature_importances).length > 0 && (
            <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-7 space-y-4 shadow-xs">
              <div className="border-b border-[#E2E8F0] pb-4">
                <h3 className="text-sm font-bold text-[#172B4D] flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#1677D2]" />
                  Top Hydro-Environmental Feature Importances (Permutation Importance)
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Physical parameters with highest predictive leverage in anticipating environmental surge hazard.
                </p>
              </div>

              <div className="space-y-3">
                {Object.entries(modelStatus.feature_importances)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 7)
                  .map(([feat, score], idx) => {
                    const widthPct = Math.min(100, Math.max(10, score * 1200));

                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#172B4D] font-semibold">{feat}</span>
                          <span className="text-[#1677D2] font-bold">{score.toFixed(4)}</span>
                        </div>
                        <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#1677D2] h-full rounded-full transition-all"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Leak-Free Antecedent Benchmark */}
          {modelStatus.leak_free_antecedent_benchmark && (
            <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-7 space-y-4 shadow-xs">
              <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#172B4D] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                    Leak-Free Predictive Benchmark (Strictly Antecedent Features)
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Evaluates the model without simultaneous target formula columns (omits water_level_m, wl_delta_1h, wl_delta_3h).
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold uppercase">
                  Target Leakage Free
                </span>
              </div>

              <p className="text-xs text-[#475569] leading-relaxed">
                {modelStatus.leak_free_antecedent_benchmark.methodology}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-xs">
                  <span className="text-[#64748B] text-[10px] block">ROC-AUC (Antecedent)</span>
                  <span className="text-lg font-bold text-[#1677D2] mt-0.5 block">
                    {modelStatus.leak_free_antecedent_benchmark.uncalibrated_test_metrics?.roc_auc != null
                      ? modelStatus.leak_free_antecedent_benchmark.uncalibrated_test_metrics.roc_auc.toFixed(4)
                      : 'Pending'}
                  </span>
                  <span className="text-[10px] text-[#64748B] block mt-0.5">Out-of-time test</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-xs">
                  <span className="text-[#64748B] text-[10px] block">PR-AUC (Antecedent)</span>
                  <span className="text-lg font-bold text-[#0D9488] mt-0.5 block">
                    {modelStatus.leak_free_antecedent_benchmark.uncalibrated_test_metrics?.pr_auc != null
                      ? modelStatus.leak_free_antecedent_benchmark.uncalibrated_test_metrics.pr_auc.toFixed(4)
                      : 'Pending'}
                  </span>
                  <span className="text-[10px] text-[#16A34A] block mt-0.5 font-bold">8.8x vs Base Rate (0.0265)</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-xs">
                  <span className="text-[#64748B] text-[10px] block">Accuracy</span>
                  <span className="text-lg font-bold text-[#172B4D] mt-0.5 block">
                    {modelStatus.leak_free_antecedent_benchmark.uncalibrated_test_metrics?.accuracy != null
                      ? modelStatus.leak_free_antecedent_benchmark.uncalibrated_test_metrics.accuracy.toFixed(4)
                      : 'Pending'}
                  </span>
                  <span className="text-[10px] text-[#64748B] block mt-0.5">Out-of-time test</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-xs">
                  <span className="text-[#64748B] text-[10px] block">Brier Score</span>
                  <span className="text-lg font-bold text-[#16A34A] mt-0.5 block">
                    {modelStatus.leak_free_antecedent_benchmark.calibrated_test_metrics?.brier_score != null
                      ? modelStatus.leak_free_antecedent_benchmark.calibrated_test_metrics.brier_score.toFixed(4)
                      : 'Pending'}
                  </span>
                  <span className="text-[10px] text-[#64748B] block mt-0.5">Calibrated probability</span>
                </div>
              </div>
            </div>
          )}

          {/* Spatial Generalization Benchmark */}
          {modelStatus.spatial_generalization_benchmark?.station_evaluations && (
            <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-7 space-y-4 shadow-xs">
              <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#172B4D] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1677D2]" />
                    Spatial Generalization Benchmark (Leave-One-Station-Out CV)
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Evaluates cross-catchment transferability by holding out each river station entirely from training.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#1677D2] border border-[#BFDBFE] font-bold uppercase">
                  5 River Catchments
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#F8FAFC]">
                    <tr className="border-b border-[#E2E8F0] text-[#64748B] text-[11px] font-bold">
                      <th className="py-3 px-3.5">Holdout Station</th>
                      <th className="py-3 px-3.5">Records</th>
                      <th className="py-3 px-3.5">Positive Rate</th>
                      <th className="py-3 px-3.5">Accuracy</th>
                      <th className="py-3 px-3.5">F1-Score</th>
                      <th className="py-3 px-3.5">ROC-AUC</th>
                      <th className="py-3 px-3.5">PR-AUC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] bg-white">
                    {modelStatus.spatial_generalization_benchmark.station_evaluations.map((st, i) => (
                      <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-3.5 font-bold text-[#172B4D]">{st.station}</td>
                        <td className="py-3 px-3.5 text-[#64748B]">{st.sample_count?.toLocaleString() ?? '—'}</td>
                        <td className="py-3 px-3.5 text-[#64748B]">{st.positive_rate != null ? `${(st.positive_rate * 100).toFixed(1)}%` : '—'}</td>
                        <td className="py-3 px-3.5 text-[#172B4D]">{st.accuracy != null ? st.accuracy.toFixed(4) : '—'}</td>
                        <td className="py-3 px-3.5 text-[#1677D2] font-bold">{st.f1_score != null ? st.f1_score.toFixed(4) : '—'}</td>
                        <td className="py-3 px-3.5 text-[#16A34A] font-bold">{st.roc_auc != null ? st.roc_auc.toFixed(4) : '—'}</td>
                        <td className="py-3 px-3.5 text-[#0D9488] font-bold">{st.pr_auc != null ? st.pr_auc.toFixed(4) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Drowning Incident Labels & Ethics Notice */}
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-[#172B4D] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
              Scientific Drowning Incident Investigation &amp; Ethics Compliance
            </h4>
            <p className="text-xs text-[#475569] leading-relaxed">
              {modelStatus.incident_data_investigation_summary}
            </p>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-mono">
              {modelStatus.ethical_compliance_notice}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
