// Edge Function: request-ship-item
// Flips an inventory item to shipping_pending. Inkstash team manually
// fulfills until real ShipStation integration lands (Phase 4).
//
// Body: { inventory_id: string }
// Returns: { ok: true }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  inventory_id?: string
  address_id?: string
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
    if (!body.inventory_id) {
      return json({ error: 'inventory_id is required' }, 400)
    }
    if (!body.address_id) {
      return json({ error: 'address_id is required' }, 400)
    }

    const { error: rpcError } = await serviceClient.rpc(
      'request_ship_inventory_item',
      {
        p_user_id: user.id,
        p_inventory_id: body.inventory_id,
        p_address_id: body.address_id,
      },
    )

    if (rpcError) {
      const msg = rpcError.message ?? ''
      if (msg.includes('inventory_not_found')) return json({ error: 'inventory_not_found' }, 404)
      if (msg.includes('not_owner')) return json({ error: 'not_owner' }, 403)
      if (msg.includes('not_shippable')) return json({ error: 'not_shippable', message: msg }, 409)
      if (msg.includes('address_invalid')) return json({ error: 'address_invalid' }, 400)
      console.error('[request-ship-item] RPC failed:', rpcError)
      return json({ error: 'Could not request shipment' }, 500)
    }

    return json({ ok: true }, 200)
  } catch (err) {
    console.error('[request-ship-item] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
