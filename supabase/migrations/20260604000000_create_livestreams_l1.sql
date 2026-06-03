-- Livestreams L1 schema: stream sessions, chat messages, per-stream bans.
-- Auctions/raffles ship in L2/L4 with their own migrations.
--
-- Source spec: docs/superpowers/specs/2026-06-02-livestreams-v1-design.md §2
--
-- A legacy `livestreams` table existed from an earlier Phase 4 prototype
-- (different schema: seller_id/is_live/current_viewers/playback_url, plus a
-- `livestream_likes` companion). It held 20 fake demo rows and was only
-- read by FALLBACK-protected queries in Live.tsx / home/LiveStreams.tsx,
-- so dropping it doesn't break the live app — those surfaces fall back to
-- their fixtures until the same PR rewires them onto the new schema.
DROP TABLE IF EXISTS public.livestream_likes CASCADE;
DROP TABLE IF EXISTS public.livestreams CASCADE;

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
