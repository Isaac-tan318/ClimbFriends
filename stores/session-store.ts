import { create } from 'zustand';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { CURRENT_USER_STATS, MOCK_SESSIONS } from '@/data/mock-sessions';
import { hasSupabaseConfig } from '@/lib/supabase';
import type { ClimbingSession, LoggedClimb, UserStats } from '@/types';
import { getCurrentUserId } from '@/services/auth/current-user';
import { err, ok, type AppResult } from '@/services/api/result';
import { presenceService } from '@/services/presence/presence-service';
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
  resetForSignedOut: () => void;
}

const DEFAULT_USER_ID = 'user-1';
const useMockSessions = !hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSessions;
const EMPTY_STATS: UserStats = {
  totalMinutes: 0,
  totalSessions: 0,
  sessionsThisWeek: 0,
  minutesThisWeek: 0,
  favoriteGymId: null,
  currentStreak: 0,
  longestStreak: 0,
};

const resolveUserId = async (): Promise<string | null> => {
  const userId = await getCurrentUserId();
  if (userId) return userId;
  return useMockSessions ? DEFAULT_USER_ID : null;
};

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
  sessions: useMockSessions ? MOCK_SESSIONS : [],
  stats: useMockSessions ? CURRENT_USER_STATS : EMPTY_STATS,
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
    if (!userId) {
      set((state) => ({
        sessions: [],
        activeSession: null,
        stats: EMPTY_STATS,
        sync: {
          ...state.sync,
          loading: false,
          source: 'supabase',
          error: null,
        },
      }));
      return ok(undefined);
    }

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
        source: useMockSessions ? 'mock' : 'supabase',
        error: statsResult.ok ? null : statsResult.error.message,
      },
    });

    return ok(undefined);
  },

  refreshSessions: async () => {
    const userId = await resolveUserId();
    if (!userId) {
      set({
        sessions: [],
        activeSession: null,
        stats: EMPTY_STATS,
        sync: {
          loading: false,
          initialized: true,
          source: 'supabase',
          error: null,
        },
      });
      return ok([]);
    }

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
        source: useMockSessions ? 'mock' : 'supabase',
        error: null,
      },
    });

    return ok(sessions);
  },

  startSession: async (gymId) => {
    const userId = await resolveUserId();
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

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
        source: useMockSessions ? 'mock' : 'supabase',
      },
    }));

    void presenceService.updatePresence({
      userId,
      currentGymId: gymId,
      isAtGym: true,
    });

    return ok(result.data);
  },

  endSession: async () => {
    const { activeSession, sessions } = get();
    if (!activeSession) return ok(null);

    const userId = await resolveUserId();
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

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
        source: useMockSessions ? 'mock' : 'supabase',
      },
    }));

    void presenceService.clearCheckIn(userId);

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
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

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
        source: useMockSessions ? 'mock' : 'supabase',
      },
    }));

    return ok(climb);
  },

  getUserSessions: (userId) => {
    return get().sessions.filter((session) => session.userId === userId);
  },

  getRecentSessions: (limit = 10) => {
    const userSessions = useMockSessions
      ? get().sessions.filter((session) => session.userId === DEFAULT_USER_ID)
      : get().sessions;
    return userSessions
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  },

  resetForSignedOut: () => {
    set({
      sessions: [],
      stats: EMPTY_STATS,
      activeSession: null,
      sync: {
        loading: false,
        initialized: true,
        source: 'supabase',
        error: null,
      },
    });
  },
}));
