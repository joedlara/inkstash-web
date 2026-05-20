-- Create shipments table for tracking shipping labels, rates, and fulfillment
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id),
  seller_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ShipEngine IDs
  shipengine_shipment_id text UNIQUE,
  shipengine_label_id text,
  shipengine_rate_id text,

  -- Carrier information
  carrier_code text, -- 'usps', 'ups', 'fedex', etc.
  carrier_name text,
  service_code text, -- 'usps_priority_mail', 'ups_ground', etc.
  service_name text,

  -- Package details
  package_weight_value numeric(10, 2), -- in ounces or pounds
  package_weight_unit text DEFAULT 'ounce', -- 'ounce', 'pound', 'gram', 'kilogram'
  package_length numeric(10, 2), -- in inches
  package_width numeric(10, 2),
  package_height numeric(10, 2),
  package_dimension_unit text DEFAULT 'inch',

  -- Shipping addresses (copied from order for historical record)
  ship_from_name text,
  ship_from_company text,
  ship_from_address_line1 text,
  ship_from_address_line2 text,
  ship_from_city text,
  ship_from_state text,
  ship_from_postal_code text,
  ship_from_country text DEFAULT 'US',
  ship_from_phone text,

  ship_to_name text,
  ship_to_company text,
  ship_to_address_line1 text,
  ship_to_address_line2 text,
  ship_to_city text,
  ship_to_state text,
  ship_to_postal_code text,
  ship_to_country text DEFAULT 'US',
  ship_to_phone text,

  -- Rates and pricing
  shipping_amount numeric(10, 2), -- What buyer pays
  actual_cost numeric(10, 2), -- What it actually costs from carrier
  seller_pays_shipping boolean DEFAULT false,

  -- Delivery estimates
  estimated_delivery_date date,
  delivery_days integer,

  -- Label information
  label_url text, -- URL to download PDF label
  label_format text DEFAULT 'pdf', -- 'pdf', 'png', 'zpl'
  label_layout text DEFAULT '4x6', -- '4x6', '8.5x11'

  -- QR code for drop-off
  qr_code_url text,
  qr_code_data text, -- Encoded QR data for carrier drop-off

  -- Tracking
  tracking_number text,
  tracking_status text, -- 'pre_transit', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'unknown'
  tracking_url text,

  -- Fulfillment status
  status text DEFAULT 'pending_label', -- 'pending_label', 'label_created', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned'
  label_created_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_status CHECK (status IN ('pending_label', 'label_created', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned')),
  CONSTRAINT valid_carrier CHECK (carrier_code IN ('usps', 'ups', 'fedex', 'dhl_express', 'stamps_com', 'endicia', 'other'))
);

-- Create indexes for common queries
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_listing_id ON shipments(listing_id);
CREATE INDEX idx_shipments_seller_id ON shipments(seller_id);
CREATE INDEX idx_shipments_buyer_id ON shipments(buyer_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_created_at ON shipments(created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Sellers can view and manage their shipments
CREATE POLICY "Sellers can view their shipments"
  ON shipments FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their shipments"
  ON shipments FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their shipments"
  ON shipments FOR UPDATE
  USING (auth.uid() = seller_id);

-- Buyers can view their shipments (read-only)
CREATE POLICY "Buyers can view their shipments"
  ON shipments FOR SELECT
  USING (auth.uid() = buyer_id);

-- Create shipping_rates table for storing rate quotes during listing creation
CREATE TABLE IF NOT EXISTS shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ShipEngine rate data
  shipengine_rate_id text,
  carrier_code text,
  carrier_name text,
  service_code text,
  service_name text,

  -- Pricing
  shipping_amount numeric(10, 2),
  other_amount numeric(10, 2), -- Insurance, confirmation, etc.
  insurance_amount numeric(10, 2),
  confirmation_amount numeric(10, 2),

  -- Delivery estimates
  estimated_delivery_date date,
  delivery_days integer,
  guaranteed_service boolean DEFAULT false,

  -- Package details used for quote
  package_weight_value numeric(10, 2),
  package_weight_unit text DEFAULT 'ounce',
  package_length numeric(10, 2),
  package_width numeric(10, 2),
  package_height numeric(10, 2),
  package_dimension_unit text DEFAULT 'inch',

  -- Seller preferences
  is_selected boolean DEFAULT false, -- Which rate seller chose
  seller_pays_shipping boolean DEFAULT false,

  -- Rate validity
  rate_expires_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_shipping_rates_listing_id ON shipping_rates(listing_id);
CREATE INDEX idx_shipping_rates_user_id ON shipping_rates(user_id);
CREATE INDEX idx_shipping_rates_is_selected ON shipping_rates(is_selected);

-- Updated_at trigger
CREATE TRIGGER update_shipping_rates_updated_at
  BEFORE UPDATE ON shipping_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their shipping rates"
  ON shipping_rates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their shipping rates"
  ON shipping_rates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their shipping rates"
  ON shipping_rates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their shipping rates"
  ON shipping_rates FOR DELETE
  USING (auth.uid() = user_id);

-- Add shipping-related columns to listings table
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS package_weight_value numeric(10, 2),
  ADD COLUMN IF NOT EXISTS package_weight_unit text DEFAULT 'ounce',
  ADD COLUMN IF NOT EXISTS package_length numeric(10, 2),
  ADD COLUMN IF NOT EXISTS package_width numeric(10, 2),
  ADD COLUMN IF NOT EXISTS package_height numeric(10, 2),
  ADD COLUMN IF NOT EXISTS package_dimension_unit text DEFAULT 'inch',
  ADD COLUMN IF NOT EXISTS seller_pays_shipping boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS selected_shipping_rate_id uuid REFERENCES shipping_rates(id);

-- Add shipment_id to orders table for reference
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipment_id uuid REFERENCES shipments(id);

-- Create function to update tracking status
CREATE OR REPLACE FUNCTION update_shipment_tracking(
  p_shipment_id uuid,
  p_tracking_status text,
  p_tracking_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shipment shipments%ROWTYPE;
  v_new_status text;
BEGIN
  -- Get the shipment
  SELECT * INTO v_shipment
  FROM shipments
  WHERE id = p_shipment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment not found';
  END IF;

  -- Determine new shipment status based on tracking status
  v_new_status := CASE p_tracking_status
    WHEN 'pre_transit' THEN 'label_created'
    WHEN 'in_transit' THEN 'in_transit'
    WHEN 'out_for_delivery' THEN 'in_transit'
    WHEN 'delivered' THEN 'delivered'
    ELSE v_shipment.status
  END;

  -- Update shipment
  UPDATE shipments
  SET
    tracking_status = p_tracking_status,
    tracking_url = COALESCE(p_tracking_url, tracking_url),
    status = v_new_status,
    delivered_at = CASE WHEN p_tracking_status = 'delivered' THEN now() ELSE delivered_at END,
    updated_at = now()
  WHERE id = p_shipment_id;

  -- Update related order status
  UPDATE orders
  SET
    status = CASE
      WHEN p_tracking_status = 'delivered' THEN 'delivered'
      WHEN p_tracking_status IN ('in_transit', 'out_for_delivery') THEN 'shipped'
      ELSE status
    END,
    delivered_at = CASE WHEN p_tracking_status = 'delivered' THEN now() ELSE delivered_at END,
    updated_at = now()
  WHERE id = v_shipment.order_id;

  RETURN json_build_object(
    'success', true,
    'shipment_id', p_shipment_id,
    'status', v_new_status,
    'tracking_status', p_tracking_status
  );
END;
$$;
