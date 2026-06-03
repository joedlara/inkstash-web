# Livestreams L1 — Broadcast + Chat Implementation Plan

> **Goal:** Active sellers can go live with camera + mic. Anyone authed can browse `/live`, watch a stream, send chat messages. Host can ban chatters and end the stream. **No auctions, no raffles, no money** — pure validation that our video + chat infrastructure works end-to-end.

**Architecture:** LiveKit Cloud for video + chat data channels. Supabase Postgres for stream metadata, chat persistence, ban records. Supabase Realtime as a fallback when LiveKit data channels fail (rare but possible on flaky connections). Reuse existing `seller_status='active'` gate for host eligibility.

**Tech stack:** LiveKit Cloud + `livekit-client` (React SDK) + Supabase edge functions + React 19 / MUI v7 + Stripe Connect (no auction money in L1, but the host eligibility gate uses it).

**Source spec:** `docs/superpowers/specs/2026-06-02-livestreams-v1-design.md` §2.

---

## File structure

```
supabase/
  migrations/
    20260604000000_create_livestreams_l1.sql
    20260604010000_profanity_denylist.sql
  functions/
    start-livestream/index.ts
    join-livestream/index.ts
    end-livestream/index.ts
    post-chat-message/index.ts
    ban-chatter/index.ts

src/
  api/
    livestreams.ts
  components/
    livestreams/
      LiveStreamCard.tsx
      LiveStreamGrid.tsx
      LiveStreamChat.tsx
      LiveStreamVideo.tsx
      HostControlPanel.tsx
      GoLiveButton.tsx
  pages/
    Live.tsx                 (rebuild from current placeholder)
    LiveStreamView.tsx       (NEW — /live/:id)
    LiveStreamHost.tsx       (NEW — /live/start)

scripts/
  end-stale-livestreams.mjs  (cron-runnable cleanup for streams >2h with no activity)
```

---

## Tasks

### Task 0: Set up LiveKit Cloud account + env vars (manual prereq)

This is the only task **you** do — not me. Before Task 1 runs:

1. Go to https://livekit.io and sign up. Free tier covers dev.
2. Create a project named `inkstash-dev` (and later `inkstash-prod`).
3. Grab three values from the project settings:
   - `LIVEKIT_API_KEY` (starts with `API`)
   - `LIVEKIT_API_SECRET` (long secret)
   - `LIVEKIT_WS_URL` (looks like `wss://inkstash-dev-xxxxx.livekit.cloud`)
4. Add to local `.env`:
   ```
   VITE_LIVEKIT_WS_URL=wss://inkstash-dev-xxxxx.livekit.cloud
   LIVEKIT_API_KEY=API...
   LIVEKIT_API_SECRET=...
   ```
5. Add to Supabase secrets (the API key and secret only — frontend just needs the WS URL):
   ```
   supabase secrets set LIVEKIT_API_KEY=API...
   supabase secrets set LIVEKIT_API_SECRET=...
   supabase secrets set LIVEKIT_WS_URL=wss://inkstash-dev-xxxxx.livekit.cloud
   ```

Tell me when this is done. I won't start Task 1 until you confirm.

---

### Task 1: Database schema migration

**Files:**
- Create: `supabase/migrations/20260604000000_create_livestreams_l1.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Livestreams L1 schema: stream sessions, chat messages, per-stream bans.
-- Auctions/raffles ship in L2/L4 with their own migrations.

CREATE TABLE livestreams (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id         uuid NOT NULL REFERENCES users(id),
  title                text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  description          text,
  cover_image_url      text,
  -- LiveKit room name. Unique because LiveKit treats this as the room key.
  -- Format: 'stream-{shortid}' generated server-side at create.
  livekit_room_name    text NOT NULL UNIQUE,
  status               text NOT NULL DEFAULT 'preparing'
                         CHECK (status IN ('preparing','live','ended','aborted')),
  started_at           timestamptz,
  ended_at             timestamptz,
  viewer_peak          integer NOT NULL DEFAULT 0,
  total_unique_viewers integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX livestreams_status_started_idx
  ON livestreams (status, started_at DESC NULLS LAST);
CREATE INDEX livestreams_host_started_idx
  ON livestreams (host_user_id, started_at DESC NULLS LAST);

ALTER TABLE livestreams ENABLE ROW LEVEL SECURITY;
-- Anyone authed can read livestreams (browse + join).
CREATE POLICY "Livestreams are public to authed users" ON livestreams
  FOR SELECT USING (auth.uid() IS NOT NULL);
-- No client INSERT/UPDATE/DELETE — all writes go through edge functions.

CREATE TABLE livestream_chat (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livestream_id uuid NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id),
  body          text NOT NULL CHECK (length(body) BETWEEN 1 AND 280),
  -- Set when this row is a server-generated mod message
  -- (e.g. "@somebody was banned by the streamer").
  is_mod_action boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX livestream_chat_stream_time_idx
  ON livestream_chat (livestream_id, created_at);

ALTER TABLE livestream_chat ENABLE ROW LEVEL SECURITY;
-- Anyone authed can read chat for any stream.
CREATE POLICY "Chat is public to authed users" ON livestream_chat
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TABLE livestream_bans (
  livestream_id uuid NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id),
  banned_by     uuid NOT NULL REFERENCES users(id),
  reason        text,
  banned_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (livestream_id, user_id)
);
CREATE INDEX livestream_bans_user_idx ON livestream_bans (user_id);

ALTER TABLE livestream_bans ENABLE ROW LEVEL SECURITY;
-- Bans are only visible to the host of the stream and the banned user themselves.
-- (Other viewers don't need to know who's banned.)
CREATE POLICY "Hosts see bans for their streams" ON livestream_bans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM livestreams
       WHERE livestreams.id = livestream_bans.livestream_id
         AND livestreams.host_user_id = auth.uid()
    )
    OR livestream_bans.user_id = auth.uid()
  );
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push --include-all`
Expected: `Applying migration 20260604000000_create_livestreams_l1.sql... Finished supabase db push.`

