import { ClimbingSession, LeaderboardEntry, UserStats } from '@/types';
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
    userId: 'user-1',
    gymId: 'boulder-plus-aperia',
    startedAt: daysAgo(1, 18, 0),
    endedAt: sessionDuration(daysAgo(1, 18, 0), 90),
    durationMinutes: 90,
    isActive: false,
  },
  {
    id: 'session-2',
    userId: 'user-1',
    gymId: 'climb-central-kallang',
    startedAt: daysAgo(3, 19, 30),
    endedAt: sessionDuration(daysAgo(3, 19, 30), 120),
    durationMinutes: 120,
    isActive: false,
  },
  {
    id: 'session-3',
    userId: 'user-1',
    gymId: 'boulder-plus-chevrons',
    startedAt: daysAgo(5, 10, 0),
    endedAt: sessionDuration(daysAgo(5, 10, 0), 75),
    durationMinutes: 75,
    isActive: false,
  },
  {
    id: 'session-4',
    userId: 'user-1',
    gymId: 'fitbloc-depot',
    startedAt: daysAgo(8, 17, 0),
    endedAt: sessionDuration(daysAgo(8, 17, 0), 105),
    durationMinutes: 105,
    isActive: false,
  },
  {
    id: 'session-5',
    userId: 'user-1',
    gymId: 'boulder-plus-aperia',
    startedAt: daysAgo(12, 19, 0),
    endedAt: sessionDuration(daysAgo(12, 19, 0), 60),
    durationMinutes: 60,
    isActive: false,
  },
  // User 2 (Sarah) sessions
  {
    id: 'session-6',
    userId: 'user-2',
    gymId: 'climb-central-kallang',
    startedAt: daysAgo(1, 17, 0),
    endedAt: sessionDuration(daysAgo(1, 17, 0), 110),
    durationMinutes: 110,
    isActive: false,
  },
  {
    id: 'session-7',
    userId: 'user-2',
    gymId: 'boulder-planet-taiseng',
    startedAt: daysAgo(4, 18, 30),
    endedAt: sessionDuration(daysAgo(4, 18, 30), 95),
    durationMinutes: 95,
    isActive: false,
  },
  // User 3 (Mike) sessions
  {
    id: 'session-8',
    userId: 'user-3',
    gymId: 'climb-central-funan',
    startedAt: daysAgo(2, 20, 0),
    endedAt: sessionDuration(daysAgo(2, 20, 0), 80),
    durationMinutes: 80,
    isActive: false,
  },
  {
    id: 'session-9',
    userId: 'user-3',
    gymId: 'climb-central-kallang',
    startedAt: daysAgo(6, 18, 0),
    endedAt: sessionDuration(daysAgo(6, 18, 0), 130),
    durationMinutes: 130,
    isActive: false,
  },
  // User 4 (Jessica) sessions
  {
    id: 'session-10',
    userId: 'user-4',
    gymId: 'bff-climb-bendemeer',
    startedAt: daysAgo(1, 9, 0),
    endedAt: sessionDuration(daysAgo(1, 9, 0), 100),
    durationMinutes: 100,
    isActive: false,
  },
  // User 5 (Ryan) sessions
  {
    id: 'session-11',
    userId: 'user-5',
    gymId: 'lighthouse-climbing',
    startedAt: daysAgo(3, 16, 0),
    endedAt: sessionDuration(daysAgo(3, 16, 0), 85),
    durationMinutes: 85,
    isActive: false,
  },
  // More Alex sessions (older)
  {
    id: 'session-12',
    userId: 'user-1',
    gymId: 'climb-central-novena',
    startedAt: daysAgo(15, 18, 30),
    endedAt: sessionDuration(daysAgo(15, 18, 30), 95),
    durationMinutes: 95,
    isActive: false,
  },
  {
    id: 'session-13',
    userId: 'user-1',
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
  return MOCK_SESSIONS.filter((s) => s.userId === userId);
};

// MOCK_LEADERBOARD is the "Friends" leaderboard (current user + friends)
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
];

