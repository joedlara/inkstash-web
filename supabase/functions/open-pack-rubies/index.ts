// Edge Function: open-pack-rubies
// Atomic Ruby-debit pack open. Replaces the Stripe-based open-pack flow
// for the Phase 3 economy. No Stripe involvement.
//
// Flow:
//   1. Authenticate user
//   2. Look up pack, validate active, derive Ruby cost from pack.price
//   3. Call debit_rubies_and_create_purchase RPC (SECURITY DEFINER) which
//      atomically: deducts rubies (or raises insufficient_rubies), inserts
//      a pack_purchases row, inserts a ruby_transactions row.
//   4. Roll items (same logic as the old open-pack)
//   5. Update the pack_purchases row with items_received + revealed_at
//   6. Return { purchase_id, items }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

const RUBIES_PER_USD = 100

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

    const rubyCost = Math.round(Number(pack.price) * RUBIES_PER_USD)
    if (!Number.isFinite(rubyCost) || rubyCost <= 0) {
      return json({ error: 'Invalid pack price' }, 500)
    }

    // Atomic debit + purchase row creation. The RPC raises
    // 'insufficient_rubies' if the user can't afford it.
    const { data: purchaseId, error: rpcError } = await serviceClient.rpc(
      'debit_rubies_and_create_purchase',
      {
        p_user_id: user.id,
        p_pack_id: pack.id,
        p_ruby_cost: rubyCost,
      },
    )

    if (rpcError) {
      const msg = rpcError.message ?? ''
      if (msg.includes('insufficient_rubies')) {
        return json({ error: 'insufficient_rubies', message: 'Not enough Rubies.' }, 402)
      }
      console.error('[open-pack-rubies] RPC failed:', rpcError)
      return json({ error: 'Could not open pack' }, 500)
    }

    if (!purchaseId) {
      return json({ error: 'Could not create purchase' }, 500)
    }

    // Roll items
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

    const { error: updateError } = await serviceClient
      .from('pack_purchases')
      .update({
        items_received: drawn,
        revealed_at: new Date().toISOString(),
      })
      .eq('id', purchaseId)

    if (updateError) {
      console.error('[open-pack-rubies] update failed:', updateError)
      return json({ error: 'Failed to record items' }, 500)
    }

    return json({
      purchase_id: purchaseId,
      items: drawn,
      ruby_cost: rubyCost,
    }, 200)
  } catch (err) {
    console.error('[open-pack-rubies] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
