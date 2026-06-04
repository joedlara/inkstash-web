// supabase/functions/pair-livestream/index.ts
//
// UNAUTHENTICATED on purpose — the pair token IS the auth here. The
// phone scans the QR from the composer, posts { livestream_id, pair_token }
// from any browser (signed in or not), and gets back a host LiveKit
// token so it can publish the camera. The token is invalidated on
// go-live-livestream so the same QR can't be reused.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2?target=denonext'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  livestream_id?: string
  pair_token?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // @ts-expect-error Deno env
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY')!
    // @ts-expect-error Deno env
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET')!
    // @ts-expect-error Deno env
    const livekitWsUrl = Deno.env.get('LIVEKIT_URL')!

    const service = createClient(supabaseUrl, serviceRoleKey)

    const body: RequestBody = await req.json()
    const livestreamId = (body.livestream_id ?? '').trim()
    const pairToken = (body.pair_token ?? '').trim()
    if (!livestreamId || !pairToken) {
      return json({ error: 'missing_fields' }, 400)
    }

    // Look up the row. Both id and pair_token must match exactly, and
    // status must still be 'preparing' (post-goLive the token is nulled).
    const { data: stream, error } = await service
      .from('livestreams')
      .select('id, host_user_id, livekit_room_name, status, pair_token')
      .eq('id', livestreamId)
      .maybeSingle()
    if (error || !stream) return json({ error: 'not_found' }, 404)
    const row = stream as {
      id: string
      host_user_id: string
      livekit_room_name: string
      status: string
      pair_token: string | null
    }
    if (row.status !== 'preparing') return json({ error: 'not_preparing' }, 409)
    if (!row.pair_token || row.pair_token !== pairToken) {
      return json({ error: 'invalid_pair_token' }, 403)
    }

    // Mint a publish token scoped to this room. Identity carries the host
    // user id + a random suffix so a refresh / accidental double-tap on
    // the phone doesn't trip DUPLICATE_IDENTITY.
    const identity = `${row.host_user_id}#phone-${crypto.randomUUID().slice(0, 8)}`
    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity,
      name: 'host-phone',
      ttl: 4 * 60 * 60,
    })
    token.addGrant({
      room: row.livekit_room_name,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    })

    return json({
      livestream_id: row.id,
      livekit_room_name: row.livekit_room_name,
      livekit_token: await token.toJwt(),
      livekit_ws_url: livekitWsUrl,
    }, 200)
  } catch (err) {
    console.error('[pair-livestream] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
