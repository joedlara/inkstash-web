-- order_groups: parent that ties N orders (from a multi-seller cart
-- checkout) to one Stripe PaymentIntent. Buyer is charged ONCE; the
-- platform fans out N Transfers to each seller's Connect account.
--
-- orders.order_group_id is NULL for legacy single-item M3 orders so the
-- existing buy-now path keeps working unchanged.

CREATE TABLE IF NOT EXISTS public.order_groups (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id                    uuid NOT NULL REFERENCES public.users(id),
  stripe_payment_intent_id    text NOT NULL UNIQUE,
  total_amount                numeric(10, 2) NOT NULL,
  status                      text NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'paid', 'partial_payout_failed', 'fully_paid_out')),
  created_at                  timestamptz DEFAULT now(),
  paid_at                     timestamptz,
  fully_paid_out_at           timestamptz
);

CREATE INDEX IF NOT EXISTS order_groups_buyer_id_created_at_idx
  ON public.order_groups (buyer_id, created_at DESC);

ALTER TABLE public.order_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer can read own order groups" ON public.order_groups
  FOR SELECT USING (auth.uid() = buyer_id);

-- Extend orders with transfer-tracking columns. order_group_id is the
-- foreign key tying this row back to its parent cart checkout.
-- transfer_status captures the post-payment Stripe Transfer state so
-- ops can monitor failed payouts and the retry cron has something to
-- query against.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_group_id              uuid REFERENCES public.order_groups(id),
  ADD COLUMN IF NOT EXISTS stripe_transfer_id          text,
  ADD COLUMN IF NOT EXISTS transfer_status             text
                                CHECK (transfer_status IS NULL OR transfer_status IN ('pending', 'succeeded', 'failed', 'retrying')),
  ADD COLUMN IF NOT EXISTS transfer_attempts           integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfer_last_error         text;

CREATE INDEX IF NOT EXISTS orders_order_group_id_idx
  ON public.orders (order_group_id) WHERE order_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_transfer_status_retry_idx
  ON public.orders (transfer_status, transfer_attempts)
  WHERE transfer_status = 'failed';
