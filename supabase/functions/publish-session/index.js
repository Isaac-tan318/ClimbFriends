// Supabase Edge Function: publish-session
// Deploy path: supabase/functions/publish-session/index.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SECRET_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    },
  );

  const body = await req.json();
  const {
    userId,
    sessionId,
    gymId,
    sessionDurationMinutes,
    climbCount,
    description,
    climbedWithUserIds = [],
  } = body;

  const { data: post, error } = await supabase
    .from('feed_posts')
    .insert({
      type: 'session',
      user_id: userId,
      gym_id: gymId,
      session_id: sessionId,
      session_duration_minutes: sessionDurationMinutes,
      climb_count: climbCount,
      description: description ?? null,
    })
    .select('*')
    .single();

  if (error || !post) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Unable to publish post' }), { status: 400 });
  }

  if (Array.isArray(climbedWithUserIds) && climbedWithUserIds.length > 0) {
    const rows = climbedWithUserIds.map((id) => ({ feed_post_id: post.id, user_id: id }));
    await supabase.from('feed_post_climbed_with').upsert(rows, { onConflict: 'feed_post_id,user_id' });
  }

  return new Response(JSON.stringify({ post }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});

