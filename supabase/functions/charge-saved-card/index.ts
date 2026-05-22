// Edge Function: charge-saved-card
// One-tap Ruby bundle top-up using the user's stored Stripe payment method.
// No client-side Stripe Elements involved — we confirm the intent server-side
// with off_session=true. Webhook does the Ruby crediting on success.
//
// Returns { paymentIntentId, status } once Stripe accepts the charge.
// The frontend then polls users.ruby_balance until the webhook lands.

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
  bundle_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401)
    }

    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // @ts-expect-error Deno env
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    // @ts-expect-error Deno env
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!

    if (!stripeSecret) {
      return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const body: RequestBody = await req.json()
    if (!body.bundle_id) {
      return json({ error: 'bundle_id is required' }, 400)
    }

    const bundle = findBundle(body.bundle_id)
    if (!bundle) {
      return json({ error: 'Unknown bundle' }, 404)
    }

    const { data: userRow } = await serviceClient
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!userRow?.stripe_customer_id) {
      return json({ error: 'No Stripe customer on file' }, 400)
    }

    const { data: pmRow } = await serviceClient
      .from('user_payment_methods')
      .select('stripe_payment_method_id')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle()

    if (!pmRow?.stripe_payment_method_id) {
      return json({ error: 'No default payment method on file' }, 400)
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    let intent: Stripe.PaymentIntent
    try {
      intent = await stripe.paymentIntents.create({
        amount: bundle.usdCents,
        currency: 'usd',
        customer: userRow.stripe_customer_id,
        payment_method: pmRow.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: {
          bundle_id: bundle.id,
          ruby_total: String(bundle.totalRubies),
          user_id: user.id,
        },
      })
    } catch (err) {
      const stripeErr = err as Stripe.errors.StripeError
      if (stripeErr.code === 'authentication_required') {
        return json(
          { error: 'requires_action', message: 'Your bank requires authentication for this payment.' },
          402,
        )
      }
      return json({ error: stripeErr.message ?? 'Payment failed' }, 400)
    }

    if (intent.status !== 'succeeded') {
      return json({ error: `Payment status: ${intent.status}` }, 400)
    }

    return json({
      paymentIntentId: intent.id,
      status: intent.status,
      bundleId: bundle.id,
      rubyTotal: bundle.totalRubies,
    }, 200)
  } catch (err) {
    console.error('[charge-saved-card] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
