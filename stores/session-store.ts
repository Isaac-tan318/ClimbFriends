import { create } from 'zustand';
import { ClimbingSession, LoggedClimb, UserStats } from '@/types';
import { MOCK_SESSIONS, CURRENT_USER_STATS, getUserSessions } from '@/data';

interface SessionState {
  sessions: ClimbingSession[];
  stats: UserStats;
  activeSession: ClimbingSession | null;
  
  // Actions
  startSession: (gymId: string) => void;
  endSession: () => void;
  addSession: (session: ClimbingSession) => void;
  logClimb: (climb: Omit<LoggedClimb, 'id' | 'loggedAt'>) => void;
  getUserSessions: (userId: string) => ClimbingSession[];
  getRecentSessions: (limit?: number) => ClimbingSession[];
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: MOCK_SESSIONS,
  stats: CURRENT_USER_STATS,
  activeSession: null,
  
  startSession: (gymId) => {
    const newSession: ClimbingSession = {
      id: `session-${Date.now()}`,
      userId: 'user-1',
      gymId,
      startedAt: new Date(),
      endedAt: null,
      durationMinutes: 0,
      isActive: true,
    };
    
    set({ activeSession: newSession });
  },
  
  endSession: () => {
    const { activeSession, sessions, stats } = get();
    if (!activeSession) return;
    
    const endedAt = new Date();
    const durationMinutes = Math.round(
      (endedAt.getTime() - activeSession.startedAt.getTime()) / 60000
    );
    
    const completedSession: ClimbingSession = {
      ...activeSession,
      endedAt,
      durationMinutes,
      isActive: false,
    };
    
    set({
      activeSession: null,
      sessions: [completedSession, ...sessions],
      stats: {
        ...stats,
        totalMinutes: stats.totalMinutes + durationMinutes,
        totalSessions: stats.totalSessions + 1,
        minutesThisWeek: stats.minutesThisWeek + durationMinutes,
        sessionsThisWeek: stats.sessionsThisWeek + 1,
      },
    });
  },
  
  addSession: (session) => {
    set((state) => ({
      sessions: [session, ...state.sessions],
    }));
  },

  logClimb: (climbData) => {
    const { activeSession, sessions } = get();
    const climb: LoggedClimb = {
      ...climbData,
      id: `climb-${Date.now()}`,
      loggedAt: new Date(),
    };

    // Add to active session if it matches
    if (activeSession && activeSession.id === climbData.sessionId) {
      set({
        activeSession: {
          ...activeSession,
          climbs: [...(activeSession.climbs ?? []), climb],
        },
      });
    }

    // Also update in sessions list (for ended sessions with summary)
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === climbData.sessionId
          ? { ...s, climbs: [...(s.climbs ?? []), climb] }
          : s,
      ),
    }));
  },
  
  getUserSessions: (userId) => {
    return get().sessions.filter((s) => s.userId === userId);
  },
  
  getRecentSessions: (limit = 10) => {
    return get()
      .sessions.filter((s) => s.userId === 'user-1')
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  },
}));
