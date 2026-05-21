// Edge Function: stripe-webhook
// Receives Stripe webhook events. Verifies signature against STRIPE_WEBHOOK_SECRET.
// On payment_intent.succeeded, upserts a pack_purchases row keyed by
// stripe_payment_intent_id (idempotent — retries from Stripe are no-ops).
//
// NOTE: this function must be deployed with --no-verify-jwt because Stripe
// will not send a Supabase JWT. Signature verification replaces JWT auth.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.168.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'stripe-signature, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // @ts-expect-error Deno env
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!
  // @ts-expect-error Deno env
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  // @ts-expect-error Deno env
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  // @ts-expect-error Deno env
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!stripeSecret || !webhookSecret) {
    console.error('[stripe-webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET')
    return new Response('Server misconfigured', { status: 500 })
  }

  const stripe = new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    )
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  console.log('[stripe-webhook] event received:', event.type, event.id)

  if (event.type !== 'payment_intent.succeeded') {
    return new Response('ok', { status: 200 })
  }

  const intent = event.data.object as Stripe.PaymentIntent
  const userId = intent.metadata?.user_id
  const packId = intent.metadata?.pack_id

  if (!userId || !packId) {
    console.error('[stripe-webhook] missing metadata on intent', intent.id)
    return new Response('Missing user_id or pack_id in metadata', { status: 400 })
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey)

  const { error } = await serviceClient
    .from('pack_purchases')
    .upsert(
      {
        user_id: userId,
        pack_id: packId,
        stripe_payment_intent_id: intent.id,
        items_received: [],
      },
      { onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true },
    )

  if (error) {
    console.error('[stripe-webhook] upsert failed:', error)
    return new Response('DB error', { status: 500 })
  }

  console.log('[stripe-webhook] pack_purchase recorded for intent', intent.id)
  return new Response('ok', { status: 200 })
})
