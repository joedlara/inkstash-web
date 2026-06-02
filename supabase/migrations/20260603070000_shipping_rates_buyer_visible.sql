-- Buyers must be able to read the shipping_rate that the seller selected
-- for an active listing — otherwise cart totals and the buyer's view of
-- "$X + $Y shipping" can never render anything but $0.
--
-- The original policy only let the rate's owner SELECT. We widen it: any
-- authenticated or anonymous user can SELECT a rate that is the
-- selected_shipping_rate_id of some listings row. Owner access for full
-- rate history (the rate-quote step in the listing wizard) still works
-- because the OR keeps it open to owners regardless.

DROP POLICY IF EXISTS "Users can view their shipping rates" ON public.shipping_rates;

CREATE POLICY "Shipping rates: owner sees all, public sees selected on active listings"
  ON public.shipping_rates
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.selected_shipping_rate_id = public.shipping_rates.id
        AND l.status = 'active'
    )
  );
