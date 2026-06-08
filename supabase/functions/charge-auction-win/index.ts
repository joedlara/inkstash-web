// supabase/functions/charge-auction-win/index.ts
//
// Host-triggered. Called by LiveControlPanel's resolver effect right
// after resolve_livestream_bid flips the item to 'sold'. Charges the
// winner's saved card off-session, splits via Stripe Connect to the
// seller's account, writes an auction_orders receipt row, and emails
// the winner (success or failure).
//
// Authentication: host of the stream only. We re-verify ownership
// instead of trusting the caller's claim.
//
// Body: { item_id: uuid }
// Returns:
//   { status: 'charged', payment_intent_id, amount_cents }
//   { status: 'charge_failed', error: string }
//   { status: 'already_charged' } — idempotent re-call
//   { status: 'no_winner' }       — item flipped to 'passed', nothing to charge
//
// Idempotent: if winner_charged_at is already set, return 'already_charged'
// without re-charging. This matters because the host's resolver effect
// may fire twice in StrictMode dev or on tab visibility change.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.168.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// $5 flat shipping (outside-vault) matches create-payment-intent's
// listing branch so the math feels consistent.
const SHIPPING_CENTS = 500
const DEFAULT_FEE_PCT = 0.10

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
    // @ts-expect-error Deno env
    const resendKey = Deno.env.get('VITE_RESEND_API_KEY') || Deno.env.get('RESEND_API_KEY') || ''

    if (!stripeSecret) return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const itemId: string = body.item_id
    if (!itemId) return json({ error: 'item_id_required' }, 400)

    // Load item + listing + stream in one shot. We need the seller
    // (stream host), the winner, the price, and the listing title for
    // emails + the order row.
    const { data: item } = await serviceClient
      .from('livestream_items')
      .select('id, livestream_id, listing_id, status, current_price_cents, current_winner_id, winner_charged_at, payment_intent_id')
      .eq('id', itemId)
      .maybeSingle()
    if (!item) return json({ error: 'item_not_found' }, 404)
    const i = item as {
      id: string; livestream_id: string; listing_id: string;
      status: string; current_price_cents: number | null;
      current_winner_id: string | null; winner_charged_at: string | null;
      payment_intent_id: string | null;
    }

    // Idempotency guard — never re-charge.
    if (i.winner_charged_at && i.payment_intent_id) {
      return json({ status: 'already_charged', payment_intent_id: i.payment_intent_id }, 200)
    }

    // No winner = no bids landed. Nothing to charge.
    if (!i.current_winner_id || !i.current_price_cents) {
      return json({ status: 'no_winner' }, 200)
    }

    // Status must be 'sold' (the RPC's terminal happy state). Any other
    // status (still 'live', 'sold_pending_payment', 'passed') means the
    // caller is racing the resolver or this row is already-resolved-
    // failure.
    if (i.status !== 'sold') {
      return json({ error: 'item_not_sold', item_status: i.status }, 409)
    }

    const { data: stream } = await serviceClient
      .from('livestreams')
      .select('id, host_user_id, title')
      .eq('id', i.livestream_id)
      .maybeSingle()
    if (!stream) return json({ error: 'stream_not_found' }, 404)
    const s = stream as { id: string; host_user_id: string; title: string }
    if (s.host_user_id !== user.id) return json({ error: 'not_host' }, 403)

    // Load seller (Connect account) and winner (saved card + email).
    const [{ data: seller }, { data: winner }, { data: listing }] = await Promise.all([
      serviceClient.from('users')
        .select('id, stripe_connect_account_id, seller_status, email, username')
        .eq('id', s.host_user_id).maybeSingle(),
      serviceClient.from('users')
        .select('id, stripe_customer_id, email, username')
        .eq('id', i.current_winner_id).maybeSingle(),
      serviceClient.from('listings')
        .select('id, title, photos, application_fee_pct, source_inventory_id')
        .eq('id', i.listing_id).maybeSingle(),
    ])
    if (!seller) return json({ error: 'seller_not_found' }, 404)
    if (!winner) return json({ error: 'winner_not_found' }, 404)
    if (!listing) return json({ error: 'listing_not_found' }, 404)
    const sellerRow = seller as { id: string; stripe_connect_account_id: string | null; seller_status: string | null; email: string | null; username: string | null }
    const winnerRow = winner as { id: string; stripe_customer_id: string | null; email: string | null; username: string | null }
    const listingRow = listing as { id: string; title: string; photos: Array<{ url?: string }> | null; application_fee_pct: number | null; source_inventory_id: string | null }

    if (sellerRow.seller_status !== 'active' || !sellerRow.stripe_connect_account_id) {
      return await markFailedAndReturn(serviceClient, itemId, 'seller_not_verified', winnerRow, listingRow, i.current_price_cents, resendKey)
    }
    if (!winnerRow.stripe_customer_id) {
      return await markFailedAndReturn(serviceClient, itemId, 'winner_missing_stripe_customer', winnerRow, listingRow, i.current_price_cents, resendKey)
    }

    // Look up the winner's default saved card via user_payment_methods.
    // Per charge-saved-card the project keeps this table in sync with
    // the Stripe Customer; we don't hit Stripe to list cards here.
    const { data: pmRow } = await serviceClient
      .from('user_payment_methods')
      .select('stripe_payment_method_id')
      .eq('user_id', winnerRow.id)
      .eq('is_default', true)
      .maybeSingle()
    const paymentMethodId = (pmRow as { stripe_payment_method_id: string | null } | null)?.stripe_payment_method_id ?? null
    if (!paymentMethodId) {
      return await markFailedAndReturn(serviceClient, itemId, 'no_card_on_file', winnerRow, listingRow, i.current_price_cents, resendKey)
    }

    // Compute amounts. Same shape as the fixed-price listing branch in
    // create-payment-intent: fee is on the item only, shipping passes
    // through to the seller at cost.
    const itemCents = i.current_price_cents
    const shippingCents = listingRow.source_inventory_id ? 0 : SHIPPING_CENTS
    const feePct = Number(listingRow.application_fee_pct ?? DEFAULT_FEE_PCT)
    const feeCents = Math.round(itemCents * feePct)
    const amountCents = itemCents + shippingCents

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    let intent: Stripe.PaymentIntent
    try {
      intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        customer: winnerRow.stripe_customer_id,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        // Connect routing: fee stays with InkStash, rest moves to seller.
        transfer_data: { destination: sellerRow.stripe_connect_account_id },
        application_fee_amount: feeCents,
        metadata: {
          payment_type: 'auction_win',
          livestream_item_id: itemId,
          livestream_id: i.livestream_id,
          listing_id: listingRow.id,
          seller_id: sellerRow.id,
          buyer_id: winnerRow.id,
        },
      })
    } catch (err) {
      const stripeErr = err as Stripe.errors.StripeError
      // Off-session can raise 'authentication_required' (3DS), card
      // decline codes, etc. We treat all of them the same in MVP:
      // mark the item sold_pending_payment, save the error string,
      // notify the winner.
      const reason = stripeErr.code || stripeErr.message || 'charge_failed'
      return await markFailedAndReturn(serviceClient, itemId, reason, winnerRow, listingRow, itemCents, resendKey)
    }

    if (intent.status !== 'succeeded') {
      // E.g. 'requires_action' (3DS) — still a failure for our purposes
      // since the host can't do anything about it mid-stream.
      return await markFailedAndReturn(serviceClient, itemId, `status_${intent.status}`, winnerRow, listingRow, itemCents, resendKey, intent.id)
    }

    // ── Success: stamp item, write order row, email winner ────────────
    await serviceClient.from('livestream_items').update({
      payment_intent_id: intent.id,
      winner_charged_at: new Date().toISOString(),
      charge_error: null,
    }).eq('id', itemId)

    // upsert by stripe_payment_intent_id so a redundant call doesn't
    // duplicate the order row (UNIQUE constraint also enforces this).
    await serviceClient.from('auction_orders').upsert({
      livestream_item_id: itemId,
      livestream_id: i.livestream_id,
      listing_id: listingRow.id,
      buyer_id: winnerRow.id,
      seller_id: sellerRow.id,
      amount_cents: itemCents,
      shipping_cents: shippingCents,
      application_fee_cents: feeCents,
      stripe_payment_intent_id: intent.id,
    }, { onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true })

    // Best-effort win email. Don't block the response on this.
    if (resendKey && winnerRow.email) {
      sendWinnerSuccessEmail(resendKey, {
        to: winnerRow.email,
        winnerName: winnerRow.username ?? 'there',
        itemTitle: listingRow.title,
        itemImageUrl: listingRow.photos?.[0]?.url ?? '',
        amountCents: itemCents,
        shippingCents,
        sellerName: sellerRow.username ?? 'the seller',
        streamTitle: s.title,
      }).catch((err) => console.warn('[charge-auction-win] win email failed', err))
    }

    return json({
      status: 'charged',
      payment_intent_id: intent.id,
      amount_cents: amountCents,
    }, 200)
  } catch (err) {
    console.error('[charge-auction-win] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

// Marks an item sold_pending_payment + saves the error reason and
// emails the winner that their card failed. Used by every "we got
// here, the card didn't work" path so we don't duplicate logic.
async function markFailedAndReturn(
  serviceClient: ReturnType<typeof createClient>,
  itemId: string,
  reason: string,
  winner: { email: string | null; username: string | null },
  listing: { title: string; photos: Array<{ url?: string }> | null },
  amountCents: number,
  resendKey: string,
  paymentIntentId?: string,
): Promise<Response> {
  await serviceClient.from('livestream_items').update({
    status: 'sold_pending_payment',
    charge_error: reason,
    payment_intent_id: paymentIntentId ?? null,
  }).eq('id', itemId)

  if (resendKey && winner.email) {
    sendWinnerFailedEmail(resendKey, {
      to: winner.email,
      winnerName: winner.username ?? 'there',
      itemTitle: listing.title,
      itemImageUrl: listing.photos?.[0]?.url ?? '',
      amountCents,
      reason,
    }).catch((err) => console.warn('[charge-auction-win] failure email failed', err))
  }

  return json({ status: 'charge_failed', error: reason }, 200)
}

// ── Email helpers ────────────────────────────────────────────────────────

interface WinPayload {
  to: string; winnerName: string;
  itemTitle: string; itemImageUrl: string;
  amountCents: number; shippingCents: number;
  sellerName: string; streamTitle: string;
}
async function sendWinnerSuccessEmail(resendKey: string, p: WinPayload) {
  const total = ((p.amountCents + p.shippingCents) / 100).toFixed(2)
  const item = (p.amountCents / 100).toFixed(2)
  const ship = (p.shippingCents / 100).toFixed(2)
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: 'InkStash <notifications@inkstash.com>',
      to: [p.to],
      subject: `🎉 You won "${p.itemTitle}" — $${total} charged`,
      html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <h1 style="margin:0 0 8px;font-size:24px;">You won, ${escapeHtml(p.winnerName)}!</h1>
  <p style="color:#555;margin:0 0 24px;">Your card was charged for the auction you won on <strong>${escapeHtml(p.streamTitle)}</strong> with ${escapeHtml(p.sellerName)}.</p>
  ${p.itemImageUrl ? `<img src="${p.itemImageUrl}" alt="" style="width:100%;max-height:320px;object-fit:cover;border-radius:8px;margin-bottom:16px;">` : ''}
  <h2 style="margin:0 0 8px;font-size:18px;">${escapeHtml(p.itemTitle)}</h2>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:6px 0;color:#555;">Winning bid</td><td style="padding:6px 0;text-align:right;font-variant-numeric:tabular-nums;">$${item}</td></tr>
    <tr><td style="padding:6px 0;color:#555;">Shipping</td><td style="padding:6px 0;text-align:right;font-variant-numeric:tabular-nums;">$${ship}</td></tr>
    <tr style="border-top:1px solid #eee;"><td style="padding:10px 0;font-weight:700;">Charged</td><td style="padding:10px 0;text-align:right;font-weight:800;font-variant-numeric:tabular-nums;">$${total}</td></tr>
  </table>
  <p style="color:#555;font-size:14px;">${escapeHtml(p.sellerName)} will ship your item within 3–5 business days. Tracking info comes to this email once it's on the way.</p>
</div>`,
    }),
  })
}

interface FailPayload {
  to: string; winnerName: string;
  itemTitle: string; itemImageUrl: string;
  amountCents: number; reason: string;
}
async function sendWinnerFailedEmail(resendKey: string, p: FailPayload) {
  const amount = (p.amountCents / 100).toFixed(2)
  const friendlyReason = friendlyChargeError(p.reason)
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: 'InkStash <notifications@inkstash.com>',
      to: [p.to],
      subject: `Card declined for "${p.itemTitle}" — auction win`,
      html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <h1 style="margin:0 0 8px;font-size:22px;">We couldn't charge your card</h1>
  <p style="color:#555;margin:0 0 16px;">Hi ${escapeHtml(p.winnerName)}, you won <strong>${escapeHtml(p.itemTitle)}</strong> for $${amount} but the charge didn't go through.</p>
  ${p.itemImageUrl ? `<img src="${p.itemImageUrl}" alt="" style="width:100%;max-height:240px;object-fit:cover;border-radius:8px;margin-bottom:16px;">` : ''}
  <div style="background:#fff3cd;border-left:4px solid #f0ad4e;padding:12px 16px;border-radius:4px;margin:16px 0;">
    <strong>Reason:</strong> ${escapeHtml(friendlyReason)}
  </div>
  <p style="color:#555;font-size:14px;">The seller has been notified and will decide whether to re-list the item or contact you directly. If you'd like to keep your win, reach out to them within 24 hours and update your payment method in Settings.</p>
</div>`,
    }),
  })
}

function friendlyChargeError(code: string): string {
  if (code.includes('insufficient_funds')) return 'Insufficient funds on your card.'
  if (code.includes('card_declined')) return 'Your card was declined by the issuing bank.'
  if (code.includes('expired_card')) return 'Your card has expired.'
  if (code.includes('authentication_required')) return 'Your bank required extra authentication that we can\'t complete off-session.'
  if (code.includes('no_card_on_file')) return 'No payment method on file.'
  if (code.includes('winner_missing_stripe_customer')) return 'No payment method on file.'
  if (code.includes('seller_not_verified')) return 'Seller account isn\'t verified for payouts. Not your fault — please contact the seller directly.'
  return code
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
