import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { CURRENT_USER_STATS, MOCK_SESSIONS } from '@/data/mock-sessions';
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';
import type { ClimbingSession, LoggedClimb, UserStats } from '@/types';

import { fromIso, fromIsoOrNow, toIso } from '@/services/api/date';
import { err, ok, type AppResult } from '@/services/api/result';

type DbSessionRow = {
  id: string;
  user_id: string;
  gym_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  is_active: boolean;
};

type DbClimbRow = {
  id: string;
  session_id: string;
  gym_id: string;
  grade: string;
  color: string;
  wall: string;
  instagram_url: string | null;
  logged_at: string;
};

const mapClimb = (row: DbClimbRow): LoggedClimb => ({
  id: row.id,
  sessionId: row.session_id,
  gymId: row.gym_id,
  grade: row.grade,
  color: row.color,
  wall: row.wall,
  instagramUrl: row.instagram_url ?? '',
  loggedAt: fromIsoOrNow(row.logged_at),
});

const mapSession = (row: DbSessionRow, climbs: LoggedClimb[]): ClimbingSession => ({
  id: row.id,
  userId: row.user_id,
  gymId: row.gym_id,
  startedAt: fromIsoOrNow(row.started_at),
  endedAt: fromIso(row.ended_at),
  durationMinutes: row.duration_minutes,
  isActive: row.is_active,
  climbs,
});

const computeStats = (sessions: ClimbingSession[], userId: string): UserStats => {
  const mine = sessions.filter((session) => session.userId === userId && !session.isActive);
  const totalMinutes = mine.reduce((sum, session) => sum + session.durationMinutes, 0);
  const totalSessions = mine.length;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const weekSessions = mine.filter((session) => session.startedAt >= weekStart);
  const minutesThisWeek = weekSessions.reduce((sum, session) => sum + session.durationMinutes, 0);

  const gymCounts = mine.reduce<Record<string, number>>((acc, session) => {
    acc[session.gymId] = (acc[session.gymId] ?? 0) + 1;
    return acc;
  }, {});

  const favoriteGymId = Object.entries(gymCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  return {
    totalMinutes,
    totalSessions,
    sessionsThisWeek: weekSessions.length,
    minutesThisWeek,
    favoriteGymId,
    currentStreak: CURRENT_USER_STATS.currentStreak,
    longestStreak: CURRENT_USER_STATS.longestStreak,
  };
};

const getMockSessionsForUser = (userId: string): ClimbingSession[] =>
  MOCK_SESSIONS.filter((session) => session.userId === userId).sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
  );

const isSupabaseSessionsEnabled = hasSupabaseConfig && FEATURE_FLAGS.useSupabaseSessions;

