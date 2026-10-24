import React from 'react';
import { Database, CheckCircle2, Cpu, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { KERALA_PROVENANCE_DATASETS, KERALA_MODEL_BENCHMARK } from '../../data/keralaStations';

export const DataModelProvenancePanel: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs" id="provenance-section">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#E2E8F0] gap-3">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1677D2]">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-bold text-lg text-[#172B4D] tracking-tight">
              Data &amp; Model Provenance
            </h3>
          </div>
          <p className="text-xs text-[#64748B] font-sans mt-1">
            Verified hydrological datasets, integrity hashes, and Random Forest benchmark validation metrics.
          </p>
        </div>

        <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-mono text-emerald-800 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold">All 5 Datasets Cryptographically Verified</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Five Verified Dataset Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-3.5">
          <div className="text-[11px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
            Verified Kerala Hydrological Datasets
          </div>

          <div className="space-y-3">
            {KERALA_PROVENANCE_DATASETS.map((ds) => (
              <div
                key={ds.id}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4.5 hover:border-[#1677D2] transition-all shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E2E8F0]">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-md bg-white border border-[#E2E8F0] flex items-center justify-center text-[#1677D2]">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-sans font-bold text-xs text-[#172B4D]">
                      {ds.name}
                    </span>
                  </div>
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 border border-emerald-200 text-emerald-700 self-start sm:self-auto font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{ds.status}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[#64748B] block font-medium">Row count</span>
                    <span className="text-[#172B4D] font-bold">{ds.rowCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] block font-medium">Date range</span>
                    <span className="text-[#172B4D] font-medium">{ds.dateRange}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] block font-medium">Missing values</span>
                    <span className="text-[#16A34A] font-bold">{ds.missingPct}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-mono text-[#64748B]">
                  <span>Source: <strong className="text-[#1677D2]">{ds.filename}</strong></span>
                  <span className="hidden sm:inline text-[#64748B]">{ds.recordsDesc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Benchmark Card (4 cols) */}
        <div className="lg:col-span-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xs">
          <div>
            <div className="flex items-center space-x-2.5 pb-3.5 border-b border-[#E2E8F0]">
              <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1677D2]">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="font-sans font-bold text-xs text-[#172B4D]">
                {KERALA_MODEL_BENCHMARK.modelName}
              </span>
            </div>

            {/* Score & Validation */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 my-4 shadow-xs">
              <span className="text-[10px] font-mono uppercase text-[#64748B] block font-medium">
                R² Validation Score
              </span>
              <div className="font-mono text-3xl font-extrabold text-[#1677D2] mt-1">
                {KERALA_MODEL_BENCHMARK.r2Score}
              </div>
              <div className="text-[10px] font-mono text-[#64748B] mt-1.5 flex justify-between border-t border-[#F1F5F9] pt-1.5">
                <span>Split: <strong className="text-[#172B4D]">{KERALA_MODEL_BENCHMARK.trainTestSplit}</strong></span>
                <span>Folds: <strong className="text-[#172B4D]">{KERALA_MODEL_BENCHMARK.crossValidationFolds}</strong></span>
              </div>
            </div>

            {/* Top Feature Importance */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase text-[#64748B] font-bold block">
                Top Feature Importance:
              </span>

              {KERALA_MODEL_BENCHMARK.topFeatures.map((feat) => (
                <div key={feat.feature} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#172B4D] font-bold">{feat.feature}</span>
                    <span className="text-[#1677D2] font-extrabold">{feat.importance.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#1677D2] h-full rounded-full transition-all duration-300"
                      style={{ width: `${feat.importance * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-sans text-[#64748B] block">
                    {feat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs font-mono text-[#64748B] bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-xs">
            Trained on 1991–2025 continuous hydro-meteorological river observation logs.
          </div>
        </div>
      </div>
    </div>
  );
};
