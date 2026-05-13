-- Add seller "ship from" addresses for shipping labels
-- This allows sellers to use alternate addresses instead of their home address

CREATE TABLE IF NOT EXISTS seller_ship_from_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Address details
  full_name text NOT NULL,
  company_name text,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text DEFAULT 'US' NOT NULL,
  phone text,

  -- Settings
  is_default boolean DEFAULT false,
  nickname text, -- e.g., "Home", "Warehouse", "PO Box"

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure each user has only one default
  CONSTRAINT unique_default_per_user UNIQUE NULLS NOT DISTINCT (user_id, is_default)
);

-- Create indexes
CREATE INDEX idx_seller_ship_from_user_id ON seller_ship_from_addresses(user_id);
CREATE INDEX idx_seller_ship_from_default ON seller_ship_from_addresses(user_id, is_default) WHERE is_default = true;

-- Updated_at trigger
CREATE TRIGGER update_seller_ship_from_addresses_updated_at
  BEFORE UPDATE ON seller_ship_from_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE seller_ship_from_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only manage their own addresses
CREATE POLICY "Users can view their own ship from addresses"
  ON seller_ship_from_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ship from addresses"
  ON seller_ship_from_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ship from addresses"
  ON seller_ship_from_addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ship from addresses"
  ON seller_ship_from_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION ensure_single_default_ship_from_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset all other defaults for this user
    UPDATE seller_ship_from_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_ship_from_address_trigger
  BEFORE INSERT OR UPDATE ON seller_ship_from_addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_ship_from_address();
