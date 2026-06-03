-- Phase 1: Host pre-live authoring surface.
--
-- Adds `scheduled_start_at` for future scheduled streams (the cron that
-- flips status='preparing' → 'live' at the scheduled time is deferred until
-- real scheduled-stream demand emerges) and creates `livestream_items` for
-- the pre-stream queue + in-stream additions.

ALTER TABLE public.livestreams
  ADD COLUMN IF NOT EXISTS scheduled_start_at timestamptz;

CREATE INDEX IF NOT EXISTS livestreams_scheduled_idx
  ON public.livestreams (scheduled_start_at)
  WHERE status = 'preparing';

-- Pre-stream queue. Each row pins a marketplace listing to a stream at a
-- given queue position. status tracks lifecycle as the host runs through
-- the queue during the stream (live auction state lives in L2's
-- livestream_auctions table; this is just the queue order + lifecycle).
CREATE TABLE public.livestream_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livestream_id uuid NOT NULL REFERENCES public.livestreams(id) ON DELETE CASCADE,
  listing_id    uuid NOT NULL REFERENCES public.listings(id),
  position      integer NOT NULL,
  status        text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','live','sold','passed','removed')),
  added_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (livestream_id, listing_id)
);
CREATE INDEX livestream_items_stream_pos_idx
  ON public.livestream_items (livestream_id, position);

ALTER TABLE public.livestream_items ENABLE ROW LEVEL SECURITY;

-- Anyone authed can read the queue (used by the viewer shop rail to show
-- upcoming items with a "Pre-bid" badge).
CREATE POLICY "Items public to authed users" ON public.livestream_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Add the table to the supabase_realtime publication so the host's
-- studio-booth queue and the viewer's shop rail both react to position +
-- status changes without polling.
ALTER PUBLICATION supabase_realtime ADD TABLE public.livestream_items;
