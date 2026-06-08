// supabase/functions/create-setup-intent/index.ts
//
// Authenticated. Mints a Stripe SetupIntent so the client can collect
// a card without charging anything — used by the in-stream WalletDrawer
// so viewers can add a card without leaving the livestream.
//
// Find-or-creates the user's Stripe Customer (mirrors the pattern in
// create-payment-intent). The SetupIntent is attached to that customer
// so card.setup_succeeded propagates customer_id → webhook → save row
// in user_payment_methods.
//
// Body: {}  (no params — implicit user_id from auth)
// Response: { client_secret, setup_intent_id }

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

    if (!stripeSecret) return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Find-or-create the Stripe Customer. Same pattern as
    // create-payment-intent so the same customer record is reused
    // across charges and saved cards.
    const { data: userRow } = await serviceClient
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .maybeSingle()
    let stripeCustomerId = (userRow as { stripe_customer_id: string | null } | null)?.stripe_customer_id ?? null
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: (userRow as { email?: string } | null)?.email ?? user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      stripeCustomerId = customer.id
      await serviceClient
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id)
    }

    // Off-session usage so the saved card can be charged later (auction
    // wins, one-tap rebuy). payment_method_types omitted on purpose —
    // the PaymentElement will offer card by default; we can extend
    // here later (Link, etc.) without a re-deploy.
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      usage: 'off_session',
      // Tag with supabase user_id so the webhook can resolve back to
      // public.users when the customer.metadata isn't echoed on the
      // event body (Stripe usually does, but defensive is cheap).
      metadata: { supabase_user_id: user.id },
    })

    return json({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
    }, 200)
  } catch (err) {
    console.error('[create-setup-intent] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
