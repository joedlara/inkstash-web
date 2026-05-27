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
  const bundleId = intent.metadata?.bundle_id
  const rubyTotalRaw = intent.metadata?.ruby_total

  if (!userId || !bundleId || !rubyTotalRaw) {
    console.error('[stripe-webhook] missing metadata on intent', intent.id, intent.metadata)
    return new Response('Missing user_id / bundle_id / ruby_total in metadata', { status: 400 })
  }

  const rubyTotal = parseInt(rubyTotalRaw, 10)
  if (!Number.isFinite(rubyTotal) || rubyTotal <= 0) {
    console.error('[stripe-webhook] invalid ruby_total', rubyTotalRaw)
    return new Response('Invalid ruby_total', { status: 400 })
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey)

  // Credit Rubies via the SECURITY DEFINER function. Idempotent: if this
  // payment_intent already produced a ruby_transactions row (webhook retry),
  // the function returns false and balance is untouched.
  const { data: credited, error: rpcError } = await serviceClient.rpc(
    'credit_rubies_from_bundle',
    {
      p_user_id: userId,
      p_ruby_total: rubyTotal,
      p_bundle_id: bundleId,
      p_payment_intent_id: intent.id,
    },
  )

  if (rpcError) {
    console.error('[stripe-webhook] credit_rubies_from_bundle failed:', rpcError)
    return new Response('DB error', { status: 500 })
  }

  if (credited === false) {
    console.log('[stripe-webhook] retry: bundle already credited for intent', intent.id)
  } else {
    console.log('[stripe-webhook] credited', rubyTotal, 'rubies to user', userId)
  }

  // Fire-and-forget confirmation email. Skip on Stripe retries
  // (credited === false) so the user doesn't get a duplicate email when
  // Stripe redelivers the same event. Email failures never fail the webhook
  // — the Ruby credit is the contract; the email is a nice-to-have.
  if (credited !== false) {
    try {
      const { data: userRow } = await serviceClient
        .from('users')
        .select('email, username')
        .eq('id', userId)
        .maybeSingle()

      // Re-import findBundle dynamically because the surrounding scope
      // doesn't already have it.
      const { findBundle } = await import('../_shared/rubyBundles.ts')
      const bundle = findBundle(bundleId)

      if (userRow?.email && bundle) {
        await fetch(`${supabaseUrl}/functions/v1/send-ruby-bundle-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            buyerEmail: userRow.email,
            buyerName: userRow.username ?? userRow.email,
            bundleName: bundle.label,
            rubyTotal,
            amountUsdCents: intent.amount,
            paymentIntentId: intent.id,
            purchasedAt: new Date().toISOString(),
          }),
        }).catch((err) => console.error('[stripe-webhook] confirmation email failed:', err))
      }
    } catch (err) {
      console.error('[stripe-webhook] confirmation email setup failed:', err)
    }
  }

  // Save the payment method if Stripe attached one to the user's Customer.
  // This only fires the first time the user pays — subsequent intents
  // confirmed off-session (via charge-saved-card) reuse the same pm_id.
  // (Reuse the `stripe` instance declared above for signature verification.)
  const paymentMethodId =
    typeof intent.payment_method === 'string' ? intent.payment_method : intent.payment_method?.id

  if (paymentMethodId) {
    try {
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
      const card = pm.card
      if (card) {
        // Check if this is the user's first saved card. If so, mark it default.
        const { count } = await serviceClient
          .from('user_payment_methods')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)

        const isFirstCard = (count ?? 0) === 0

        const { error: pmError } = await serviceClient
          .from('user_payment_methods')
          .upsert(
            {
              user_id: userId,
              stripe_payment_method_id: paymentMethodId,
              card_brand: card.brand,
              card_last4: card.last4,
              exp_month: card.exp_month,
              exp_year: card.exp_year,
              is_default: isFirstCard,
            },
            { onConflict: 'stripe_payment_method_id', ignoreDuplicates: true },
          )

        if (pmError) {
          console.error('[stripe-webhook] failed to save payment method:', pmError)
        } else {
          console.log('[stripe-webhook] payment method saved for user', userId)
        }
      }
    } catch (err) {
      console.error('[stripe-webhook] retrieve payment method failed:', err)
    }
  }

  return new Response('ok', { status: 200 })
})