export const sessionService = {
  async getSessions(userId: string): Promise<AppResult<ClimbingSession[]>> {
    if (!isSupabaseSessionsEnabled) {
      return ok(getMockSessionsForUser(userId));
    }

    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const client = getSupabaseClient();
    const { data: sessions, error } = await client
      .from('climbing_sessions')
      .select('id,user_id,gym_id,started_at,ended_at,duration_minutes,is_active')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error || !sessions) {
      return err(error?.message ?? 'Unable to fetch sessions', error?.code, error);
    }

    const sessionRows = sessions as DbSessionRow[];
    const ids = sessionRows.map((row) => row.id);

    const climbsBySession = new Map<string, LoggedClimb[]>();
    if (ids.length > 0) {
      const { data: climbs, error: climbsError } = await client
        .from('logged_climbs')
        .select('id,session_id,gym_id,grade,color,wall,instagram_url,logged_at')
        .in('session_id', ids)
        .order('logged_at', { ascending: true });

      if (climbsError) {
        return err(climbsError.message, climbsError.code, climbsError);
      }

      for (const row of (climbs ?? []) as DbClimbRow[]) {
        const mapped = mapClimb(row);
        const bucket = climbsBySession.get(mapped.sessionId) ?? [];
        bucket.push(mapped);
        climbsBySession.set(mapped.sessionId, bucket);
      }
    }

    return ok(sessionRows.map((row) => mapSession(row, climbsBySession.get(row.id) ?? [])));
  },

  async getStats(userId: string): Promise<AppResult<UserStats>> {
    if (isSupabaseSessionsEnabled && !userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const sessionsResult = await this.getSessions(userId);
    if (!sessionsResult.ok) return sessionsResult;

    return ok(computeStats(sessionsResult.data, userId));
  },

  async startSession(userId: string, gymId: string): Promise<AppResult<ClimbingSession>> {
    if (!isSupabaseSessionsEnabled) {
      return ok({
        id: `session-${Date.now()}`,
        userId,
        gymId,
        startedAt: new Date(),
        endedAt: null,
        durationMinutes: 0,
        isActive: true,
        climbs: [],
      });
    }

    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('climbing_sessions')
      .insert({
        user_id: userId,
        gym_id: gymId,
        started_at: toIso(new Date()),
        ended_at: null,
        duration_minutes: 0,
        is_active: true,
      })
      .select('id,user_id,gym_id,started_at,ended_at,duration_minutes,is_active')
      .single();

    if (error || !data) {
      return err(error?.message ?? 'Unable to start session', error?.code, error);
    }

    return ok(mapSession(data as DbSessionRow, []));
  },

  async endSession(sessionId: string): Promise<AppResult<ClimbingSession>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSessions) {
      const existing = MOCK_SESSIONS.find((session) => session.id === sessionId);
      if (!existing) return err('Session not found', 'SESSION_NOT_FOUND');
      const endedAt = new Date();
      const durationMinutes = Math.round((endedAt.getTime() - existing.startedAt.getTime()) / 60000);
      return ok({ ...existing, endedAt, durationMinutes, isActive: false });
    }

    const client = getSupabaseClient();
    const { data: current, error: currentError } = await client
      .from('climbing_sessions')
      .select('id,user_id,gym_id,started_at,ended_at,duration_minutes,is_active')
      .eq('id', sessionId)
      .single();

    if (currentError || !current) {
      return err(currentError?.message ?? 'Session not found', currentError?.code, currentError);
    }

    const startedAt = fromIsoOrNow((current as DbSessionRow).started_at);
    const endedAt = new Date();
    const durationMinutes = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

    const { data, error } = await client
      .from('climbing_sessions')
      .update({
        ended_at: toIso(endedAt),
        duration_minutes: durationMinutes,
        is_active: false,
      })
      .eq('id', sessionId)
      .select('id,user_id,gym_id,started_at,ended_at,duration_minutes,is_active')
      .single();

    if (error || !data) {
      return err(error?.message ?? 'Unable to end session', error?.code, error);
    }

    const { data: climbs } = await client
      .from('logged_climbs')
      .select('id,session_id,gym_id,grade,color,wall,instagram_url,logged_at')
      .eq('session_id', sessionId)
      .order('logged_at', { ascending: true });

    const mappedClimbs = ((climbs ?? []) as DbClimbRow[]).map(mapClimb);
    return ok(mapSession(data as DbSessionRow, mappedClimbs));
  },

  async logClimb(input: {
    userId: string;
    sessionId: string;
    gymId: string;
    grade: string;
    color: string;
    wall: string;
    instagramUrl?: string;
  }): Promise<AppResult<LoggedClimb>> {
    if (!isSupabaseSessionsEnabled) {
      return ok({
        id: `climb-${Date.now()}`,
        sessionId: input.sessionId,
        gymId: input.gymId,
        grade: input.grade,
        color: input.color,
        wall: input.wall,
        instagramUrl: input.instagramUrl ?? '',
        loggedAt: new Date(),
      });
    }

    if (!input.userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('logged_climbs')
      .insert({
        session_id: input.sessionId,
        gym_id: input.gymId,
        user_id: input.userId,
        grade: input.grade,
        color: input.color,
        wall: input.wall,
        instagram_url: input.instagramUrl ?? null,
      })
      .select('id,session_id,gym_id,grade,color,wall,instagram_url,logged_at')
      .single();

    if (error || !data) {
      return err(error?.message ?? 'Unable to log climb', error?.code, error);
    }

    const climbRow = data as DbClimbRow;
    const { error: feedPostError } = await client.from('feed_posts').insert({
      type: 'send',
      user_id: input.userId,
      gym_id: input.gymId,
      session_id: input.sessionId,
      grade: input.grade,
      color: input.color,
      wall: input.wall,
      instagram_url: input.instagramUrl ?? null,
      description: null,
    });

    if (feedPostError) {
      // Best-effort rollback to keep climb + feed write in sync when send post creation fails.
      await client.from('logged_climbs').delete().eq('id', climbRow.id);
      return err(feedPostError.message, feedPostError.code, feedPostError);
    }

    return ok(mapClimb(climbRow));
  },
};
