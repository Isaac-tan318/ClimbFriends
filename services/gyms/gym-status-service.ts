import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';
import { GymOccupancy, GymCrowdedness } from '@/types';
import { err, ok, type AppResult } from '@/services/api/result';

const CROWDED_THRESHOLD = 15;
const MODERATE_THRESHOLD = 5;

const getCrowdednessLevel = (count: number): GymCrowdedness => {
  if (count >= CROWDED_THRESHOLD) return 'crowded';
  if (count >= MODERATE_THRESHOLD) return 'moderate';
  return 'quiet';
};

export const gymStatusService = {
  async getOccupancy(): Promise<AppResult<GymOccupancy[]>> {
    if (!hasSupabaseConfig) {
      // In mock mode, we could return dummy data or empty
      return ok([]);
    }

    const client = getSupabaseClient();
    const { data, error } = await client.rpc('get_gym_occupancy');

    if (error) {
      return err(error.message, error.code, error);
    }

    const mapped: GymOccupancy[] = (data || []).map((row: any) => ({
      gymId: row.gym_id,
      count: Number(row.occupancy_count),
      level: getCrowdednessLevel(Number(row.occupancy_count)),
    }));

    return ok(mapped);
  },

  /**
   * Subscribes to changes in climbing_sessions (active flag) to know when to refresh occupancy.
   * Note: For efficiency, we don't stream the counts, we just notify the caller
   * that they should re-fetch getOccupancy().
   */
  subscribeToPresenceChanges(onUpdate: () => void) {
    if (!hasSupabaseConfig) return () => {};

    const client = getSupabaseClient();
    const channel = client
      .channel('gym-occupancy-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'climbing_sessions',
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }
};
