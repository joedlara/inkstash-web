// Edge Function: create-payment-intent
// Creates a Stripe PaymentIntent for a pack purchase. Authenticated user.
// Returns { clientSecret, paymentIntentId, amount } for the frontend
// to confirm via Stripe Elements.

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

    const { data: pack, error: packError } = await serviceClient
      .from('packs')
      .select('id, name, price, status')
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

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        pack_id: pack.id,
        pack_name: pack.name,
        user_id: user.id,
      },
    })

    return json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: amountCents,
    }, 200)
  } catch (err) {
    console.error('[create-payment-intent] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
