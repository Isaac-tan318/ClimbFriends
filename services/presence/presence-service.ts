import type { UserPresence } from '@/types';
import { err, ok, type AppResult } from '@/services/api/result';

/**
 * Presence storage is deprecated. We now derive "who's at which gym" from active sessions,
 * so these helpers become no-ops that avoid touching the backend or storing coordinates.
 */

export const presenceService = {
  async updatePresence(input: {
    userId: string;
    currentGymId?: string | null;
    isAtGym?: boolean;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<AppResult<UserPresence>> {
    if (!input.userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    return ok({
      userId: input.userId,
      currentGymId: input.currentGymId ?? null,
      isAtGym: input.isAtGym ?? false,
      lastSeenAt: new Date(),
      latitude: undefined,
      longitude: undefined,
      updatedAt: new Date(),
    });
  },

  async updateFromCoordinates(input: {
    userId: string;
    latitude: number;
    longitude: number;
  }): Promise<AppResult<UserPresence>> {
    if (!input.userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    // Coordinates intentionally ignored; just acknowledge call.
    return this.updatePresence({
      userId: input.userId,
      currentGymId: null,
      isAtGym: false,
      latitude: null,
      longitude: null,
    });
  },

  async clearCheckIn(userId: string): Promise<AppResult<UserPresence>> {
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    return this.updatePresence({
      userId,
      currentGymId: null,
      isAtGym: false,
      latitude: null,
      longitude: null,
    });
  },
};
