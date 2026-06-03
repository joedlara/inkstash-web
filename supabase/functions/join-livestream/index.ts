// supabase/functions/join-livestream/index.ts
//
// Authenticated. Issues a LiveKit subscribe-only token for the given stream
// + returns the most recent 50 chat messages so the viewer hydrates state
// without waiting for new realtime events.
//
// Request body: { livestream_id: string }
// Response: { livekit_token, livekit_ws_url, livekit_room_name, recent_chat, is_banned }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2?target=denonext'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // @ts-expect-error Deno env
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    // @ts-expect-error Deno env
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY')!
    // @ts-expect-error Deno env
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET')!
    // @ts-expect-error Deno env
    const livekitWsUrl = Deno.env.get('LIVEKIT_URL')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    if (!body.livestream_id) return json({ error: 'livestream_id_required' }, 400)

    const { data: stream } = await serviceClient
      .from('livestreams')
      .select('id, livekit_room_name, status')
      .eq('id', body.livestream_id)
      .maybeSingle()
    if (!stream) return json({ error: 'stream_not_found' }, 404)
    if ((stream as { status: string }).status !== 'live') {
      return json({ error: 'stream_not_live' }, 400)
    }

    // Block banned viewers from chatting (they can still watch video).
    const { data: ban } = await serviceClient
      .from('livestream_bans')
      .select('user_id')
      .eq('livestream_id', (stream as { id: string }).id)
      .eq('user_id', user.id)
      .maybeSingle()
    const isBanned = !!ban

    const { data: recentChat } = await serviceClient
      .from('livestream_chat')
      .select('id, user_id, body, is_mod_action, created_at')
      .eq('livestream_id', (stream as { id: string }).id)
      .order('created_at', { ascending: false })
      .limit(50)

    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: user.id,
      ttl: 4 * 60 * 60,
    })
    token.addGrant({
      room: (stream as { livekit_room_name: string }).livekit_room_name,
      roomJoin: true,
      canSubscribe: true,
      canPublishData: !isBanned, // banned viewers can't send data-channel messages
    })

    return json({
      livekit_token: await token.toJwt(),
      livekit_ws_url: livekitWsUrl,
      livekit_room_name: (stream as { livekit_room_name: string }).livekit_room_name,
      recent_chat: (recentChat ?? []).reverse(), // oldest-first for UI
      is_banned: isBanned,
    }, 200)
  } catch (err) {
    console.error('[join-livestream] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
