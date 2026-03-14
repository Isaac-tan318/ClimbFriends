import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { getAllRecentBetaPosts, getBetaPostsForGym } from '@/data/mock-beta';
import { MOCK_USERS } from '@/data/mock-users';
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';
import type { BetaPost } from '@/types';

import { fromIsoOrNow, toIso } from '@/services/api/date';
import { err, ok, type AppResult } from '@/services/api/result';

type DbFeedPostRow = {
  id: string;
  type: 'session' | 'send';
  user_id: string;
  gym_id: string;
  posted_at: string;
  session_id: string | null;
  session_duration_minutes: number | null;
  climb_count: number | null;
  grade: string | null;
  color: string | null;
  wall: string | null;
  instagram_url: string | null;
  description: string | null;
};

type DbClimbedWithRow = {
  feed_post_id: string;
  user_id: string;
};

type DbProfileRow = {
  id: string;
  display_name: string | null;
};

const userNameMap = new Map(MOCK_USERS.map((user) => [user.id, user.displayName]));

const buildProfileNameMap = (profiles: DbProfileRow[]) =>
  new Map<string, string>(profiles.map((profile) => [profile.id, profile.display_name ?? 'Climber']));

const mapFeedPost = (row: DbFeedPostRow, userName: string, climbedWithNames: string[]): BetaPost => ({
  id: row.id,
  type: row.type,
  userId: row.user_id,
  userName,
  gymId: row.gym_id,
  postedAt: fromIsoOrNow(row.posted_at),
  sessionId: row.session_id ?? undefined,
  sessionDurationMinutes: row.session_duration_minutes ?? undefined,
  climbCount: row.climb_count ?? undefined,
  climbedWithNames: climbedWithNames.length > 0 ? climbedWithNames : undefined,
  grade: row.grade ?? undefined,
  color: row.color ?? undefined,
  wall: row.wall ?? undefined,
  instagramUrl: row.instagram_url ?? undefined,
  description: row.description ?? undefined,
});

