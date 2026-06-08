// supabase/functions/start-livestream/index.ts
//
// Authenticated. Active sellers only. Creates a livestreams row and returns
// a LiveKit publish token so the host can start broadcasting.
//
// Request body: { title: string; description?: string; cover_image_url?: string }
// Response: { livestream_id, livekit_room_name, livekit_token, livekit_ws_url }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2?target=denonext'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  title?: string
  description?: string
  cover_image_url?: string
  /** ISO timestamp. When set + in the future the stream is created as
   *  'preparing' instead of going live immediately. */
  scheduled_start_at?: string | null
  /** Optional listing IDs to pre-populate the stream's item queue. */
  queue?: string[]
  /** Creator Hub dual-device flow: hold the stream at 'preparing',
   *  mint a pair_token, and do NOT return a host LiveKit token (the
   *  laptop is the producer, not the camera — the phone calls
   *  pair-livestream to get its publish token). The composer flips
   *  the stream to 'live' via go-live-livestream after the phone is
   *  paired and publishing. */
  prepare_dual_device?: boolean
  /** Single-device flow (phone is the camera): hold at 'preparing' so
   *  the row doesn't show up on /live before Publish, BUT mint a host
   *  publish token so the composer can preview the device's own camera.
   *  Composer calls go-live-livestream on Publish, same as dual-device. */
  prepare_single_device?: boolean
}

function shortId(): string {
  return crypto.randomUUID().split('-')[0]
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

    // Active sellers only.
    const { data: userRow } = await serviceClient
      .from('users')
      .select('seller_status, username')
      .eq('id', user.id)
      .maybeSingle()
    if (!userRow || (userRow as { seller_status?: string }).seller_status !== 'active') {
      return json({ error: 'seller_not_active' }, 403)
    }

    const body: RequestBody = await req.json()
    const title = (body.title ?? '').trim()
    if (!title || title.length > 120) {
      return json({ error: 'title_required_or_too_long' }, 400)
    }

    const roomName = 'stream-' + shortId()

    // Scheduled-start handling: if the requested time is in the future we
    // create the row as 'preparing' (the cron that flips it to 'live' is
    // deferred per spec; for now an admin can flip the status manually).
    // Pre-live tokens still need to be issued so the host can step into the
    // broadcast experience at the scheduled moment.
    const scheduledAt = body.scheduled_start_at ? new Date(body.scheduled_start_at) : null
    const isScheduledFuture = scheduledAt && scheduledAt.getTime() > Date.now()
    // Stream stays at 'preparing' for any prepare-only flow (dual-
    // device, single-device, or scheduled-future). Composer flips to
    // 'live' on Publish via go-live-livestream so streams never appear
    // on /live before the host commits.
    const isPrepareOnly = body.prepare_dual_device || body.prepare_single_device || isScheduledFuture
    const initialStatus = isPrepareOnly ? 'preparing' : 'live'
    const startedAt = initialStatus === 'live' ? new Date().toISOString() : null
    // Mint a short pair token for dual-device. URL-safe, ~64 bits of
    // entropy — enough to make a guess practically impossible inside
    // the seconds-to-minutes window between Preview and Go Live.
    const pairToken = body.prepare_dual_device
      ? Array.from(crypto.getRandomValues(new Uint8Array(8)))
          .map((b) => b.toString(16).padStart(2, '0')).join('')
      : null

    const { data: stream, error: insertErr } = await serviceClient
      .from('livestreams')
      .insert({
        host_user_id: user.id,
        title,
        description: body.description ?? null,
        cover_image_url: body.cover_image_url ?? null,
        livekit_room_name: roomName,
        status: initialStatus,
        started_at: startedAt,
        scheduled_start_at: scheduledAt?.toISOString() ?? null,
        pair_token: pairToken,
      })
      .select('id, livekit_room_name')
      .single()

    if (insertErr || !stream) {
      console.error('[start-livestream] insert failed', insertErr)
      return json({ error: 'create_failed' }, 500)
    }

    // Persist the pre-stream queue. Best-effort: failures don't abort
    // stream creation (the host can re-add items mid-stream).
    if (body.queue && body.queue.length > 0) {
      const rows = body.queue.map((listingId, idx) => ({
        livestream_id: (stream as { id: string }).id,
        listing_id: listingId,
        position: idx,
      }))
      const { error: queueErr } = await serviceClient.from('livestream_items').insert(rows)
      if (queueErr) {
        console.warn('[start-livestream] queue insert failed (continuing)', queueErr)
      }
    }

    // In dual-device flow, the laptop is NOT the camera — it's the
    // producer console. Don't mint a host token here; the phone gets
    // its publish token via pair-livestream.
    if (body.prepare_dual_device) {
      // Mint a composer viewer token so the laptop can subscribe to
      // the room and detect the phone joining. Strictly scoped: no
      // publish rights, view-only, same 4h TTL as the host token.
      const composerIdentity = `${user.id}#composer-${crypto.randomUUID().slice(0, 8)}`
      const composerToken = new AccessToken(livekitApiKey, livekitApiSecret, {
        identity: composerIdentity,
        name: (userRow as { username?: string }).username ?? 'composer',
        ttl: 4 * 60 * 60,
      })
      composerToken.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: false,
        canPublishData: false,
        canSubscribe: true,
      })
      return json({
        livestream_id: stream.id,
        livekit_room_name: roomName,
        livekit_ws_url: livekitWsUrl,
        pair_token: pairToken,
        composer_token: await composerToken.toJwt(),
      }, 200)
    }

    // Generate a LiveKit token with publish permissions. Append a random
    // suffix to the identity so a tab refresh (or same user opening the host
    // page twice) doesn't trigger LiveKit's DUPLICATE_IDENTITY kick. The
    // `#host-` infix lets the viewer count filter exclude the broadcaster
    // (matches isInfrastructure() in LiveStreamVideo). Without it the host
    // gets counted as a viewer and the "Watching" badge inflates by 1.
    const identity = `${user.id}#host-${crypto.randomUUID().slice(0, 8)}`
    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity,
      name: (userRow as { username?: string }).username ?? user.email ?? 'host',
      ttl: 4 * 60 * 60, // 4 hours
    })
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    })

    return json({
      livestream_id: stream.id,
      livekit_room_name: roomName,
      livekit_token: await token.toJwt(),
      livekit_ws_url: livekitWsUrl,
    }, 200)
  } catch (err) {
    console.error('[start-livestream] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
