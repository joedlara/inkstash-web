-- Add missing columns to auctions table
ALTER TABLE public.auctions
ADD COLUMN IF NOT EXISTS artist TEXT,
ADD COLUMN IF NOT EXISTS us_shipping NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS international_shipping NUMERIC(10, 2) DEFAULT 0;
