import { ClimbingSession, UserStats, LeaderboardEntry } from '@/types';
import { MOCK_USERS } from './mock-users';

// Helper to create dates in the past
const daysAgo = (days: number, hours = 0, minutes = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const sessionDuration = (startedAt: Date, durationMinutes: number): Date => {
  return new Date(startedAt.getTime() + durationMinutes * 60000);
};

export const MOCK_SESSIONS: ClimbingSession[] = [
  // User 1 (Alex) sessions
  {
    id: 'session-1',
    oderId: 'user-1',
    gymId: 'boulder-plus-aperia',
    startedAt: daysAgo(1, 18, 0),
    endedAt: sessionDuration(daysAgo(1, 18, 0), 90),
    durationMinutes: 90,
    isActive: false,
  },
  {
    id: 'session-2',
    oderId: 'user-1',
    gymId: 'climb-central-kallang',
    startedAt: daysAgo(3, 19, 30),
    endedAt: sessionDuration(daysAgo(3, 19, 30), 120),
    durationMinutes: 120,
    isActive: false,
  },
  {
    id: 'session-3',
    oderId: 'user-1',
    gymId: 'boulder-plus-bukit-timah',
    startedAt: daysAgo(5, 10, 0),
    endedAt: sessionDuration(daysAgo(5, 10, 0), 75),
    durationMinutes: 75,
    isActive: false,
  },
  {
    id: 'session-4',
    oderId: 'user-1',
    gymId: 'fitbloc-kent-ridge',
    startedAt: daysAgo(8, 17, 0),
    endedAt: sessionDuration(daysAgo(8, 17, 0), 105),
    durationMinutes: 105,
    isActive: false,
  },
  {
    id: 'session-5',
    oderId: 'user-1',
    gymId: 'boulder-plus-aperia',
    startedAt: daysAgo(12, 19, 0),
    endedAt: sessionDuration(daysAgo(12, 19, 0), 60),
    durationMinutes: 60,
    isActive: false,
  },
  // User 2 (Sarah) sessions
  {
    id: 'session-6',
    oderId: 'user-2',
    gymId: 'climb-central-kallang',
    startedAt: daysAgo(1, 17, 0),
    endedAt: sessionDuration(daysAgo(1, 17, 0), 110),
    durationMinutes: 110,
    isActive: false,
  },
  {
    id: 'session-7',
    oderId: 'user-2',
    gymId: 'boulder-planet-tai-seng',
    startedAt: daysAgo(4, 18, 30),
    endedAt: sessionDuration(daysAgo(4, 18, 30), 95),
    durationMinutes: 95,
    isActive: false,
  },
  // User 3 (Mike) sessions
  {
    id: 'session-8',
    oderId: 'user-3',
    gymId: 'climb-central-funan',
    startedAt: daysAgo(2, 20, 0),
    endedAt: sessionDuration(daysAgo(2, 20, 0), 80),
    durationMinutes: 80,
    isActive: false,
  },
  {
    id: 'session-9',
    oderId: 'user-3',
    gymId: 'climb-central-kallang',
    startedAt: daysAgo(6, 18, 0),
    endedAt: sessionDuration(daysAgo(6, 18, 0), 130),
    durationMinutes: 130,
    isActive: false,
  },
  // User 4 (Jessica) sessions
  {
    id: 'session-10',
    oderId: 'user-4',
    gymId: 'bff-climb-bukit-timah',
    startedAt: daysAgo(1, 9, 0),
    endedAt: sessionDuration(daysAgo(1, 9, 0), 100),
    durationMinutes: 100,
    isActive: false,
  },
  // User 5 (Ryan) sessions
  {
    id: 'session-11',
    oderId: 'user-5',
    gymId: 'lighthouse-climbing',
    startedAt: daysAgo(3, 16, 0),
    endedAt: sessionDuration(daysAgo(3, 16, 0), 85),
    durationMinutes: 85,
    isActive: false,
  },
  // More Alex sessions (older)
  {
    id: 'session-12',
    oderId: 'user-1',
    gymId: 'climb-central-novena',
    startedAt: daysAgo(15, 18, 30),
    endedAt: sessionDuration(daysAgo(15, 18, 30), 95),
    durationMinutes: 95,
    isActive: false,
  },
  {
    id: 'session-13',
    oderId: 'user-1',
    gymId: 'boulder-planet-sembawang',
    startedAt: daysAgo(20, 11, 0),
    endedAt: sessionDuration(daysAgo(20, 11, 0), 70),
    durationMinutes: 70,
    isActive: false,
  },
];

export const CURRENT_USER_STATS: UserStats = {
  totalMinutes: 615, // sum of user-1 sessions
  totalSessions: 7,
  sessionsThisWeek: 2,
  minutesThisWeek: 210,
  favoriteGymId: 'boulder-plus-aperia',
  currentStreak: 3,
  longestStreak: 5,
};

export const getUserSessions = (userId: string): ClimbingSession[] => {
  return MOCK_SESSIONS.filter((s) => s.oderId === userId);
};

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    userId: 'user-4',
    user: MOCK_USERS[3],
    totalMinutes: 1450,
    totalSessions: 18,
    rank: 1,
  },
  {
    userId: 'user-3',
    user: MOCK_USERS[2],
    totalMinutes: 1280,
    totalSessions: 15,
    rank: 2,
  },
  {
    userId: 'user-1',
    user: MOCK_USERS[0],
    totalMinutes: 615,
    totalSessions: 7,
    rank: 3,
  },
  {
    userId: 'user-2',
    user: MOCK_USERS[1],
    totalMinutes: 580,
    totalSessions: 6,
    rank: 4,
  },
  {
    userId: 'user-5',
    user: MOCK_USERS[4],
    totalMinutes: 470,
    totalSessions: 5,
    rank: 5,
  },
  {
    userId: 'user-6',
    user: MOCK_USERS[5],
    totalMinutes: 390,
    totalSessions: 4,
    rank: 6,
  },
  {
    userId: 'user-7',
    user: MOCK_USERS[6],
    totalMinutes: 310,
    totalSessions: 3,
    rank: 7,
  },
  {
    userId: 'user-8',
    user: MOCK_USERS[7],
    totalMinutes: 180,
    totalSessions: 2,
    rank: 8,
  },
];
