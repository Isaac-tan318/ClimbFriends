// Supabase Edge Function: send-push-notification

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { pushToken, title, body, data } = await req.json();

  if (!pushToken || !title) {
    return new Response(JSON.stringify({ error: 'pushToken and title are required' }), { status: 400 });
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
    },
    body: JSON.stringify({
      to: pushToken,
      title,
      body,
      data,
      sound: 'default',
    }),
  });

  const payload = await response.json();

  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    status: response.ok ? 200 : 400,
  });
});