- [ ] **Step 3: Verify the schema**

Run: `source .env && curl -s "$VITE_SUPABASE_URL/rest/v1/livestreams?limit=1" -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY"`
Expected: `[]` (empty array; table exists and is queryable).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260604000000_create_livestreams_l1.sql
git commit -m "feat(livestreams-l1): schema for streams + chat + bans"
```

---

### Task 2: Profanity denylist migration + helper function

**Files:**
- Create: `supabase/migrations/20260604010000_profanity_denylist.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Profanity denylist for L1 chat. Edge function post-chat-message calls
-- public.contains_profanity(body text) before insert; on hit, returns a
-- 400 with code 'profanity_blocked'.
--
-- Starter list is intentionally small + boring; we expand based on real
-- chat incidents. Operators can edit the table directly without code deploys.

CREATE TABLE profanity_denylist (
  word text PRIMARY KEY,
  added_by uuid REFERENCES users(id),
  added_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO profanity_denylist (word) VALUES
  ('fuck'),('shit'),('bitch'),('asshole'),('slur1'),('slur2'),('slur3');
-- (Replace slur1/2/3 with the actual moderation list during operator setup.
--  We don't commit slurs into the repo.)

CREATE OR REPLACE FUNCTION public.contains_profanity(p_body text)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_lower text := lower(p_body);
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profanity_denylist
    WHERE v_lower ~* ('\m' || word || '\M')
  );
END $$;

GRANT EXECUTE ON FUNCTION public.contains_profanity(text) TO service_role;
```

- [ ] **Step 2: Apply + verify**

Run: `supabase db push --include-all`
Then: `source .env && curl -s -X POST "$VITE_SUPABASE_URL/rest/v1/rpc/contains_profanity" -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" -H "Content-Type: application/json" -d '{"p_body":"hello world"}'`
Expected: `false`

Then: `... -d '{"p_body":"this is shit"}'`
Expected: `true`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260604010000_profanity_denylist.sql
git commit -m "feat(livestreams-l1): profanity denylist + contains_profanity helper"
```

---

### Task 3: `start-livestream` edge function

**Files:**
- Create: `supabase/functions/start-livestream/index.ts`

- [ ] **Step 1: Install LiveKit server SDK as a Deno-compatible import**

Use the npm package via esm.sh:
```ts
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2?target=denonext'
```

- [ ] **Step 2: Write the function**

```typescript
// supabase/functions/start-livestream/index.ts
//
// Authenticated. Active sellers only. Creates a livestreams row and returns
// a LiveKit publish token so the host can start broadcasting.
//
// Request body: { title: string; description?: string; cover_image_url?: string }
// Response: { livestream_id, livekit_room_name, livekit_token, livekit_ws_url }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2?target=denonext'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  title?: string
  description?: string
  cover_image_url?: string
}

