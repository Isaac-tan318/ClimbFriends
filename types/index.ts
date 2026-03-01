// Core type definitions for ClimbFriend

export interface Gym {
  id: string;
  name: string;
  brand: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  address: string;
  imageUrl?: string;
}

export interface ClimbingSession {
  id: string;
  oderId: string;
  gymId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface UserSettings {
  userId: string;
  locationEnabled: boolean;
  friendVisibilityEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface Friend extends User {
  currentGymId: string | null;
  lastSeenAt: Date | null;
  isAtGym: boolean;
}

export interface PlannedVisit {
  id: string;
  userId: string;
  gymId: string;
  plannedDate: Date;
  createdAt: Date;
  invitees: VisitInvite[];
}

export interface VisitInvite {
  id: string;
  plannedVisitId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface LeaderboardEntry {
  userId: string;
  user: User;
  totalMinutes: number;
  totalSessions: number;
  rank: number;
}

export interface UserStats {
  totalMinutes: number;
  totalSessions: number;
  sessionsThisWeek: number;
  minutesThisWeek: number;
  favoriteGymId: string | null;
  currentStreak: number;
  longestStreak: number;
}
