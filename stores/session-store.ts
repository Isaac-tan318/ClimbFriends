import { create } from 'zustand';

import { CURRENT_USER_STATS, MOCK_SESSIONS } from '@/data/mock-sessions';
import type { ClimbingSession, LoggedClimb, UserStats } from '@/types';
import { getCurrentUserId } from '@/services/auth/current-user';
import { err, ok, type AppResult } from '@/services/api/result';
import { sessionService } from '@/services/sessions/session-service';

type SyncState = {
  loading: boolean;
  initialized: boolean;
  source: 'mock' | 'supabase';
  error: string | null;
};

interface SessionState {
  sessions: ClimbingSession[];
  stats: UserStats;
  activeSession: ClimbingSession | null;
  sync: SyncState;

  initialize: () => Promise<AppResult<void>>;
  startSession: (gymId: string) => Promise<AppResult<ClimbingSession>>;
  endSession: () => Promise<AppResult<ClimbingSession | null>>;
  addSession: (session: ClimbingSession) => Promise<AppResult<ClimbingSession>>;
  logClimb: (climb: Omit<LoggedClimb, 'id' | 'loggedAt'>) => Promise<AppResult<LoggedClimb>>;
  refreshSessions: () => Promise<AppResult<ClimbingSession[]>>;
  getUserSessions: (userId: string) => ClimbingSession[];
  getRecentSessions: (limit?: number) => ClimbingSession[];
}

const DEFAULT_USER_ID = 'user-1';

const resolveUserId = async () => (await getCurrentUserId()) ?? DEFAULT_USER_ID;

const deriveStats = (sessions: ClimbingSession[], userId: string): UserStats => {
  const mine = sessions.filter((session) => session.userId === userId && !session.isActive);
  const totalMinutes = mine.reduce((sum, session) => sum + session.durationMinutes, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sessionsThisWeek = mine.filter((session) => session.startedAt >= sevenDaysAgo);
  const minutesThisWeek = sessionsThisWeek.reduce((sum, session) => sum + session.durationMinutes, 0);

  const gymCounts = mine.reduce<Record<string, number>>((acc, session) => {
    acc[session.gymId] = (acc[session.gymId] ?? 0) + 1;
    return acc;
  }, {});

  const favoriteGymId = Object.entries(gymCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  return {
    totalMinutes,
    totalSessions: mine.length,
    sessionsThisWeek: sessionsThisWeek.length,
    minutesThisWeek,
    favoriteGymId,
    currentStreak: CURRENT_USER_STATS.currentStreak,
    longestStreak: CURRENT_USER_STATS.longestStreak,
  };
};

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: MOCK_SESSIONS,
  stats: CURRENT_USER_STATS,
  activeSession: null,
  sync: {
    loading: false,
    initialized: false,
    source: 'mock',
    error: null,
  },

  initialize: async () => {
    set((state) => ({ sync: { ...state.sync, loading: true, initialized: true, error: null } }));

    const userId = await resolveUserId();
    const sessionsResult = await sessionService.getSessions(userId);

    if (!sessionsResult.ok) {
      set((state) => ({
        sync: {
          ...state.sync,
          loading: false,
          error: sessionsResult.error.message,
        },
      }));
      return err(sessionsResult.error.message, sessionsResult.error.code, sessionsResult.error.details);
    }

    const sessions = sessionsResult.data;
    const activeSession = sessions.find((session) => session.isActive) ?? null;

    const statsResult = await sessionService.getStats(userId);
    const stats = statsResult.ok ? statsResult.data : deriveStats(sessions, userId);

    set({
      sessions,
      activeSession,
      stats,
      sync: {
        loading: false,
        initialized: true,
        source: userId === DEFAULT_USER_ID ? 'mock' : 'supabase',
        error: statsResult.ok ? null : statsResult.error.message,
      },
    });

    return ok(undefined);
  },

  refreshSessions: async () => {
    const userId = await resolveUserId();
    const result = await sessionService.getSessions(userId);

    if (!result.ok) {
      set((state) => ({
        sync: {
          ...state.sync,
          error: result.error.message,
        },
      }));
      return err(result.error.message, result.error.code, result.error.details);
    }

    const sessions = result.data;
    set({
      sessions,
      activeSession: sessions.find((session) => session.isActive) ?? null,
      stats: deriveStats(sessions, userId),
      sync: {
        loading: false,
        initialized: true,
        source: userId === DEFAULT_USER_ID ? 'mock' : 'supabase',
        error: null,
      },
    });

    return ok(sessions);
  },

  startSession: async (gymId) => {
    const userId = await resolveUserId();
    set((state) => ({ sync: { ...state.sync, loading: true, error: null } }));

    const result = await sessionService.startSession(userId, gymId);

    if (!result.ok) {
      set((state) => ({ sync: { ...state.sync, loading: false, error: result.error.message } }));
      return err(result.error.message, result.error.code, result.error.details);
    }

    set((state) => ({
      activeSession: result.data,
      sync: {
        ...state.sync,
        loading: false,
        source: userId === DEFAULT_USER_ID ? 'mock' : 'supabase',
      },
    }));

    return ok(result.data);
  },

  endSession: async () => {
    const { activeSession, sessions } = get();
    if (!activeSession) return ok(null);

    const userId = await resolveUserId();
    set((state) => ({ sync: { ...state.sync, loading: true, error: null } }));

    const result = await sessionService.endSession(activeSession.id);

    if (!result.ok) {
      set((state) => ({ sync: { ...state.sync, loading: false, error: result.error.message } }));
      return err(result.error.message, result.error.code, result.error.details);
    }

    const nextSessions = [result.data, ...sessions.filter((session) => session.id !== result.data.id)];

    set((state) => ({
      activeSession: null,
      sessions: nextSessions,
      stats: deriveStats(nextSessions, userId),
      sync: {
        ...state.sync,
        loading: false,
        source: userId === DEFAULT_USER_ID ? 'mock' : 'supabase',
      },
    }));

    return ok(result.data);
  },

  addSession: async (session) => {
    set((state) => {
      const nextSessions = [session, ...state.sessions];
      return {
        sessions: nextSessions,
        stats: deriveStats(nextSessions, session.userId),
      };
    });

    return ok(session);
  },

  logClimb: async (climbData) => {
    const userId = await resolveUserId();
    set((state) => ({ sync: { ...state.sync, loading: true, error: null } }));

    const result = await sessionService.logClimb({
      ...climbData,
      userId,
    });

    if (!result.ok) {
      set((state) => ({ sync: { ...state.sync, loading: false, error: result.error.message } }));
      return err(result.error.message, result.error.code, result.error.details);
    }

    const climb = result.data;

    set((state) => ({
      activeSession:
        state.activeSession && state.activeSession.id === climb.sessionId
          ? {
              ...state.activeSession,
              climbs: [...(state.activeSession.climbs ?? []), climb],
            }
          : state.activeSession,
      sessions: state.sessions.map((session) =>
        session.id === climb.sessionId
          ? { ...session, climbs: [...(session.climbs ?? []), climb] }
          : session,
      ),
      sync: {
        ...state.sync,
        loading: false,
        source: userId === DEFAULT_USER_ID ? 'mock' : 'supabase',
      },
    }));

    return ok(climb);
  },

  getUserSessions: (userId) => {
    return get().sessions.filter((session) => session.userId === userId);
  },

  getRecentSessions: (limit = 10) => {
    const userSessions = get().sessions.filter((session) => session.userId === DEFAULT_USER_ID);
    return userSessions
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  },
}));
