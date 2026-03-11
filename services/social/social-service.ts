import { FEATURE_FLAGS } from '@/constants/feature-flags';
import { MOCK_FRIENDS } from '@/data/mock-users';
import { MOCK_PLANNED_VISITS } from '@/data/mock-plans';
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';
import type { Friend, FriendRequest, PlannedVisit, VisitInvite } from '@/types';

import { fromIso, fromIsoOrNow, toIso } from '@/services/api/date';
import { err, ok, type AppResult } from '@/services/api/result';

type DbProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

type DbLocation = {
  user_id: string;
  current_gym_id: string | null;
  last_seen_at: string | null;
  is_at_gym: boolean;
};

type DbFriendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
};

type DbPlannedVisit = {
  id: string;
  user_id: string;
  gym_id: string;
  planned_date: string;
  message: string | null;
  created_at: string;
};

type DbVisitInvite = {
  id: string;
  planned_visit_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string | null;
  responded_at: string | null;
};

const mapFriend = (profile: DbProfile, location?: DbLocation): Friend => ({
  id: profile.id,
  email: profile.email ?? '',
  displayName: profile.display_name ?? 'Climber',
  avatarUrl: profile.avatar_url ?? undefined,
  createdAt: fromIsoOrNow(profile.created_at),
  currentGymId: location?.current_gym_id ?? null,
  lastSeenAt: fromIso(location?.last_seen_at),
  isAtGym: location?.is_at_gym ?? false,
});

const mapInvite = (row: DbVisitInvite): VisitInvite => ({
  id: row.id,
  plannedVisitId: row.planned_visit_id,
  inviteeId: row.invitee_id,
  status: row.status,
});

const mapPlannedVisit = (row: DbPlannedVisit, invitees: VisitInvite[]): PlannedVisit => ({
  id: row.id,
  userId: row.user_id,
  gymId: row.gym_id,
  plannedDate: fromIsoOrNow(row.planned_date),
  message: row.message ?? undefined,
  createdAt: fromIsoOrNow(row.created_at),
  invitees,
});

