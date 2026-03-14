import { create } from 'zustand';

import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { MOCK_FRIENDS } from '@/data/mock-users';
import { MOCK_PLANNED_VISITS } from '@/data/mock-plans';
import { hasSupabaseConfig } from '@/lib/supabase';
import type { Friend, FriendRequest, PlannedVisit, User } from '@/types';
import { getCurrentUserId } from '@/services/auth/current-user';
import { err, ok, type AppResult } from '@/services/api/result';
import { realtimeService } from '@/services/realtime/realtime-service';
import { socialService } from '@/services/social/social-service';

type SyncState = {
  loading: boolean;
  initialized: boolean;
  source: 'mock' | 'supabase';
  error: string | null;
};

interface SocialState {
  friends: Friend[];
  plannedVisits: PlannedVisit[];
  friendRequests: FriendRequest[];
  searchResults: User[];
  sync: SyncState;

  initialize: () => Promise<AppResult<void>>;

  addFriend: (friend: Friend) => Promise<AppResult<Friend>>;
  searchUsers: (query: string) => Promise<AppResult<User[]>>;
  sendFriendRequest: (targetUserId: string) => Promise<AppResult<FriendRequest>>;
  respondToFriendRequest: (requestId: string, status: 'accepted' | 'rejected') => Promise<AppResult<FriendRequest>>;
  removeFriend: (friendId: string) => Promise<AppResult<void>>;
  getFriendsAtGym: () => Friend[];
  getFriendById: (id: string) => Friend | undefined;

  createPlannedVisit: (gymId: string, date: Date, message?: string) => Promise<AppResult<PlannedVisit>>;
  inviteFriend: (visitId: string, friendId: string) => Promise<AppResult<void>>;
  respondToInvite: (visitId: string, status: 'accepted' | 'declined') => Promise<AppResult<void>>;
  getUpcomingPlans: () => PlannedVisit[];
  resetForSignedOut: () => void;
}

const DEFAULT_USER_ID = 'user-1';
const useMockSocial = !hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSocial;

let presenceUnsubscribe: (() => void) | null = null;

const resolveUserId = async (): Promise<string | null> => {
  const userId = await getCurrentUserId();
  if (userId) return userId;
  return useMockSocial ? DEFAULT_USER_ID : null;
};

