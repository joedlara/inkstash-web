import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OpenPackPayload {
  pack_id: string
  stripe_payment_intent_id?: string
}

interface PackItem {
  id: string
  comic_title: string
  issue_number: string | null
  grade: string | null
  rarity: 'common' | 'rare' | 'legendary'
  estimated_value: number | null
  image_url: string | null
}

interface RarityTiers {
  common: number
  rare: number
  legendary: number
}

function weightedRarityPick(tiers: RarityTiers): 'common' | 'rare' | 'legendary' {
  const roll = Math.random()
  if (roll < tiers.legendary) return 'legendary'
  if (roll < tiers.legendary + tiers.rare) return 'rare'
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
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: OpenPackPayload = await req.json()
    const { pack_id, stripe_payment_intent_id } = payload

    if (!pack_id) {
      return new Response(JSON.stringify({ error: 'pack_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: pack, error: packError } = await serviceClient
      .from('packs')
      .select('id, name, item_count, rarity_tiers, status')
      .eq('id', pack_id)
      .single()

    if (packError || !pack) {
      return new Response(JSON.stringify({ error: 'Pack not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (pack.status !== 'active') {
      return new Response(JSON.stringify({ error: `Pack is not available (status: ${pack.status})` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tiers = pack.rarity_tiers as RarityTiers

    const { data: availableItems, error: itemsError } = await serviceClient
      .from('pack_items')
      .select('id, comic_title, issue_number, grade, rarity, estimated_value, image_url')
      .eq('pack_id', pack_id)
      .gt('remaining', 0)

    if (itemsError || !availableItems || availableItems.length === 0) {
      return new Response(JSON.stringify({ error: 'No items available in this pack' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

    for (const [itemId, count] of Object.entries(decrementMap)) {
      const { data: currentItem } = await serviceClient
        .from('pack_items')
        .select('remaining')
        .eq('id', itemId)
        .single()

      if (currentItem) {
        await serviceClient
          .from('pack_items')
          .update({ remaining: Math.max(0, currentItem.remaining - count) })
          .eq('id', itemId)
      }
    }

    const { data: purchase, error: purchaseError } = await serviceClient
      .from('pack_purchases')
      .insert({
        user_id: user.id,
        pack_id,
        items_received: drawn,
        stripe_payment_intent_id: stripe_payment_intent_id || null,
        revealed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (purchaseError || !purchase) {
      return new Response(JSON.stringify({ error: 'Failed to record purchase' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ purchase_id: purchase.id, items: drawn }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
