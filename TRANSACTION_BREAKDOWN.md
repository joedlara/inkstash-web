# Transaction Breakdown - InkStash

This document explains how transaction costs are calculated when a buyer purchases an item on InkStash.

## Transaction Components

When a buyer completes a purchase, the total transaction amount is calculated as follows:

```
TOTAL = Item Price + Platform Service Fee + Shipping Cost + Sales Tax
```

### 1. Item Price
- **Description**: The listing price set by the seller (buy-now price or winning auction bid)
- **Set by**: Seller during listing creation
- **Example**: $50.00

### 2. Platform Service Fee
- **Description**: InkStash platform fee for facilitating the transaction
- **Calculation**: Percentage of item price (typically 10-15%)
- **Paid by**: Buyer
- **Example**: $50.00 × 10% = $5.00

### 3. Shipping Cost
- **Description**: Real-time shipping rate from ShipEngine (USPS, UPS, FedEx)
- **Set during**: Listing creation - seller provides package dimensions and weight
- **Calculated**: Based on actual package dimensions, weight, and buyer's location at checkout
- **Paid by**: **Buyer** (shipping cost is added to total at checkout)
- **Example**: $8.50 (USPS Priority Mail)
- **Note**: The seller selects a default shipping service during listing creation, but the final cost may vary based on buyer's exact location

### 4. Sales Tax
- **Description**: State and local sales tax based on buyer's shipping address
- **Calculation**: Handled automatically by Stripe based on buyer's location
- **Paid by**: Buyer
- **Example**: $50.00 × 6.5% = $3.25 (varies by state)

## Example Transaction

### Listing Details
- Item: Pokemon Card - Charizard PSA 10
- Buy Now Price: $50.00
- Delivery Method: Shipping
- Package: 8 oz, 6" × 4" × 1"
- Selected Shipping Service: USPS Priority Mail (~$8.50)

### At Checkout (Buyer in California)
```
Item Price:           $50.00
Service Fee (10%):    $ 5.00
Shipping (USPS):      $ 8.50
Tax (CA 7.25%):       $ 3.63
─────────────────────────────
TOTAL:                $67.13
```

### Seller Receives (After Sale)
```
Item Price:           $50.00
Platform Fee (10%):   -$ 5.00
Shipping Label Cost:  -$ 8.50  (deducted when label is created)
─────────────────────────────
Seller Payout:        $36.50
```

## Implementation Details

### During Listing Creation
1. Seller enters package dimensions and weight in [PackageDimensionsInput.tsx](src/components/listing/PackageDimensionsInput.tsx)
2. Seller clicks "Get shipping rates"
3. If no ship-from address exists, [ShipFromAddressModal.tsx](src/components/listing/ShipFromAddressModal.tsx) is displayed
4. System calls ShipEngine API via [get-shipping-rates](supabase/functions/get-shipping-rates/index.ts) edge function
5. Available shipping options are displayed in [ShippingRatesDisplay.tsx](src/components/listing/ShippingRatesDisplay.tsx)
6. Seller selects preferred shipping service (default rate)
7. Selected rate is saved with the listing

### At Checkout (Future Implementation)
1. Retrieve buyer's shipping address
2. Recalculate shipping cost with actual buyer location
3. Calculate sales tax based on buyer's state/location (Stripe automatic tax)
4. Display full transaction breakdown:
   - Item price
   - Service fee
   - Shipping cost
   - Sales tax
   - **Total**
5. Process payment via Stripe
6. Create shipping label via [create-shipping-label](supabase/functions/create-shipping-label/index.ts) edge function

## Key Changes Made

### Removed "Who Pays Shipping" Toggle
- **Previous**: Sellers could choose whether they or the buyer pays for shipping
- **Current**: **Buyer always pays** shipping cost at checkout
- **Rationale**: Simpler transaction model, transparent pricing, industry standard

### Ship-From Address Required
- Sellers must provide their ship-from address before getting shipping rates
- Address is managed via [seller_ship_from_addresses](src/api/sellerShipFromAddresses.ts) API
- Modal prompts seller to add address if none exists
- Can save multiple addresses with a default selection

## Database Schema

### Listings Table
```sql
-- Shipping-related fields
package_weight_value DECIMAL
package_weight_unit TEXT  -- 'ounce', 'pound', 'gram', 'kilogram'
package_length DECIMAL
package_width DECIMAL
package_height DECIMAL
package_dimension_unit TEXT  -- 'inch', 'centimeter'
selected_shipping_rate_id UUID  -- Reference to saved rate
```

### Shipping Rates Table
```sql
CREATE TABLE shipping_rates (
  id UUID PRIMARY KEY,
  listing_id UUID REFERENCES listings(id),
  shipengine_rate_id TEXT,
  carrier_code TEXT,  -- 'usps', 'ups', 'fedex'
  service_name TEXT,  -- 'USPS Priority Mail', 'UPS Ground', etc.
  shipping_amount DECIMAL,
  delivery_days INTEGER,
  is_selected BOOLEAN,
  created_at TIMESTAMP,
  ...
);
```

### Seller Ship-From Addresses Table
```sql
CREATE TABLE seller_ship_from_addresses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  full_name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  phone TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  ...
);
```

## API Integrations

### ShipEngine API
- **Purpose**: Calculate real-time shipping rates and create labels
- **Endpoints**:
  - `GET /v1/rates` - Get shipping rates
  - `POST /v1/labels` - Create shipping label
- **Carriers**: USPS, UPS, FedEx (configured in ShipEngine dashboard)

### Stripe API
- **Purpose**: Payment processing and automatic sales tax calculation
- **Features**:
  - Automatic tax calculation based on buyer location
  - Payment intents for secure checkout
  - Seller payouts via Stripe Connect

## Next Steps

1. **Implement Checkout Flow**: Create checkout page that:
   - Collects buyer shipping address
   - Recalculates shipping with actual destination
   - Calculates sales tax via Stripe
   - Displays full transaction breakdown
   - Processes payment

2. **Order Management**: After successful payment:
   - Create shipment record
   - Generate shipping label via ShipEngine
   - Send tracking info to buyer
   - Update order status

3. **Seller Payout**: After delivery confirmation:
   - Calculate seller payout (item price - fees - shipping cost)
   - Transfer funds via Stripe Connect
   - Generate payout report

## Testing

To test the shipping flow:

1. Start dev server: `npm run dev:web`
2. Navigate to List Item page
3. Enter package dimensions (e.g., 8 oz, 6"×4"×1")
4. Click "Get shipping rates"
5. Add ship-from address if prompted
6. View available shipping options from USPS, UPS, FedEx
7. Select a shipping service
8. Complete listing

**Note**: You'll need a valid ShipEngine API key in `.env`:
```
VITE_SHIPSTATION_API_KEY=your_key_here
```
