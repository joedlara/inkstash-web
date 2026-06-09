// supabase/functions/create-drop-payment-intent/index.ts
//
// Authenticated. Triggers a drop purchase:
//   1. Reserve capacity atomically via reserve_drop_capacity() — raises
//      'not_yet_live' / 'sold_out' if applicable.
//   2. Build the right Stripe PaymentIntent per drop.kind:
//      - 'listing' — destination charge to the seller's Connect account
//                    (mirrors M3 listing buy flow)
//      - 'pack'    — platform charge for a vendor pack (mirrors C1 flow)
//   3. PI metadata.drop_id lets the webhook record which drop generated
//      the resulting order.
//
// Request body: { drop_id: string }
// Response: { client_secret, drop_id, payment_type }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=denonext'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  drop_id?: string
  /** Number of copies to buy. Defaults to 1. Capped server-side at MAX_QTY_PER_BUY. */
  qty?: number
}

const MAX_QTY_PER_BUY = 5

interface DropRow {
  id: string
  kind: 'listing' | 'pack' | 'standalone'
  listing_id: string | null
  pack_id: string | null
  price: number
  vendor_id: string | null
  title: string | null
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
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body: RequestBody = await req.json()
    if (!body.drop_id) return json({ error: 'drop_id is required' }, 400)

    const requestedQty = Math.max(1, Math.min(MAX_QTY_PER_BUY, Math.floor(body.qty ?? 1)))

    // Find-or-create a Stripe Customer for this user. Reused across all
    // buy surfaces (rubies / vendor packs / listings / drops) so saved cards
    // are visible everywhere. Mirrors the pattern in create-payment-intent.
    let stripeCustomerId: string | null = null
    const { data: userRow } = await serviceClient
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .maybeSingle()
    stripeCustomerId = (userRow as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null
    if (!stripeCustomerId) {
      // Idempotency key keyed by supabase user id so concurrent
      // first-payment attempts share one Customer. Same key in
      // create-payment-intent and create-setup-intent.
      const customer = await stripe.customers.create(
        {
          email: (userRow as { email?: string } | null)?.email ?? user.email,
          metadata: { user_id: user.id },
        },
        { idempotencyKey: `customer-for-user-${user.id}` },
      )
      stripeCustomerId = customer.id
      await serviceClient
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id)
    }

    // Customer Session unlocks the saved-card list inside the Payment Element.
    // Without this, Stripe forces "card details" entry every time even when
    // the customer has saved cards. Components are configured to enable the
    // payment_element with the payment_method_save_usage feature.
    const customerSession = await stripe.customerSessions.create({
      customer: stripeCustomerId,
      components: {
        payment_element: {
          enabled: true,
          features: {
            payment_method_redisplay: 'enabled',
            payment_method_save: 'enabled',
            payment_method_save_usage: 'off_session',
            payment_method_remove: 'enabled',
          },
        },
      },
    })

    // Load drop so we know what we're charging for.
    const { data: dropRow, error: dropErr } = await serviceClient
      .from('drops')
      .select('id, kind, listing_id, pack_id, price, vendor_id, title')
      .eq('id', body.drop_id)
      .maybeSingle()

    if (dropErr) {
      console.error('[create-drop-payment-intent] drop fetch failed', dropErr)
      return json({ error: 'Failed to load drop' }, 500)
    }
    if (!dropRow) return json({ error: 'drop_not_found' }, 404)

    const drop = dropRow as DropRow

    // Reserve N copies atomically. Locks the row FOR UPDATE so two concurrent
    // buyers can't both pass the capacity check. Returns false if not enough
    // copies remain; raises 'not_yet_live' if before go_live_at.
    const { data: reserved, error: reserveErr } = await serviceClient
      .rpc('reserve_drop_capacity_n', { p_drop_id: drop.id, p_qty: requestedQty })

    if (reserveErr) {
      const msg = reserveErr.message ?? ''
      if (msg.includes('not_yet_live')) return json({ error: 'not_yet_live' }, 400)
      if (msg.includes('drop_not_found')) return json({ error: 'drop_not_found' }, 404)
      console.error('[create-drop-payment-intent] reserve failed', reserveErr)
      return json({ error: 'reserve failed' }, 500)
    }
    if (reserved === false) return json({ error: 'not_enough_copies' }, 400)

