-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 5: vendor collabs + pack origins
-- ─────────────────────────────────────────────────────────────────────────────

-- ── enums ────────────────────────────────────────────────────────────────────

CREATE TYPE pack_origin AS ENUM ('house', 'vendor', 'publisher');
CREATE TYPE cover_treatment AS ENUM ('cardstock', 'foil', 'signed', 'remarked');
CREATE TYPE vendor_status AS ENUM ('pending', 'active', 'paused', 'offboarded');

-- ── vendors ──────────────────────────────────────────────────────────────────

CREATE TABLE public.vendors (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name                text NOT NULL,
  handle                      text UNIQUE NOT NULL,
  avatar_url                  text,
  bio                         text,
  is_publisher                boolean NOT NULL DEFAULT false,
  commission_rate             numeric(4,3) NOT NULL DEFAULT 0.300
                                CHECK (commission_rate BETWEEN 0 AND 1),
  stripe_connect_account_id   text UNIQUE,
  status                      vendor_status NOT NULL DEFAULT 'pending',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vendors_user_id_idx ON public.vendors(user_id);
CREATE INDEX vendors_status_idx ON public.vendors(status);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Public reads: anyone (including anon) can see active vendors so the
-- vendor profile route works for logged-out browsing.
CREATE POLICY vendors_public_read_active ON public.vendors
  FOR SELECT USING (status = 'active');

-- A vendor can see their own row regardless of status.
CREATE POLICY vendors_owner_read ON public.vendors
  FOR SELECT USING (user_id = auth.uid());

-- No client-side writes. All writes go through service role
-- (admin scripts + edge functions).

-- ── packs additions ─────────────────────────────────────────────────────────

ALTER TABLE public.packs
  ADD COLUMN origin              pack_origin NOT NULL DEFAULT 'house',
  ADD COLUMN vendor_id           uuid REFERENCES public.vendors(id),
  ADD COLUMN value_lock          boolean NOT NULL DEFAULT false,
  ADD COLUMN curator_note        text,
  ADD COLUMN is_sealed_collectible boolean NOT NULL DEFAULT false;

-- A vendor pack must have a vendor_id; non-vendor packs must not.
ALTER TABLE public.packs
  ADD CONSTRAINT packs_vendor_id_origin_match
    CHECK (
      (origin = 'vendor' AND vendor_id IS NOT NULL)
      OR (origin != 'vendor' AND vendor_id IS NULL)
    );

CREATE INDEX packs_origin_idx ON public.packs(origin);
CREATE INDEX packs_vendor_id_idx ON public.packs(vendor_id);

-- ── pack_items additions ────────────────────────────────────────────────────

ALTER TABLE public.pack_items
  ADD COLUMN cover_treatment cover_treatment,
  ADD COLUMN declared_value  numeric(10,2);

-- ── pack_revenue_splits ─────────────────────────────────────────────────────

CREATE TABLE public.pack_revenue_splits (
  pack_id        uuid PRIMARY KEY REFERENCES public.packs(id) ON DELETE CASCADE,
  vendor_id      uuid NOT NULL REFERENCES public.vendors(id),
  vendor_cut     numeric(4,3) NOT NULL CHECK (vendor_cut BETWEEN 0 AND 1),
  inkstash_cut   numeric(4,3) NOT NULL CHECK (inkstash_cut BETWEEN 0 AND 1),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pack_revenue_splits_sum CHECK (vendor_cut + inkstash_cut = 1.000)
);

ALTER TABLE public.pack_revenue_splits ENABLE ROW LEVEL SECURITY;

-- No client read. Edge functions and admin scripts use service role.

-- ── vendor_payouts ──────────────────────────────────────────────────────────

CREATE TABLE public.vendor_payouts (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id                uuid NOT NULL REFERENCES public.vendors(id),
  pack_purchase_id         uuid NOT NULL REFERENCES public.pack_purchases(id),
  pack_id                  uuid NOT NULL REFERENCES public.packs(id),
  gross_amount_cents       integer NOT NULL CHECK (gross_amount_cents > 0),
  vendor_amount_cents      integer NOT NULL CHECK (vendor_amount_cents >= 0),
  inkstash_amount_cents    integer NOT NULL CHECK (inkstash_amount_cents >= 0),
  stripe_payment_intent_id text NOT NULL,
  stripe_transfer_id       text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX vendor_payouts_intent_id_uq
  ON public.vendor_payouts(stripe_payment_intent_id);
CREATE INDEX vendor_payouts_vendor_id_idx
  ON public.vendor_payouts(vendor_id);

ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;

-- A vendor can see their own payouts.
CREATE POLICY vendor_payouts_owner_read ON public.vendor_payouts
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- ── validator function ──────────────────────────────────────────────────────

-- Returns NULL if the pack passes validation; returns a human-readable
-- error string if it fails. Called by scripts/validate-vendor-pack.mjs
-- and by scripts/create-vendor-pack.mjs before flipping status to active.
--
-- Rules (only enforced for origin = 'vendor'):
--   1. value_lock must be true.
--   2. vendor must exist and be 'active'.
--   3. vendor must have stripe_connect_account_id.
--   4. Average declared_value of non-chase pack_items × pack.item_count
--      must equal pack.price (within 1¢ tolerance).
--   5. Every non-chase pack_item must have a cover_treatment set.
--   6. Every pack_item must have a declared_value set.

CREATE OR REPLACE FUNCTION public.validate_vendor_pack(p_pack_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack            record;
  v_vendor          record;
  v_avg_non_chase   numeric;
  v_expected        numeric;
  v_missing_treatment int;
  v_missing_value     int;
BEGIN
  SELECT * INTO v_pack FROM public.packs WHERE id = p_pack_id;
  IF NOT FOUND THEN
    RETURN 'pack not found';
  END IF;

  IF v_pack.origin != 'vendor' THEN
    RETURN NULL;  -- non-vendor packs are not validated by this function
  END IF;

  IF NOT v_pack.value_lock THEN
    RETURN 'value_lock must be true for vendor packs';
  END IF;

  SELECT * INTO v_vendor FROM public.vendors WHERE id = v_pack.vendor_id;
  IF NOT FOUND THEN
    RETURN 'vendor not found';
  END IF;

  IF v_vendor.status != 'active' THEN
    RETURN format('vendor status is %s (must be active)', v_vendor.status);
  END IF;

  IF v_vendor.stripe_connect_account_id IS NULL THEN
    RETURN 'vendor has not completed Stripe Connect onboarding';
  END IF;

  SELECT count(*) INTO v_missing_value
    FROM public.pack_items
    WHERE pack_id = p_pack_id AND declared_value IS NULL;
  IF v_missing_value > 0 THEN
    RETURN format('%s pack_items missing declared_value', v_missing_value);
  END IF;

  SELECT count(*) INTO v_missing_treatment
    FROM public.pack_items
    WHERE pack_id = p_pack_id
      AND coalesce(is_chase, false) = false
      AND cover_treatment IS NULL;
  IF v_missing_treatment > 0 THEN
    RETURN format('%s non-chase pack_items missing cover_treatment', v_missing_treatment);
  END IF;

  SELECT avg(declared_value) INTO v_avg_non_chase
    FROM public.pack_items
    WHERE pack_id = p_pack_id AND coalesce(is_chase, false) = false;

  IF v_avg_non_chase IS NULL THEN
    RETURN 'no non-chase pack_items found';
  END IF;

  v_expected := v_avg_non_chase * v_pack.item_count;

  IF abs(v_expected - v_pack.price) > 0.01 THEN
    RETURN format(
      'expected pull value $%s does not equal pack price $%s (avg non-chase = $%s × item_count = %s)',
      to_char(v_expected, 'FM999990.00'),
      to_char(v_pack.price, 'FM999990.00'),
      to_char(v_avg_non_chase, 'FM999990.00'),
      v_pack.item_count
    );
  END IF;

  RETURN NULL;  -- pass
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_vendor_pack(uuid) TO service_role;
