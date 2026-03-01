import { create } from 'zustand';
import { Friend, PlannedVisit } from '@/types';
import { MOCK_FRIENDS, MOCK_PLANNED_VISITS } from '@/data';

interface SocialState {
  friends: Friend[];
  plannedVisits: PlannedVisit[];
  
  // Friend actions
  addFriend: (friend: Friend) => void;
  removeFriend: (friendId: string) => void;
  getFriendsAtGym: () => Friend[];
  getFriendById: (id: string) => Friend | undefined;
  
  // Planning actions
  createPlannedVisit: (gymId: string, date: Date) => PlannedVisit;
  inviteFriend: (visitId: string, friendId: string) => void;
  respondToInvite: (visitId: string, status: 'accepted' | 'declined') => void;
  getUpcomingPlans: () => PlannedVisit[];
}

export const useSocialStore = create<SocialState>((set, get) => ({
  friends: MOCK_FRIENDS,
  plannedVisits: MOCK_PLANNED_VISITS,
  
  addFriend: (friend) => {
    set((state) => ({
      friends: [...state.friends, friend],
    }));
  },
  
  removeFriend: (friendId) => {
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== friendId),
    }));
  },
  
  getFriendsAtGym: () => {
    return get().friends.filter((f) => f.isAtGym && f.currentGymId);
  },
  
  getFriendById: (id) => {
    return get().friends.find((f) => f.id === id);
  },
  
  createPlannedVisit: (gymId, date) => {
    const newPlan: PlannedVisit = {
      id: `plan-${Date.now()}`,
      userId: 'user-1',
      gymId,
      plannedDate: date,
      createdAt: new Date(),
      invitees: [],
    };
    
    set((state) => ({
      plannedVisits: [...state.plannedVisits, newPlan],
    }));
    
    return newPlan;
  },
  
  inviteFriend: (visitId, friendId) => {
    set((state) => ({
      plannedVisits: state.plannedVisits.map((plan) =>
        plan.id === visitId
          ? {
              ...plan,
              invitees: [
                ...plan.invitees,
                {
                  id: `invite-${Date.now()}`,
                  plannedVisitId: visitId,
                  inviteeId: friendId,
                  status: 'pending' as const,
                },
              ],
            }
          : plan
      ),
    }));
  },
  
  respondToInvite: (visitId, status) => {
    set((state) => ({
      plannedVisits: state.plannedVisits.map((plan) =>
        plan.id === visitId
          ? {
              ...plan,
              invitees: plan.invitees.map((invite) =>
                invite.inviteeId === 'user-1' ? { ...invite, status } : invite
              ),
            }
          : plan
      ),
    }));
  },
  
  getUpcomingPlans: () => {
    const now = new Date();
    return get()
      .plannedVisits.filter((p) => p.plannedDate > now)
      .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime());
  },
}));