    // Helper to release the provisional N-copy reservation if anything below
    // throws. Capacity is bumped up-front to win the race against concurrent
    // buyers; if PI creation fails we MUST release or the counter drifts.
    const releaseAndError = async (errBody: Record<string, unknown>, status: number) => {
      await serviceClient.rpc('release_drop_capacity_n', { p_drop_id: drop.id, p_qty: requestedQty })
      return json(errBody, status)
    }

    try {
      // Build the PaymentIntent per kind.
      if (drop.kind === 'listing') {
        if (!drop.listing_id) {
          return await releaseAndError({ error: 'listing-kind drop missing listing_id' }, 500)
        }

        const { data: listingRow } = await serviceClient
          .from('listings')
          .select('id, user_id, title')
          .eq('id', drop.listing_id)
          .maybeSingle()

        if (!listingRow) {
          return await releaseAndError({ error: 'underlying listing not found' }, 500)
        }

        const sellerId = (listingRow as { user_id: string }).user_id

        const { data: sellerRow } = await serviceClient
          .from('users')
          .select('stripe_connect_account_id, seller_status')
          .eq('id', sellerId)
          .maybeSingle()

        const connectId = (sellerRow as { stripe_connect_account_id?: string } | null)?.stripe_connect_account_id
        if (!connectId) {
          return await releaseAndError({ error: 'seller_not_connect_active' }, 400)
        }

        // Dev/test fallback: seeded sellers have placeholder Connect IDs that
        // Stripe rejects (acct_test_PLACEHOLDER_*). In that case fall back to a
        // platform charge so the drop flow remains testable until the seller
        // completes real Stripe Connect onboarding. The webhook still records
        // drop_id on the order; only the destination + application fee diverge.
        const isPlaceholderConnect = connectId.startsWith('acct_test_PLACEHOLDER')

        const unitCents = Math.round(Number(drop.price) * 100)
        const amountCents = unitCents * requestedQty
        const feeCents = Math.round(amountCents * 0.10)

        const pi = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'usd',
          customer: stripeCustomerId,
          setup_future_usage: 'off_session',
          ...(isPlaceholderConnect
            ? {}
            : {
                application_fee_amount: feeCents,
                transfer_data: { destination: connectId },
              }),
          automatic_payment_methods: { enabled: true },
          metadata: {
            payment_type: 'listing',
            listing_id: drop.listing_id,
            seller_id: sellerId,
            buyer_id: user.id,
            drop_id: drop.id,
            drop_qty: String(requestedQty),
            placeholder_connect: isPlaceholderConnect ? 'true' : 'false',
          },
        })

        return json({
          client_secret: pi.client_secret,
          payment_intent_id: pi.id,
          customer_session_client_secret: customerSession.client_secret,
          drop_id: drop.id,
          qty: requestedQty,
          payment_type: 'listing',
        }, 200)
      }

      if (drop.kind === 'pack') {
        if (!drop.pack_id) {
          return await releaseAndError({ error: 'pack-kind drop missing pack_id' }, 500)
        }

        // Platform charge — vendor packs have their own payout model
        // (vendor_payouts / pack_revenue_splits) so no transfer_data.
        const unitCents = Math.round(Number(drop.price) * 100)
        const amountCents = unitCents * requestedQty
        const pi = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'usd',
          customer: stripeCustomerId,
          setup_future_usage: 'off_session',
          automatic_payment_methods: { enabled: true },
          metadata: {
            payment_type: 'vendor_pack',
            pack_id: drop.pack_id,
            user_id: user.id,
            drop_id: drop.id,
            drop_qty: String(requestedQty),
          },
        })

        return json({
          client_secret: pi.client_secret,
          payment_intent_id: pi.id,
          customer_session_client_secret: customerSession.client_secret,
          drop_id: drop.id,
          qty: requestedQty,
          payment_type: 'vendor_pack',
        }, 200)
      }

      // standalone — v1.1
      return await releaseAndError({ error: 'standalone drops not yet supported' }, 501)
    } catch (piErr) {
      // Stripe (or any post-reserve) failure: release the reservation so the
      // counter doesn't drift.
      console.error('[create-drop-payment-intent] post-reserve failure, releasing capacity', piErr)
      await serviceClient.rpc('release_drop_capacity_n', { p_drop_id: drop.id, p_qty: requestedQty })
      const msg = piErr instanceof Error ? piErr.message : 'payment_intent_creation_failed'
      return json({ error: msg }, 500)
    }
  } catch (err) {
    console.error('[create-drop-payment-intent] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
