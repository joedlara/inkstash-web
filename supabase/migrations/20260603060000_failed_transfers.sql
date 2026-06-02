-- Operational log of Stripe Transfer failures. Service-role-only; this is
-- ops monitoring data, not user-visible. The retry-failed-transfers cron
-- queries `orders.transfer_status='failed'` directly; this table is a
-- per-attempt audit trail.

CREATE TABLE IF NOT EXISTS public.failed_transfers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id       uuid NOT NULL REFERENCES public.users(id),
  amount_cents    integer NOT NULL,
  stripe_error    text,
  attempted_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS failed_transfers_order_id_attempted_at_idx
  ON public.failed_transfers (order_id, attempted_at DESC);

ALTER TABLE public.failed_transfers ENABLE ROW LEVEL SECURITY;
-- No client-facing policies; service role bypasses RLS for ops queries.
