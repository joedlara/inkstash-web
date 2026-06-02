-- Store the purchased shipping label URL + when it was bought.
-- tracking_number and carrier already exist on orders; these just complete
-- the row so the seller view can render "Print label" + the buyer view can
-- show tracking.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS label_url            text,
  ADD COLUMN IF NOT EXISTS label_purchased_at   timestamptz;
