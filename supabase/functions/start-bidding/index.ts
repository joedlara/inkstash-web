// supabase/functions/start-bidding/index.ts
//
// Host-only. Flips a livestream_items row to bidding-active state:
// sets start_price_cents (from request OR fall back to listing's
// buy_now_price), seeds current_price_cents = start_price_cents,
// resets bid_count + current_winner_id, and sets bidding_ends_at
// 10s from now. Item must already be in status='live' (host has
// pushed it onto the block via the existing flow).
//
// Body: { item_id: uuid, start_price_cents?: number }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TIMER_SECONDS = 10

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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const itemId: string = body.item_id
    const requestedStart: number | undefined = body.start_price_cents
    if (!itemId) return json({ error: 'item_id_required' }, 400)

    // Verify the item exists, belongs to a stream this user hosts,
    // and is currently on the block ('live'). We do this server-side
    // even though place_livestream_bid also checks — the host needs a
    // clear early-failure path here for UI feedback.
    const { data: item } = await serviceClient
      .from('livestream_items')
      .select('id, livestream_id, listing_id, status, bidding_ends_at')
      .eq('id', itemId)
      .maybeSingle()
    if (!item) return json({ error: 'item_not_found' }, 404)
    const i = item as {
      id: string; livestream_id: string; listing_id: string;
      status: string; bidding_ends_at: string | null;
    }
    if (i.status !== 'live') return json({ error: 'item_not_on_block' }, 409)
    if (i.bidding_ends_at) return json({ error: 'bidding_already_started' }, 409)

    const { data: stream } = await serviceClient
      .from('livestreams')
      .select('id, host_user_id, status')
      .eq('id', i.livestream_id)
      .maybeSingle()
    if (!stream) return json({ error: 'stream_not_found' }, 404)
    const s = stream as { id: string; host_user_id: string; status: string }
    if (s.host_user_id !== user.id) return json({ error: 'not_host' }, 403)
    if (s.status !== 'live') return json({ error: 'stream_not_live' }, 409)

    // Default start price: caller can override (host edited it in the UI),
    // otherwise pull buy_now_price from the listing. Convert to cents.
    let startCents = requestedStart
    if (startCents == null) {
      const { data: listing } = await serviceClient
        .from('listings')
        .select('buy_now_price')
        .eq('id', i.listing_id)
        .maybeSingle()
      const price = Number((listing as { buy_now_price: number | null } | null)?.buy_now_price ?? 1)
      startCents = Math.max(100, Math.round(price * 100))
    }
    if (!Number.isFinite(startCents) || startCents < 100) {
      return json({ error: 'invalid_start_price' }, 400)
    }

    const endsAt = new Date(Date.now() + TIMER_SECONDS * 1000).toISOString()

    const { error: updateErr } = await serviceClient
      .from('livestream_items')
      .update({
        start_price_cents: startCents,
        current_price_cents: startCents,
        current_winner_id: null,
        bid_count: 0,
        bidding_ends_at: endsAt,
      })
      .eq('id', itemId)

    if (updateErr) {
      console.error('[start-bidding] update failed', updateErr)
      return json({ error: 'update_failed' }, 500)
    }

    return json({
      item_id: itemId,
      start_price_cents: startCents,
      bidding_ends_at: endsAt,
    }, 200)
  } catch (err) {
    console.error('[start-bidding] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
