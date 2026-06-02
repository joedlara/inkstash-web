// supabase/functions/delist-listing/index.ts
//
// Authenticated. Takes a listing down from the marketplace:
//   1. Flip listings.status to 'delisted' and set delisted_at = now()
//   2. If the listing was from a vault item, flip user_inventory.status
//      back to 'vaulted'. sell_back_forfeited stays true (M2 policy:
//      one-shot forfeit, even after delist).
//
// Body: { listing_id: string }
// Response: { success: true }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  listing_id?: string
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
    if (!body.listing_id) return json({ error: 'listing_id is required' }, 400)

    // Load the listing - confirm caller is the owner and it's still active.
    const { data: listing, error: listingErr } = await serviceClient
      .from('listings')
      .select('id, user_id, status, source_inventory_id')
      .eq('id', body.listing_id)
      .maybeSingle()

    if (listingErr) {
      console.error('[delist-listing] listing fetch failed', listingErr)
      return json({ error: 'Failed to load listing' }, 500)
    }
    if (!listing) return json({ error: 'Listing not found' }, 404)
    if (listing.user_id !== user.id) return json({ error: 'Not your listing' }, 403)
    if (listing.status !== 'active') {
      return json({ error: `Listing is already ${listing.status}` }, 400)
    }

    // 1. Flip listings.status
    const { error: updListingErr } = await serviceClient
      .from('listings')
      .update({ status: 'delisted', delisted_at: new Date().toISOString() })
      .eq('id', listing.id)

    if (updListingErr) {
      console.error('[delist-listing] listing update failed', updListingErr)
      return json({ error: 'Failed to delist' }, 500)
    }

    // 2. If it was a vault item, return the inventory row to 'vaulted'.
    //    sell_back_forfeited stays true intentionally.
    if (listing.source_inventory_id) {
      const { error: updInvErr } = await serviceClient
        .from('user_inventory')
        .update({ status: 'vaulted' })
        .eq('id', listing.source_inventory_id)

      if (updInvErr) {
        // Non-fatal — log it but still report success. The listing is
        // already delisted; an orphaned inventory row in 'listed' state
        // is recoverable via a follow-up admin script.
        console.error('[delist-listing] inventory flip failed', updInvErr)
      }
    }

    return json({ success: true }, 200)
  } catch (err) {
    console.error('[delist-listing] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
