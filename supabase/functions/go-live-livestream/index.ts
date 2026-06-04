// supabase/functions/go-live-livestream/index.ts
//
// Authenticated. Flips a 'preparing' stream owned by the caller to
// 'live'. Nulls pair_token so the QR can't be reused. Sets started_at.
// The phone is assumed to already be publishing — the composer gates
// this call behind a paired-state check on the data channel.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  livestream_id?: string
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
    const service = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body: RequestBody = await req.json()
    const livestreamId = (body.livestream_id ?? '').trim()
    if (!livestreamId) return json({ error: 'missing_livestream_id' }, 400)

    // Verify ownership + current status.
    const { data: stream, error } = await service
      .from('livestreams')
      .select('id, host_user_id, status')
      .eq('id', livestreamId)
      .maybeSingle()
    if (error || !stream) return json({ error: 'not_found' }, 404)
    const row = stream as { id: string; host_user_id: string; status: string }
    if (row.host_user_id !== user.id) return json({ error: 'not_owner' }, 403)
    if (row.status !== 'preparing') return json({ error: 'not_preparing' }, 409)

    const { error: updateErr } = await service
      .from('livestreams')
      .update({
        status: 'live',
        started_at: new Date().toISOString(),
        pair_token: null, // single-use; invalidated on go-live
      })
      .eq('id', livestreamId)
    if (updateErr) return json({ error: 'update_failed' }, 500)

    return json({ status: 'live' }, 200)
  } catch (err) {
    console.error('[go-live-livestream] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
