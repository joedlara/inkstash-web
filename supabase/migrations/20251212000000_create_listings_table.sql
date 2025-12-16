-- Create listings table for seller inventory
CREATE TABLE IF NOT EXISTS public.listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title character varying(500) NOT NULL,
    description text,
    condition character varying(50),
    category character varying(100),

    -- Photos stored as JSONB array
    photos jsonb DEFAULT '[]'::jsonb,

    -- Pricing options
    is_auction boolean DEFAULT false,
    is_buy_now boolean DEFAULT false,
    buy_now_price numeric(10,2),
    starting_bid numeric(10,2),

    -- Inventory management
    quantity integer DEFAULT 1 NOT NULL,

    -- Delivery
    delivery_method character varying(50),

    -- Status
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,

    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_listings_user_id ON public.listings(user_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_created_at ON public.listings(created_at DESC);

-- Add RLS policies
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all active listings
CREATE POLICY "Anyone can view active listings"
    ON public.listings
    FOR SELECT
    USING (status = 'active' OR user_id = auth.uid());

-- Policy: Users can insert their own listings
CREATE POLICY "Users can insert their own listings"
    ON public.listings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own listings
CREATE POLICY "Users can update their own listings"
    ON public.listings
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own listings
CREATE POLICY "Users can delete their own listings"
    ON public.listings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION update_listings_updated_at();

-- Add comment
COMMENT ON TABLE public.listings IS 'Seller inventory and listings for non-livestream items';
