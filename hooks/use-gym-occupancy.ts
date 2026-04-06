import { useState, useEffect, useCallback } from 'react';
import { GymOccupancy } from '@/types';
import { gymStatusService } from '@/services/gyms/gym-status-service';

export function useGymOccupancy() {
  const [occupancy, setOccupancy] = useState<GymOccupancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOccupancy = useCallback(async () => {
    const result = await gymStatusService.getOccupancy();
    if (result.ok) {
      setOccupancy(result.data);
      setError(null);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOccupancy();

    const unsubscribe = gymStatusService.subscribeToPresenceChanges(() => {
      fetchOccupancy();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchOccupancy]);

  const getGymOccupancy = (gymId: string): GymOccupancy | null => {
    return occupancy.find((o) => o.gymId === gymId) ?? null;
  };

  return {
    occupancy,
    getGymOccupancy,
    loading,
    error,
    refresh: fetchOccupancy,
  };
}
