// supabase/functions/initiate-seller-connect/index.ts
//
// Authenticated. Provisions a Stripe Connect Express account for the
// authenticated user, stores stripe_connect_account_id + seller_status='pending'
// on the users row, generates a Stripe onboarding link, returns the URL.
//
// The webhook (account.updated) flips seller_status to 'active' once the user
// completes Stripe's hosted onboarding and Stripe enables charges + payouts.
//
// Idempotent: if the user already has a stripe_connect_account_id, we
// generate a fresh onboarding link (Stripe links expire after ~1 hour) and
// return it without creating a duplicate account.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.168.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!

    if (!stripeSecret) return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Load the user's current state.
    const { data: userRow, error: userLookupError } = await serviceClient
      .from('users')
      .select('id, email, username, stripe_connect_account_id, seller_status')
      .eq('id', user.id)
      .single()

    if (userLookupError || !userRow) {
      console.error('[initiate-seller-connect] user lookup failed:', userLookupError)
      return json({ error: 'User not found' }, 500)
    }

    let connectAccountId = userRow.stripe_connect_account_id

    if (!connectAccountId) {
      // First-time: create the Stripe Connect Express account.
      const account = await stripe.accounts.create({
        type: 'express',
        email: userRow.email ?? user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          inkstash_user_id: user.id,
          username: userRow.username ?? '',
        },
      })

      connectAccountId = account.id

      // Persist the account id + flip seller_status to 'pending'.
      const { error: updateError } = await serviceClient
        .from('users')
        .update({
          stripe_connect_account_id: connectAccountId,
          seller_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('[initiate-seller-connect] user update failed:', updateError)
        return json({ error: 'Could not persist Connect account id' }, 500)
      }

      console.log('[initiate-seller-connect] created Connect account', connectAccountId, 'for user', user.id)
    } else {
      console.log('[initiate-seller-connect] reusing existing Connect account', connectAccountId, 'for user', user.id)
    }

    // Generate a fresh onboarding link. These expire after ~1 hour.
    const link = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: 'https://inkstash.com/seller-onboarding/refresh',
      return_url: 'https://inkstash.com/seller-onboarding/complete',
      type: 'account_onboarding',
    })

    return json({
      url: link.url,
      stripe_connect_account_id: connectAccountId,
    }, 200)
  } catch (err) {
    console.error('[initiate-seller-connect] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
