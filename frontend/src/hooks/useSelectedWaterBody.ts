import { useState, useEffect, useCallback } from 'react';
import { WaterBody } from '../types';

interface UseSelectedWaterBodyResult {
  selectedWaterBody: WaterBody | null;
  setSelectedWaterBody: (wb: WaterBody | null) => void;
  clearSelection: () => void;
}

export function useSelectedWaterBody(
  initial: WaterBody | null = null
): UseSelectedWaterBodyResult {
  const [selectedWaterBody, setSelectedWaterBody] = useState<WaterBody | null>(initial);

  const clearSelection = useCallback(() => {
    setSelectedWaterBody(null);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);

  return { selectedWaterBody, setSelectedWaterBody, clearSelection };
}
