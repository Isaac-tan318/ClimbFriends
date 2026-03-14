// Supabase Edge Function: compute-leaderboards
// Useful for scheduled refresh if user ranking queries become materialized views.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SECRET_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // Current product rankings are friends, gym-user, and national.
  // If you switch to materialized views, call refresh here.
  // Example:
  // await supabase.rpc('refresh_materialized_leaderboards');

  const { data: national, error: nationalError } = await supabase
    .from('national_leaderboard')
    .select('user_id,total_minutes,total_sessions,rank')
    .limit(10);

  if (nationalError) {
    return new Response(JSON.stringify({ error: nationalError.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ national_preview: national ?? [] }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});