export const socialService = {
  async listFriends(userId: string): Promise<AppResult<Friend[]>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSocial) {
      return ok(MOCK_FRIENDS);
    }

    const client = getSupabaseClient();
    const { data: relationships, error } = await client
      .from('friendships')
      .select('id,requester_id,addressee_id,status,created_at,updated_at')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (error) {
      return err(error.message, error.code, error);
    }

    const friendIds = (relationships as DbFriendship[])
      .map((relationship) =>
        relationship.requester_id === userId ? relationship.addressee_id : relationship.requester_id,
      )
      .filter(Boolean);

    if (friendIds.length === 0) {
      return ok([]);
    }

    const { data: profiles, error: profileError } = await client
      .from('profiles')
      .select('id,email,display_name,avatar_url,created_at')
      .in('id', friendIds);

    if (profileError) {
      return err(profileError.message, profileError.code, profileError);
    }

    const { data: locations, error: locationError } = await client
      .from('user_locations')
      .select('user_id,current_gym_id,last_seen_at,is_at_gym')
      .in('user_id', friendIds);

    if (locationError) {
      return err(locationError.message, locationError.code, locationError);
    }

    const locationMap = new Map<string, DbLocation>(
      ((locations ?? []) as DbLocation[]).map((location) => [location.user_id, location]),
    );

    return ok(
      ((profiles ?? []) as DbProfile[]).map((profile) =>
        mapFriend(profile, locationMap.get(profile.id)),
      ),
    );
  },

  async listFriendRequests(userId: string): Promise<AppResult<FriendRequest[]>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSocial) {
      return ok([]);
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('friendships')
      .select('id,requester_id,addressee_id,status,created_at,updated_at')
      .eq('status', 'pending')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      return err(error.message, error.code, error);
    }

    return ok(
      ((data ?? []) as DbFriendship[]).map((row) => ({
        id: row.id,
        requesterId: row.requester_id,
        addresseeId: row.addressee_id,
        status: row.status,
        createdAt: fromIsoOrNow(row.created_at),
      })),
    );
  },

  async sendFriendRequest(userId: string, targetUserId: string): Promise<AppResult<FriendRequest>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSocial) {
      return ok({
        id: `friendship-${Date.now()}`,
        requesterId: userId,
        addresseeId: targetUserId,
        status: 'pending',
        createdAt: new Date(),
      });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('friendships')
      .insert({
        requester_id: userId,
        addressee_id: targetUserId,
        status: 'pending',
      })
      .select('id,requester_id,addressee_id,status,created_at,updated_at')
      .single();

    if (error || !data) {
      return err(error?.message ?? 'Unable to send friend request', error?.code, error);
    }

    const row = data as DbFriendship;
    return ok({
      id: row.id,
      requesterId: row.requester_id,
      addresseeId: row.addressee_id,
      status: row.status,
      createdAt: fromIsoOrNow(row.created_at),
    });
  },

  async respondToFriendRequest(
    requestId: string,
    status: 'accepted' | 'rejected',
  ): Promise<AppResult<FriendRequest>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSocial) {
      return err('Mock friend request update not supported in fallback mode', 'NOT_SUPPORTED');
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('friendships')
      .update({ status })
      .eq('id', requestId)
      .select('id,requester_id,addressee_id,status,created_at,updated_at')
      .single();

    if (error || !data) {
      return err(error?.message ?? 'Unable to update friend request', error?.code, error);
    }

    const row = data as DbFriendship;
    return ok({
      id: row.id,
      requesterId: row.requester_id,
      addresseeId: row.addressee_id,
      status: row.status,
      createdAt: fromIsoOrNow(row.created_at),
    });
  },

  async listPlannedVisits(userId: string): Promise<AppResult<PlannedVisit[]>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSocial) {
      return ok(MOCK_PLANNED_VISITS);
    }

    const client = getSupabaseClient();

    const { data: ownedPlans, error: ownedError } = await client
      .from('planned_visits')
      .select('id,user_id,gym_id,planned_date,message,created_at')
      .eq('user_id', userId)
      .order('planned_date', { ascending: true });

    if (ownedError) {
      return err(ownedError.message, ownedError.code, ownedError);
    }

    const { data: invites, error: inviteError } = await client
      .from('visit_invites')
      .select('id,planned_visit_id,invitee_id,status,created_at,responded_at')
      .eq('invitee_id', userId)
      .order('created_at', { ascending: false });

    if (inviteError) {
      return err(inviteError.message, inviteError.code, inviteError);
    }

    const inviteRows = (invites ?? []) as DbVisitInvite[];
    const invitedPlanIds = Array.from(new Set(inviteRows.map((invite) => invite.planned_visit_id)));

    let invitedPlans: DbPlannedVisit[] = [];
    if (invitedPlanIds.length > 0) {
      const { data: invitedData, error: invitedError } = await client
        .from('planned_visits')
        .select('id,user_id,gym_id,planned_date,message,created_at')
        .in('id', invitedPlanIds);

      if (invitedError) {
        return err(invitedError.message, invitedError.code, invitedError);
      }

      invitedPlans = (invitedData ?? []) as DbPlannedVisit[];
    }

    const allPlans = [...(ownedPlans as DbPlannedVisit[]), ...invitedPlans];
    const uniquePlans = new Map<string, DbPlannedVisit>();
    for (const row of allPlans) uniquePlans.set(row.id, row);

    const planIds = Array.from(uniquePlans.keys());
    let allInvites: DbVisitInvite[] = inviteRows;

    if (planIds.length > 0) {
      const { data: planInvites, error: planInvitesError } = await client
        .from('visit_invites')
        .select('id,planned_visit_id,invitee_id,status,created_at,responded_at')
        .in('planned_visit_id', planIds);

      if (planInvitesError) {
        return err(planInvitesError.message, planInvitesError.code, planInvitesError);
      }

      allInvites = (planInvites ?? []) as DbVisitInvite[];
    }

    const inviteMap = new Map<string, VisitInvite[]>();
    for (const invite of allInvites) {
      const bucket = inviteMap.get(invite.planned_visit_id) ?? [];
      bucket.push(mapInvite(invite));
      inviteMap.set(invite.planned_visit_id, bucket);
    }

    const mapped = Array.from(uniquePlans.values())
      .map((plan) => mapPlannedVisit(plan, inviteMap.get(plan.id) ?? []))
      .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime());

    return ok(mapped);
  },

  async createPlannedVisit(input: {
    userId: string;
    gymId: string;
    plannedDate: Date;
    message?: string;
  }): Promise<AppResult<PlannedVisit>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSocial) {
      return ok({
        id: `plan-${Date.now()}`,
        userId: input.userId,
        gymId: input.gymId,
        plannedDate: input.plannedDate,
        message: input.message,
        createdAt: new Date(),
        invitees: [],
      });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('planned_visits')
      .insert({
        user_id: input.userId,
        gym_id: input.gymId,
        planned_date: toIso(input.plannedDate),
        message: input.message ?? null,
      })
      .select('id,user_id,gym_id,planned_date,message,created_at')
      .single();

    if (error || !data) {
      return err(error?.message ?? 'Unable to create plan', error?.code, error);
    }

    return ok(mapPlannedVisit(data as DbPlannedVisit, []));
  },

  async inviteFriends(input: {
    plannedVisitId: string;
    inviteeIds: string[];
  }): Promise<AppResult<VisitInvite[]>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSocial) {
      return ok(
        input.inviteeIds.map((inviteeId, index) => ({
          id: `invite-${Date.now()}-${index}`,
          plannedVisitId: input.plannedVisitId,
          inviteeId,
          status: 'pending',
        })),
      );
    }

    const client = getSupabaseClient();
    const payload = input.inviteeIds.map((inviteeId) => ({
      planned_visit_id: input.plannedVisitId,
      invitee_id: inviteeId,
      status: 'pending' as const,
    }));

    const { data, error } = await client
      .from('visit_invites')
      .upsert(payload, { onConflict: 'planned_visit_id,invitee_id' })
      .select('id,planned_visit_id,invitee_id,status,created_at,responded_at');

    if (error || !data) {
      return err(error?.message ?? 'Unable to invite friends', error?.code, error);
    }

    return ok((data as DbVisitInvite[]).map(mapInvite));
  },

  async respondToInvite(input: {
    plannedVisitId: string;
    inviteeId: string;
    status: 'accepted' | 'declined';
  }): Promise<AppResult<VisitInvite>> {
    if (!hasSupabaseConfig || !FEATURE_FLAGS.useSupabaseSocial) {
      return ok({
        id: `invite-${Date.now()}`,
        plannedVisitId: input.plannedVisitId,
        inviteeId: input.inviteeId,
        status: input.status,
      });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('visit_invites')
      .update({
        status: input.status,
        responded_at: toIso(new Date()),
      })
      .eq('planned_visit_id', input.plannedVisitId)
      .eq('invitee_id', input.inviteeId)
      .select('id,planned_visit_id,invitee_id,status,created_at,responded_at')
      .single();

    if (error || !data) {
      return err(error?.message ?? 'Unable to respond to invite', error?.code, error);
    }

    return ok(mapInvite(data as DbVisitInvite));
  },
};
