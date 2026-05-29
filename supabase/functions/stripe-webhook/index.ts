// Edge Function: stripe-webhook
// Receives Stripe webhook events. Verifies signature against STRIPE_WEBHOOK_SECRET.
// Dispatches by event type:
//   - payment_intent.succeeded → handlePaymentIntentSucceeded
//       → creditRubyBundle (payment_type='ruby_bundle' or legacy intents)
//       → openVendorPack   (payment_type='vendor_pack')
//   - account.updated → handleAccountUpdated (flips vendor status to 'active'
//       once Connect onboarding completes)
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

  const serviceClient = createClient(supabaseUrl, serviceRoleKey)

  if (event.type === 'payment_intent.succeeded') {
    return await handlePaymentIntentSucceeded(event, stripe, serviceClient, supabaseUrl, serviceRoleKey)
  }

  if (event.type === 'account.updated') {
    return await handleAccountUpdated(event, serviceClient)
  }

  return new Response('ok', { status: 200 })
})

async function handlePaymentIntentSucceeded(
  event: Stripe.Event,
  stripe: Stripe,
  serviceClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<Response> {
  const intent = event.data.object as Stripe.PaymentIntent
  const userId = intent.metadata?.user_id

  if (!userId) {
    console.error('[stripe-webhook] missing user_id on intent', intent.id)
    return new Response('Missing user_id in metadata', { status: 400 })
  }

  // Backward compat: intents created before A3 don't have payment_type metadata.
  // Treat them as ruby_bundle.
  const effectiveType = intent.metadata?.payment_type ?? 'ruby_bundle'

  if (effectiveType === 'ruby_bundle') {
    return await creditRubyBundle(intent, stripe, serviceClient, userId, supabaseUrl, serviceRoleKey)
  }

  if (effectiveType === 'vendor_pack') {
    return await openVendorPack(intent, serviceClient, userId, supabaseUrl, serviceRoleKey)
  }

  console.warn('[stripe-webhook] unknown payment_type:', effectiveType)
  return new Response('ok', { status: 200 })
}

async function creditRubyBundle(
  intent: Stripe.PaymentIntent,
  stripe: Stripe,
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<Response> {
  const bundleId = intent.metadata?.bundle_id
  const rubyTotalRaw = intent.metadata?.ruby_total
  if (!bundleId || !rubyTotalRaw) {
    console.error('[stripe-webhook] ruby_bundle missing metadata', intent.id, intent.metadata)
    return new Response('Missing bundle_id or ruby_total', { status: 400 })
  }
  const rubyTotal = parseInt(rubyTotalRaw, 10)
  if (!Number.isFinite(rubyTotal) || rubyTotal <= 0) {
    return new Response('Invalid ruby_total', { status: 400 })
  }

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
  const paymentMethodId =
    typeof intent.payment_method === 'string' ? intent.payment_method : intent.payment_method?.id

  if (paymentMethodId) {
    try {
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
      const card = pm.card
      if (card) {
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
}

async function openVendorPack(
  intent: Stripe.PaymentIntent,
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<Response> {
  const packId = intent.metadata?.pack_id
  const vendorId = intent.metadata?.vendor_id
  if (!packId || !vendorId) {
    console.error('[stripe-webhook] vendor_pack missing metadata', intent.id, intent.metadata)
    return new Response('Missing pack_id or vendor_id', { status: 400 })
  }

  // Idempotency: bail if we already opened this pack for this intent.
  const { data: existing } = await serviceClient
    .from('seller_payouts')
    .select('id')
    .eq('stripe_payment_intent_id', intent.id)
    .maybeSingle()
  if (existing) {
    console.log('[stripe-webhook] retry: vendor pack already opened for intent', intent.id)
    return new Response('ok', { status: 200 })
  }

  // Delegate to the open-pack-usd edge function via direct invocation.
  // Function-to-function calls use the service role key.
  const res = await fetch(`${supabaseUrl}/functions/v1/open-pack-usd`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      user_id: userId,
      pack_id: packId,
      vendor_id: vendorId,
      payment_intent_id: intent.id,
      gross_amount_cents: intent.amount,
      application_fee_amount_cents: intent.application_fee_amount ?? 0,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[stripe-webhook] open-pack-usd failed:', res.status, text)
    return new Response('open-pack-usd failed', { status: 500 })
  }

  console.log('[stripe-webhook] vendor pack opened for intent', intent.id)
  return new Response('ok', { status: 200 })
}

async function handleAccountUpdated(
  event: Stripe.Event,
  serviceClient: ReturnType<typeof createClient>,
): Promise<Response> {
  const account = event.data.object as Stripe.Account
  // Connect account is "active" once charges + payouts are both enabled.
  const isActive = account.charges_enabled && account.payouts_enabled
  if (!isActive) {
    console.log('[stripe-webhook] account.updated: not yet active', account.id)
    return new Response('ok', { status: 200 })
  }

  const { data: vendor, error: lookupError } = await serviceClient
    .from('vendors')
    .select('id, status')
    .eq('stripe_connect_account_id', account.id)
    .maybeSingle()

  if (lookupError) {
    console.error('[stripe-webhook] vendor lookup failed:', lookupError)
    return new Response('DB error', { status: 500 })
  }

  if (!vendor) {
    // Not a vendor — check if it's a regular seller (non-vendor user).
    const { data: sellerUser, error: userLookupError } = await serviceClient
      .from('users')
      .select('id, seller_status')
      .eq('stripe_connect_account_id', account.id)
      .maybeSingle()

    if (userLookupError) {
      console.error('[stripe-webhook] seller user lookup failed:', userLookupError)
      return new Response('DB error', { status: 500 })
    }

    if (!sellerUser) {
      console.warn('[stripe-webhook] account.updated for unknown Connect account', account.id)
      return new Response('ok', { status: 200 })
    }

    if (sellerUser.seller_status === 'active') {
      return new Response('ok', { status: 200 })
    }

    const { error: sellerUpdateError } = await serviceClient
      .from('users')
      .update({ seller_status: 'active', updated_at: new Date().toISOString() })
      .eq('id', sellerUser.id)

    if (sellerUpdateError) {
      console.error('[stripe-webhook] seller activate failed:', sellerUpdateError)
      return new Response('DB error', { status: 500 })
    }

    console.log('[stripe-webhook] seller activated:', sellerUser.id)
    return new Response('ok', { status: 200 })
  }

  if (vendor.status === 'active') {
    return new Response('ok', { status: 200 })
  }

  const { error: updateError } = await serviceClient
    .from('vendors')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', vendor.id)

  if (updateError) {
    console.error('[stripe-webhook] vendor activate failed:', updateError)
    return new Response('DB error', { status: 500 })
  }

  console.log('[stripe-webhook] vendor activated:', vendor.id)
  return new Response('ok', { status: 200 })
}
