import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, AlertTriangle } from 'lucide-react';
import { WaterBody } from '../../types';

interface WaterBodySearchBarProps {
  waterBodies: WaterBody[];
  onSelectWaterBody?: (wb: WaterBody) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Highlights matches of query within text
 */
function highlightMatch(text: string, query: string) {
  if (!query || !query.trim()) return text;
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark
        key={index}
        className="bg-[#FFF1C7] text-[#24445A] font-bold px-0.5 rounded transition-colors"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export const WaterBodySearchBar: React.FC<WaterBodySearchBarProps> = ({
  waterBodies,
  onSelectWaterBody = () => {},
  placeholder = 'Search monitored water bodies, rivers, dams, districts...',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter matching stations based on query
  const cleanQ = query.trim().toLowerCase();
  const matchingStations = cleanQ.length > 0
    ? waterBodies.filter((wb) => {
        const nameMatch = wb.name.toLowerCase().includes(cleanQ);
        const typeMatch = wb.type.toLowerCase().includes(cleanQ);
        const basinMatch = wb.basin_region?.toLowerCase().includes(cleanQ) ?? false;
        const descMatch = wb.description?.toLowerCase().includes(cleanQ) ?? false;
        const sourceMatch = wb.data_source?.toLowerCase().includes(cleanQ) ?? false;
        const stationIdMatch = wb.station_id?.toLowerCase().includes(cleanQ) ?? false;

        return nameMatch || typeMatch || basinMatch || descMatch || sourceMatch || stationIdMatch;
      }).sort((a, b) => {
        // Prioritize exact prefix match in name
        const aStarts = a.name.toLowerCase().startsWith(cleanQ);
        const bStarts = b.name.toLowerCase().startsWith(cleanQ);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
      }).slice(0, 8) // Limit to top 8 suggestions
    : [];

  // Reset highlight index when query or results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [cleanQ]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (cleanQ.length > 0 && (e.key === 'ArrowDown' || e.key === 'Enter')) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        matchingStations.length > 0 ? (prev + 1) % matchingStations.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        matchingStations.length > 0 ? (prev - 1 + matchingStations.length) % matchingStations.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matchingStations[highlightedIndex]) {
        handleSelect(matchingStations[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelect = (wb: WaterBody) => {
    onSelectWaterBody(wb);
    setQuery(wb.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Derive human-readable district/basin description
  const getSubtext = (wb: WaterBody) => {
    if (wb.basin_region) return wb.basin_region;
    const districtMatch = wb.description?.match(/([A-Za-z]+)\s+District/i);
    if (districtMatch) return `${districtMatch[0]} · Kerala`;
    return `${wb.latitude.toFixed(3)}°N, ${wb.longitude.toFixed(3)}°E`;
  };

  // Type color badges
  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'river':
        return 'bg-[#D9F0FF] text-[#2387D9] border-[#8ED7F8]';
      case 'waterfall':
        return 'bg-[#FFE3D9] text-[#EA580C] border-[#FDBA74]';
      case 'quarry':
        return 'bg-[#FFF1C7] text-[#D97706] border-[#FDE68A]';
      case 'reservoir':
        return 'bg-[#E8F5FA] text-[#24445A] border-[#D9E8EF]';
      case 'lake':
      case 'pond':
        return 'bg-[#DDF5E8] text-[#16A34A] border-[#A7F3D0]';
      case 'canal':
        return 'bg-[#ECF8E8] text-[#48BFA3] border-[#A7F3D0]';
      default:
        return 'bg-[#F1F8FC] text-[#647D8C] border-[#D9E8EF]';
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-[#647D8C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-focus-within:text-[#2387D9]" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (cleanQ.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search water bodies"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
          className="w-full bg-[#F1F8FC] hover:bg-[#E8F5FA] focus:bg-white border border-[#D9E8EF] focus:border-[#2387D9] focus:ring-3 focus:ring-[#2387D9]/15 rounded-full pl-9 pr-8 py-2 text-[13px] text-[#24445A] placeholder-[#647D8C]/70 focus:outline-none transition-all shadow-2xs font-sans"
        />

        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search query"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#647D8C] hover:text-[#24445A] hover:bg-[#E8F5FA] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown Panel */}
      {isOpen && cleanQ.length > 0 && (
        <div
          role="listbox"
          aria-label="Water body suggestions"
          className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#D9E8EF] rounded-2xl shadow-xl z-50 overflow-hidden animate-natural-fade max-h-[380px] overflow-y-auto"
        >
          {matchingStations.length > 0 ? (
            <div className="p-2 space-y-1">
              <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-[#647D8C] border-b border-[#F1F8FC]">
                <span>Matching stations ({matchingStations.length})</span>
                <span className="hidden sm:inline">Use ↑↓ and Enter</span>
              </div>

              {matchingStations.map((station, index) => {
                const isHighlighted = index === highlightedIndex;
                const isHighRisk =
                  station.current_risk_level === 'high' || station.current_risk_level === 'extreme';
                const isWatch = station.current_risk_level === 'moderate';

                return (
                  <div
                    key={station.id}
                    role="option"
                    aria-selected={isHighlighted}
                    onClick={() => handleSelect(station)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 text-left ${
                      isHighlighted
                        ? 'bg-[#E8F5FA] border-l-4 border-[#2387D9] shadow-2xs translate-x-0.5'
                        : 'hover:bg-[#F1F8FC] border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isHighRisk
                            ? 'bg-[#FFE3D9] text-[#DC2626]'
                            : isWatch
                            ? 'bg-[#FFF1C7] text-[#D97706]'
                            : 'bg-[#D9F0FF] text-[#2387D9]'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-[13px] text-[#24445A] truncate leading-tight">
                          {highlightMatch(station.name, query)}
                        </div>
                        <div className="text-[11px] text-[#647D8C] truncate mt-0.5 flex items-center gap-1.5">
                          <span>{highlightMatch(getSubtext(station), query)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Badges: Type & Risk */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getTypeBadge(
                          station.type
                        )}`}
                      >
                        {station.type}
                      </span>

                      {/* Status indicator */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          isHighRisk
                            ? 'bg-[#FFE3D9] text-[#7C2D12] border-[#FDBA74]'
                            : isWatch
                            ? 'bg-[#FFF1C7] text-[#78350F] border-[#FDE68A]'
                            : 'bg-[#DDF5E8] text-[#14532D] border-[#A7F3D0]'
                        }`}
                      >
                        {station.current_risk_level.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-5 text-center space-y-2">
              <div className="w-9 h-9 rounded-full bg-[#FFE3D9] text-[#DC2626] mx-auto flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="text-[13px] font-bold text-[#24445A]">
                No matching water bodies found
              </p>
              <p className="text-xs text-[#647D8C] max-w-xs mx-auto">
                No telemetry station or hazard zone matched &ldquo;<span className="font-mono font-semibold text-[#24445A]">{query}</span>&rdquo;.
              </p>
              <div className="pt-2 border-t border-[#D9E8EF] text-[11px] text-[#647D8C]">
                Try searching for: <span className="font-semibold text-[#2387D9]">Ramamangalam</span>, <span className="font-semibold text-[#2387D9]">Athirappilly</span>, <span className="font-semibold text-[#2387D9]">River</span>, or <span className="font-semibold text-[#2387D9]">Quarry</span>.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
