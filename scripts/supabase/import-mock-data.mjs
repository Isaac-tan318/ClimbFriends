#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error('Missing SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const mockUsers = [
  { legacyId: 'user-1', email: 'alex@climbfriend.sg', displayName: 'Isaac Tan' },
  { legacyId: 'user-2', email: 'sarah@climbfriend.sg', displayName: 'Sarah Tan' },
  { legacyId: 'user-3', email: 'mike@climbfriend.sg', displayName: 'Mike Lim' },
  { legacyId: 'user-4', email: 'jess@climbfriend.sg', displayName: 'Jessica Ng' },
  { legacyId: 'user-5', email: 'ryan@climbfriend.sg', displayName: 'Ryan Lee' },
];

const mockSessions = [
  { legacyId: 'session-1', userLegacyId: 'user-1', gymId: 'boulder-plus-aperia', startedAt: '2026-03-01T10:00:00.000Z', endedAt: '2026-03-01T11:30:00.000Z', durationMinutes: 90 },
  { legacyId: 'session-2', userLegacyId: 'user-1', gymId: 'climb-central-kallang', startedAt: '2026-03-03T11:30:00.000Z', endedAt: '2026-03-03T13:30:00.000Z', durationMinutes: 120 },
  { legacyId: 'session-3', userLegacyId: 'user-2', gymId: 'boulder-plus-aperia', startedAt: '2026-03-02T09:00:00.000Z', endedAt: '2026-03-02T10:35:00.000Z', durationMinutes: 95 },
  { legacyId: 'session-4', userLegacyId: 'user-3', gymId: 'boulder-planet-taiseng', startedAt: '2026-03-02T12:00:00.000Z', endedAt: '2026-03-02T14:00:00.000Z', durationMinutes: 120 },
  { legacyId: 'session-5', userLegacyId: 'user-4', gymId: 'bff-climb-bendemeer', startedAt: '2026-03-01T08:00:00.000Z', endedAt: '2026-03-01T09:40:00.000Z', durationMinutes: 100 },
];

const mockClimbs = [
  { sessionLegacyId: 'session-1', userLegacyId: 'user-1', gymId: 'boulder-plus-aperia', grade: 'Purple', color: 'Purple', wall: 'Slab', instagramUrl: 'https://instagram.com/reel/example1' },
  { sessionLegacyId: 'session-3', userLegacyId: 'user-2', gymId: 'boulder-plus-aperia', grade: 'Yellow', color: 'Yellow', wall: 'Overhang' },
  { sessionLegacyId: 'session-4', userLegacyId: 'user-3', gymId: 'boulder-planet-taiseng', grade: '9', color: 'Black', wall: 'Main Wall' },
  { sessionLegacyId: 'session-5', userLegacyId: 'user-4', gymId: 'bff-climb-bendemeer', grade: 'Red', color: 'Red', wall: 'Overhang' },
];

const mockPlans = [
  {
    legacyId: 'plan-1',
    userLegacyId: 'user-1',
    gymId: 'boulder-plus-aperia',
    plannedDate: '2026-03-15T10:00:00.000Z',
    message: 'Come climb with me right now!',
    invitees: [
      { userLegacyId: 'user-2', status: 'accepted' },
      { userLegacyId: 'user-3', status: 'pending' },
    ],
  },
];

const mockFeedPosts = [
  {
    type: 'session',
    userLegacyId: 'user-1',
    gymId: 'boulder-plus-aperia',
    postedAt: '2026-03-01T12:00:00.000Z',
    sessionLegacyId: 'session-1',
    sessionDurationMinutes: 90,
    climbCount: 1,
    description: 'Great session today!',
  },
  {
    type: 'send',
    userLegacyId: 'user-2',
    gymId: 'boulder-plus-aperia',
    postedAt: '2026-03-02T11:00:00.000Z',
    grade: 'Yellow',
    color: 'Yellow',
    wall: 'Overhang',
  },
];

const ensureUser = async (user) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: 'ChangeMe123!',
    email_confirm: true,
    user_metadata: { display_name: user.displayName },
  });

  if (data?.user?.id) return data.user.id;

  if (!error) throw new Error(`Failed to create user ${user.email}`);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  if (profileError || !profile?.id) {
    throw new Error(`Unable to resolve existing user for ${user.email}: ${error.message}`);
  }

  return profile.id;
};

const run = async () => {
  const idMap = new Map();

  for (const user of mockUsers) {
    const userId = await ensureUser(user);
    idMap.set(user.legacyId, userId);

    await supabase.from('profiles').upsert({
      id: userId,
      email: user.email,
      display_name: user.displayName,
    });

    await supabase.from('user_settings').upsert({
      user_id: userId,
      location_enabled: true,
      friend_visibility_enabled: true,
      notifications_enabled: true,
    });

    await supabase.from('user_locations').upsert({
      user_id: userId,
      current_gym_id: null,
      is_at_gym: false,
      last_seen_at: new Date().toISOString(),
    });
  }

  const sessionIdMap = new Map();

  for (const session of mockSessions) {
    const userId = idMap.get(session.userLegacyId);
    const { data, error } = await supabase
      .from('climbing_sessions')
      .insert({
        user_id: userId,
        gym_id: session.gymId,
        started_at: session.startedAt,
        ended_at: session.endedAt,
        duration_minutes: session.durationMinutes,
        is_active: false,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      console.warn(`Failed to insert session ${session.legacyId}:`, error?.message);
      continue;
    }

    sessionIdMap.set(session.legacyId, data.id);
  }

  for (const climb of mockClimbs) {
    const userId = idMap.get(climb.userLegacyId);
    const sessionId = sessionIdMap.get(climb.sessionLegacyId);
    if (!sessionId) continue;

    await supabase.from('logged_climbs').insert({
      session_id: sessionId,
      gym_id: climb.gymId,
      user_id: userId,
      grade: climb.grade,
      color: climb.color,
      wall: climb.wall,
      instagram_url: climb.instagramUrl ?? null,
    });
  }

  for (const plan of mockPlans) {
    const userId = idMap.get(plan.userLegacyId);
    const { data, error } = await supabase
      .from('planned_visits')
      .insert({
        user_id: userId,
        gym_id: plan.gymId,
        planned_date: plan.plannedDate,
        message: plan.message,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      console.warn(`Failed to insert plan ${plan.legacyId}:`, error?.message);
      continue;
    }

    const invites = plan.invitees.map((invitee) => ({
      planned_visit_id: data.id,
      invitee_id: idMap.get(invitee.userLegacyId),
      status: invitee.status,
    }));

    await supabase.from('visit_invites').upsert(invites, { onConflict: 'planned_visit_id,invitee_id' });
  }

  for (const post of mockFeedPosts) {
    const userId = idMap.get(post.userLegacyId);
    const sessionId = post.sessionLegacyId ? sessionIdMap.get(post.sessionLegacyId) : null;

    await supabase.from('feed_posts').insert({
      type: post.type,
      user_id: userId,
      gym_id: post.gymId,
      posted_at: post.postedAt,
      session_id: sessionId,
      session_duration_minutes: post.sessionDurationMinutes ?? null,
      climb_count: post.climbCount ?? null,
      grade: post.grade ?? null,
      color: post.color ?? null,
      wall: post.wall ?? null,
      description: post.description ?? null,
    });
  }

  console.log('Mock import complete.');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
