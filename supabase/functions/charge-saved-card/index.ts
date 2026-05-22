// Edge Function: charge-saved-card
// One-tap pack purchase using the user's stored Stripe payment method.
// No client-side Stripe Elements involved — we confirm the intent server-side
// with off_session=true. Returns the purchase_id and items once both the
// charge and the pack roll have completed.
//
// Flow:
//   1. Auth + load user's stripe_customer_id and default payment_method
//   2. Read pack, validate active status + price
//   3. Create + confirm a PaymentIntent in one call with off_session
//   4. Insert pack_purchases row directly (no webhook race)
//   5. Roll items via the same logic as open-pack and update the row
//   6. Return { purchase_id, items, amount }
//
// Differences from create-payment-intent:
//   - Confirms immediately (no clientSecret returned to the frontend)
//   - Bypasses the webhook for the row insert; webhook still upserts on
//     payment_intent.succeeded but ignoreDuplicates handles it
//   - 3DS failures return a 402 with `requires_action` so the frontend can
//     fall back to the regular modal flow (Phase 3 will handle this in-app)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.168.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  pack_id?: string
}

interface PackItem {
  id: string
  comic_title: string
  issue_number: string | null
  grade: string | null
  rarity: 'common' | 'rare' | 'legendary'
  estimated_value: number | null
  image_url: string | null
  remaining: number
}

interface RarityTiers {
  common: number
  rare: number
  legendary: number
}

function weightedRarityPick(tiers: RarityTiers): keyof RarityTiers {
  const r = Math.random()
  if (r < tiers.legendary) return 'legendary'
  if (r < tiers.legendary + tiers.rare) return 'rare'
  return 'common'
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
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
    if (!body.pack_id) {
      return json({ error: 'pack_id is required' }, 400)
    }

    // Load user's Stripe Customer + default payment method
    const { data: userRow } = await serviceClient
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!userRow?.stripe_customer_id) {
      return json({ error: 'No saved payment method' }, 400)
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

    // Load pack
    const { data: pack, error: packError } = await serviceClient
      .from('packs')
      .select('id, name, price, status, item_count, rarity_tiers')
      .eq('id', body.pack_id)
      .single()

    if (packError || !pack) {
      return json({ error: 'Pack not found' }, 404)
    }

    if (pack.status !== 'active') {
      return json({ error: `This pack is no longer available (${pack.status})` }, 400)
    }

    const amountCents = Math.round(Number(pack.price) * 100)
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return json({ error: 'Invalid pack price' }, 500)
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Create + confirm in one call. off_session=true tells Stripe the user
    // is not present; if 3DS is required, Stripe throws and we return 402.
    let intent: Stripe.PaymentIntent
    try {
      intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        customer: userRow.stripe_customer_id,
        payment_method: pmRow.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: {
          pack_id: pack.id,
          pack_name: pack.name,
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

    // Roll the pack items now (same logic as open-pack)
    const tiers = pack.rarity_tiers as RarityTiers

    const { data: availableItems, error: itemsError } = await serviceClient
      .from('pack_items')
      .select('id, comic_title, issue_number, grade, rarity, estimated_value, image_url, remaining')
      .eq('pack_id', pack.id)
      .gt('remaining', 0)

    if (itemsError || !availableItems || availableItems.length === 0) {
      return json({ error: 'No items available in this pack' }, 400)
    }

    const byRarity: Record<string, PackItem[]> = { common: [], rare: [], legendary: [] }
    for (const item of availableItems as PackItem[]) {
      byRarity[item.rarity]?.push(item)
    }

    const drawn: PackItem[] = []
    const decrementMap: Record<string, number> = {}

    for (let i = 0; i < pack.item_count; i++) {
      let selectedItem: PackItem | null = null
      for (let attempt = 0; attempt < 10; attempt++) {
        const rarity = weightedRarityPick(tiers)
        const pool = byRarity[rarity]
        if (pool && pool.length > 0) {
          selectedItem = pickRandom(pool)
          break
        }
      }
      if (!selectedItem) {
        const allAvailable = Object.values(byRarity).flat()
        if (allAvailable.length > 0) selectedItem = pickRandom(allAvailable)
      }
      if (!selectedItem) continue

      drawn.push(selectedItem)
      decrementMap[selectedItem.id] = (decrementMap[selectedItem.id] || 0) + 1
    }

    if (drawn.length === 0) {
      return json({ error: 'Could not draw any items from this pack' }, 500)
    }

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

    // Insert the purchase row. The webhook may also insert via upsert with
    // ignoreDuplicates, but the unique constraint on stripe_payment_intent_id
    // makes either order safe.
    const { data: purchase, error: purchaseError } = await serviceClient
      .from('pack_purchases')
      .upsert(
        {
          user_id: user.id,
          pack_id: pack.id,
          items_received: drawn,
          stripe_payment_intent_id: intent.id,
          revealed_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_payment_intent_id' },
      )
      .select('id')
      .single()

    if (purchaseError || !purchase) {
      console.error('[charge-saved-card] purchase insert failed:', purchaseError)
      return json({ error: 'Failed to record purchase' }, 500)
    }

    return json({
      purchase_id: purchase.id,
      items: drawn,
      amount: amountCents,
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
