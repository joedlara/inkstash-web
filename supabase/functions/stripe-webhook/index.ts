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

  // Backward compat: intents created before A3 don't have payment_type metadata.
  // Treat them as ruby_bundle.
  const effectiveType = intent.metadata?.payment_type ?? 'ruby_bundle'

  // Each branch validates the metadata IT needs. ruby_bundle / vendor_pack
  // require user_id; listing requires buyer_id + seller_id + listing_id and
  // sets buyer_id (not user_id). Validating user_id up front would (and did)
  // reject listing webhooks with 400 before they ever dispatched.
  if (effectiveType === 'ruby_bundle') {
    const userId = intent.metadata?.user_id
    if (!userId) {
      console.error('[stripe-webhook] ruby_bundle missing user_id', intent.id)
      return new Response('Missing user_id in metadata', { status: 400 })
    }
    return await creditRubyBundle(intent, stripe, serviceClient, userId, supabaseUrl, serviceRoleKey)
  }

  if (effectiveType === 'vendor_pack') {
    const userId = intent.metadata?.user_id
    if (!userId) {
      console.error('[stripe-webhook] vendor_pack missing user_id', intent.id)
      return new Response('Missing user_id in metadata', { status: 400 })
    }
    return await openVendorPack(intent, serviceClient, userId, supabaseUrl, serviceRoleKey)
  }

  if (effectiveType === 'listing') {
    // openListingOrder validates listing_id/seller_id/buyer_id internally.
    return await openListingOrder(intent, supabaseUrl, serviceRoleKey)
  }

  if (effectiveType === 'cart') {
    return await openCartOrderGroup(intent, stripe, serviceClient, supabaseUrl, serviceRoleKey)
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
        // Dedupe by Stripe card fingerprint. Stripe re-tokenizes the
        // same physical card with a NEW pm_xxx every time it's entered
        // on the PaymentElement, so dedupe-by-pm_id alone never catches
        // a re-entry of the same card. card.fingerprint is stable
        // across re-tokenizations of the same PAN, so it's our true
        // identity key here.
        const fingerprint = card.fingerprint ?? null

        // If we already have a row for (user_id, fingerprint), just
        // update its stripe_payment_method_id + exp + brand so future
        // off-session charges hit the freshest pm_xxx. Skip insert.
        let existing: { id: string; is_default: boolean } | null = null
        if (fingerprint) {
          const { data } = await serviceClient
            .from('user_payment_methods')
            .select('id, is_default')
            .eq('user_id', userId)
            .eq('card_fingerprint', fingerprint)
            .maybeSingle()
          existing = data as { id: string; is_default: boolean } | null
        }

        if (existing) {
          // Refresh the stored pm_id + expiry so off-session charges
          // (e.g. auction wins) use the current Stripe handle. Don't
          // touch is_default — that's a user-controlled preference.
          const { error: updateErr } = await serviceClient
            .from('user_payment_methods')
            .update({
              stripe_payment_method_id: paymentMethodId,
              card_brand: card.brand,
              card_last4: card.last4,
              exp_month: card.exp_month,
              exp_year: card.exp_year,
            })
            .eq('id', existing.id)
          if (updateErr) {
            console.error('[stripe-webhook] failed to refresh payment method:', updateErr)
          } else {
            console.log('[stripe-webhook] refreshed existing pm by fingerprint for user', userId)
          }
        } else {
          // First time we've seen this card for this user. If they
          // have no other cards on file, make this one the default.
          const { count } = await serviceClient
            .from('user_payment_methods')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
          const isFirstCard = (count ?? 0) === 0

          const { error: pmError } = await serviceClient
            .from('user_payment_methods')
            .insert({
              user_id: userId,
              stripe_payment_method_id: paymentMethodId,
              card_brand: card.brand,
              card_last4: card.last4,
              exp_month: card.exp_month,
              exp_year: card.exp_year,
              card_fingerprint: fingerprint,
              is_default: isFirstCard,
            })

          if (pmError) {
            // The partial unique index on (user_id, card_fingerprint)
            // is a backstop — if a parallel webhook racing us got
            // there first, we'll hit a 23505 here. Treat as benign.
            if (pmError.code === '23505') {
              console.log('[stripe-webhook] pm already saved (concurrent insert)')
            } else {
              console.error('[stripe-webhook] failed to save payment method:', pmError)
            }
          } else {
            console.log('[stripe-webhook] payment method saved for user', userId)
          }
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

async function openListingOrder(
  intent: Stripe.PaymentIntent,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<Response> {
  const listing_id = intent.metadata?.listing_id
  const seller_id = intent.metadata?.seller_id
  const buyer_id = intent.metadata?.buyer_id

  if (!listing_id || !seller_id || !buyer_id) {
    console.error('[stripe-webhook] listing intent missing metadata', intent.id, intent.metadata)
    return new Response('Missing listing metadata', { status: 400 })
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/open-listing-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      listing_id,
      seller_id,
      buyer_id,
      payment_intent_id: intent.id,
      amount_cents: intent.amount,
      application_fee_cents: intent.application_fee_amount ?? 0,
      // When the buy was triggered by a drop, the create-drop-payment-intent
      // edge fn stamps drop_id + drop_qty into the PI metadata. open-listing-order
      // persists drop_id on each order row and, when drop_qty > 1, creates N
      // orders for a single PaymentIntent and skips the "mark listing sold"
      // step (the underlying listing is a drop template, not a single-copy
      // marketplace listing).
      drop_id: intent.metadata?.drop_id ?? null,
      drop_qty: intent.metadata?.drop_qty ? Number(intent.metadata.drop_qty) : null,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[stripe-webhook] open-listing-order failed', res.status, body)
    return new Response('open-listing-order failed', { status: 502 })
  }

  console.log('[stripe-webhook] listing order opened for intent', intent.id)
  return new Response('ok', { status: 200 })
}

/**
 * Multi-seller cart payment succeeded. Fans out:
 *   1. Idempotency: bail if order_group already 'paid' or beyond.
 *   2. Mark order_group paid, all child orders processing.
 *   3. For each order: flip listing to sold, transfer vault inventory
 *      (if applicable), create Stripe Transfer to seller's Connect
 *      account (item_price * 0.9 + shipping_cost), persist transfer_id +
 *      transfer_status. On failure: record failed_transfers row, mark
 *      order transfer_status='failed'.
 *   4. Roll up: if any transfer failed → group status='partial_payout_failed';
 *      else 'fully_paid_out'.
 *   5. Empty the buyer's cart_items.
 *   6. Fire buyer cart summary email + per-seller emails (Task 8 implements
 *      the templates; here we just invoke).
 *
 * The buyer never sees transfer failures — they paid InkStash, the
 * money's ours, and we reconcile out-of-band.
 */
async function openCartOrderGroup(
  intent: Stripe.PaymentIntent,
  stripe: Stripe,
  serviceClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<Response> {
  const groupId = intent.metadata?.order_group_id
  if (!groupId) {
    console.error('[stripe-webhook] cart intent missing order_group_id metadata', intent.id)
    return new Response('missing order_group_id', { status: 400 })
  }

  // 1. Idempotency. Stripe retries deliver this event up to 3+ times.
  const { data: groupRow, error: groupErr } = await serviceClient
    .from('order_groups')
    .select('id, status, buyer_id, total_amount')
    .eq('id', groupId)
    .maybeSingle()

  if (groupErr) {
    console.error('[stripe-webhook] order_group fetch failed', groupErr)
    return new Response('group fetch failed', { status: 500 })
  }
  if (!groupRow) {
    console.error('[stripe-webhook] order_group not found', groupId)
    return new Response('group not found', { status: 404 })
  }
  if (groupRow.status !== 'pending') {
    console.log('[stripe-webhook] cart group already processed', groupId, groupRow.status)
    return new Response('ok', { status: 200 })
  }

  // 2. Mark group paid + child orders processing.
  await serviceClient
    .from('order_groups')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', groupId)

  const { data: orders, error: ordersErr } = await serviceClient
    .from('orders')
    .select(`
      id, listing_id, seller_id, buyer_id, item_price, shipping_cost,
      shipping_full_name, shipping_address_line1, shipping_address_line2,
      shipping_city, shipping_state, shipping_postal_code, shipping_country,
      shipping_phone, order_number
    `)
    .eq('order_group_id', groupId)

  if (ordersErr || !orders) {
    console.error('[stripe-webhook] orders fetch failed', ordersErr)
    return new Response('orders fetch failed', { status: 500 })
  }

  await serviceClient
    .from('orders')
    .update({ status: 'processing' })
    .eq('order_group_id', groupId)

  // 3. Per-order processing.
  let anyTransferFailed = false
  for (const order of orders) {
    const o = order as {
      id: string
      listing_id: string
      seller_id: string
      buyer_id: string
      item_price: number
      shipping_cost: number
    }

    // 3a. Flip listing to sold. Also pull source_inventory_id + comic title
    //     so we can transfer vault inventory ownership and fire the email.
    const { data: listingRow } = await serviceClient
      .from('listings')
      .select('id, title, source_inventory_id, photos')
      .eq('id', o.listing_id)
      .maybeSingle()

    await serviceClient
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', o.listing_id)

    // 3b. If vault item, transfer inventory ownership.
    if (listingRow && (listingRow as { source_inventory_id?: string | null }).source_inventory_id) {
      const invId = (listingRow as { source_inventory_id: string }).source_inventory_id
      const { error: invErr } = await serviceClient
        .from('user_inventory')
        .update({ user_id: o.buyer_id, status: 'sold', sold_at: new Date().toISOString() })
        .eq('id', invId)
      if (invErr) {
        console.error('[stripe-webhook] inventory transfer failed', o.id, invErr)
      }
    }

    // 3c. Look up seller's Connect account.
    const { data: sellerRow } = await serviceClient
      .from('users')
      .select('id, stripe_connect_account_id, email')
      .eq('id', o.seller_id)
      .maybeSingle()

    const connectId = (sellerRow as { stripe_connect_account_id?: string } | null)?.stripe_connect_account_id

    if (!connectId) {
      // Should have been blocked at create-cart-payment-intent, but defensive.
      console.error('[stripe-webhook] seller has no connect account', o.seller_id)
      await serviceClient
        .from('orders')
        .update({ transfer_status: 'failed', transfer_last_error: 'no connect account' })
        .eq('id', o.id)
      await serviceClient
        .from('failed_transfers')
        .insert({ order_id: o.id, seller_id: o.seller_id, amount_cents: Math.round((o.item_price * 0.9 + o.shipping_cost) * 100), stripe_error: 'no connect account' })
      anyTransferFailed = true
      continue
    }

    // 3d. Stripe Transfer. Amount = (item_price * 0.9) + shipping_cost,
    //     converted to cents. InkStash keeps 10% of item_price; full
    //     shipping passes through (seller pays the label).
    const transferAmountCents = Math.round((Number(o.item_price) * 0.9 + Number(o.shipping_cost)) * 100)
    try {
      const transfer = await stripe.transfers.create({
        amount: transferAmountCents,
        currency: 'usd',
        destination: connectId,
        transfer_group: groupId,
        metadata: {
          order_id: o.id,
          order_group_id: groupId,
        },
      })
      await serviceClient
        .from('orders')
        .update({
          stripe_transfer_id: transfer.id,
          transfer_status: 'succeeded',
          transfer_attempts: 1,
        })
        .eq('id', o.id)
    } catch (err) {
      console.error('[stripe-webhook] transfer failed', o.id, err)
      const errMsg = err instanceof Error ? err.message : 'transfer failed'
      await serviceClient
        .from('orders')
        .update({
          transfer_status: 'failed',
          transfer_last_error: errMsg,
          transfer_attempts: 1,
        })
        .eq('id', o.id)
      await serviceClient
        .from('failed_transfers')
        .insert({ order_id: o.id, seller_id: o.seller_id, amount_cents: transferAmountCents, stripe_error: errMsg })
      anyTransferFailed = true
    }
  }

  // 4. Roll up group status.
  const finalStatus = anyTransferFailed ? 'partial_payout_failed' : 'fully_paid_out'
  const update: Record<string, unknown> = { status: finalStatus }
  if (!anyTransferFailed) update.fully_paid_out_at = new Date().toISOString()
  await serviceClient.from('order_groups').update(update).eq('id', groupId)

  // 5. Empty the buyer's cart.
  await serviceClient
    .from('cart_items')
    .delete()
    .eq('user_id', groupRow.buyer_id)

  // 6. Fire emails (best effort — failure here doesn't fail the webhook).
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-cart-checkout-buyer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ order_group_id: groupId }),
    })
  } catch (err) {
    console.warn('[stripe-webhook] buyer cart email failed (non-fatal)', err)
  }

  // Per-seller emails. Reuse the existing send-listing-sold-seller fn,
  // which expects a fat payload with listing details. We've got everything
  // already loaded above (orders + listingRow earlier in the loop won't
  // survive — refetch per email since each is independent).
  for (const order of orders) {
    const o = order as {
      id: string
      seller_id: string
      buyer_id: string
      listing_id: string
      item_price: number
      shipping_cost: number
    }
    try {
      const { data: l } = await serviceClient
        .from('listings')
        .select('id, title, comic_publisher, source_inventory_id')
        .eq('id', o.listing_id)
        .maybeSingle()
      if (!l) continue
      await fetch(`${supabaseUrl}/functions/v1/send-listing-sold-seller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          orderId: o.id,
          listing: l,
          buyer_id: o.buyer_id,
          seller_id: o.seller_id,
          amount_cents: Math.round((Number(o.item_price) + Number(o.shipping_cost)) * 100),
          payment_intent_id: intent.id,
        }),
      })
    } catch (err) {
      console.warn('[stripe-webhook] seller email failed (non-fatal)', o.id, err)
    }
  }

  console.log('[stripe-webhook] cart group processed', groupId, finalStatus)
  return new Response('ok', { status: 200 })
}
