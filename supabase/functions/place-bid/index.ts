// supabase/functions/place-bid/index.ts
//
// Viewer-side. Places a bid on an active item. By default a flat
// $1 increment ("Bid $N+1"); the optional amount_cents in the body
// raises the price to that exact total instead (Custom popover).
// Pre-bid gate: bidder must have a Stripe customer ID AND at least
// one saved payment method. Without it we reject early with
// 'no_card_on_file' so the client can prompt the bidder to add one.
//
// Atomicity lives in the place_livestream_bid RPC (row-level lock).
// We always call the 3-arg overload, passing null when no amount was
// supplied — the RPC treats null as the legacy $1 bump path. A
// non-null amount that's at or below the current price raises
// 'bid_below_minimum' in the RPC; we translate that to 'bid_too_low'
// for the client so the UI matches the prototype's error name.
//
// Body: { item_id: uuid, amount_cents?: integer }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.168.0'

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
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const itemId: string = body.item_id
    if (!itemId) return json({ error: 'item_id_required' }, 400)

    // Optional explicit amount (cents). When omitted the RPC's null
    // path applies the flat $1 bump. When present we validate the
    // shape here (positive integer) so we fail fast on garbage input.
    let amountCents: number | null = null
    if (body.amount_cents !== undefined && body.amount_cents !== null) {
      const raw = body.amount_cents
      if (typeof raw !== 'number' || !Number.isInteger(raw) || raw <= 0) {
        return json({ error: 'invalid_amount' }, 400)
      }
      amountCents = raw
    }

    // ── Card-on-file gate ─────────────────────────────────────────────
    // Real-money commitment: we don't accept a bid unless the bidder
    // has a saved payment method. The follow-on charge phase will pull
    // their default payment method off this customer to settle the win.
    const { data: userRow } = await serviceClient
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()
    const customerId = (userRow as { stripe_customer_id: string | null } | null)?.stripe_customer_id

    if (!customerId) {
      return json({ error: 'no_card_on_file' }, 402)
    }

    if (stripeSecret) {
      const stripe = new Stripe(stripeSecret, {
        apiVersion: '2024-06-20',
        httpClient: Stripe.createFetchHttpClient(),
      })
      try {
        const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 })
        if (!methods.data.length) {
          return json({ error: 'no_card_on_file' }, 402)
        }
      } catch (stripeErr) {
        // Stripe can throw if the saved customer id is from a
        // different mode (test vs live) or has been deleted on
        // Stripe's side. Either way, the buyer effectively has no
        // usable card — treat it the same as no-card-on-file so
        // the client surfaces the "add a card in settings" prompt
        // instead of an opaque 500.
        const code = (stripeErr as { code?: string })?.code
        console.warn('[place-bid] stripe pm.list failed', code, (stripeErr as Error).message)
        return json({ error: 'no_card_on_file' }, 402)
      }
    }

    // ── Atomic bid ───────────────────────────────────────────────────
    // The RPC handles: row lock, status check, self-bid rejection,
    // window check, increment + log + timer reset. We just call it.
    // Always pass p_amount_cents (null = flat $1 path) so we route to
    // the 3-arg overload on every call.
    const { data, error: rpcErr } = await serviceClient.rpc('place_livestream_bid', {
      p_item_id: itemId,
      p_bidder: user.id,
      p_amount_cents: amountCents,
    })

    if (rpcErr) {
      // Postgres raises generic P0001s for our business-rule errors.
      // Translate them to friendly codes the client UI can react to.
      // Combine message + details + hint so we still match if a
      // Postgrest version puts the body in a different field.
      const haystack = [rpcErr.message, (rpcErr as { details?: string }).details, (rpcErr as { hint?: string }).hint]
        .filter(Boolean).join(' ').toLowerCase()
      if (haystack.includes('item_not_found')) return json({ error: 'item_not_found' }, 404)
      if (haystack.includes('not_bidding')) return json({ error: 'not_bidding' }, 409)
      if (haystack.includes('bidding_closed')) return json({ error: 'bidding_closed' }, 410)
      if (haystack.includes('cannot_self_bid')) return json({ error: 'cannot_self_bid' }, 403)
      // Custom-bid validation errors. The RPC raises 'bid_below_minimum'
      // when amount <= current price; we surface that as 'bid_too_low'
      // to match the prototype's error name + the client toast copy.
      if (haystack.includes('bid_below_minimum')) return json({ error: 'bid_too_low' }, 400)
      if (haystack.includes('invalid_amount')) return json({ error: 'invalid_amount' }, 400)
      console.error('[place-bid] rpc failed', rpcErr)
      return json({ error: 'bid_failed', detail: haystack }, 500)
    }

    const row = Array.isArray(data) ? data[0] : data
    return json({
      current_price_cents: row?.current_price_cents,
      current_winner_id: row?.current_winner_id,
      bid_count: row?.bid_count,
      bidding_ends_at: row?.bidding_ends_at,
    }, 200)
  } catch (err) {
    console.error('[place-bid] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
