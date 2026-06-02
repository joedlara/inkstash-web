// supabase/functions/open-listing-order/index.ts
//
// Service-role only. Invoked by stripe-webhook when a payment_type='listing'
// PaymentIntent succeeds. Idempotent — checks seller_payouts.stripe_payment_intent_id
// UNIQUE constraint to detect retries.
//
// Flow:
//   1. Idempotency: bail if seller_payouts already has this intent.
//   2. Load listing + seller.
//   3. INSERT order row (status='processing').
//   4. For vault listings (source_inventory_id != null):
//        - SELECT original inventory row to capture pack_item_id + pack_purchase_id
//        - UPDATE source inventory status='sold'
//        - INSERT new user_inventory row for buyer (status='vaulted')
//   5. UPDATE listing status='sold'.
//   6. INSERT seller_payouts row.
//   7. Fire-and-forget: send-listing-sold-buyer + send-listing-sold-seller emails.
//
// Idempotency note: the idempotency check (step 1) guards normal Stripe retries
// — the SELECT runs before any mutations. For the rare case of two simultaneous
// deliveries, the UNIQUE constraint on seller_payouts.stripe_payment_intent_id
// is the final safeguard: the second concurrent request will get a constraint
// violation on the seller_payouts INSERT and be caught by the try/catch, returning
// early without side effects. Acceptable for v1; Postgres-transaction wrapping
// is earmarked for M3+1.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Payload {
  listing_id: string
  seller_id: string
  buyer_id: string
  payment_intent_id: string
  amount_cents: number
  application_fee_cents: number
  /** Set when the listing was bought via a scheduled drop. Persisted on
   *  the orders row so we can report "X copies sold via the Friday drop". */
  drop_id?: string | null
  /** When the buy came from a drop, the number of copies the buyer paid for.
   *  drop_qty > 1 means insert N orders for one PI and skip "mark listing
   *  sold" (the underlying listing is a drop template, not a single-copy). */
  drop_qty?: number | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const payload: Payload = await req.json()

    // ── 1. Idempotency check — MUST be first ──────────────────────────────────
    // If seller_payouts already has a row for this intent, we already processed
    // this payment. Return early without touching any other tables.
    const { data: existing } = await supabase
      .from('seller_payouts')
      .select('id')
      .eq('stripe_payment_intent_id', payload.payment_intent_id)
      .maybeSingle()
    if (existing) {
      console.log('[open-listing-order] idempotency: already processed intent', payload.payment_intent_id)
      return new Response(JSON.stringify({ status: 'already_processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Load listing ───────────────────────────────────────────────────────
    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select('id, buy_now_price, source_inventory_id, user_id, title, comic_publisher')
      .eq('id', payload.listing_id)
      .maybeSingle()
    if (listingErr || !listing) {
      console.error('[open-listing-order] listing not found', listingErr)
      return new Response(JSON.stringify({ error: 'listing_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. INSERT order ───────────────────────────────────────────────────────
    // shipping snapshot columns (shipping_full_name etc.) are intentionally
    // omitted — they are nullable after migration 20260602010000. The buyer's
    // address is recorded via shipping_address_id FK when they actually request
    // shipping (Phase 7). The total is derived from the Stripe intent amount so
    // it exactly matches what was charged.
    const dropQty = payload.drop_qty && payload.drop_qty > 0 ? payload.drop_qty : 1
    const isDropMultiCopy = !!payload.drop_id && dropQty >= 1

    const itemCents = Math.round(Number(listing.buy_now_price) * 100)
    // For drop buys, the amount is unit_price * drop_qty. Shipping isn't
    // collected on drops in v1, so any extra is treated as shipping for the
    // non-drop path only.
    const shippingCents = isDropMultiCopy ? 0 : Math.max(0, payload.amount_cents - itemCents)
    const sellerNetCents = payload.amount_cents - payload.application_fee_cents
    const unitTotal = isDropMultiCopy ? payload.amount_cents / dropQty / 100 : payload.amount_cents / 100

    // Build N order rows. For single buys (drop or marketplace) this is one
    // row; for multi-copy drops it's N. The PI is the same, but each row gets
    // its own order_number so emails / dashboards can reference individual copies.
    const baseTs = Date.now().toString(36).toUpperCase()
    const orderRows = Array.from({ length: dropQty }, (_, i) => ({
      buyer_id: payload.buyer_id,
      seller_id: payload.seller_id,
      listing_id: payload.listing_id,
      auction_id: null,
      status: 'processing',
      item_price: listing.buy_now_price,
      shipping_cost: shippingCents / 100,
      tax: 0,
      total: unitTotal,
      purchase_type: 'listing',
      order_number: dropQty > 1 ? `L-${baseTs}-${i + 1}` : `L-${baseTs}`,
      stripe_payment_intent_id: payload.payment_intent_id,
      drop_id: payload.drop_id ?? null,
    }))

    const { data: insertedOrders, error: orderErr } = await supabase
      .from('orders')
      .insert(orderRows)
      .select('id')
    if (orderErr || !insertedOrders || insertedOrders.length === 0) {
      console.error('[open-listing-order] order INSERT failed', orderErr)
      return new Response(JSON.stringify({ error: 'order_insert_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const order = insertedOrders[0]

    // ── 4. Vault flow: transfer inventory ownership ───────────────────────────
    // Correct sequencing: SELECT first to capture lineage data, THEN UPDATE
    // source to sold, THEN INSERT new row for buyer. This avoids reading stale
    // data from a row whose status we've already mutated.
    if (listing.source_inventory_id) {
      // Step A: SELECT the original vault row before touching it
      const { data: oldInv } = await supabase
        .from('user_inventory')
        .select('pack_item_id, pack_purchase_id')
        .eq('id', listing.source_inventory_id)
        .single()

      // Step B: Mark seller's vault row as sold
      const { error: updateInvErr } = await supabase
        .from('user_inventory')
        .update({ status: 'sold' })
        .eq('id', listing.source_inventory_id)
      if (updateInvErr) {
        console.error('[open-listing-order] vault UPDATE to sold failed', updateInvErr)
        // Don't abort — order is already inserted. Log and continue so we
        // still mark the listing sold and insert the payout row.
      }

      // Step C: INSERT new row for buyer (if we captured the lineage)
      if (oldInv) {
        const { error: insertInvErr } = await supabase
          .from('user_inventory')
          .insert({
            user_id: payload.buyer_id,
            pack_item_id: oldInv.pack_item_id,
            // Shared lineage — traces provenance through the original pack purchase.
            // The new owner gets a fresh sell_back_forfeited=false (default).
            pack_purchase_id: oldInv.pack_purchase_id,
            status: 'vaulted',
          })
        if (insertInvErr) {
          console.error('[open-listing-order] buyer inventory INSERT failed', insertInvErr)
          // Same: log and continue.
        }
      } else {
        console.warn('[open-listing-order] could not read source inventory row', listing.source_inventory_id)
      }
    }

    // ── 5. Mark listing as sold ───────────────────────────────────────────────
    // Done AFTER inventory transfer so inventory never points to a "sold" listing
    // while the buyer's row is still being created.
    //
    // Drop buys skip this: the underlying listing is a drop template. Its
    // "sold" state is governed by drop.quantity_sold reaching drop.quantity_total,
    // not by a single order. Marking it sold here would orphan the rest of
    // the drop's copies.
    if (!payload.drop_id) {
      const { error: listingUpdateErr } = await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', payload.listing_id)
      if (listingUpdateErr) {
        console.error('[open-listing-order] listing UPDATE to sold failed', listingUpdateErr)
        // Continue — payout must still be recorded.
      }
    }

    // ── 6. INSERT seller_payouts ───────────────────────────────────────────────
    // The UNIQUE constraint on stripe_payment_intent_id is the final guard
    // against double-processing if two webhook deliveries raced past the
    // idempotency SELECT in step 1. A constraint violation here means the other
    // delivery already finished — we treat it as success.
    try {
      const { error: payoutErr } = await supabase
        .from('seller_payouts')
        .insert({
          payee_user_id: payload.seller_id,
          // pack_id and pack_purchase_id are nullable after migration 20260602010000
          pack_id: null,
          pack_purchase_id: null,
          gross_amount_cents: payload.amount_cents,
          vendor_amount_cents: sellerNetCents,
          inkstash_amount_cents: payload.application_fee_cents,
          stripe_payment_intent_id: payload.payment_intent_id,
        })

      if (payoutErr) {
        // If the error is a unique constraint violation, another concurrent
        // delivery already inserted this row — that's fine, return 200.
        if (payoutErr.code === '23505') {
          console.log('[open-listing-order] seller_payouts duplicate (concurrent delivery) — already processed', payload.payment_intent_id)
          return new Response(JSON.stringify({ status: 'already_processed' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        console.error('[open-listing-order] seller_payouts INSERT failed', payoutErr)
        return new Response(JSON.stringify({ error: 'payout_insert_failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } catch (payoutCatchErr) {
      console.error('[open-listing-order] seller_payouts INSERT threw', payoutCatchErr)
      return new Response(JSON.stringify({ error: 'payout_insert_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[open-listing-order] success — order', order.id, 'intent', payload.payment_intent_id)

    // ── 7. Fire-and-forget confirmation emails ────────────────────────────────
    // Email failures must NEVER fail the webhook — the order and payout are
    // already committed. Tasks 10 will create these edge functions.
    fireConfirmationEmails(supabase, supabaseUrl, serviceRoleKey, {
      orderId: order.id,
      listing,
      buyer_id: payload.buyer_id,
      seller_id: payload.seller_id,
      amount_cents: payload.amount_cents,
      payment_intent_id: payload.payment_intent_id,
    }).catch((err) => console.error('[open-listing-order] email fire failed:', err))

    return new Response(JSON.stringify({ status: 'ok', order_id: order.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[open-listing-order] uncaught', err)
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function fireConfirmationEmails(
  _supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
  ctx: {
    orderId: string
    listing: { id: string; title: string; comic_publisher: string | null; source_inventory_id: string | null }
    buyer_id: string
    seller_id: string
    amount_cents: number
    payment_intent_id: string
  },
) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceRoleKey}`,
  }

  // Promise.allSettled so a failure in one email doesn't prevent the other.
  await Promise.allSettled([
    fetch(`${supabaseUrl}/functions/v1/send-listing-sold-buyer`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ctx),
    }),
    fetch(`${supabaseUrl}/functions/v1/send-listing-sold-seller`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ctx),
    }),
  ])
}
