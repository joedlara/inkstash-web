-- Drops v1: scheduled-release sale items. A drop is a row that wraps an
-- existing listing or pack (or eventually a standalone) with a time gate
-- (go_live_at) and a supply gate (quantity_total / quantity_sold).
--
-- Drops do not duplicate the priced row — they reference it via listing_id
-- or pack_id. The drop layers the "live now / sold out / upcoming" logic
-- on top of the underlying listing/pack buy flow that already exists.
--
-- Authoring is service-role-only for v1 (admin script). Vendor self-service
-- drop creation ships later when we have a vendor dashboard.

-- An older `drops` table exists from a previously-abandoned Phase 4 attempt
-- (different schema: name/partner/drop_at/remaining/status, with seed rows).
-- No production code references it. Drop + recreate is safe.
DROP TABLE IF EXISTS public.drops CASCADE;
DROP TYPE IF EXISTS public.drop_kind CASCADE;

CREATE TYPE public.drop_kind AS ENUM ('listing', 'pack', 'standalone');

CREATE TABLE public.drops (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                public.drop_kind NOT NULL,

  -- Polymorphic content links. Exactly one is populated based on kind.
  -- Standalone drops have inline title/description/cover_url and no
  -- listing_id or pack_id — fulfillment for those is v1.1.
  listing_id          uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  pack_id             uuid REFERENCES public.packs(id) ON DELETE CASCADE,
  title               text,
  description         text,
  cover_url           text,

  -- Pricing + supply
  price               numeric(10, 2) NOT NULL CHECK (price >= 1),
  quantity_total      integer NOT NULL CHECK (quantity_total > 0),
  quantity_sold       integer NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),

  -- Scheduling
  go_live_at          timestamptz NOT NULL,

  -- Display + ownership
  hero_image_url      text,
  vendor_id           uuid REFERENCES public.users(id),
  is_featured         boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),

  -- Integrity: exactly one content link per kind.
  CONSTRAINT drops_kind_link_chk CHECK (
    (kind = 'listing'    AND listing_id IS NOT NULL AND pack_id IS NULL) OR
    (kind = 'pack'       AND pack_id    IS NOT NULL AND listing_id IS NULL) OR
    (kind = 'standalone' AND listing_id IS NULL AND pack_id IS NULL AND title IS NOT NULL)
  ),

  -- Belt + suspenders against oversells; the real guard is the
  -- reserve_drop_capacity() function below since CHECKs do not block
  -- the concurrent race window.
  CONSTRAINT drops_capacity_chk CHECK (quantity_sold <= quantity_total)
);

CREATE INDEX drops_go_live_at_idx ON public.drops (go_live_at);
CREATE INDEX drops_vendor_id_idx ON public.drops (vendor_id) WHERE vendor_id IS NOT NULL;

ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;

-- Anyone can read drops (browsing /drops). Service role only writes.
CREATE POLICY "Drops are public" ON public.drops
  FOR SELECT USING (true);

-- Atomic sold-out guard. Locks the drops row FOR UPDATE so two concurrent
-- buys can't both pass an "is there capacity?" check. Called by the
-- create-drop-payment-intent edge function before it creates the Stripe
-- PaymentIntent.
--
-- Returns:
--   true   — capacity reserved (quantity_sold += 1). Caller proceeds to PI.
--   false  — sold out. Caller returns 400 to client.
-- Raises:
--   drop_not_found / not_yet_live — caller maps to 404 / 400.
--
-- Reservation is provisional: if the buyer abandons the PI, the spot is
-- locked until a future cleanup cron releases it (v1.1).
CREATE FUNCTION public.reserve_drop_capacity(p_drop_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_drop record;
BEGIN
  SELECT id, quantity_total, quantity_sold, go_live_at
    INTO v_drop
    FROM public.drops
    WHERE id = p_drop_id
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'drop_not_found'; END IF;
  IF v_drop.go_live_at > now() THEN RAISE EXCEPTION 'not_yet_live'; END IF;
  IF v_drop.quantity_sold >= v_drop.quantity_total THEN RETURN false; END IF;

  UPDATE public.drops
    SET quantity_sold = quantity_sold + 1
    WHERE id = p_drop_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_drop_capacity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_drop_capacity(uuid) TO service_role;

-- Tag orders that came from a drop so we can report "X copies sold via the
-- Friday drop" later, and so the cleanup cron can release reserved
-- capacity for abandoned PIs whose drop_id we know.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS drop_id uuid REFERENCES public.drops(id);

CREATE INDEX IF NOT EXISTS orders_drop_id_idx
  ON public.orders (drop_id)
  WHERE drop_id IS NOT NULL;
