-- Server-side cart_items table. Lets a signed-in buyer's cart sync across
-- devices and lets us validate listing status at add-to-cart time
-- (prevents stale-cart attacks where seller raised the price after the
-- buyer loaded the page).
--
-- localStorage cart stays as optimistic-UI fallback. On signed-in load
-- the CartContext hydrates from this table; server wins on conflict.

CREATE TABLE IF NOT EXISTS public.cart_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id   uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  added_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS cart_items_user_id_added_at_idx
  ON public.cart_items (user_id, added_at DESC);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own cart" ON public.cart_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
