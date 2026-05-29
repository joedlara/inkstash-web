// Edge Function: open-pack-usd
// Opens a vendor pack after Stripe payment succeeds. Invoked by
// stripe-webhook (not by clients). The webhook sends user_id, pack_id,
// vendor_id, payment_intent_id, and the amounts already in cents.
//
// Flow:
//   1. Look up pack + items (must be origin='vendor', status='active')
//   2. Insert pack_purchases row keyed by payment_intent_id (idempotent)
//   3. Roll items (same draw logic as open-pack-rubies, but using
//      cover_treatment as the rarity dimension — we just pick weighted
//      by `quantity` / total remaining within the items pool, no
//      separate rarity-tier weights)
//   4. Update pack_items remaining
//   5. Insert user_inventory rows
//   6. Insert seller_payouts row (one per purchase)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  user_id: string
  pack_id: string
  vendor_id: string
  payment_intent_id: string
  gross_amount_cents: number
  application_fee_amount_cents: number
}

interface PackItem {
  id: string
  comic_title: string
  issue_number: string | null
  grade: string | null
  rarity: string
  cover_treatment: string | null
  declared_value: number | null
  estimated_value: number | null
  image_url: string | null
  remaining: number
  quantity: number
  is_chase: boolean | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const body: RequestBody = await req.json()
    if (!body.user_id || !body.pack_id || !body.vendor_id || !body.payment_intent_id) {
      return json({ error: 'Missing required fields' }, 400)
    }

    // Idempotency: was this intent already processed?
    const { data: existing } = await serviceClient
      .from('seller_payouts')
      .select('id, pack_purchase_id')
      .eq('stripe_payment_intent_id', body.payment_intent_id)
      .maybeSingle()
    if (existing) {
      return json({ ok: true, idempotent: true, purchase_id: existing.pack_purchase_id }, 200)
    }

    const { data: pack, error: packError } = await serviceClient
      .from('packs')
      .select('id, item_count, origin, status, value_lock')
      .eq('id', body.pack_id)
      .single()
    if (packError || !pack) return json({ error: 'Pack not found' }, 404)
    if (pack.origin !== 'vendor') return json({ error: 'Not a vendor pack' }, 400)
    if (pack.status !== 'active') return json({ error: `Pack not active (${pack.status})` }, 400)

    const { data: items, error: itemsError } = await serviceClient
      .from('pack_items')
      .select('id, comic_title, issue_number, grade, rarity, cover_treatment, declared_value, estimated_value, image_url, remaining, quantity, is_chase')
      .eq('pack_id', body.pack_id)
      .gt('remaining', 0)
    if (itemsError || !items || items.length === 0) {
      return json({ error: 'No items available' }, 400)
    }

    // Insert pack_purchases row
    const { data: purchase, error: purchaseError } = await serviceClient
      .from('pack_purchases')
      .insert({
        user_id: body.user_id,
        pack_id: body.pack_id,
        stripe_payment_intent_id: body.payment_intent_id,
      })
      .select('id')
      .single()
    if (purchaseError || !purchase) {
      console.error('[open-pack-usd] purchase insert failed:', purchaseError)
      return json({ error: 'Purchase insert failed' }, 500)
    }

    // Draw items. Weighted by `remaining` (more available = more likely).
    // is_chase items have their `quantity` divided by 10 before weighting
    // to make them appropriately rare — a 5-remaining chase shouldn't be
    // equally likely as a 50-remaining cardstock common.
    const drawn: PackItem[] = []
    const pool: PackItem[] = items as PackItem[]
    const decrementMap: Record<string, number> = {}

    for (let i = 0; i < pack.item_count; i++) {
      const candidates = pool.filter((p) => (p.remaining - (decrementMap[p.id] ?? 0)) > 0)
      if (candidates.length === 0) break
      const weights = candidates.map((c) => {
        const effective = (c.remaining - (decrementMap[c.id] ?? 0))
        return c.is_chase ? effective / 10 : effective
      })
      const totalWeight = weights.reduce((a, b) => a + b, 0)
      let r = Math.random() * totalWeight
      let chosen = candidates[0]
      for (let j = 0; j < candidates.length; j++) {
        r -= weights[j]
        if (r <= 0) { chosen = candidates[j]; break }
      }
      drawn.push(chosen)
      decrementMap[chosen.id] = (decrementMap[chosen.id] ?? 0) + 1
    }

