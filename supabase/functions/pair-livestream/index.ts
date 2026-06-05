// supabase/functions/pair-livestream/index.ts
//
// Authenticated as the stream's OWNER. Pair token alone isn't enough —
// the phone must be signed in as the seller who owns the livestream.
// This stops a snooped QR from being usable by anyone but the owner.
//
// Phone-side flow: scan QR → /live/host detects no session → bounces
// to /?next=... → user logs in → returns to /live/host → posts here
// with both their session token AND the pair_token. We verify both
// match the stream's host_user_id before minting a publish token.

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'not_signed_in' }, 401)

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
    const service = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'not_signed_in' }, 401)

    const body: RequestBody = await req.json()
    const livestreamId = (body.livestream_id ?? '').trim()
    const pairToken = (body.pair_token ?? '').trim()
    if (!livestreamId || !pairToken) {
      return json({ error: 'missing_fields' }, 400)
    }

    // Look up the row. id must exist, status must still be 'preparing'
    // (post-goLive the pair_token is nulled), pair_token must match,
    // AND the signed-in user must be the stream's host.
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
    if (row.host_user_id !== user.id) {
      // The QR was scanned by someone who isn't the seller. Tell the
      // phone client so it can surface a friendly "this stream belongs
      // to someone else" message instead of a generic 403.
      return json({ error: 'not_owner' }, 403)
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
