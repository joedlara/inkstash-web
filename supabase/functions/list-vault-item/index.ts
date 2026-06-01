// supabase/functions/list-vault-item/index.ts
//
// Authenticated. Creates a vault listing atomically via the list_vault_item RPC.
// The RPC validates inventory ownership + status + house-origin + price floor.
//
// Request body:
//   { inventory_id: string, price_cents: number }
//
// Response:
//   { listing_id: string }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  inventory_id?: string
  price_cents?: number
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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body: RequestBody = await req.json()
    if (!body.inventory_id) return json({ error: 'inventory_id is required' }, 400)
    if (!body.price_cents || body.price_cents < 100) {
      return json({ error: 'price_cents must be at least 100' }, 400)
    }

    // Verify the user is allowed to sell (seller_status === 'active'). The RPC
    // itself doesn't enforce this — keeping it here in the edge function so
    // the error message is clear to the client.
    const { data: userRow } = await serviceClient
      .from('users')
      .select('seller_status')
      .eq('id', user.id)
      .maybeSingle()

    if (!userRow || userRow.seller_status !== 'active') {
      return json({
        error: 'seller_not_verified',
        message: 'Complete seller verification before listing items.',
      }, 403)
    }

    const { data: listingId, error: rpcError } = await serviceClient.rpc(
      'list_vault_item',
      {
        p_user_id: user.id,
        p_inventory_id: body.inventory_id,
        p_price_cents: body.price_cents,
      },
    )

    if (rpcError) {
      const msg = rpcError.message ?? ''
      console.error('[list-vault-item] RPC failed:', rpcError)
      if (msg.includes('not owner')) return json({ error: 'not_owner' }, 403)
      if (msg.includes('not vaulted')) return json({ error: 'not_vaulted', message: msg }, 409)
      if (msg.includes('cannot list vendor pack')) return json({ error: 'vendor_pack_item' }, 400)
      if (msg.includes('not found')) return json({ error: 'not_found', message: msg }, 404)
      return json({ error: 'list_failed', message: msg }, 500)
    }

    if (!listingId) {
      return json({ error: 'list_failed', message: 'RPC returned null' }, 500)
    }

    return json({ listing_id: listingId }, 200)
  } catch (err) {
    console.error('[list-vault-item] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