    if (drawn.length === 0) {
      return json({ error: 'Could not draw any items' }, 500)
    }

    // Decrement remaining counts
    for (const [itemId, count] of Object.entries(decrementMap)) {
      const { data: currentItem } = await serviceClient
        .from('pack_items')
        .select('remaining')
        .eq('id', itemId)
        .single()
      if (currentItem && currentItem.remaining >= count) {
        await serviceClient
          .from('pack_items')
          .update({ remaining: currentItem.remaining - count })
          .eq('id', itemId)
          .gte('remaining', count)
      }
    }

    // Update pack_purchases with the drawn items
    await serviceClient
      .from('pack_purchases')
      .update({
        items_received: drawn,
        revealed_at: new Date().toISOString(),
      })
      .eq('id', purchase.id)

    // Seed user_inventory
    const inventoryRows = drawn.map((item) => ({
      user_id: body.user_id,
      pack_purchase_id: purchase.id,
      pack_item_id: item.id,
      status: 'vaulted',
    }))
    await serviceClient.from('user_inventory').insert(inventoryRows)

    // Look up the vendor's user_id — seller_payouts.payee_user_id points at auth.users.
    const { data: vendorRow } = await serviceClient
      .from('vendors')
      .select('user_id')
      .eq('id', body.vendor_id)
      .single()

    if (!vendorRow) {
      console.error('[open-pack-usd] vendor not found for payout insert:', body.vendor_id)
      return json({ error: 'Vendor not found' }, 500)
    }

    // Insert seller_payouts row (was vendor_payouts; renamed in M1 migration).
    const vendorAmountCents = body.gross_amount_cents - body.application_fee_amount_cents
    await serviceClient.from('seller_payouts').insert({
      payee_user_id: vendorRow.user_id,
      pack_purchase_id: purchase.id,
      pack_id: body.pack_id,
      gross_amount_cents: body.gross_amount_cents,
      vendor_amount_cents: vendorAmountCents,
      inkstash_amount_cents: body.application_fee_amount_cents,
      stripe_payment_intent_id: body.payment_intent_id,
      // stripe_transfer_id is null at this point; can be backfilled if needed
      // by querying the PaymentIntent's latest_charge.transfer
    })

    // Fire-and-forget confirmation email. Never fail the pack open if email errors —
    // the inventory + payout are the contract; the email is a nice-to-have.
    try {
      const { data: buyer } = await serviceClient
        .from('users')
        .select('email, username')
        .eq('id', body.user_id)
        .maybeSingle()

      const { data: vendor } = await serviceClient
        .from('vendors')
        .select('display_name, handle')
        .eq('id', body.vendor_id)
        .maybeSingle()

      const { data: packRow } = await serviceClient
        .from('packs')
        .select('name')
        .eq('id', body.pack_id)
        .maybeSingle()

      if (buyer?.email && vendor && packRow) {
        await fetch(`${supabaseUrl}/functions/v1/send-vendor-pack-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            buyerEmail: buyer.email,
            buyerName: buyer.username ?? buyer.email,
            packName: packRow.name,
            vendorDisplayName: vendor.display_name,
            vendorHandle: vendor.handle,
            amountUsdCents: body.gross_amount_cents,
            items: drawn.map((it) => ({
              comic_title: it.comic_title,
              cover_treatment: it.cover_treatment,
              declared_value: it.declared_value,
              image_url: it.image_url,
              is_chase: Boolean(it.is_chase),
            })),
            purchaseId: purchase.id,
            paymentIntentId: body.payment_intent_id,
          }),
        }).catch((err) => console.error('[open-pack-usd] confirmation email failed:', err))
      }
    } catch (err) {
      console.error('[open-pack-usd] confirmation email setup failed:', err)
    }

    return json({ ok: true, purchase_id: purchase.id, items: drawn }, 200)
  } catch (err) {
    console.error('[open-pack-usd] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
