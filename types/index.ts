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
  grades?: string[];
  walls?: string[];
}

export interface LoggedClimb {
  id: string;
  sessionId: string;
  gymId: string;
  grade: string;
  color: string;
  wall: string;
  instagramUrl: string;
  loggedAt: Date;
}

export interface ClimbingSession {
  id: string;
  userId: string;
  gymId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number;
  isActive: boolean;
  climbs?: LoggedClimb[];
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
  updatedAt?: Date;
}

export interface FriendRequest {
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

export interface UserPresence {
  userId: string;
  currentGymId: string | null;
  isAtGym: boolean;
  lastSeenAt: Date | null;
  latitude?: number;
  longitude?: number;
  updatedAt: Date;
}

export interface PlannedVisit {
  id: string;
  userId: string;
  gymId: string;
  plannedDate: Date;
  message?: string;
  createdAt: Date;
  invitees: VisitInvite[];
}

export interface VisitInvite {
  id: string;
  plannedVisitId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: Date;
  respondedAt?: Date | null;
}

export interface LeaderboardEntry {
  userId: string;
  user: User;
  totalMinutes: number;
  totalSessions: number;
  rank: number;
}

export interface GymLeaderboardEntry {
  gymId: string;
  gymName: string;
  brand: string;
  totalMinutes: number;
  totalSessions: number;
  activeMembersCount: number;
  rank: number;
}

export interface BetaPost {
  id: string;
  type: 'session' | 'send';
  userId: string;
  userName: string;
  gymId: string;
  postedAt: Date;
  sessionId?: string;
  sessionDurationMinutes?: number;
  climbCount?: number;
  climbedWithNames?: string[];
  grade?: string;
  color?: string;
  wall?: string;
  instagramUrl?: string;
  description?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  readAt: Date | null;
  createdAt: Date;
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
