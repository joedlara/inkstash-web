-- Auction charge-on-win, MVP scope.
--
-- When resolve_livestream_bid flips an item to 'sold', the host's
-- client calls the charge-auction-win edge fn which creates an
-- off-session PaymentIntent on the winner's saved card. On success
-- → item stays 'sold' + auction_orders row written. On failure →
-- item flips to 'sold_pending_payment' + the error is saved for the
-- seller to review in their dashboard.
--
-- No webhook branch needed: off_session + confirm:true PaymentIntents
-- resolve synchronously. If 3DS becomes a thing (`requires_action`),
-- we'll add the webhook + recovery email later.

-- ── livestream_items: charge state columns ──────────────────────────────
ALTER TABLE public.livestream_items
  ADD COLUMN IF NOT EXISTS payment_intent_id  text,
  ADD COLUMN IF NOT EXISTS winner_charged_at  timestamptz,
  ADD COLUMN IF NOT EXISTS charge_error       text;

-- Status enum gets one new value: 'sold_pending_payment'. We can't
-- easily ALTER an enum-like CHECK constraint in place, so drop +
-- re-add. The set is small and the table is small enough that this
-- is cheap.
ALTER TABLE public.livestream_items
  DROP CONSTRAINT IF EXISTS livestream_items_status_check;

ALTER TABLE public.livestream_items
  ADD CONSTRAINT livestream_items_status_check
  CHECK (status IN ('queued','live','sold','sold_pending_payment','passed','removed'));

-- ── auction_orders: the receipt-of-truth for paid auction wins ──────────
-- Mirrors orders/order_groups but scoped to live auctions. Separate
-- from the fixed-price orders table because the lifecycle is
-- different (no cart, no shipping rate chosen by buyer, no listing
-- inventory decrement — the auction RPC already flipped status).
CREATE TABLE IF NOT EXISTS public.auction_orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livestream_item_id uuid NOT NULL REFERENCES public.livestream_items(id) ON DELETE CASCADE,
  livestream_id      uuid NOT NULL REFERENCES public.livestreams(id) ON DELETE CASCADE,
  listing_id         uuid NOT NULL REFERENCES public.listings(id),
  buyer_id           uuid NOT NULL REFERENCES public.users(id),
  seller_id          uuid NOT NULL REFERENCES public.users(id),
  amount_cents       integer NOT NULL CHECK (amount_cents > 0),
  shipping_cents     integer NOT NULL DEFAULT 0,
  application_fee_cents integer NOT NULL DEFAULT 0,
  stripe_payment_intent_id text NOT NULL UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auction_orders_seller_idx
  ON public.auction_orders (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS auction_orders_buyer_idx
  ON public.auction_orders (buyer_id, created_at DESC);

ALTER TABLE public.auction_orders ENABLE ROW LEVEL SECURITY;

-- Buyer and seller can each read their own auction orders. Writes
-- come from the edge fn (service role) only.
CREATE POLICY "auction_orders_buyer_read" ON public.auction_orders
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id);

CREATE POLICY "auction_orders_seller_read" ON public.auction_orders
  FOR SELECT TO authenticated USING (auth.uid() = seller_id);
