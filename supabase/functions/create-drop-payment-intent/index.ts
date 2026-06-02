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
}

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

    // Reserve capacity. Locks the row + increments quantity_sold atomically.
    // Returns false if sold out, raises 'not_yet_live' if before go_live_at.
    const { data: reserved, error: reserveErr } = await serviceClient
      .rpc('reserve_drop_capacity', { p_drop_id: drop.id })

    if (reserveErr) {
      const msg = reserveErr.message ?? ''
      if (msg.includes('not_yet_live')) return json({ error: 'not_yet_live' }, 400)
      if (msg.includes('drop_not_found')) return json({ error: 'drop_not_found' }, 404)
      console.error('[create-drop-payment-intent] reserve failed', reserveErr)
      return json({ error: 'reserve failed' }, 500)
    }
    if (reserved === false) return json({ error: 'sold_out' }, 400)

    // Build the PaymentIntent per kind.
    if (drop.kind === 'listing') {
      if (!drop.listing_id) {
        return json({ error: 'listing-kind drop missing listing_id' }, 500)
      }

      const { data: listingRow } = await serviceClient
        .from('listings')
        .select('id, user_id, title')
        .eq('id', drop.listing_id)
        .maybeSingle()

      if (!listingRow) {
        return json({ error: 'underlying listing not found' }, 500)
      }

      const { data: sellerRow } = await serviceClient
        .from('users')
        .select('stripe_connect_account_id, seller_status')
        .eq('id', (listingRow as { user_id: string }).user_id)
        .maybeSingle()

      const connectId = (sellerRow as { stripe_connect_account_id?: string } | null)?.stripe_connect_account_id
      if (!connectId) {
        return json({ error: 'seller_not_connect_active' }, 400)
      }

      // Destination charge: amount lands on platform, transferred to the
      // seller's Connect account minus the 10% application fee.
      const amountCents = Math.round(Number(drop.price) * 100)
      const feeCents = Math.round(amountCents * 0.10)

      const pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        application_fee_amount: feeCents,
        transfer_data: { destination: connectId },
        automatic_payment_methods: { enabled: true },
        metadata: {
          payment_type: 'listing',
          listing_id: drop.listing_id,
          seller_id: (listingRow as { user_id: string }).user_id,
          buyer_id: user.id,
          drop_id: drop.id,
        },
      })

      return json({
        client_secret: pi.client_secret,
        drop_id: drop.id,
        payment_type: 'listing',
      }, 200)
    }

    if (drop.kind === 'pack') {
      if (!drop.pack_id) {
        return json({ error: 'pack-kind drop missing pack_id' }, 500)
      }

      // Platform charge — vendor packs have their own payout model
      // (vendor_payouts / pack_revenue_splits) so no transfer_data.
      // Mirrors create-payment-intent's vendor_pack branch.
      const amountCents = Math.round(Number(drop.price) * 100)
      const pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          payment_type: 'vendor_pack',
          pack_id: drop.pack_id,
          user_id: user.id,
          drop_id: drop.id,
        },
      })

      return json({
        client_secret: pi.client_secret,
        drop_id: drop.id,
        payment_type: 'vendor_pack',
      }, 200)
    }

    // standalone — v1.1
    return json({ error: 'standalone drops not yet supported' }, 501)
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
