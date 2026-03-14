import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';
import type { UserPresence } from '@/types';

import { fromIso, fromIsoOrNow, toIso } from '@/services/api/date';
import { err, ok, type AppResult } from '@/services/api/result';

type DbPresence = {
  user_id: string;
  current_gym_id: string | null;
  is_at_gym: boolean;
  last_seen_at: string | null;
  latitude: number | null;
  longitude: number | null;
  updated_at: string;
};

const mapPresence = (row: DbPresence): UserPresence => ({
  userId: row.user_id,
  currentGymId: row.current_gym_id,
  isAtGym: row.is_at_gym,
  lastSeenAt: fromIso(row.last_seen_at),
  latitude: row.latitude ?? undefined,
  longitude: row.longitude ?? undefined,
  updatedAt: fromIsoOrNow(row.updated_at),
});

const isSupabasePresenceEnabled = hasSupabaseConfig && FEATURE_FLAGS.useSupabasePresence;

export const presenceService = {
  async updatePresence(input: {
    userId: string;
    currentGymId?: string | null;
    isAtGym?: boolean;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<AppResult<UserPresence>> {
    if (!isSupabasePresenceEnabled) {
      return ok({
        userId: input.userId,
        currentGymId: input.currentGymId ?? null,
        isAtGym: input.isAtGym ?? false,
        lastSeenAt: new Date(),
        latitude: input.latitude ?? undefined,
        longitude: input.longitude ?? undefined,
        updatedAt: new Date(),
      });
    }

    if (!input.userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('user_locations')
      .upsert({
        user_id: input.userId,
        current_gym_id: input.currentGymId ?? null,
        is_at_gym: input.isAtGym ?? false,
        last_seen_at: toIso(new Date()),
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      })
      .select('user_id,current_gym_id,is_at_gym,last_seen_at,latitude,longitude,updated_at')
      .single();

    if (error || !data) {
      return err(error?.message ?? 'Unable to update presence', error?.code, error);
    }

    return ok(mapPresence(data as DbPresence));
  },

  async updateFromCoordinates(input: {
    userId: string;
    latitude: number;
    longitude: number;
  }): Promise<AppResult<UserPresence>> {
    if (!isSupabasePresenceEnabled) {
      return this.updatePresence({
        userId: input.userId,
        latitude: input.latitude,
        longitude: input.longitude,
        currentGymId: null,
        isAtGym: false,
      });
    }

    if (!input.userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const client = getSupabaseClient();
    const { data: resolvedGymId, error: resolveError } = await client.rpc('resolve_current_gym', {
      latitude_input: input.latitude,
      longitude_input: input.longitude,
    });

    if (resolveError) {
      return err(resolveError.message, resolveError.code, resolveError);
    }

    const currentGymId = typeof resolvedGymId === 'string' ? resolvedGymId : null;
    return this.updatePresence({
      userId: input.userId,
      currentGymId,
      isAtGym: Boolean(currentGymId),
      latitude: input.latitude,
      longitude: input.longitude,
    });
  },

  async clearCheckIn(userId: string): Promise<AppResult<UserPresence>> {
    return this.updatePresence({
      userId,
      currentGymId: null,
      isAtGym: false,
      latitude: null,
      longitude: null,
    });
  },
};
