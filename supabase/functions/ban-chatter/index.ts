// supabase/functions/ban-chatter/index.ts
//
// Authenticated. Host only. INSERTs livestream_bans row and posts a mod
// announcement message into chat.

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

    const body = await req.json()
    if (!body.livestream_id || !body.user_id) return json({ error: 'missing_fields' }, 400)

    const { data: stream } = await serviceClient
      .from('livestreams')
      .select('id, host_user_id')
      .eq('id', body.livestream_id)
      .maybeSingle()
    if (!stream) return json({ error: 'stream_not_found' }, 404)
    const s = stream as { id: string; host_user_id: string }
    if (s.host_user_id !== user.id) return json({ error: 'not_host' }, 403)
    if (body.user_id === user.id) return json({ error: 'cant_ban_self' }, 400)

    const { data: bannedUser } = await serviceClient
      .from('users')
      .select('username')
      .eq('id', body.user_id)
      .maybeSingle()

    // Upsert so re-banning the same user doesn't error
    await serviceClient
      .from('livestream_bans')
      .upsert({
        livestream_id: s.id,
        user_id: body.user_id,
        banned_by: user.id,
        reason: body.reason ?? null,
      }, { onConflict: 'livestream_id,user_id' })

    // Mod message announcing the ban
    await serviceClient
      .from('livestream_chat')
      .insert({
        livestream_id: s.id,
        user_id: user.id, // host as the "speaker" of the mod message
        body: `@${(bannedUser as { username?: string } | null)?.username ?? 'user'} was banned by the streamer.`,
        is_mod_action: true,
      })

    return json({ status: 'banned' }, 200)
  } catch (err) {
    console.error('[ban-chatter] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
