import { FEATURE_FLAGS } from '@/constants/feature-flags';
import {
  CURRENT_USER,
  MOCK_USERS,
} from '@/data/mock-users';
import {
  MOCK_GYM_LEADERBOARD,
  MOCK_LEADERBOARD,
  MOCK_NATIONAL_LEADERBOARD,
} from '@/data/mock-sessions';
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';
import type { GymLeaderboardEntry, LeaderboardEntry, User } from '@/types';

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

type DbGymLeaderboardRow = {
  gym_id: string;
  gym_name: string;
  brand: string;
  total_minutes: number;
  total_sessions: number;
  active_members_count: number;
  rank: number;
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

  async getGymLeaderboard(limit = 20): Promise<AppResult<GymLeaderboardEntry[]>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSessions) {
      return ok(MOCK_GYM_LEADERBOARD);
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('gym_leaderboard')
      .select('gym_id,gym_name,brand,total_minutes,total_sessions,active_members_count,rank')
      .limit(limit)
      .order('rank', { ascending: true });

    if (error || !data) {
      return err(error?.message ?? 'Unable to load gym leaderboard', error?.code, error);
    }

    return ok(
      (data as DbGymLeaderboardRow[]).map((row) => ({
        gymId: row.gym_id,
        gymName: row.gym_name,
        brand: row.brand,
        totalMinutes: row.total_minutes,
        totalSessions: row.total_sessions,
        activeMembersCount: row.active_members_count,
        rank: row.rank,
      })),
    );
  },
};
