// supabase/functions/release-drop-capacity/index.ts
//
// Authenticated. Releases a provisional drop reservation when the buyer
// closes the modal before confirming payment. Guard rails:
//   - Looks up the PaymentIntent by id and confirms it belongs to the
//     calling user (buyer_id metadata match) AND references the given drop.
//   - Refuses to release if the PI has already succeeded — by then the
//     webhook has already done the work and rolling back capacity would
//     desync the orders table.
//   - Cancels the PI so the buyer can't accidentally complete it later
//     from a stale Elements session.
//
// Request body: { drop_id: string, payment_intent_id: string, qty?: number }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=denonext'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  drop_id?: string
  payment_intent_id?: string
  qty?: number
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

    const body: RequestBody = await req.json()
    if (!body.drop_id || !body.payment_intent_id) {
      return json({ error: 'drop_id and payment_intent_id required' }, 400)
    }
    const qty = Math.max(1, Math.floor(body.qty ?? 1))

    // Look up the PI to verify ownership + capture eligibility.
    let pi: Stripe.PaymentIntent
    try {
      pi = await stripe.paymentIntents.retrieve(body.payment_intent_id)
    } catch (err) {
      console.error('[release-drop-capacity] PI retrieve failed', err)
      return json({ error: 'payment_intent_not_found' }, 404)
    }

    if (pi.metadata?.drop_id !== body.drop_id) return json({ error: 'drop_id_mismatch' }, 400)
    if (pi.metadata?.buyer_id !== user.id) return json({ error: 'not_your_pi' }, 403)

    // If the PI already succeeded, the webhook will have done the order work.
    // Rolling back capacity now would create a phantom unsold copy.
    if (pi.status === 'succeeded' || pi.status === 'processing') {
      return json({ status: 'too_late', pi_status: pi.status }, 200)
    }

    // Cancel the PI so a stale Elements session can't complete it later.
    // Silently ignore errors here — release is the priority.
    try {
      if (pi.status !== 'canceled') await stripe.paymentIntents.cancel(pi.id)
    } catch (cancelErr) {
      console.warn('[release-drop-capacity] cancel failed (continuing)', cancelErr)
    }

    const { error: releaseErr } = await serviceClient
      .rpc('release_drop_capacity_n', { p_drop_id: body.drop_id, p_qty: qty })

    if (releaseErr) {
      console.error('[release-drop-capacity] release failed', releaseErr)
      return json({ error: 'release_failed' }, 500)
    }

    console.log('[release-drop-capacity] released', qty, 'copies of drop', body.drop_id, 'for user', user.id)
    return json({ status: 'released', qty }, 200)
  } catch (err) {
    console.error('[release-drop-capacity] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