export const useSocialStore = create<SocialState>((set, get) => ({
  friends: useMockSocial ? MOCK_FRIENDS : [],
  plannedVisits: useMockSocial ? MOCK_PLANNED_VISITS : [],
  friendRequests: [],
  searchResults: [],
  sync: {
    loading: false,
    initialized: false,
    source: useMockSocial ? 'mock' : 'supabase',
    error: null,
  },

  initialize: async () => {
    set((state) => ({ sync: { ...state.sync, loading: true, initialized: true, error: null } }));

    const userId = await resolveUserId();
    if (!userId) {
      if (presenceUnsubscribe) {
        presenceUnsubscribe();
        presenceUnsubscribe = null;
      }
      set({
        friends: [],
        plannedVisits: [],
        friendRequests: [],
        searchResults: [],
        sync: {
          loading: false,
          initialized: true,
          source: 'supabase',
          error: null,
        },
      });
      return ok(undefined);
    }

    const [friendsResult, plansResult, requestsResult] = await Promise.all([
      socialService.listFriends(userId),
      socialService.listPlannedVisits(userId),
      socialService.listFriendRequests(userId),
    ]);

    if (!friendsResult.ok || !plansResult.ok || !requestsResult.ok) {
      const message = !friendsResult.ok
        ? friendsResult.error.message
        : plansResult.ok
          ? (requestsResult.ok ? 'Unknown social sync error' : requestsResult.error.message)
          : plansResult.error.message;

      set((state) => ({
        sync: {
          ...state.sync,
          loading: false,
          error: message,
        },
      }));

      return err(message);
    }

    set({
      friends: friendsResult.data,
      plannedVisits: plansResult.data,
      friendRequests: requestsResult.data,
      searchResults: [],
      sync: {
        loading: false,
        initialized: true,
        source: useMockSocial ? 'mock' : 'supabase',
        error: null,
      },
    });

    if (presenceUnsubscribe) {
      presenceUnsubscribe();
      presenceUnsubscribe = null;
    }

    if (!useMockSocial) {
      presenceUnsubscribe = realtimeService.subscribeToPresence((presence) => {
        set((state) => ({
          friends: state.friends.map((friend) =>
            friend.id === presence.userId
              ? {
                  ...friend,
                  currentGymId: presence.currentGymId,
                  isAtGym: presence.isAtGym,
                  lastSeenAt: presence.lastSeenAt,
                }
              : friend,
          ),
        }));
      });
    }

    return ok(undefined);
  },

  addFriend: async (friend) => {
    const requestResult = await get().sendFriendRequest(friend.id);
    if (!requestResult.ok) {
      return err(requestResult.error.message, requestResult.error.code, requestResult.error.details);
    }
    return ok(friend);
  },

  searchUsers: async (query) => {
    const userId = await resolveUserId();
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    if (!query.trim()) {
      set({ searchResults: [] });
      return ok([]);
    }

    const result = await socialService.searchUsers(userId, query, 20);
    if (!result.ok) {
      set((state) => ({ sync: { ...state.sync, error: result.error.message } }));
      return err(result.error.message, result.error.code, result.error.details);
    }

    set({ searchResults: result.data });
    return ok(result.data);
  },

  sendFriendRequest: async (targetUserId) => {
    const userId = await resolveUserId();
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const result = await socialService.sendFriendRequest(userId, targetUserId);
    if (!result.ok) {
      set((state) => ({ sync: { ...state.sync, error: result.error.message } }));
      return err(result.error.message, result.error.code, result.error.details);
    }

    set((state) => ({
      friendRequests: [result.data, ...state.friendRequests.filter((request) => request.id !== result.data.id)],
      searchResults: state.searchResults.filter((candidate) => candidate.id !== targetUserId),
      sync: {
        ...state.sync,
        source: useMockSocial ? 'mock' : 'supabase',
        error: null,
      },
    }));

    return ok(result.data);
  },

  respondToFriendRequest: async (requestId, status) => {
    const userId = await resolveUserId();
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const result = await socialService.respondToFriendRequest(requestId, status, userId);
    if (!result.ok) {
      set((state) => ({ sync: { ...state.sync, error: result.error.message } }));
      return err(result.error.message, result.error.code, result.error.details);
    }
    if (userId) {
      void get().initialize();
    }

    return ok(result.data);
  },

  removeFriend: async (friendId) => {
    const userId = await resolveUserId();
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const result = await socialService.removeFriend(userId, friendId);
    if (!result.ok) {
      set((state) => ({ sync: { ...state.sync, error: result.error.message } }));
      return err(result.error.message, result.error.code, result.error.details);
    }

    set((state) => ({
      friends: state.friends.filter((friend) => friend.id !== friendId),
      sync: {
        ...state.sync,
        source: useMockSocial ? 'mock' : 'supabase',
        error: null,
      },
    }));

    return ok(undefined);
  },

  getFriendsAtGym: () => {
    return get().friends.filter((friend) => friend.isAtGym && Boolean(friend.currentGymId));
  },

  getFriendById: (id) => {
    return get().friends.find((friend) => friend.id === id);
  },

  createPlannedVisit: async (gymId, date, message) => {
    const userId = await resolveUserId();
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    set((state) => ({ sync: { ...state.sync, loading: true, error: null } }));

    const result = await socialService.createPlannedVisit({
      userId,
      gymId,
      plannedDate: date,
      message,
    });

    if (!result.ok) {
      set((state) => ({ sync: { ...state.sync, loading: false, error: result.error.message } }));
      return err(result.error.message, result.error.code, result.error.details);
    }

    set((state) => ({
      plannedVisits: [...state.plannedVisits, result.data],
      sync: {
        ...state.sync,
        loading: false,
        source: useMockSocial ? 'mock' : 'supabase',
      },
    }));

    return ok(result.data);
  },

  inviteFriend: async (visitId, friendId) => {
    const result = await socialService.inviteFriends({
      plannedVisitId: visitId,
      inviteeIds: [friendId],
    });

    if (!result.ok) {
      set((state) => ({ sync: { ...state.sync, error: result.error.message } }));
      return err(result.error.message, result.error.code, result.error.details);
    }

    set((state) => ({
      plannedVisits: state.plannedVisits.map((plan) =>
        plan.id === visitId
          ? { ...plan, invitees: [...plan.invitees, ...result.data] }
          : plan,
      ),
    }));

    return ok(undefined);
  },

  respondToInvite: async (visitId, status) => {
    const userId = await resolveUserId();
    if (!userId) {
      return err('Not authenticated', 'NOT_AUTHENTICATED');
    }

    const result = await socialService.respondToInvite({
      plannedVisitId: visitId,
      inviteeId: userId,
      status,
    });

    if (!result.ok) {
      set((state) => ({ sync: { ...state.sync, error: result.error.message } }));
      return err(result.error.message, result.error.code, result.error.details);
    }

    set((state) => ({
      plannedVisits: state.plannedVisits.map((plan) =>
        plan.id === visitId
          ? {
              ...plan,
              invitees: plan.invitees.map((invite) =>
                invite.inviteeId === userId ? { ...invite, status } : invite,
              ),
            }
          : plan,
      ),
    }));

    return ok(undefined);
  },

  getUpcomingPlans: () => {
    const now = new Date();
    return get()
      .plannedVisits.filter((plan) => plan.plannedDate > now)
      .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime());
  },

  resetForSignedOut: () => {
    if (presenceUnsubscribe) {
      presenceUnsubscribe();
      presenceUnsubscribe = null;
    }

    set({
      friends: [],
      plannedVisits: [],
      friendRequests: [],
      searchResults: [],
      sync: {
        loading: false,
        initialized: true,
        source: 'supabase',
        error: null,
      },
    });
  },
}));