function shortId(): string {
  return crypto.randomUUID().split('-')[0]
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
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY')!
    // @ts-expect-error Deno env
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET')!
    // @ts-expect-error Deno env
    const livekitWsUrl = Deno.env.get('LIVEKIT_WS_URL')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    // Active sellers only.
    const { data: userRow } = await serviceClient
      .from('users')
      .select('seller_status, username')
      .eq('id', user.id)
      .maybeSingle()
    if (!userRow || userRow.seller_status !== 'active') {
      return json({ error: 'seller_not_active' }, 403)
    }

    const body: RequestBody = await req.json()
    const title = (body.title ?? '').trim()
    if (!title || title.length > 120) {
      return json({ error: 'title_required_or_too_long' }, 400)
    }

    const roomName = 'stream-' + shortId()

    const { data: stream, error: insertErr } = await serviceClient
      .from('livestreams')
      .insert({
        host_user_id: user.id,
        title,
        description: body.description ?? null,
        cover_image_url: body.cover_image_url ?? null,
        livekit_room_name: roomName,
        status: 'live',
        started_at: new Date().toISOString(),
      })
      .select('id, livekit_room_name')
      .single()

    if (insertErr || !stream) {
      console.error('[start-livestream] insert failed', insertErr)
      return json({ error: 'create_failed' }, 500)
    }

    // Generate a LiveKit token with publish permissions.
    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: user.id,
      name: userRow.username ?? user.email ?? 'host',
      ttl: 4 * 60 * 60, // 4 hours
    })
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    })

    return json({
      livestream_id: stream.id,
      livekit_room_name: roomName,
      livekit_token: await token.toJwt(),
      livekit_ws_url: livekitWsUrl,
    }, 200)
  } catch (err) {
    console.error('[start-livestream] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 3: Deploy + smoke test**

```bash
supabase functions deploy start-livestream
```

Smoke test (after logging in as an active seller in browser, grab your JWT from `localStorage`):
```bash
source .env && JWT="<paste from browser>" && curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/start-livestream" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"title":"smoke test stream"}'
```
Expected: `{"livestream_id":"...","livekit_room_name":"stream-...","livekit_token":"eyJ...","livekit_ws_url":"wss://..."}`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/start-livestream/
git commit -m "feat(livestreams-l1): start-livestream edge fn with LiveKit publish token"
```

---

### Task 4: `join-livestream` + `end-livestream` edge functions

**Files:**
- Create: `supabase/functions/join-livestream/index.ts`
- Create: `supabase/functions/end-livestream/index.ts`

- [ ] **Step 1: Write `join-livestream`**

```typescript
// supabase/functions/join-livestream/index.ts
//
// Authenticated. Issues a LiveKit subscribe-only token for the given stream
// + returns the most recent 50 chat messages so the viewer hydrates state
// without waiting for new realtime events.
//
// Request body: { livestream_id: string }
// Response: { livekit_token, livekit_ws_url, livekit_room_name, recent_chat }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2?target=denonext'

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
    // @ts-expect-error Deno env
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY')!
    // @ts-expect-error Deno env
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET')!
    // @ts-expect-error Deno env
    const livekitWsUrl = Deno.env.get('LIVEKIT_WS_URL')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    if (!body.livestream_id) return json({ error: 'livestream_id_required' }, 400)

    const { data: stream } = await serviceClient
      .from('livestreams')
      .select('id, livekit_room_name, status')
      .eq('id', body.livestream_id)
      .maybeSingle()
    if (!stream) return json({ error: 'stream_not_found' }, 404)
    if (stream.status !== 'live') return json({ error: 'stream_not_live' }, 400)

    // Block banned viewers from re-joining chat (they can still watch video).
    // Bans are per-stream so this query is cheap.
    const { data: ban } = await serviceClient
      .from('livestream_bans')
      .select('user_id')
      .eq('livestream_id', stream.id)
      .eq('user_id', user.id)
      .maybeSingle()
    const isBanned = !!ban

    const { data: recentChat } = await serviceClient
      .from('livestream_chat')
      .select('id, user_id, body, is_mod_action, created_at')
      .eq('livestream_id', stream.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: user.id,
      ttl: 4 * 60 * 60,
    })
    token.addGrant({
      room: stream.livekit_room_name,
      roomJoin: true,
      canSubscribe: true,
      canPublishData: !isBanned, // banned viewers can't send chat data
    })

    return json({
      livekit_token: await token.toJwt(),
      livekit_ws_url: livekitWsUrl,
      livekit_room_name: stream.livekit_room_name,
      recent_chat: (recentChat ?? []).reverse(), // oldest-first for UI
      is_banned: isBanned,
    }, 200)
  } catch (err) {
    console.error('[join-livestream] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Write `end-livestream`**

```typescript
// supabase/functions/end-livestream/index.ts
//
// Authenticated. Host only. Marks the stream ended and removes the LiveKit room.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RoomServiceClient } from 'https://esm.sh/livekit-server-sdk@2?target=denonext'

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
    // @ts-expect-error Deno env
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY')!
    // @ts-expect-error Deno env
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET')!
    // @ts-expect-error Deno env
    const livekitWsUrl = Deno.env.get('LIVEKIT_WS_URL')!
    const livekitHttpUrl = livekitWsUrl.replace(/^wss?:/, 'https:')

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    if (!body.livestream_id) return json({ error: 'livestream_id_required' }, 400)

    const { data: stream } = await serviceClient
      .from('livestreams')
      .select('id, host_user_id, livekit_room_name, status')
      .eq('id', body.livestream_id)
      .maybeSingle()
    if (!stream) return json({ error: 'stream_not_found' }, 404)
    if (stream.host_user_id !== user.id) return json({ error: 'not_host' }, 403)
    if (stream.status === 'ended') return json({ status: 'already_ended' }, 200)

    // Close the LiveKit room. Best effort; failure shouldn't block the DB
    // status flip — viewers will get disconnected next time they reconnect.
    try {
      const roomSvc = new RoomServiceClient(livekitHttpUrl, livekitApiKey, livekitApiSecret)
      await roomSvc.deleteRoom(stream.livekit_room_name)
    } catch (lkErr) {
      console.warn('[end-livestream] livekit deleteRoom failed (continuing)', lkErr)
    }

    await serviceClient
      .from('livestreams')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', stream.id)

    return json({ status: 'ended' }, 200)
  } catch (err) {
    console.error('[end-livestream] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 3: Deploy both**

```bash
supabase functions deploy join-livestream && supabase functions deploy end-livestream
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/join-livestream/ supabase/functions/end-livestream/
git commit -m "feat(livestreams-l1): join-livestream + end-livestream edge fns"
```

---

### Task 5: `post-chat-message` + `ban-chatter` edge functions

**Files:**
- Create: `supabase/functions/post-chat-message/index.ts`
- Create: `supabase/functions/ban-chatter/index.ts`

- [ ] **Step 1: Write `post-chat-message`**

```typescript
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
    if (stream.status !== 'live') return json({ error: 'stream_not_live' }, 400)

    // Ban check
    const { data: ban } = await serviceClient
      .from('livestream_bans')
      .select('user_id')
      .eq('livestream_id', stream.id)
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
        livestream_id: stream.id,
        user_id: user.id,
        body,
      })
      .select('id, created_at')
      .single()
    if (insertErr || !chat) {
      console.error('[post-chat-message] insert failed', insertErr)
      return json({ error: 'insert_failed' }, 500)
    }

    return json({ id: chat.id, created_at: chat.created_at }, 200)
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
```

- [ ] **Step 2: Write `ban-chatter`**

```typescript
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
    if (stream.host_user_id !== user.id) return json({ error: 'not_host' }, 403)
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
        livestream_id: stream.id,
        user_id: body.user_id,
        banned_by: user.id,
        reason: body.reason ?? null,
      }, { onConflict: 'livestream_id,user_id' })

    // Mod message announcing the ban
    await serviceClient
      .from('livestream_chat')
      .insert({
        livestream_id: stream.id,
        user_id: user.id, // host as the "speaker" of the mod message
        body: `@${bannedUser?.username ?? 'user'} was banned by the streamer.`,
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
```

- [ ] **Step 3: Deploy both + commit**

```bash
supabase functions deploy post-chat-message && supabase functions deploy ban-chatter
git add supabase/functions/post-chat-message/ supabase/functions/ban-chatter/
git commit -m "feat(livestreams-l1): post-chat-message + ban-chatter with profanity gate"
```

---

### Task 6: Install LiveKit client SDK + write `livestreams.ts` API client

**Files:**
- Modify: `package.json` (add `livekit-client` dependency)
- Create: `src/api/livestreams.ts`

- [ ] **Step 1: Install**

Run: `bun add livekit-client` (or `npm install livekit-client` if not on bun)
Expected: package added, lockfile updated.

- [ ] **Step 2: Write the API client**

```typescript
// src/api/livestreams.ts
//
// Frontend client for Livestreams L1 surfaces. Wraps the five edge functions
// plus a list query for /live. LiveKit Room setup happens in the React
// components (useLivestreamRoom hook) since it needs lifecycle management.

import { supabase } from './supabase/supabaseClient';

export type LivestreamStatus = 'preparing' | 'live' | 'ended' | 'aborted';

export interface Livestream {
  id: string;
  host_user_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: LivestreamStatus;
  started_at: string | null;
  ended_at: string | null;
  viewer_peak: number;
  total_unique_viewers: number;
  created_at: string;
  // Joined
  host?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  body: string;
  is_mod_action: boolean;
  created_at: string;
}

interface StartResponse {
  livestream_id: string;
  livekit_room_name: string;
  livekit_token: string;
  livekit_ws_url: string;
}

interface JoinResponse {
  livekit_token: string;
  livekit_ws_url: string;
  livekit_room_name: string;
  recent_chat: ChatMessage[];
  is_banned: boolean;
}

async function callFn<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not logged in.');
  const { data, error } = await supabase.functions.invoke(fn, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error(error.message);
  if (data?.error) {
    const e = new Error(data.error);
    e.name = data.error;
    throw e;
  }
  return data as T;
}

export const livestreamsAPI = {
  async listLive(): Promise<Livestream[]> {
    const { data, error } = await supabase
      .from('livestreams')
      .select('*')
      .eq('status', 'live')
      .order('started_at', { ascending: false });
    if (error) {
      console.error('[livestreamsAPI.listLive] failed', error);
      return [];
    }
    const rows = (data ?? []) as Livestream[];
    // Join hosts in one batched query (mirrors the dropsAPI pattern).
    const hostIds = [...new Set(rows.map((r) => r.host_user_id))];
    if (hostIds.length > 0) {
      const { data: hosts } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .in('id', hostIds);
      const byId = new Map<string, { username: string | null; avatar_url: string | null }>();
      (hosts ?? []).forEach((u: any) => byId.set(u.id, { username: u.username, avatar_url: u.avatar_url }));
      for (const r of rows) {
        r.host = byId.get(r.host_user_id) ?? null;
      }
    }
    return rows;
  },

  async get(id: string): Promise<Livestream | null> {
    const { data } = await supabase
      .from('livestreams')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!data) return null;
    const row = data as Livestream;
    const { data: host } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', row.host_user_id)
      .maybeSingle();
    row.host = host as Livestream['host'];
    return row;
  },

  start: (body: { title: string; description?: string; cover_image_url?: string }) =>
    callFn<StartResponse>('start-livestream', body),

  join: (livestream_id: string) =>
    callFn<JoinResponse>('join-livestream', { livestream_id }),

  end: (livestream_id: string) =>
    callFn<{ status: string }>('end-livestream', { livestream_id }),

  postChat: (livestream_id: string, body: string) =>
    callFn<{ id: string; created_at: string }>('post-chat-message', { livestream_id, body }),

  banChatter: (livestream_id: string, user_id: string, reason?: string) =>
    callFn<{ status: string }>('ban-chatter', { livestream_id, user_id, reason }),
};
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lockb src/api/livestreams.ts
git commit -m "feat(livestreams-l1): livekit-client install + livestreams.ts API"
```

---

### Task 7: `LiveStreamVideo` + `LiveStreamChat` components

**Files:**
- Create: `src/components/livestreams/LiveStreamVideo.tsx`
- Create: `src/components/livestreams/LiveStreamChat.tsx`

- [ ] **Step 1: Write `LiveStreamVideo`**

```typescript
// src/components/livestreams/LiveStreamVideo.tsx
//
// Wraps a LiveKit Room and renders the host's video track full-bleed.
// Two modes:
//   - host: publishes camera + mic to the room
//   - viewer: subscribe-only (audio + video)
//
// Cleanup on unmount: leave room, stop tracks. Critical to prevent zombie
// cameras (browser tab keeps streaming if we don't tear down properly).

import { useEffect, useRef } from 'react';
import { Room, Track, RoomEvent, createLocalTracks } from 'livekit-client';
import { Box, Typography } from '@mui/material';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  wsUrl: string;
  token: string;
  mode: 'host' | 'viewer';
  /** Called once the host's video track is published. Useful for switching
   *  the UI from "preparing" to "live". */
  onConnected?: () => void;
}

