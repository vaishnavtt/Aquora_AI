import { useState, useEffect, useCallback } from 'react';
import { WaterBody } from '../types';
import { api, DEMO_WATER_BODIES } from '../services/api';

interface UseWaterBodiesResult {
  waterBodies: WaterBody[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** True when all displayed data is synthetic/unvalidated demo data */
  isUsingDemoData: boolean;
}

export function useWaterBodies(): UseWaterBodiesResult {
  const [waterBodies, setWaterBodies] = useState<WaterBody[]>(DEMO_WATER_BODIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingDemoData, setIsUsingDemoData] = useState(true);

  const fetchWaterBodies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getWaterBodies();
      if (data && data.length > 0) {
        setWaterBodies(data);
        // Consider demo data if every record is flagged or if we couldn't reach the backend
        const allDemo = data.every((wb) => wb.is_demonstration_data === true);
        setIsUsingDemoData(allDemo);
      } else {
        // Empty response — fall back to demo data
        setWaterBodies(DEMO_WATER_BODIES);
        setIsUsingDemoData(true);
      }
    } catch {
      setError('Could not reach the live backend. Displaying synthetic demonstration data.');
      setWaterBodies(DEMO_WATER_BODIES);
      setIsUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWaterBodies();
  }, [fetchWaterBodies]);

  return { waterBodies, loading, error, refetch: fetchWaterBodies, isUsingDemoData };
}
