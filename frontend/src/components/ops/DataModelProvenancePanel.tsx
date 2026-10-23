import React from 'react';
import { Database, CheckCircle2, Cpu, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { KERALA_PROVENANCE_DATASETS, KERALA_MODEL_BENCHMARK } from '../../data/keralaStations';

export const DataModelProvenancePanel: React.FC = () => {
  return (
    <div className="bg-[#84B3CE] rounded-xl p-5 shadow-xs" id="provenance-section">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#6A9AB6] gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-[#0B3F5A]" style={{ strokeWidth: 1.5 }} />
            <h3 className="font-sans font-semibold text-[18px] text-[#082536]">
              Data &amp; Model Provenance
            </h3>
          </div>
          <p className="text-[13px] text-[#134059] font-sans mt-0.5">
            Verified hydrological datasets, integrity hashes, and Random Forest benchmark validation metrics.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#0B2C40] rounded-full text-xs font-mono text-[#5FDDB4] shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5FDDB4]" />
          <span>All 5 Datasets Cryptographically Verified</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Five Verified Dataset Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="text-[11px] font-mono uppercase text-[#0F3A52] font-semibold tracking-wider pb-1">
            Verified Kerala Hydrological Datasets
          </div>

          <div className="space-y-2.5">
            {KERALA_PROVENANCE_DATASETS.map((ds) => (
              <div
                key={ds.id}
                className="bg-[#F5EEDD] border border-[#6A9AB6] rounded-xl p-4 hover:border-[#0B3F5A] transition-colors shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#6A9AB6]">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#0B3F5A] shrink-0" />
                    <span className="font-sans font-semibold text-[13px] text-[#082536]">
                      {ds.name}
                    </span>
                  </div>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#0B2C40] text-[#5FDDB4] self-start sm:self-auto font-medium">
                    <CheckCircle2 className="w-3 h-3 text-[#5FDDB4]" />
                    <span>{ds.status}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2.5 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[#134059] block font-medium">Row count</span>
                    <span className="text-[#082536] font-semibold">{ds.rowCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#134059] block font-medium">Date range</span>
                    <span className="text-[#082536]">{ds.dateRange}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#134059] block font-medium">Missing values</span>
                    <span className="text-[#17895C] font-semibold">{ds.missingPct}</span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#6A9AB6] flex items-center justify-between text-[11px] font-mono text-[#134059]">
                  <span>Source: <strong className="text-[#0B3F5A]">{ds.filename}</strong></span>
                  <span className="hidden sm:inline text-[#134059]">{ds.recordsDesc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Benchmark Card (4 cols) */}
        <div className="lg:col-span-4 bg-[#F5EEDD] border border-[#6A9AB6] rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-[#6A9AB6]">
              <Cpu className="w-4 h-4 text-[#0B3F5A]" />
              <span className="font-sans font-semibold text-sm text-[#082536]">
                {KERALA_MODEL_BENCHMARK.modelName}
              </span>
            </div>

            {/* Score & Validation */}
            <div className="bg-[#84B3CE]/20 border border-[#6A9AB6] rounded-xl p-4 my-3">
              <span className="text-[10px] font-mono uppercase text-[#134059] block font-medium">
                R² Validation Score
              </span>
              <div className="font-mono text-3xl font-bold text-[#0B3F5A] mt-0.5">
                {KERALA_MODEL_BENCHMARK.r2Score}
              </div>
              <div className="text-[10px] font-mono text-[#134059] mt-1 flex justify-between">
                <span>Split: {KERALA_MODEL_BENCHMARK.trainTestSplit}</span>
                <span>Folds: {KERALA_MODEL_BENCHMARK.crossValidationFolds}</span>
              </div>
            </div>

            {/* Top Feature Importance */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono uppercase text-[#0F3A52] font-semibold block">
                Top Feature Importance:
              </span>

              {KERALA_MODEL_BENCHMARK.topFeatures.map((feat) => (
                <div key={feat.feature} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#082536] font-semibold">{feat.feature}</span>
                    <span className="text-[#0B3F5A] font-bold">{feat.importance.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-[#84B3CE]/30 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#0B3F5A] h-full rounded-full"
                      style={{ width: `${feat.importance * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-sans text-[#134059] block">
                    {feat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-mono text-[#134059] bg-[#84B3CE]/30 p-2.5 rounded-lg border border-[#6A9AB6]">
            Trained on 1991–2025 continuous hydro-meteorological river observation logs.
          </div>
        </div>
      </div>
    </div>
  );
};
