import { FEATURE_FLAGS } from '@/constants/feature-flags';
import {
  CURRENT_USER,
  MOCK_USERS,
} from '@/data/mock-users';
import {
  MOCK_LEADERBOARD,
  MOCK_NATIONAL_LEADERBOARD,
  getMockGymUserLeaderboard,
} from '@/data/mock-sessions';
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';
import type { LeaderboardEntry, User } from '@/types';

import { fromIsoOrNow } from '@/services/api/date';
import { err, ok, type AppResult } from '@/services/api/result';

type DbLeaderboardRow = {
  user_id: string;
  total_minutes: number;
  total_sessions: number;
  rank: number;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

const userById = new Map<string, User>(MOCK_USERS.map((user) => [user.id, user]));

const mapEntry = (row: DbLeaderboardRow): LeaderboardEntry => {
  const fallbackUser = userById.get(row.user_id) ?? CURRENT_USER;
  return {
    userId: row.user_id,
    user: {
      id: row.user_id,
      email: row.email ?? fallbackUser.email,
      displayName: row.display_name ?? fallbackUser.displayName,
      avatarUrl: row.avatar_url ?? fallbackUser.avatarUrl,
      createdAt: fromIsoOrNow(row.created_at),
    },
    totalMinutes: row.total_minutes,
    totalSessions: row.total_sessions,
    rank: row.rank,
  };
};

export const leaderboardService = {
  async getFriendsLeaderboard(userId: string): Promise<AppResult<LeaderboardEntry[]>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSocial) {
      return ok(MOCK_LEADERBOARD);
    }

    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const client = getSupabaseClient();
    const { data, error } = await client.rpc('friends_leaderboard', { current_user_id: userId });

    if (error || !data) {
      return err(error?.message ?? 'Unable to load friends leaderboard', error?.code, error);
    }

    return ok((data as DbLeaderboardRow[]).map(mapEntry));
  },

  async getNationalLeaderboard(limit = 50, offset = 0): Promise<AppResult<LeaderboardEntry[]>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSessions) {
      return ok(MOCK_NATIONAL_LEADERBOARD);
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('national_leaderboard')
      .select('user_id,total_minutes,total_sessions,rank,display_name,email,avatar_url,created_at')
      .range(offset, offset + limit - 1)
      .order('rank', { ascending: true });

    if (error || !data) {
      return err(error?.message ?? 'Unable to load national leaderboard', error?.code, error);
    }

    return ok((data as DbLeaderboardRow[]).map(mapEntry));
  },

  async getGymUsersLeaderboard(gymId: string, limit = 20): Promise<AppResult<LeaderboardEntry[]>> {
    if (!gymId) {
      return ok([]);
    }

    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSessions) {
      return ok(getMockGymUserLeaderboard(gymId, limit));
    }

    const client = getSupabaseClient();
    const { data, error } = await client.rpc('gym_user_leaderboard', { target_gym_id: gymId });

    if (error || !data) {
      return err(error?.message ?? 'Unable to load gym users leaderboard', error?.code, error);
    }

    return ok((data as DbLeaderboardRow[]).slice(0, limit).map(mapEntry));
  },
};
