import { create } from 'zustand';

import { MOCK_FRIENDS } from '@/data/mock-users';
import { MOCK_PLANNED_VISITS } from '@/data/mock-plans';
import type { Friend, PlannedVisit } from '@/types';
import { getCurrentUserId } from '@/services/auth/current-user';
import { err, ok, type AppResult } from '@/services/api/result';
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
  sync: SyncState;

  initialize: () => Promise<AppResult<void>>;

  addFriend: (friend: Friend) => Promise<AppResult<Friend>>;
  removeFriend: (friendId: string) => Promise<AppResult<void>>;
  getFriendsAtGym: () => Friend[];
  getFriendById: (id: string) => Friend | undefined;

  createPlannedVisit: (gymId: string, date: Date, message?: string) => Promise<AppResult<PlannedVisit>>;
  inviteFriend: (visitId: string, friendId: string) => Promise<AppResult<void>>;
  respondToInvite: (visitId: string, status: 'accepted' | 'declined') => Promise<AppResult<void>>;
  getUpcomingPlans: () => PlannedVisit[];
}

const DEFAULT_USER_ID = 'user-1';

const resolveUserId = async () => (await getCurrentUserId()) ?? DEFAULT_USER_ID;

export const useSocialStore = create<SocialState>((set, get) => ({
  friends: MOCK_FRIENDS,
  plannedVisits: MOCK_PLANNED_VISITS,
  sync: {
    loading: false,
    initialized: false,
    source: 'mock',
    error: null,
  },

  initialize: async () => {
    set((state) => ({ sync: { ...state.sync, loading: true, initialized: true, error: null } }));

    const userId = await resolveUserId();
    const [friendsResult, plansResult] = await Promise.all([
      socialService.listFriends(userId),
      socialService.listPlannedVisits(userId),
    ]);

    if (!friendsResult.ok || !plansResult.ok) {
      const message = !friendsResult.ok
        ? friendsResult.error.message
        : plansResult.ok
          ? 'Unknown social sync error'
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
      sync: {
        loading: false,
        initialized: true,
        source: userId === DEFAULT_USER_ID ? 'mock' : 'supabase',
        error: null,
      },
    });

    return ok(undefined);
  },

  addFriend: async (friend) => {
    const userId = await resolveUserId();
    set((state) => ({
      friends: [...state.friends, friend],
      sync: {
        ...state.sync,
        source: userId === DEFAULT_USER_ID ? 'mock' : 'supabase',
      },
    }));

    if (userId !== DEFAULT_USER_ID) {
      const requestResult = await socialService.sendFriendRequest(userId, friend.id);
      if (!requestResult.ok) {
        set((state) => ({ sync: { ...state.sync, error: requestResult.error.message } }));
        return err(requestResult.error.message, requestResult.error.code, requestResult.error.details);
      }
    }

    return ok(friend);
  },

  removeFriend: async (friendId) => {
    set((state) => ({
      friends: state.friends.filter((friend) => friend.id !== friendId),
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
        source: userId === DEFAULT_USER_ID ? 'mock' : 'supabase',
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
}));
