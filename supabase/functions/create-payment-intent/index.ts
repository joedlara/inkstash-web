// supabase/functions/create-payment-intent/index.ts
// Unified PaymentIntent creator. Branches on payment_type:
//   - ruby_bundle  → uses _shared/rubyBundles, no Connect routing
//   - vendor_pack  → looks up pack + vendor, sets transfer_data.destination
//                    and application_fee_amount for 90/10 split
//
// Returns { clientSecret, paymentIntentId, amount }. The webhook does
// the post-payment work (credit rubies / open vendor pack).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.168.0'
import { findBundle } from '../_shared/rubyBundles.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  payment_type?: 'ruby_bundle' | 'vendor_pack'
  target_id?: string
  bundle_id?: string // backward-compat for the old shape
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

    if (!stripeSecret) return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body: RequestBody = await req.json()

    // Backward-compat: a body with just { bundle_id } is implicitly a ruby_bundle request.
    const paymentType: 'ruby_bundle' | 'vendor_pack' =
      body.payment_type ?? 'ruby_bundle'
    const targetId = body.target_id ?? body.bundle_id

    if (!targetId) return json({ error: 'target_id is required' }, 400)

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Find-or-create the Stripe Customer (used by both branches for
    // saved-card support and Stripe Tax address lookup).
    let stripeCustomerId: string | null = null
    const { data: userRow } = await serviceClient
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .maybeSingle()

    stripeCustomerId = userRow?.stripe_customer_id ?? null
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userRow?.email ?? user.email,
        metadata: { user_id: user.id },
      })
      stripeCustomerId = customer.id
      await serviceClient
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id)
    }

    if (paymentType === 'ruby_bundle') {
      return await createRubyBundleIntent({
        stripe, serviceClient, user, stripeCustomerId, bundleId: targetId,
      })
    } else if (paymentType === 'vendor_pack') {
      return await createVendorPackIntent({
        stripe, serviceClient, user, stripeCustomerId, packId: targetId,
      })
    } else {
      return json({ error: `Unknown payment_type: ${paymentType}` }, 400)
    }
  } catch (err) {
    console.error('[create-payment-intent] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

async function createRubyBundleIntent({
  stripe, serviceClient, user, stripeCustomerId, bundleId,
}: {
  stripe: Stripe
  serviceClient: ReturnType<typeof createClient>
  user: { id: string; email?: string | null }
  stripeCustomerId: string
  bundleId: string
}): Promise<Response> {
  const bundle = findBundle(bundleId)
  if (!bundle) return json({ error: 'Unknown bundle' }, 404)

  // Note: automatic_tax is intentionally NOT enabled. Stripe Tax requires
  // explicit activation on the Stripe account plus state-by-state registration.
  // See docs/operations/apple-pay-domain-verification.md "Tax obligations"
  // section for the pre-launch checklist. Re-enable here once registered.
  const intent = await stripe.paymentIntents.create({
    amount: bundle.usdCents,
    currency: 'usd',
    customer: stripeCustomerId,
    // Save the card for future Ruby bundle purchases (vendor packs are one-offs, no save).
    setup_future_usage: 'on_session',
    automatic_payment_methods: { enabled: true },
    metadata: {
      payment_type: 'ruby_bundle',
      bundle_id: bundle.id,
      ruby_total: String(bundle.totalRubies),
      user_id: user.id,
    },
  })

  return json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount: bundle.usdCents,
  }, 200)
}

async function createVendorPackIntent({
  stripe, serviceClient, user, stripeCustomerId, packId,
}: {
  stripe: Stripe
  serviceClient: ReturnType<typeof createClient>
  user: { id: string; email?: string | null }
  stripeCustomerId: string
  packId: string
}): Promise<Response> {
  const { data: pack, error: packError } = await serviceClient
    .from('packs')
    .select(`
      id, name, price, status, origin, value_lock, vendor_id,
      vendor:vendors!packs_vendor_id_fkey(
        id, status, stripe_connect_account_id, commission_rate
      )
    `)
    .eq('id', packId)
    .single()

  if (packError || !pack) return json({ error: 'Pack not found' }, 404)
  if (pack.origin !== 'vendor') return json({ error: 'Not a vendor pack' }, 400)
  if (pack.status !== 'active') return json({ error: `Pack not available (${pack.status})` }, 400)

  const vendor = Array.isArray(pack.vendor) ? pack.vendor[0] : pack.vendor
  if (!vendor) return json({ error: 'Vendor not found' }, 500)
  if (vendor.status !== 'active') return json({ error: 'Vendor not active' }, 400)
  if (!vendor.stripe_connect_account_id) {
    return json({ error: 'Vendor Stripe Connect not configured' }, 500)
  }

  const amountCents = Math.round(Number(pack.price) * 100)
  const applicationFeeCents = Math.round(amountCents * Number(vendor.commission_rate))

  if (applicationFeeCents < 0 || applicationFeeCents >= amountCents) {
    return json({ error: 'Invalid commission_rate on vendor' }, 500)
  }

  // Note: automatic_tax is intentionally NOT enabled on vendor_pack intents.
  // Tax obligation for Connect destination charges requires explicit
  // marketplace-vs-platform tax model registration with Stripe, which is
  // deferred until Phase 6. Vendors handle their own tax via their existing
  // bookkeeping for now.
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: stripeCustomerId,
    automatic_payment_methods: { enabled: true },
    transfer_data: { destination: vendor.stripe_connect_account_id },
    application_fee_amount: applicationFeeCents,
    metadata: {
      payment_type: 'vendor_pack',
      pack_id: pack.id,
      vendor_id: vendor.id,
      user_id: user.id,
    },
  })

  return json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount: amountCents,
  }, 200)
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
