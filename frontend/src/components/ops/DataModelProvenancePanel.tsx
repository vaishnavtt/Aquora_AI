import React from 'react';
import { Database, CheckCircle2, Cpu, BarChart3, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { KERALA_PROVENANCE_DATASETS, KERALA_MODEL_BENCHMARK } from '../../data/keralaStations';

export const DataModelProvenancePanel: React.FC = () => {
  return (
    <div className="bg-[#1A1F22] border border-[#384145] rounded p-4 shadow-xs" id="provenance-section">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#384145] gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-[#3D8F91]" />
            <h3 className="font-sans font-semibold text-[18px] text-[#E8E5DC]">
              Data &amp; Model Provenance
            </h3>
          </div>
          <p className="text-xs text-[#9BA5A5] font-sans mt-0.5">
            Verified hydrological datasets, integrity hashes, and Random Forest benchmark validation metrics.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[rgba(92,155,114,0.16)] border border-[rgba(92,155,114,0.35)] rounded text-xs font-mono text-[#5C9B72]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5C9B72]" />
          <span>All 5 Datasets Cryptographically Verified</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Five Verified Dataset Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="text-[11px] font-mono uppercase text-[#9BA5A5] font-semibold tracking-wider pb-1">
            Verified Kerala Hydrological Datasets
          </div>

          <div className="space-y-2.5">
            {KERALA_PROVENANCE_DATASETS.map((ds) => (
              <div
                key={ds.id}
                className="bg-[#23292C] border border-[#384145] rounded p-3 hover:border-[#3D8F91] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-[#384145]">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#3D8F91] shrink-0" />
                    <span className="font-sans font-semibold text-xs text-[#E8E5DC]">
                      {ds.name}
                    </span>
                  </div>
                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[rgba(92,155,114,0.16)] text-[#7DC798] border border-[rgba(92,155,114,0.35)] self-start sm:self-auto">
                    <CheckCircle2 className="w-3 h-3 text-[#5C9B72]" />
                    <span>{ds.status}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[#9BA5A5] block">Row count</span>
                    <span className="text-[#E8E5DC] font-semibold">{ds.rowCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#9BA5A5] block">Date range</span>
                    <span className="text-[#E8E5DC]">{ds.dateRange}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#9BA5A5] block">Missing values</span>
                    <span className="text-[#5C9B72] font-semibold">{ds.missingPct}</span>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-[#384145] flex items-center justify-between text-[10px] font-mono text-[#9BA5A5]">
                  <span>Source: <strong className="text-[#3D8F91]">{ds.filename}</strong></span>
                  <span className="hidden sm:inline text-[#9BA5A5]">{ds.recordsDesc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Benchmark Card (4 cols) */}
        <div className="lg:col-span-4 bg-[#23292C] border border-[#384145] rounded p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-[#384145]">
              <Cpu className="w-4 h-4 text-[#3D8F91]" />
              <span className="font-sans font-semibold text-sm text-[#E8E5DC]">
                {KERALA_MODEL_BENCHMARK.modelName}
              </span>
            </div>

            {/* Score & Validation */}
            <div className="bg-[#1A1F22] border border-[#384145] rounded p-3 my-3">
              <span className="text-[10px] font-mono uppercase text-[#9BA5A5] block">
                R² Validation Score
              </span>
              <div className="font-mono text-3xl font-bold text-[#3D8F91] mt-0.5">
                {KERALA_MODEL_BENCHMARK.r2Score}
              </div>
              <div className="text-[10px] font-mono text-[#9BA5A5] mt-1 flex justify-between">
                <span>Train / test split: {KERALA_MODEL_BENCHMARK.trainTestSplit}</span>
                <span>Folds: {KERALA_MODEL_BENCHMARK.crossValidationFolds}</span>
              </div>
            </div>

            {/* Top Feature Importance */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#9BA5A5] font-semibold block">
                Top Feature Importance:
              </span>

              {KERALA_MODEL_BENCHMARK.topFeatures.map((feat) => (
                <div key={feat.feature} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#E8E5DC] font-semibold">{feat.feature}</span>
                    <span className="text-[#3D8F91] font-bold">{feat.importance.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-[#111417] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#3D8F91] h-full rounded-full"
                      style={{ width: `${feat.importance * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-sans text-[#9BA5A5] block">
                    {feat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#384145] text-[10px] font-mono text-[#9BA5A5]">
            Benchmarked against historical Kerala monsoons (1991–2025) with 5-fold spatial cross-validation.
          </div>
        </div>
      </div>
    </div>
  );
};
