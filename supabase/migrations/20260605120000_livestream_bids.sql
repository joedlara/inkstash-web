-- Live in-stream auctions, MVP scope.
--
-- WhatNot-style soft-close model:
--   1. Host puts an item on the block (livestream_items.status='live').
--   2. Host hits "Start bidding" → sets start_price_cents, sets
--      bidding_ends_at = now() + 10s, current_price_cents = start_price_cents.
--   3. Each bid bumps current_price_cents by $1, sets current_winner_id
--      to the bidder, resets bidding_ends_at = now() + 10s.
--   4. When bidding_ends_at passes with no new bid, the item flips to
--      status='sold' (or 'passed' if no winner) via a client-side
--      resolver call. Real Stripe charge wires in a follow-on phase.
--
-- Atomicity matters: two viewers may tap Bid at the exact same instant.
-- The place_livestream_bid RPC uses a row-level lock + SELECT FOR UPDATE
-- so only one bid wins per increment.

-- Item-level state for active bidding. Nullable for pre-block items.
ALTER TABLE public.livestream_items
  ADD COLUMN IF NOT EXISTS start_price_cents   integer,
  ADD COLUMN IF NOT EXISTS current_price_cents integer,
  ADD COLUMN IF NOT EXISTS current_winner_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bid_count           integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bidding_ends_at     timestamptz;

CREATE INDEX IF NOT EXISTS livestream_items_bidding_ends_idx
  ON public.livestream_items (bidding_ends_at)
  WHERE bidding_ends_at IS NOT NULL;

-- Per-bid log. Keeps the full bidding history per item for replay,
-- analytics, and dispute resolution. Append-only.
CREATE TABLE IF NOT EXISTS public.livestream_bids (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livestream_item_id uuid NOT NULL REFERENCES public.livestream_items(id) ON DELETE CASCADE,
  bidder_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_cents       integer NOT NULL CHECK (amount_cents > 0),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS livestream_bids_item_created_idx
  ON public.livestream_bids (livestream_item_id, created_at DESC);

ALTER TABLE public.livestream_bids ENABLE ROW LEVEL SECURITY;

-- Anyone authed can read bids (chat-like transparency).
CREATE POLICY "bids_read_authed" ON public.livestream_bids
  FOR SELECT TO authenticated USING (true);

-- Writes go through the RPC only — no direct client INSERTs.
-- (Implicitly denied: no INSERT/UPDATE/DELETE policies for clients.)

-- Realtime: broadcast bid inserts so viewers see the bid history live.
ALTER PUBLICATION supabase_realtime ADD TABLE public.livestream_bids;

-- ─── place_livestream_bid RPC ───────────────────────────────────────────
--
-- Atomically increments current_price_cents by $1 (100 cents), records
-- the bid, and resets bidding_ends_at. Returns the new state so the
-- caller can update UI without waiting for realtime.
--
-- Rejects if:
--   - item not found / not bidding-active
--   - bidder == seller (no self-bidding)
--   - bidding window has already closed
--
-- Pre-bid card-on-file gate is enforced by the edge fn, not here, so
-- this RPC can stay schema-only.

CREATE OR REPLACE FUNCTION public.place_livestream_bid(
  p_item_id  uuid,
  p_bidder   uuid
)
RETURNS TABLE (
  current_price_cents integer,
  current_winner_id   uuid,
  bid_count           integer,
  bidding_ends_at     timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_host uuid;
  v_new_price integer;
  v_new_ends  timestamptz;
BEGIN
  -- Lock the item row so concurrent bidders serialize. This is the
  -- whole reason the RPC exists; without the lock, two simultaneous
  -- bids could read the same current_price_cents and produce ties.
  SELECT li.*, ls.host_user_id
    INTO v_item
    FROM public.livestream_items li
    JOIN public.livestreams ls ON ls.id = li.livestream_id
   WHERE li.id = p_item_id
     FOR UPDATE OF li;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_item.status <> 'live' OR v_item.bidding_ends_at IS NULL THEN
    RAISE EXCEPTION 'not_bidding' USING ERRCODE = 'P0001';
  END IF;

  IF v_item.bidding_ends_at <= now() THEN
    RAISE EXCEPTION 'bidding_closed' USING ERRCODE = 'P0001';
  END IF;

  v_host := v_item.host_user_id;
  IF v_host = p_bidder THEN
    RAISE EXCEPTION 'cannot_self_bid' USING ERRCODE = 'P0001';
  END IF;

  v_new_price := COALESCE(v_item.current_price_cents, v_item.start_price_cents, 0) + 100;
  v_new_ends  := now() + interval '10 seconds';

  UPDATE public.livestream_items
     SET current_price_cents = v_new_price,
         current_winner_id   = p_bidder,
         bid_count           = COALESCE(bid_count, 0) + 1,
         bidding_ends_at     = v_new_ends
   WHERE id = p_item_id;

  INSERT INTO public.livestream_bids (livestream_item_id, bidder_id, amount_cents)
  VALUES (p_item_id, p_bidder, v_new_price);

  RETURN QUERY
  SELECT v_new_price, p_bidder, COALESCE(v_item.bid_count, 0) + 1, v_new_ends;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_livestream_bid(uuid, uuid) TO authenticated;

-- ─── resolve_livestream_bid RPC ─────────────────────────────────────────
--
-- Flips an item from 'live' → 'sold' (if it had a winner) or 'passed'
-- (no bids). Called by the host's Live Control when the local timer
-- shows the bidding has elapsed. Safe to call multiple times — second
-- call is a no-op since status is no longer 'live'.

CREATE OR REPLACE FUNCTION public.resolve_livestream_bid(p_item_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_new_status text;
BEGIN
  SELECT * INTO v_item
    FROM public.livestream_items
   WHERE id = p_item_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_item.status <> 'live' THEN
    RETURN v_item.status;
  END IF;

  -- Only resolve once the timer has elapsed. If a late caller hits us
  -- before the deadline (clock skew) leave the item alone.
  IF v_item.bidding_ends_at IS NULL OR v_item.bidding_ends_at > now() THEN
    RAISE EXCEPTION 'bidding_still_open' USING ERRCODE = 'P0001';
  END IF;

  v_new_status := CASE WHEN v_item.current_winner_id IS NOT NULL
                       THEN 'sold' ELSE 'passed' END;

  UPDATE public.livestream_items
     SET status = v_new_status
   WHERE id = p_item_id;

  RETURN v_new_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_livestream_bid(uuid) TO authenticated;
