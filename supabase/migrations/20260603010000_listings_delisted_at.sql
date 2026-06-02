-- Track when a listing was delisted so we can show "delisted on …" in the
-- seller dashboard later. Nullable — populated by the delist-listing edge fn.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS delisted_at timestamptz;
