// supabase/functions/post-chat-message/index.ts
//
// Authenticated. Validates the user isn't banned for this stream + the message
// passes profanity filtering, then inserts the chat row. Supabase Realtime
// fans it out to all stream viewers via the livestream_chat table channel.
//
// Request body: { livestream_id: string; body: string }
// Response: { id, created_at } | { error }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const reqBody = await req.json()
    if (!reqBody.livestream_id) return json({ error: 'livestream_id_required' }, 400)
    const body = (reqBody.body ?? '').toString().trim()
    if (!body || body.length > 280) return json({ error: 'invalid_body' }, 400)

    // Stream must exist and be live
    const { data: stream } = await serviceClient
      .from('livestreams')
      .select('id, status')
      .eq('id', reqBody.livestream_id)
      .maybeSingle()
    if (!stream) return json({ error: 'stream_not_found' }, 404)
    const s = stream as { id: string; status: string }
    if (s.status !== 'live') return json({ error: 'stream_not_live' }, 400)

    // Ban check
    const { data: ban } = await serviceClient
      .from('livestream_bans')
      .select('user_id')
      .eq('livestream_id', s.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (ban) return json({ error: 'banned' }, 403)

    // Profanity check
    const { data: hasProfanity } = await serviceClient
      .rpc('contains_profanity', { p_body: body })
    if (hasProfanity === true) return json({ error: 'profanity_blocked' }, 400)

    const { data: chat, error: insertErr } = await serviceClient
      .from('livestream_chat')
      .insert({
        livestream_id: s.id,
        user_id: user.id,
        body,
      })
      .select('id, created_at')
      .single()
    if (insertErr || !chat) {
      console.error('[post-chat-message] insert failed', insertErr)
      return json({ error: 'insert_failed' }, 500)
    }

    return json({ id: (chat as { id: string }).id, created_at: (chat as { created_at: string }).created_at }, 200)
  } catch (err) {
    console.error('[post-chat-message] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
