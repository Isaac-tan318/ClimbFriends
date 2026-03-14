// Supabase Edge Function: invite-friends

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SECRET_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    },
  );

  const { plannedVisitId, friendIds = [] } = await req.json();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data: plan, error: planError } = await supabase
    .from('planned_visits')
    .select('id,user_id')
    .eq('id', plannedVisitId)
    .maybeSingle();

  if (planError || !plan) {
    return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404 });
  }

  if (plan.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'You do not own this planned visit' }), { status: 403 });
  }

  const rows = friendIds.map((friendId) => ({
    planned_visit_id: plannedVisitId,
    invitee_id: friendId,
    status: 'pending',
  }));

  const { data, error } = await supabase
    .from('visit_invites')
    .upsert(rows, { onConflict: 'planned_visit_id,invitee_id' })
    .select('*');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ invites: data ?? [] }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});

