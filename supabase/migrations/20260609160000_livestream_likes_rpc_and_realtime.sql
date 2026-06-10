-- Shared likes for the in-stream LikeButton + double-tap-to-like.
-- Per the redesign spec these feed into the "featured" ranking that
-- listSections already references (livestream_likes COUNT * 2 in the
-- ranking SQL). This migration:
--   1) Creates the livestream_likes table (referenced by the local
--      remote_schema dump but not present in the live DB)
--   2) Adds a unique index so per-user dedupe is enforced at the DB
--   3) An idempotent like RPC that inserts the row and returns the
--      new total — used by the in-stream LikeButton + heart gesture
--   4) An optional count helper so the rail can hydrate on mount
--   5) Realtime publication entry so all viewers see the total tick
--      up as soon as anyone likes the stream
--   6) RLS policies so viewers can insert their own row and read the
--      aggregate count for any livestream

-- ── 1) Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.livestream_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livestream_id uuid NOT NULL REFERENCES public.livestreams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Look up "how many likes on stream X?" without scanning the heap.
CREATE INDEX IF NOT EXISTS idx_livestream_likes_stream
  ON public.livestream_likes (livestream_id);

-- ── 2) Per-user dedupe ─────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS livestream_likes_unique_per_user
  ON public.livestream_likes (livestream_id, user_id);

-- ── 2) like_livestream RPC ─────────────────────────────────────────
-- Atomic: INSERT … ON CONFLICT DO NOTHING + SELECT count. Returns
-- the post-like total so the client can render the new value without
-- a second round trip.
CREATE OR REPLACE FUNCTION public.like_livestream(p_livestream_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.livestream_likes (livestream_id, user_id)
  VALUES (p_livestream_id, v_user_id)
  ON CONFLICT (livestream_id, user_id) DO NOTHING;

  SELECT COUNT(*) INTO v_total
  FROM public.livestream_likes
  WHERE livestream_id = p_livestream_id;

  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.like_livestream(uuid) TO authenticated;

-- ── 3) count_livestream_likes helper ───────────────────────────────
-- Anonymous callers can hydrate the count on mount without auth.
CREATE OR REPLACE FUNCTION public.count_livestream_likes(p_livestream_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.livestream_likes
   WHERE livestream_id = p_livestream_id;
$$;

GRANT EXECUTE ON FUNCTION public.count_livestream_likes(uuid) TO anon, authenticated;

-- ── 4) Realtime ────────────────────────────────────────────────────
-- Idempotent add-to-publication.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'livestream_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.livestream_likes;
  END IF;
END $$;

-- ── 5) RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.livestream_likes ENABLE ROW LEVEL SECURITY;

-- Everyone (logged in or not) can read like rows so anon viewers
-- still see the count on initial load.
DROP POLICY IF EXISTS "livestream_likes_select_all" ON public.livestream_likes;
CREATE POLICY "livestream_likes_select_all"
  ON public.livestream_likes
  FOR SELECT
  USING (true);

-- Authenticated users can insert their own row. The unique index
-- enforces one row per (livestream, user); the RPC uses
-- ON CONFLICT DO NOTHING to make repeat taps idempotent.
DROP POLICY IF EXISTS "livestream_likes_insert_own" ON public.livestream_likes;
CREATE POLICY "livestream_likes_insert_own"
  ON public.livestream_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