export default function LiveStreamVideo({ wsUrl, token, mode, onConnected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    let cancelled = false;

    async function connect() {
      try {
        await room.connect(wsUrl, token);
        if (cancelled) {
          await room.disconnect();
          return;
        }

        if (mode === 'host') {
          const tracks = await createLocalTracks({ audio: true, video: true });
          for (const track of tracks) {
            await room.localParticipant.publishTrack(track);
            if (track.kind === Track.Kind.Video && videoRef.current) {
              track.attach(videoRef.current);
            }
          }
        } else {
          // Viewer: subscribe to the host's published tracks as they arrive.
          room.on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === Track.Kind.Video && videoRef.current) {
              track.attach(videoRef.current);
            } else if (track.kind === Track.Kind.Audio) {
              // Audio attaches to a hidden audio element; mute toggling
              // is handled at the player UI level (not in v1).
              const audioEl = document.createElement('audio');
              audioEl.autoplay = true;
              track.attach(audioEl);
            }
          });
        }
        onConnected?.();
      } catch (err) {
        console.error('[LiveStreamVideo] connect failed', err);
      }
    }

    connect();

    return () => {
      cancelled = true;
      room.disconnect();
    };
  }, [wsUrl, token, mode, onConnected]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: '#000' }}>
      <Box
        component="video"
        ref={videoRef}
        autoPlay
        playsInline
        muted={mode === 'host'} // host doesn't hear themselves
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      {/* Live indicator pill */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          px: 1,
          py: 0.5,
          borderRadius: 999,
          bgcolor: inkstashColors.live,
          color: '#fff',
          fontSize: 11,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#fff' }} />
        Live
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Write `LiveStreamChat`**

```typescript
// src/components/livestreams/LiveStreamChat.tsx
//
// Bottom-docked chat with sticky composer. Uses Supabase Realtime channel
// on the livestream_chat table for incoming messages and the post-chat-message
// edge fn for sending.
//
// In v1, presence (viewer count) is NOT shown — we don't track it server-side
// yet. We'll add LiveKit room.participants count in L2 when it becomes useful
// for auction "active bidder" counts.

import { useEffect, useRef, useState, FormEvent } from 'react';
import { Box, TextField, IconButton, Avatar, Typography } from '@mui/material';
import { Send } from '@mui/icons-material';
import { supabase } from '../../api/supabase/supabaseClient';
import { livestreamsAPI, type ChatMessage } from '../../api/livestreams';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
  initialMessages: ChatMessage[];
  isBanned: boolean;
  /** When true, render a tiny ban icon next to each message so the host can tap to ban. */
  hostMode?: boolean;
  onBanUser?: (userId: string) => void;
}

export default function LiveStreamChat({
  livestreamId, initialMessages, isBanned, hostMode = false, onBanUser,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to new chat messages via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`livestream_chat:${livestreamId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'livestream_chat', filter: `livestream_id=eq.${livestreamId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [livestreamId]);

  // Backfill usernames for messages we don't yet have names for. One batched call
  // when the list of unknown user_ids grows.
  useEffect(() => {
    const unknown = [...new Set(messages.map((m) => m.user_id))].filter((id) => !usernames[id]);
    if (unknown.length === 0) return;
    let cancelled = false;
    supabase
      .from('users')
      .select('id, username')
      .in('id', unknown)
      .then(({ data }) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        (data ?? []).forEach((u: any) => { next[u.id] = u.username ?? 'anon'; });
        setUsernames((prev) => ({ ...prev, ...next }));
      });
    return () => { cancelled = true; };
  }, [messages]);

  // Auto-scroll to bottom on new messages (only if user is near the bottom).
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current;
    const wasNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (wasNearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending || isBanned) return;
    setSending(true);
    setDraft('');
    try {
      await livestreamsAPI.postChat(livestreamId, body);
    } catch (err) {
      const e = err as Error;
      if (e.name === 'profanity_blocked') {
        // Restore the draft so user can edit it
        setDraft(body);
        // TODO: surface a toast saying "watch your language"
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        ref={listRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 1.5,
          // Semi-transparent dark gradient so video shows through
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))',
        }}
      >
        {messages.map((m) => (
          <Box key={m.id} sx={{ display: 'flex', gap: 1, mb: 0.75, alignItems: 'flex-start' }}>
            <Avatar sx={{ width: 22, height: 22, fontSize: 11 }}>
              {(usernames[m.user_id] ?? '?').charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                component="span"
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: m.is_mod_action ? inkstashColors.gold : '#fff',
                  mr: 0.5,
                }}
              >
                {m.is_mod_action ? 'MOD' : (usernames[m.user_id] ?? '...')}
              </Typography>
              <Typography component="span" sx={{ fontSize: 12, color: '#eee' }}>
                {m.body}
              </Typography>
              {hostMode && !m.is_mod_action && m.user_id !== '' && (
                <Typography
                  component="button"
                  onClick={() => onBanUser?.(m.user_id)}
                  sx={{
                    ml: 1, fontSize: 10, color: '#ff7676', bgcolor: 'transparent',
                    border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                  }}
                >
                  Ban
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
      <Box
        component="form"
        onSubmit={send}
        sx={{
          display: 'flex',
          gap: 1,
          p: 1,
          bgcolor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <TextField
          fullWidth
          size="small"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isBanned}
          placeholder={isBanned ? 'You were banned from this stream.' : 'Say something…'}
          inputProps={{ maxLength: 280 }}
          sx={{
            '& .MuiInputBase-root': {
              bgcolor: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: 13,
              borderRadius: 999,
            },
            '& fieldset': { border: 'none' },
          }}
        />
        <IconButton type="submit" disabled={!draft.trim() || sending || isBanned} sx={{ color: inkstashColors.brand }}>
          <Send fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add src/components/livestreams/LiveStreamVideo.tsx src/components/livestreams/LiveStreamChat.tsx
git commit -m "feat(livestreams-l1): LiveStreamVideo + LiveStreamChat components"
```

---

### Task 8: `LiveStreamCard` + `LiveStreamGrid` + rebuilt `/live` page

**Files:**
- Create: `src/components/livestreams/LiveStreamCard.tsx`
- Create: `src/components/livestreams/LiveStreamGrid.tsx`
- Modify: `src/pages/Live.tsx` (replace existing placeholder content)

- [ ] **Step 1: Write `LiveStreamCard`**

```typescript
// src/components/livestreams/LiveStreamCard.tsx
//
// Tile for the /live grid. Click navigates to /live/:id.

import { Box, Typography, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Livestream } from '../../api/livestreams';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';
import { PLACEHOLDER_IMAGE_URL } from '../../utils/placeholders';

interface Props { stream: Livestream; }

export default function LiveStreamCard({ stream }: Props) {
  const navigate = useNavigate();
  const cover = stream.cover_image_url ?? PLACEHOLDER_IMAGE_URL;
  return (
    <Box
      component="button"
      type="button"
      onClick={() => navigate(`/live/${stream.id}`)}
      sx={{
        display: 'block', width: '100%', p: 0, textAlign: 'left',
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        bgcolor: inkstashColors.bgElev,
        overflow: 'hidden', cursor: 'pointer',
        transition: 'transform 160ms ease, border-color 160ms ease',
        '&:hover': { transform: 'translateY(-3px)', borderColor: inkstashColors.brand },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%', aspectRatio: '9 / 16',
          backgroundImage: `url(${cover})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}
      >
        {/* Live pill */}
        <Box sx={{
          position: 'absolute', top: 8, left: 8, px: 1, py: 0.3,
          borderRadius: 999, bgcolor: inkstashColors.live, color: '#fff',
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          Live
        </Box>
      </Box>
      <Box sx={{ p: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
          <Avatar src={stream.host?.avatar_url ?? undefined} sx={{ width: 20, height: 20 }} />
          <Typography sx={{ fontSize: 11, color: inkstashColors.muted, fontFamily: inkstashFonts.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            @{stream.host?.username ?? 'host'}
          </Typography>
        </Box>
        <Typography sx={{
          fontFamily: inkstashFonts.display, fontWeight: 700, fontSize: 14,
          color: inkstashColors.ink, lineHeight: 1.25,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {stream.title}
        </Typography>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Write `LiveStreamGrid`**

```typescript
// src/components/livestreams/LiveStreamGrid.tsx

import { Box } from '@mui/material';
import type { Livestream } from '../../api/livestreams';
import LiveStreamCard from './LiveStreamCard';

interface Props { streams: Livestream[]; }

export default function LiveStreamGrid({ streams }: Props) {
  if (streams.length === 0) return null;
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 1.5, md: 2 },
        gridTemplateColumns: {
          xs: '1fr 1fr',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(5, 1fr)',
        },
      }}
    >
      {streams.map((s) => <LiveStreamCard key={s.id} stream={s} />)}
    </Box>
  );
}
```

- [ ] **Step 3: Rebuild `Live.tsx`**

Replace the placeholder content with:

```typescript
// src/pages/Live.tsx
//
// /live — grid of currently live streams. Empty state nudges sellers to go live.

import { useEffect, useState } from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import LiveStreamGrid from '../components/livestreams/LiveStreamGrid';
import { livestreamsAPI, type Livestream } from '../api/livestreams';
import { useAuth } from '../hooks/useAuth';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

export default function Live() {
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isActiveSeller = (user as any)?.seller_status === 'active';

  useEffect(() => {
    livestreamsAPI.listLive().then((s) => { setStreams(s); setLoading(false); });
  }, []);

  return (
    <AppShell>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
          <Box>
            <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Watch + bid in real time
            </Typography>
            <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: { xs: 32, md: 44 }, color: inkstashColors.ink, textTransform: 'uppercase', letterSpacing: '0.005em', lineHeight: 1 }}>
              Live
            </Typography>
          </Box>
          {isActiveSeller && (
            <Button
              variant="contained"
              onClick={() => navigate('/live/start')}
              sx={{
                bgcolor: inkstashColors.brand, color: '#fff', fontWeight: 800,
                px: 2.5, py: 1, textTransform: 'uppercase', fontFamily: inkstashFonts.ui,
                letterSpacing: '0.06em',
                '&:hover': { bgcolor: inkstashColors.brandDeep },
              }}
            >
              Go live
            </Button>
          )}
        </Box>

        {loading && <Typography sx={{ color: inkstashColors.muted }}>Loading…</Typography>}

        {!loading && streams.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 22, color: inkstashColors.ink, mb: 1 }}>
              Nobody is live right now
            </Typography>
            <Typography sx={{ color: inkstashColors.muted, mb: 3 }}>
              {isActiveSeller ? 'Be the first — click Go Live above.' : 'Check back soon.'}
            </Typography>
          </Box>
        )}

        {!loading && streams.length > 0 && <LiveStreamGrid streams={streams} />}
      </Container>
    </AppShell>
  );
}
```

- [ ] **Step 4: Type-check + commit**

```bash
npx tsc --noEmit
git add src/components/livestreams/LiveStreamCard.tsx src/components/livestreams/LiveStreamGrid.tsx src/pages/Live.tsx
git commit -m "feat(livestreams-l1): /live grid + LiveStreamCard + LiveStreamGrid"
```

---

### Task 9: `LiveStreamView` page (viewer)

**Files:**
- Create: `src/pages/LiveStreamView.tsx`
- Modify: `src/main.tsx` (add route `/live/:id`)

- [ ] **Step 1: Write `LiveStreamView`**

```typescript
// src/pages/LiveStreamView.tsx
//
// /live/:id — viewer surface. Mobile-first portrait video full-bleed with
// chat docked at the bottom. Desktop centers the same layout at max-width
// 480px (phone aspect) which matches the streamer's vertical camera.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, IconButton, Typography, Avatar, CircularProgress } from '@mui/material';
import { Close } from '@mui/icons-material';
import LiveStreamVideo from '../components/livestreams/LiveStreamVideo';
import LiveStreamChat from '../components/livestreams/LiveStreamChat';
import { livestreamsAPI, type Livestream, type ChatMessage } from '../api/livestreams';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

export default function LiveStreamView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stream, setStream] = useState<Livestream | null>(null);
  const [joinData, setJoinData] = useState<{ token: string; wsUrl: string; chat: ChatMessage[]; isBanned: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, j] = await Promise.all([
          livestreamsAPI.get(id),
          livestreamsAPI.join(id),
        ]);
        if (cancelled) return;
        if (!s) { setError('Stream not found.'); return; }
        setStream(s);
        setJoinData({
          token: j.livekit_token,
          wsUrl: j.livekit_ws_url,
          chat: j.recent_chat,
          isBanned: j.is_banned,
        });
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  if (!stream || !joinData) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: inkstashColors.brand }} />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#000', overflow: 'hidden' }}>
      {/* Centered phone-aspect column on desktop, full-bleed on mobile */}
      <Box
        sx={{
          position: 'absolute', inset: 0,
          maxWidth: { xs: '100%', md: 480 },
          mx: 'auto',
          display: 'grid',
          gridTemplateRows: '1fr 280px',
        }}
      >
        {/* Video */}
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
          <LiveStreamVideo wsUrl={joinData.wsUrl} token={joinData.token} mode="viewer" />

          {/* Top-left host pill */}
          <Box
            sx={{
              position: 'absolute', top: 12, left: 60,
              display: 'flex', alignItems: 'center', gap: 1,
              bgcolor: 'rgba(0,0,0,0.55)', px: 1.25, py: 0.5,
              borderRadius: 999, backdropFilter: 'blur(8px)',
            }}
          >
            <Avatar src={stream.host?.avatar_url ?? undefined} sx={{ width: 22, height: 22 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
              @{stream.host?.username ?? 'host'}
            </Typography>
          </Box>

          {/* Close button */}
          <IconButton
            onClick={() => navigate('/live')}
            sx={{
              position: 'absolute', top: 8, right: 8,
              color: '#fff', bgcolor: 'rgba(0,0,0,0.4)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
            }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Chat */}
        <Box sx={{ position: 'relative' }}>
          <LiveStreamChat
            livestreamId={stream.id}
            initialMessages={joinData.chat}
            isBanned={joinData.isBanned}
          />
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Wire the route**

In `src/main.tsx`, add the import and the route:

```typescript
import LiveStreamView from './pages/LiveStreamView';
// ...
<Route path="/live/:id" element={<LiveStreamView />} />
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add src/pages/LiveStreamView.tsx src/main.tsx
git commit -m "feat(livestreams-l1): /live/:id viewer page"
```

---

### Task 10: `LiveStreamHost` page + `HostControlPanel`

**Files:**
- Create: `src/pages/LiveStreamHost.tsx`
- Create: `src/components/livestreams/HostControlPanel.tsx`
- Modify: `src/main.tsx` (add route `/live/start`)
- Modify: `src/components/layout/AppSidebar.tsx` (add "Go Live" button to seller-status section if applicable — confirm during impl)

- [ ] **Step 1: Write `HostControlPanel`**

```typescript
// src/components/livestreams/HostControlPanel.tsx
//
// Right rail (desktop) / bottom drawer (mobile) for the host during a live
// stream. Shows the live chat + an "End stream" button. Auctions panel
// will slot in here in L2.

import { Box, Button, Typography } from '@mui/material';
import LiveStreamChat from './LiveStreamChat';
import type { ChatMessage } from '../../api/livestreams';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
  initialChat: ChatMessage[];
  onEnd: () => void;
  onBanUser: (userId: string) => void;
}

export default function HostControlPanel({ livestreamId, initialChat, onEnd, onBanUser }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: inkstashColors.bgElev }}>
      <Box sx={{ p: 2, borderBottom: `1px solid ${inkstashColors.border}` }}>
        <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 10, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Stream chat
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <LiveStreamChat
          livestreamId={livestreamId}
          initialMessages={initialChat}
          isBanned={false}
          hostMode
          onBanUser={onBanUser}
        />
      </Box>
      <Box sx={{ p: 2, borderTop: `1px solid ${inkstashColors.border}` }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onEnd}
          sx={{
            bgcolor: inkstashColors.live, color: '#fff', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            '&:hover': { bgcolor: '#B91C1C' },
          }}
        >
          End stream
        </Button>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Write `LiveStreamHost`**

```typescript
// src/pages/LiveStreamHost.tsx
//
// /live/start — two-phase. Pre-live: title input + camera preview. Live:
// camera + side panel with chat + end button. Active sellers only; redirects
// non-sellers to the seller dashboard.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, CircularProgress, Alert,
} from '@mui/material';
import AppShell from '../components/layout/AppShell';
import LiveStreamVideo from '../components/livestreams/LiveStreamVideo';
import HostControlPanel from '../components/livestreams/HostControlPanel';
import { livestreamsAPI, type ChatMessage } from '../api/livestreams';
import { useAuth } from '../hooks/useAuth';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

export default function LiveStreamHost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState<'pre' | 'live'>('pre');
  const [streamId, setStreamId] = useState<string | null>(null);
  const [livekit, setLivekit] = useState<{ token: string; wsUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Gate
  const isActiveSeller = (user as any)?.seller_status === 'active';
  useEffect(() => {
    if (user && !isActiveSeller) navigate('/seller-dashboard');
  }, [user, isActiveSeller, navigate]);

  async function handleGoLive() {
    setStarting(true);
    setError(null);
    try {
      const res = await livestreamsAPI.start({ title: title.trim() });
      setStreamId(res.livestream_id);
      setLivekit({ token: res.livekit_token, wsUrl: res.livekit_ws_url });
      setPhase('live');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function handleEnd() {
    if (!streamId) return;
    await livestreamsAPI.end(streamId);
    navigate('/live');
  }

  async function handleBan(userId: string) {
    if (!streamId) return;
    await livestreamsAPI.banChatter(streamId, userId);
  }

  if (!user) return null;

  if (phase === 'pre') {
    return (
      <AppShell>
        <Box sx={{ maxWidth: 480, mx: 'auto', p: 3 }}>
          <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 32, mb: 1 }}>
            Go Live
          </Typography>
          <Typography sx={{ color: inkstashColors.muted, mb: 3 }}>
            Give your stream a title, then start broadcasting.
          </Typography>

          <TextField
            fullWidth
            label="Stream title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputProps={{ maxLength: 120 }}
            sx={{ mb: 2 }}
          />

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Button
            fullWidth
            variant="contained"
            onClick={handleGoLive}
            disabled={!title.trim() || starting}
            sx={{
              bgcolor: inkstashColors.live, color: '#fff', fontWeight: 800,
              py: 1.4, textTransform: 'uppercase', letterSpacing: '0.06em',
              '&:hover': { bgcolor: '#B91C1C' },
            }}
          >
            {starting ? <CircularProgress size={20} color="inherit" /> : 'Start broadcasting'}
          </Button>
        </Box>
      </AppShell>
    );
  }

  // Live phase
  if (!streamId || !livekit) return null;
  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 360px' } }}>
      <LiveStreamVideo wsUrl={livekit.wsUrl} token={livekit.token} mode="host" />
      <HostControlPanel
        livestreamId={streamId}
        initialChat={[]}
        onEnd={handleEnd}
        onBanUser={handleBan}
      />
    </Box>
  );
}
```

- [ ] **Step 3: Add the route in `main.tsx`**

```typescript
import LiveStreamHost from './pages/LiveStreamHost';
// ...
<Route path="/live/start" element={<LiveStreamHost />} />
```

- [ ] **Step 4: Type-check + commit**

```bash
npx tsc --noEmit
git add src/pages/LiveStreamHost.tsx src/components/livestreams/HostControlPanel.tsx src/main.tsx
git commit -m "feat(livestreams-l1): /live/start host page + HostControlPanel"
```

---

### Task 11: Stale-stream cleanup cron

**Files:**
- Create: `scripts/end-stale-livestreams.mjs`

- [ ] **Step 1: Write the cleanup script**

Hosts can crash, close tabs, lose network — leaving `status='live'` rows that aren't actually live. This cron flips them to `aborted` after 2 hours of no activity.

```javascript
// scripts/end-stale-livestreams.mjs
//
// Marks livestream rows status='aborted' when they've been 'live' for >2h
// without any chat activity in the last 30min. Run on a schedule (e.g. every
// 15min in production). Manually for now: `node scripts/end-stale-livestreams.mjs`

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
);

async function main() {
  // Find live streams started >2h ago
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: candidates } = await supabase
    .from('livestreams')
    .select('id, host_user_id, started_at')
    .eq('status', 'live')
    .lt('started_at', cutoff);

  if (!candidates || candidates.length === 0) {
    console.log('No stale streams.');
    return;
  }

  for (const s of candidates) {
    // Check last chat activity
    const { data: recent } = await supabase
      .from('livestream_chat')
      .select('created_at')
      .eq('livestream_id', s.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const lastChat = recent?.[0]?.created_at;
    const stillActive = lastChat && Date.now() - new Date(lastChat).getTime() < 30 * 60 * 1000;
    if (stillActive) continue;

    await supabase
      .from('livestreams')
      .update({ status: 'aborted', ended_at: new Date().toISOString() })
      .eq('id', s.id);
    console.log(`Aborted stale stream ${s.id} (host ${s.host_user_id})`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Smoke-run**

Run: `node scripts/end-stale-livestreams.mjs`
Expected: `No stale streams.` (assuming no live streams >2h old).

- [ ] **Step 3: Commit**

```bash
git add scripts/end-stale-livestreams.mjs
git commit -m "feat(livestreams-l1): end-stale-livestreams cleanup script"
```

---

### Task 12: End-to-end smoke test (manual)

- [ ] **Step 1: Two-browser test**

In browser A (logged in as an active seller):
1. Navigate to `/live`. Confirm empty state with "Be the first" message.
2. Click "Go live". Land on `/live/start`.
3. Enter a title like "smoke test". Click "Start broadcasting."
4. Grant camera + mic permissions.
5. Confirm you see yourself in the preview + the side panel shows empty chat + "End stream" button.

In browser B (logged in as a different user):
6. Navigate to `/live`. Confirm the smoke-test tile appears.
7. Click into it. Land on `/live/:id`.
8. Confirm you see browser A's video.
9. Type "hello from b" in chat. Press send.
10. In browser A's side panel, confirm "hello from b" appears within 1 second.

11. In browser A, hover over the chat message and click "Ban". Confirm:
    - A mod message appears: "@b_user was banned by the streamer."
    - Browser B's chat composer becomes disabled with "You were banned…" placeholder.

12. In browser A, click "End stream". Confirm:
    - You land back on `/live`.
    - Browser B's video stops streaming.

- [ ] **Step 2: Stale cleanup test**

Manually SET a test stream's `started_at` to 3h ago and DELETE its chat rows. Run the cleanup script. Confirm the stream is marked `aborted`.

- [ ] **Step 3: Document any bugs found as Drops-style fix commits before opening the PR**

---

### Task 13: PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin livestreams-l1
```

- [ ] **Step 2: Open PR**

Title: `Livestreams L1 — broadcast + chat`

Body: standard spec/plan reference + test plan summary. See PR template established by drops-v1.

---

## Self-review checklist (run before opening PR)

- [ ] All 11 implementation tasks committed.
- [ ] Camera/mic cleanup verified: leaving `/live/start` mid-stream stops the camera (no zombie indicator in the browser tab).
- [ ] Stream ends cleanly when host closes the tab (handled by either the user explicit "End" click OR the stale-stream cron within 2h).
- [ ] Profanity filter blocks the seeded words; non-matching words pass through.
- [ ] Banned users can still watch (subscribe-only LiveKit token) but can't chat.
- [ ] `/live` grid empty state nudges sellers to go live; viewers just see "check back soon."
- [ ] Two-browser smoke test passes for all 12 steps in Task 12.
