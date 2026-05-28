-- Phase 5 C10: per-vendor ship-from addresses
--
-- Vendor pack books physically ship from the vendor's address, not InkStash's.
-- This table holds the vendor's ship origin(s). At least one row per vendor
-- with is_default=true is required before ship labels can be generated for
-- that vendor's pack inventory.
--
-- Wiring into the actual label generation flow is deferred until the in-app
-- label generation feature lands (separate task). For now, InkStash admin
-- references this table manually when generating labels out-of-band.

CREATE TABLE public.vendor_ship_from_addresses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name         text NOT NULL,
  company_name text,
  street1      text NOT NULL,
  street2      text,
  city         text NOT NULL,
  state        text NOT NULL,
  postal_code  text NOT NULL,
  country      text NOT NULL DEFAULT 'US',
  phone        text,
  is_default   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Enforce at most one default address per vendor.
CREATE UNIQUE INDEX vendor_ship_from_default_uq
  ON public.vendor_ship_from_addresses (vendor_id)
  WHERE is_default;

CREATE INDEX vendor_ship_from_vendor_id_idx
  ON public.vendor_ship_from_addresses (vendor_id);

ALTER TABLE public.vendor_ship_from_addresses ENABLE ROW LEVEL SECURITY;

-- A vendor can read their own ship-from addresses.
CREATE POLICY vsfa_owner_read ON public.vendor_ship_from_addresses
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- A vendor can insert their own ship-from addresses.
CREATE POLICY vsfa_owner_insert ON public.vendor_ship_from_addresses
  FOR INSERT WITH CHECK (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- A vendor can update their own ship-from addresses.
CREATE POLICY vsfa_owner_update ON public.vendor_ship_from_addresses
  FOR UPDATE USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- A vendor can delete their own ship-from addresses.
CREATE POLICY vsfa_owner_delete ON public.vendor_ship_from_addresses
  FOR DELETE USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );
