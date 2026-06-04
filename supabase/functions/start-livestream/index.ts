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
    const initialStatus = isScheduledFuture ? 'preparing' : 'live'
    const startedAt = isScheduledFuture ? null : new Date().toISOString()

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

    // Generate a LiveKit token with publish permissions. Append a random
    // suffix to the identity so a tab refresh (or same user opening the host
    // page twice) doesn't trigger LiveKit's DUPLICATE_IDENTITY kick. The
    // real user_id is still captured via the AccessToken `name` field and the
    // livestreams.host_user_id column for any reporting.
    const identity = `${user.id}#${crypto.randomUUID().slice(0, 8)}`
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
