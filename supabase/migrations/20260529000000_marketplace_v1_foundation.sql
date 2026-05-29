-- supabase/migrations/20260529000000_marketplace_v1_foundation.sql
--
-- Marketplace v1 — M1 Foundation:
--   1. users.stripe_connect_account_id + seller_status (for non-vendor sellers)
--   2. listings table extensions (vault link + comic metadata + fee snapshot)
--   3. comic_catalog_cache table (memoize ComicVine)
--   4. refund_requests table (buyer-initiated refund tracking)
--   5. disputes table (Stripe chargeback logging)
--   6. vendor_payouts → seller_payouts rename with FK migration

-- ── 1. users seller columns ─────────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN stripe_connect_account_id text UNIQUE,
  ADD COLUMN seller_status text NOT NULL DEFAULT 'inactive'
    CHECK (seller_status IN ('inactive', 'pending', 'active', 'paused'));

CREATE INDEX users_seller_status_idx ON public.users(seller_status);

-- ── 2. listings extensions ──────────────────────────────────────────────────

ALTER TABLE public.listings
  ADD COLUMN source_inventory_id uuid REFERENCES public.user_inventory(id),
  ADD COLUMN comic_vine_id integer,
  ADD COLUMN comic_writer text,
  ADD COLUMN comic_artist text,
  ADD COLUMN comic_publisher text,
  ADD COLUMN comic_issue_number text,
  ADD COLUMN application_fee_pct numeric(4,3) NOT NULL DEFAULT 0.100
    CHECK (application_fee_pct BETWEEN 0 AND 1);

CREATE INDEX listings_source_inventory_idx ON public.listings(source_inventory_id)
  WHERE source_inventory_id IS NOT NULL;
CREATE INDEX listings_publisher_idx ON public.listings(comic_publisher)
  WHERE status = 'active';
CREATE INDEX listings_comic_vine_id_idx ON public.listings(comic_vine_id)
  WHERE comic_vine_id IS NOT NULL;

-- A vault listing's source must be unique (cannot list the same vault item twice).
CREATE UNIQUE INDEX listings_source_inventory_unique_idx ON public.listings(source_inventory_id)
  WHERE source_inventory_id IS NOT NULL AND status = 'active';

-- ── 3. comic_catalog_cache ──────────────────────────────────────────────────

CREATE TABLE public.comic_catalog_cache (
  id              integer PRIMARY KEY,  -- ComicVine's own issue id
  name            text NOT NULL,
  issue_number    text,
  cover_url       text,
  publisher       text,
  writer          text,
  artist          text,
  cover_date      date,
  raw_response    jsonb,
  cached_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comic_catalog_search_idx ON public.comic_catalog_cache
  USING gin (to_tsvector('english',
    name || ' ' ||
    coalesce(publisher, '') || ' ' ||
    coalesce(writer, '') || ' ' ||
    coalesce(issue_number, '')
  ));

-- Service-role only; clients never read directly.
ALTER TABLE public.comic_catalog_cache ENABLE ROW LEVEL SECURITY;

-- ── 4. refund_requests ──────────────────────────────────────────────────────

CREATE TABLE public.refund_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id        uuid NOT NULL REFERENCES auth.users(id),
  reason          text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'completed')),
  admin_notes     text,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

CREATE INDEX refund_requests_order_id_idx ON public.refund_requests(order_id);
CREATE INDEX refund_requests_status_idx ON public.refund_requests(status);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY refund_requests_buyer_read ON public.refund_requests
  FOR SELECT USING (buyer_id = auth.uid());

-- ── 5. disputes ─────────────────────────────────────────────────────────────

CREATE TABLE public.disputes (
  id                          text PRIMARY KEY,  -- Stripe dispute id
  order_id                    uuid REFERENCES public.orders(id),
  stripe_payment_intent_id    text NOT NULL,
  amount_cents                integer NOT NULL CHECK (amount_cents > 0),
  reason                      text,
  status                      text,
  raw_event                   jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX disputes_order_id_idx ON public.disputes(order_id);
CREATE INDEX disputes_status_idx ON public.disputes(status);

-- Admin-only; service role inserts. No client-side reads.
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- ── 6. vendor_payouts → seller_payouts rename ──────────────────────────────

ALTER TABLE public.vendor_payouts RENAME TO seller_payouts;
ALTER TABLE public.seller_payouts RENAME COLUMN vendor_id TO payee_user_id;

-- Drop the old FK constraint BEFORE the backfill so the UPDATE can write user_id values
-- (which are not present in vendors.id, causing a FK violation if the constraint is live).
ALTER TABLE public.seller_payouts
  DROP CONSTRAINT IF EXISTS vendor_payouts_vendor_id_fkey;

-- Backfill payee_user_id from vendors.id → vendors.user_id.
UPDATE public.seller_payouts sp
SET payee_user_id = v.user_id
FROM public.vendors v
WHERE sp.payee_user_id = v.id;

-- Add new FK to auth.users.
ALTER TABLE public.seller_payouts
  ADD CONSTRAINT seller_payouts_payee_user_id_fkey
    FOREIGN KEY (payee_user_id) REFERENCES auth.users(id);

-- Rename indexes for consistency with new table name.
ALTER INDEX vendor_payouts_intent_id_uq RENAME TO seller_payouts_intent_id_uq;
ALTER INDEX vendor_payouts_vendor_id_idx RENAME TO seller_payouts_payee_user_id_idx;

-- Replace the RLS policy (vendor_payouts_owner_read pointed at vendors lookup).
DROP POLICY IF EXISTS vendor_payouts_owner_read ON public.seller_payouts;

CREATE POLICY seller_payouts_owner_read ON public.seller_payouts
  FOR SELECT USING (payee_user_id = auth.uid());
