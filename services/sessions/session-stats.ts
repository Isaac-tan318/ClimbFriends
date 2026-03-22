import type { ClimbingSession, UserStats } from '@/types';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const STREAK_GRACE_DAYS = 7;

const startOfLocalDay = (value: Date): Date => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const differenceInDays = (later: Date, earlier: Date): number =>
  Math.floor((startOfLocalDay(later).getTime() - startOfLocalDay(earlier).getTime()) / MILLIS_PER_DAY);

const getUniqueSessionDays = (sessions: ClimbingSession[]): Date[] => {
  const seen = new Set<number>();

  return sessions
    .map((session) => startOfLocalDay(session.startedAt))
    .filter((day) => {
      const key = day.getTime();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((a, b) => a.getTime() - b.getTime());
};

type StreakMetrics = {
  currentStreak: number;
  longestStreak: number;
};

export const calculateSessionStreaks = (
  sessions: ClimbingSession[],
  referenceDate = new Date(),
): StreakMetrics => {
  const sessionDays = getUniqueSessionDays(sessions);
  if (sessionDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const today = startOfLocalDay(referenceDate);
  let runStart = sessionDays[0];
  let runEnd = sessionDays[0];
  let longestStreak = 1;

  for (let index = 1; index < sessionDays.length; index += 1) {
    const day = sessionDays[index];
    if (differenceInDays(day, runEnd) <= STREAK_GRACE_DAYS) {
      runEnd = day;
      longestStreak = Math.max(
        longestStreak,
        differenceInDays(runEnd, runStart) + 1,
      );
      continue;
    }

    runStart = day;
    runEnd = day;
  }

  const latestDay = sessionDays[sessionDays.length - 1];
  if (differenceInDays(today, latestDay) > STREAK_GRACE_DAYS) {
    return { currentStreak: 0, longestStreak };
  }

  let currentRunStart = latestDay;
  for (let index = sessionDays.length - 2; index >= 0; index -= 1) {
    const day = sessionDays[index];
    if (differenceInDays(currentRunStart, day) > STREAK_GRACE_DAYS) {
      break;
    }

    currentRunStart = day;
  }

  const currentStreak = differenceInDays(today, currentRunStart) + 1;
  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
  };
};

export const deriveUserStats = (
  sessions: ClimbingSession[],
  userId: string,
  referenceDate = new Date(),
): UserStats => {
  const mine = sessions.filter((session) => session.userId === userId && !session.isActive);
  const totalMinutes = mine.reduce((sum, session) => sum + session.durationMinutes, 0);

  const sevenDaysAgo = new Date(referenceDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sessionsThisWeek = mine.filter((session) => session.startedAt >= sevenDaysAgo);
  const minutesThisWeek = sessionsThisWeek.reduce((sum, session) => sum + session.durationMinutes, 0);

  const gymCounts = mine.reduce<Record<string, number>>((acc, session) => {
    acc[session.gymId] = (acc[session.gymId] ?? 0) + 1;
    return acc;
  }, {});

  const favoriteGymId = Object.entries(gymCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  const { currentStreak, longestStreak } = calculateSessionStreaks(mine, referenceDate);

  return {
    totalMinutes,
    totalSessions: mine.length,
    sessionsThisWeek: sessionsThisWeek.length,
    minutesThisWeek,
    favoriteGymId,
    currentStreak,
    longestStreak,
  };
};
