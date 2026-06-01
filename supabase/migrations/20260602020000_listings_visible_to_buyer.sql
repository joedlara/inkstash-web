-- Buyers must be able to read a sold listing they purchased, otherwise the
-- post-checkout ItemDetail page hits "Item not found" the moment the webhook
-- flips status to 'sold'. The original policy only allowed status='active'
-- rows OR the seller's own rows.
--
-- We expand the policy to also expose sold listings to the buyer-of-record
-- via the orders table. (No change for non-buyers — sold listings stay
-- hidden from the general public.)

DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;

CREATE POLICY "Listings visible to public, owners, and buyers"
    ON public.listings
    FOR SELECT
    USING (
      status = 'active'
      OR user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.listing_id = public.listings.id
          AND o.buyer_id = auth.uid()
      )
    );
