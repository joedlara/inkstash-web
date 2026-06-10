-- Phase 3d: TikTok-style like model — every tap counts, ring meter +
-- celebration in the UI. Replaces the unique-user model from
-- 20260609160000_livestream_likes_rpc_and_realtime.sql (that table was
-- created but never used in production; safe to drop the data).

ALTER TABLE public.livestreams
  ADD COLUMN IF NOT EXISTS like_count bigint NOT NULL DEFAULT 0;

-- Atomic increment + return. Each tap adds 1. The bigint ceiling is
-- generous enough we'll never hit it in practice.
CREATE OR REPLACE FUNCTION public.tap_livestream_like(p_livestream_id uuid, p_taps integer DEFAULT 1)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_taps integer;
  v_total bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  v_taps := COALESCE(p_taps, 1);
  IF v_taps <= 0 OR v_taps > 50 THEN
    -- Throttle: a single client call can batch up to 50 taps. The ring
    -- meter fires the RPC on completion (~10 taps), so 50 is a generous
    -- per-batch ceiling.
    RAISE EXCEPTION 'invalid_taps' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.livestreams
     SET like_count = like_count + v_taps
   WHERE id = p_livestream_id
   RETURNING like_count INTO v_total;

  IF v_total IS NULL THEN
    RAISE EXCEPTION 'stream_not_found' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tap_livestream_like(uuid, integer) TO authenticated;

-- Drop the unused unique-viewer table + its RPCs. The cherry-picked
-- migration created them but nothing in production references them
-- (listSections's ranking SQL referenced livestream_likes COUNT * 2 in
-- a way that would have failed; that ranking column is itself optional).
DROP FUNCTION IF EXISTS public.like_livestream(uuid);
DROP FUNCTION IF EXISTS public.count_livestream_likes(uuid);
-- Drop from realtime publication only if the table is currently a member.
-- ALTER PUBLICATION ... DROP TABLE has no IF EXISTS form in PG <16, so we
-- guard it with a catalog probe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'livestream_likes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.livestream_likes';
  END IF;
END $$;
DROP TABLE IF EXISTS public.livestream_likes;
