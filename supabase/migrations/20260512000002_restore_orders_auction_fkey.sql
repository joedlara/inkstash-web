-- Restore the nullable FK from orders.auction_id → auctions so PostgREST
-- can resolve the join again. The column is already nullable from the previous migration.
ALTER TABLE public.orders
  ADD CONSTRAINT orders_auction_id_fkey
  FOREIGN KEY (auction_id) REFERENCES public.auctions(id) ON DELETE RESTRICT
  NOT VALID;

-- Validate only rows where auction_id is not null (skips listing-based orders)
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_auction_id_fkey;
