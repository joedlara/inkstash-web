// supabase/functions/end-livestream/index.ts
//
// Authenticated. Host only. Marks the stream ended and removes the LiveKit room.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RoomServiceClient } from 'https://esm.sh/livekit-server-sdk@2?target=denonext'

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
    const livekitHttpUrl = livekitWsUrl.replace(/^wss?:/, 'https:')

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
      .select('id, host_user_id, livekit_room_name, status')
      .eq('id', body.livestream_id)
      .maybeSingle()
    if (!stream) return json({ error: 'stream_not_found' }, 404)
    const s = stream as { id: string; host_user_id: string; livekit_room_name: string; status: string }
    if (s.host_user_id !== user.id) return json({ error: 'not_host' }, 403)
    if (s.status === 'ended') return json({ status: 'already_ended' }, 200)

    // Close the LiveKit room. Best effort; failure shouldn't block the DB
    // status flip — viewers will get disconnected next time they reconnect.
    try {
      const roomSvc = new RoomServiceClient(livekitHttpUrl, livekitApiKey, livekitApiSecret)
      await roomSvc.deleteRoom(s.livekit_room_name)
    } catch (lkErr) {
      console.warn('[end-livestream] livekit deleteRoom failed (continuing)', lkErr)
    }

    await serviceClient
      .from('livestreams')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', s.id)

    return json({ status: 'ended' }, 200)
  } catch (err) {
    console.error('[end-livestream] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
