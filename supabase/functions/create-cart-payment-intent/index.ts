// supabase/functions/create-cart-payment-intent/index.ts
//
// Authenticated. Creates ONE Stripe PaymentIntent on the InkStash platform
// account covering an entire multi-seller cart. The webhook later (Cart-Task7
// — openCartOrderGroup) fans out N Stripe Transfers to each seller's
// Connect account.
//
// Request body: {}  (cart implicit from caller's auth)
//
// Response (200): { client_secret, order_group_id, total_amount }
// Response (400): one of:
//   { error: 'empty_cart' }
//   { error: 'stale_items', stale_item_ids: [...] }
//   { error: 'no_shipping_address' }
//   { error: 'seller_not_connect_active', seller_ids: [...] }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=denonext'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CartListingJoin {
  listing_id: string
  listings: {
    id: string
    status: string
    user_id: string
    buy_now_price: number
    selected_shipping_rate_id: string | null
    title: string
    photos: Array<{ url?: string }> | null
    source_inventory_id: string | null
  } | null
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

    // 1. Load the cart with each item's current listing state.
    const { data: cartRowsRaw, error: cartErr } = await serviceClient
      .from('cart_items')
      .select(`
        listing_id,
        listings (
          id,
          status,
          user_id,
          buy_now_price,
          selected_shipping_rate_id,
          title,
          photos,
          source_inventory_id
        )
      `)
      .eq('user_id', user.id)

    if (cartErr) {
      console.error('[create-cart-payment-intent] cart fetch failed', cartErr)
      return json({ error: 'Failed to load cart' }, 500)
    }

    const cartRows = (cartRowsRaw ?? []) as unknown as CartListingJoin[]
    if (cartRows.length === 0) return json({ error: 'empty_cart' }, 400)

    // 2. Normalize listing objects (PostgREST can return either object or array).
    type Listing = NonNullable<CartListingJoin['listings']>
    function unwrap(l: CartListingJoin['listings']): Listing | null {
      if (!l) return null
      return Array.isArray(l) ? (l[0] ?? null) : l
    }

    const items = cartRows
      .map((r) => ({ listing_id: r.listing_id, listing: unwrap(r.listings) }))
      .filter((x): x is { listing_id: string; listing: Listing } => x.listing !== null)

    // 3. Reject stale items (status flipped to sold/delisted since they were added).
    const stale = items.filter((i) => i.listing.status !== 'active').map((i) => i.listing_id)
    if (stale.length > 0) {
      return json({ error: 'stale_items', stale_item_ids: stale }, 400)
    }

    // 4. Confirm every seller has a Stripe Connect account active. Without it,
    //    we can't Transfer to them after the buyer's charge succeeds.
    const sellerIds = Array.from(new Set(items.map((i) => i.listing.user_id)))
    const { data: sellers, error: sellersErr } = await serviceClient
      .from('users')
      .select('id, stripe_connect_account_id, seller_status')
      .in('id', sellerIds)

    if (sellersErr) {
      console.error('[create-cart-payment-intent] seller lookup failed', sellersErr)
      return json({ error: 'Failed to load sellers' }, 500)
    }

    const inactiveSellers = (sellers ?? []).filter(
      (s) => !(s as { stripe_connect_account_id?: string }).stripe_connect_account_id
        || (s as { seller_status?: string }).seller_status !== 'active',
    ).map((s) => s.id)

    if (inactiveSellers.length > 0) {
      return json({ error: 'seller_not_connect_active', seller_ids: inactiveSellers }, 400)
    }

    // 5. Load the buyer's default shipping address. M3's pattern uses
    //    user_addresses with is_default. If none, block checkout — they need
    //    to add one before proceeding.
    const { data: addressRow, error: addrErr } = await serviceClient
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle()

    if (addrErr) {
      console.error('[create-cart-payment-intent] address fetch failed', addrErr)
      return json({ error: 'Failed to load shipping address' }, 500)
    }
    if (!addressRow) return json({ error: 'no_shipping_address' }, 400)

    const address = addressRow as {
      full_name: string
      line1: string
      line2: string | null
      city: string
      state: string
      postal_code: string
      country: string
      phone: string | null
    }

    // 6. Load shipping rates so we can total correctly. Batched to avoid
    //    the PostgREST two-FK ambiguity between listings and shipping_rates.
    const rateIds = items
      .map((i) => i.listing.selected_shipping_rate_id)
      .filter((id): id is string => !!id)
    const ratesById = new Map<string, number>()
    if (rateIds.length > 0) {
      const { data: rateRows } = await serviceClient
        .from('shipping_rates')
        .select('id, shipping_amount')
        .in('id', rateIds)
      for (const r of rateRows ?? []) {
        ratesById.set(r.id as string, Number((r as { shipping_amount: number }).shipping_amount))
      }
    }

    // 7. Compute total. amount lives in dollars; we convert to cents at Stripe time.
    let totalAmount = 0
    const orderRowsToInsert: Array<{
      listing_id: string
      seller_id: string
      item_price: number
      shipping_cost: number
    }> = []

    for (const { listing } of items) {
      const itemPrice = Number(listing.buy_now_price)
      const shippingCost = listing.selected_shipping_rate_id
        ? (ratesById.get(listing.selected_shipping_rate_id) ?? 0)
        : 0
      totalAmount += itemPrice + shippingCost
      orderRowsToInsert.push({
        listing_id: listing.id,
        seller_id: listing.user_id,
        item_price: itemPrice,
        shipping_cost: shippingCost,
      })
    }

    if (totalAmount < 1) {
      return json({ error: 'Cart total is below minimum charge.' }, 400)
    }

    // 8. Insert order_groups row (pending until webhook fires).
    const { data: group, error: groupErr } = await serviceClient
      .from('order_groups')
      .insert({
        buyer_id: user.id,
        total_amount: totalAmount,
        stripe_payment_intent_id: `pending-${user.id}-${Date.now()}`, // placeholder
        status: 'pending',
      })
      .select('id')
      .single()

    if (groupErr || !group) {
      console.error('[create-cart-payment-intent] group insert failed', groupErr)
      return json({ error: 'Failed to create order group' }, 500)
    }

    // 9. Insert N orders, all tied to this group, all with status='pending'.
    //    Each order copies the buyer's shipping address inline (matches M3
    //    pattern). orders.order_number is required by old schema — generate one.
    const orderInserts = orderRowsToInsert.map((row) => ({
      order_group_id: group.id,
      buyer_id: user.id,
      seller_id: row.seller_id,
      listing_id: row.listing_id,
      purchase_type: 'listing' as const,
      status: 'pending' as const,
      transfer_status: 'pending' as const,
      transfer_attempts: 0,
      item_price: row.item_price,
      shipping_cost: row.shipping_cost,
      tax: 0,
      total: row.item_price + row.shipping_cost,
      order_number: `${group.id.substring(0, 8).toUpperCase()}-${row.listing_id.substring(0, 4).toUpperCase()}`,
      shipping_full_name: address.full_name,
      shipping_address_line1: address.line1,
      shipping_address_line2: address.line2,
      shipping_city: address.city,
      shipping_state: address.state,
      shipping_postal_code: address.postal_code,
      shipping_country: address.country,
      shipping_phone: address.phone,
    }))

    const { error: orderErr } = await serviceClient.from('orders').insert(orderInserts)
    if (orderErr) {
      console.error('[create-cart-payment-intent] orders insert failed', orderErr)
      // Roll back the order_group row so we don't leave orphans.
      await serviceClient.from('order_groups').delete().eq('id', group.id)
      return json({ error: 'Failed to create orders' }, 500)
    }

    // 10. Create Stripe PaymentIntent on the PLATFORM account (no transfer_data).
    //     The webhook fan-out (Cart-Task7) creates the per-seller Transfers
    //     after the charge clears.
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        payment_type: 'cart',
        order_group_id: group.id,
        buyer_id: user.id,
      },
    })

    // 11. Replace the placeholder PI id with the real one.
    const { error: updErr } = await serviceClient
      .from('order_groups')
      .update({ stripe_payment_intent_id: pi.id })
      .eq('id', group.id)

    if (updErr) {
      console.error('[create-cart-payment-intent] PI id update failed', updErr)
      // PaymentIntent is already created; the webhook will reconcile via
      // metadata.order_group_id even if this update somehow failed. Log + continue.
    }

    return json({
      client_secret: pi.client_secret,
      order_group_id: group.id,
      total_amount: totalAmount,
    }, 200)
  } catch (err) {
    console.error('[create-cart-payment-intent] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