// National leaderboard — bigger pool, current user further down
export const MOCK_NATIONAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    userId: 'nat-1',
    user: { id: 'nat-1', email: 'wei@sg.com', displayName: 'Wei Jun Tan', createdAt: new Date('2024-01-10') },
    totalMinutes: 3200,
    totalSessions: 42,
    rank: 1,
  },
  {
    userId: 'nat-2',
    user: { id: 'nat-2', email: 'aish@sg.com', displayName: 'Aisha Rahman', createdAt: new Date('2024-02-15') },
    totalMinutes: 2950,
    totalSessions: 38,
    rank: 2,
  },
  {
    userId: 'nat-3',
    user: { id: 'nat-3', email: 'darren@sg.com', displayName: 'Darren Chua', createdAt: new Date('2024-03-01') },
    totalMinutes: 2680,
    totalSessions: 34,
    rank: 3,
  },
  {
    userId: 'nat-4',
    user: { id: 'nat-4', email: 'priya@sg.com', displayName: 'Priya Menon', createdAt: new Date('2024-01-20') },
    totalMinutes: 2400,
    totalSessions: 30,
    rank: 4,
  },
  {
    userId: 'nat-5',
    user: { id: 'nat-5', email: 'samlee@sg.com', displayName: 'Samuel Lee', createdAt: new Date('2024-04-05') },
    totalMinutes: 2150,
    totalSessions: 27,
    rank: 5,
  },
  {
    userId: 'user-4',
    user: MOCK_USERS[3],
    totalMinutes: 1450,
    totalSessions: 18,
    rank: 6,
  },
  {
    userId: 'nat-6',
    user: { id: 'nat-6', email: 'yixin@sg.com', displayName: 'Yi Xin Loh', createdAt: new Date('2024-05-12') },
    totalMinutes: 1380,
    totalSessions: 17,
    rank: 7,
  },
  {
    userId: 'user-3',
    user: MOCK_USERS[2],
    totalMinutes: 1280,
    totalSessions: 15,
    rank: 8,
  },
  {
    userId: 'nat-7',
    user: { id: 'nat-7', email: 'haziq@sg.com', displayName: 'Haziq Ismail', createdAt: new Date('2024-02-28') },
    totalMinutes: 1100,
    totalSessions: 14,
    rank: 9,
  },
  {
    userId: 'nat-8',
    user: { id: 'nat-8', email: 'claire@sg.com', displayName: 'Claire Goh', createdAt: new Date('2024-06-01') },
    totalMinutes: 920,
    totalSessions: 11,
    rank: 10,
  },
  {
    userId: 'nat-9',
    user: { id: 'nat-9', email: 'javier@sg.com', displayName: 'Javier Sim', createdAt: new Date('2024-03-15') },
    totalMinutes: 850,
    totalSessions: 10,
    rank: 11,
  },
  {
    userId: 'nat-10',
    user: { id: 'nat-10', email: 'nurul@sg.com', displayName: 'Nurul Amin', createdAt: new Date('2024-04-20') },
    totalMinutes: 780,
    totalSessions: 9,
    rank: 12,
  },
  {
    userId: 'user-1',
    user: MOCK_USERS[0],
    totalMinutes: 615,
    totalSessions: 7,
    rank: 13,
  },
  {
    userId: 'user-2',
    user: MOCK_USERS[1],
    totalMinutes: 580,
    totalSessions: 6,
    rank: 14,
  },
  {
    userId: 'user-5',
    user: MOCK_USERS[4],
    totalMinutes: 470,
    totalSessions: 5,
    rank: 15,
  },
];

export interface GymLeaderboardEntry {
  gymId: string;
  gymName: string;
  brand: string;
  totalMinutes: number;
  totalSessions: number;
  activeMembersCount: number;
  rank: number;
}

export const MOCK_GYM_LEADERBOARD: GymLeaderboardEntry[] = [
  { gymId: 'climb-central-kallang', gymName: 'Climb Central Kallang', brand: 'Climb Central', totalMinutes: 8400, totalSessions: 112, activeMembersCount: 48, rank: 1 },
  { gymId: 'boulder-plus-aperia', gymName: 'Boulder+ Aperia', brand: 'Boulder+', totalMinutes: 7200, totalSessions: 98, activeMembersCount: 42, rank: 2 },
  { gymId: 'bff-climb-bendemeer', gymName: 'BFF Climb Bendemeer', brand: 'BFF Climb', totalMinutes: 6100, totalSessions: 84, activeMembersCount: 36, rank: 3 },
  { gymId: 'boulder-planet-taiseng', gymName: 'Boulder Planet Tai Seng', brand: 'Boulder Planet', totalMinutes: 5500, totalSessions: 72, activeMembersCount: 31, rank: 4 },
  { gymId: 'fitbloc-depot', gymName: 'Fitbloc The Depot', brand: 'Fitbloc', totalMinutes: 4800, totalSessions: 65, activeMembersCount: 28, rank: 5 },
  { gymId: 'lighthouse-climbing', gymName: 'Lighthouse Climbing', brand: 'Lighthouse', totalMinutes: 4200, totalSessions: 58, activeMembersCount: 25, rank: 6 },
  { gymId: 'climb-central-funan', gymName: 'Climb Central Funan', brand: 'Climb Central', totalMinutes: 3800, totalSessions: 50, activeMembersCount: 22, rank: 7 },
  { gymId: 'boulder-plus-chevrons', gymName: 'Boulder+ The Chevrons', brand: 'Boulder+', totalMinutes: 3400, totalSessions: 44, activeMembersCount: 19, rank: 8 },
];