export const feedService = {
  async getFeedPosts(input?: {
    limit?: number;
    gymId?: string;
    type?: 'session' | 'send';
  }): Promise<AppResult<BetaPost[]>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseFeed) {
      const local = input?.gymId ? getBetaPostsForGym(input.gymId) : getAllRecentBetaPosts(input?.limit ?? 60);
      const typed = input?.type ? local.filter((post) => post.type === input.type) : local;
      return ok(typed.slice(0, input?.limit ?? typed.length));
    }

    const client = getSupabaseClient();

    let query = client
      .from('feed_posts')
      .select('id,type,user_id,gym_id,posted_at,session_id,session_duration_minutes,climb_count,grade,color,wall,instagram_url,description')
      .order('posted_at', { ascending: false })
      .limit(input?.limit ?? 60);

    if (input?.gymId) query = query.eq('gym_id', input.gymId);
    if (input?.type) query = query.eq('type', input.type);

    const { data, error } = await query;

    if (error || !data) {
      return err(error?.message ?? 'Unable to fetch feed posts', error?.code, error);
    }

    const rows = data as DbFeedPostRow[];
    const userIds = Array.from(new Set(rows.map((row) => row.user_id)));

    const { data: profiles, error: profileError } = userIds.length
      ? await client.from('profiles').select('id,display_name').in('id', userIds)
      : { data: [], error: null };

    if (profileError) {
      return err(profileError.message, profileError.code, profileError);
    }

    const profileMap = buildProfileNameMap((profiles ?? []) as DbProfileRow[]);

    const postIds = rows.map((row) => row.id);
    const { data: climbedWithRows, error: climbedWithError } = postIds.length
      ? await client
          .from('feed_post_climbed_with')
          .select('feed_post_id,user_id')
          .in('feed_post_id', postIds)
      : { data: [], error: null };

    if (climbedWithError) {
      return err(climbedWithError.message, climbedWithError.code, climbedWithError);
    }

    const climbedWith = (climbedWithRows ?? []) as DbClimbedWithRow[];
    const climbedWithUserIds = Array.from(new Set(climbedWith.map((row) => row.user_id)));

    if (climbedWithUserIds.length > 0) {
      const missing = climbedWithUserIds.filter((id) => !profileMap.has(id));
      if (missing.length > 0) {
        const { data: extraProfiles, error: extraProfilesError } = await client
          .from('profiles')
          .select('id,display_name')
          .in('id', missing);

        if (extraProfilesError) {
          return err(extraProfilesError.message, extraProfilesError.code, extraProfilesError);
        }

        for (const profile of (extraProfiles ?? []) as DbProfileRow[]) {
          profileMap.set(profile.id, profile.display_name ?? 'Climber');
        }
      }
    }

    const climbedWithMap = new Map<string, string[]>();
    for (const row of climbedWith) {
      const bucket = climbedWithMap.get(row.feed_post_id) ?? [];
      bucket.push(profileMap.get(row.user_id) ?? 'Climber');
      climbedWithMap.set(row.feed_post_id, bucket);
    }

    return ok(
      rows.map((row) =>
        mapFeedPost(
          row,
          profileMap.get(row.user_id) ?? userNameMap.get(row.user_id) ?? 'Climber',
          climbedWithMap.get(row.id) ?? [],
        ),
      ),
    );
  },

  async publishSession(input: {
    userId: string;
    sessionId: string;
    gymId: string;
    sessionDurationMinutes: number;
    climbCount: number;
    description?: string;
    climbedWithUserIds?: string[];
  }): Promise<AppResult<BetaPost>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseFeed) {
      return ok({
        id: `feed-${Date.now()}`,
        type: 'session',
        userId: input.userId,
        userName: userNameMap.get(input.userId) ?? 'Climber',
        gymId: input.gymId,
        postedAt: new Date(),
        sessionId: input.sessionId,
        sessionDurationMinutes: input.sessionDurationMinutes,
        climbCount: input.climbCount,
        climbedWithNames: [],
        description: input.description,
      });
    }

    if (!input.userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const client = getSupabaseClient();

    const { data, error } = await client
      .from('feed_posts')
      .insert({
        type: 'session',
        user_id: input.userId,
        gym_id: input.gymId,
        posted_at: toIso(new Date()),
        session_id: input.sessionId,
        session_duration_minutes: input.sessionDurationMinutes,
        climb_count: input.climbCount,
        description: input.description ?? null,
      })
      .select('id,type,user_id,gym_id,posted_at,session_id,session_duration_minutes,climb_count,grade,color,wall,instagram_url,description')
      .single();

    if (error || !data) {
      return err(error?.message ?? 'Unable to publish session', error?.code, error);
    }

    if (input.climbedWithUserIds && input.climbedWithUserIds.length > 0) {
      const joinRows = input.climbedWithUserIds.map((id) => ({
        feed_post_id: (data as DbFeedPostRow).id,
        user_id: id,
      }));
      await client.from('feed_post_climbed_with').upsert(joinRows, { onConflict: 'feed_post_id,user_id' });
    }

    const profileIds = Array.from(
      new Set([input.userId, ...(input.climbedWithUserIds ?? [])].filter((id): id is string => Boolean(id))),
    );

    const { data: publishedProfiles, error: publishedProfilesError } = profileIds.length
      ? await client.from('profiles').select('id,display_name').in('id', profileIds)
      : { data: [], error: null };

    if (publishedProfilesError) {
      return err(publishedProfilesError.message, publishedProfilesError.code, publishedProfilesError);
    }

    const profileMap = buildProfileNameMap((publishedProfiles ?? []) as DbProfileRow[]);
    const userName = profileMap.get(input.userId) ?? userNameMap.get(input.userId) ?? 'Climber';
    const climbedWithNames =
      input.climbedWithUserIds?.map((id) => profileMap.get(id) ?? userNameMap.get(id) ?? 'Climber') ?? [];

    return ok(mapFeedPost(data as DbFeedPostRow, userName, climbedWithNames));
  },
};
