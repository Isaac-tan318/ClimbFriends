// Supabase Edge Function: invite-friends

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

  const { plannedVisitId, friendIds = [] } = await req.json();

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

