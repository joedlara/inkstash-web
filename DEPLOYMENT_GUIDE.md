# InkStash - Order System Deployment Guide

This guide covers deploying the new order management system to your Supabase database.

## Overview

The order system includes:
- ✅ Order processing and checkout flow
- ✅ Order success page
- ✅ Purchases page for buyers and sellers
- ✅ "Sold" status indicators on items
- ✅ Email notification system (setup required)
- ✅ Database schema for orders

## Database Migration

### Step 1: Run the Orders Migration

You need to run the SQL migration file `005_create_orders_table.sql` to create the necessary database tables.

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your InkStash project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy the entire contents of `supabase/migrations/005_create_orders_table.sql`
6. Paste into the SQL editor
7. Click **Run** to execute the migration

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Link your project (you'll need your project ref from dashboard)
supabase link --project-ref YOUR_PROJECT_REF

# Push all pending migrations
supabase db push
```

### Step 2: Verify Migration

After running the migration, verify it worked:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see a new `orders` table
3. The `auctions` table should have new columns: `status` and `sold_at`

## Email Notifications Setup (Optional but Recommended)

To enable order confirmation emails:

### 1. Sign up for Resend

1. Go to [resend.com](https://resend.com) and create a free account
2. Verify your domain (or use their test domain for development)
3. Create an API key from the dashboard

### 2. Deploy Edge Function

```bash
# Set your Resend API key
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx

# Deploy the email function
supabase functions deploy send-order-confirmation
```

### 3. Update Email Configuration (Optional)

If you want to customize the sender email address:
- Edit `supabase/functions/send-order-confirmation/index.ts`
- Change the `from` field (line 46) to your verified domain email
- Redeploy: `supabase functions deploy send-order-confirmation`

### 4. Enable Email Sending in Checkout

The checkout flow is already set up to call the email function. Once deployed, emails will be sent automatically when orders are placed.

**Without email setup:** The system will still work perfectly, but buyers won't receive confirmation emails. You can add this later.

## Features & Pages

### New Pages

1. **Order Success** (`/order-success`)
   - Shows order confirmation after successful purchase
   - Displays order details, shipping address, and pricing
   - Links to purchases page

2. **Purchases** (`/purchases`)
   - Two tabs: Purchases (as buyer) and Sales (as seller)
   - Shows order history with status tracking
   - Links to individual order details

### Updated Pages

1. **Item Detail** (`/item/:id`)
   - Shows "SOLD" badge when item is sold
   - Disables buy/bid buttons for sold items
   - Prevents purchases of already-sold items

2. **Saved Items** (`/saved-items`)
   - Displays "SOLD" badge on sold items
   - Shows which saved items are no longer available

3. **Checkout** (`/checkout`)
   - Creates order in database on payment success
   - Marks item as sold automatically
   - Redirects to order success page
   - Triggers email notification (if configured)

## Testing the Order Flow

### 1. Test Buy Now Flow

1. Navigate to an item with a "Buy Now" price
2. Click **Buy Now**
3. Add a payment method and shipping address (if not already done)
4. Complete checkout
5. Verify you're redirected to order success page
6. Check that the item now shows as "SOLD"
7. Visit `/purchases` to see your order

### 2. Test Sold Item Display

1. Try to buy an item that's already sold
2. Verify "SOLD" badge appears
3. Verify buy/bid buttons are disabled

### 3. Test Email (if configured)

1. Complete a test purchase
2. Check your email for order confirmation
3. Verify all order details are correct

## Database Schema

### Orders Table

```sql
orders (
  id UUID PRIMARY KEY,
  order_number TEXT UNIQUE,
  auction_id UUID,
  buyer_id UUID,
  seller_id UUID,
  payment_method_id UUID,
  shipping_address_id UUID,
  -- Shipping details (snapshot)
  shipping_full_name TEXT,
  shipping_address_line1 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT,
  -- Pricing
  item_price DECIMAL(10, 2),
  shipping_cost DECIMAL(10, 2),
  tax DECIMAL(10, 2),
  total DECIMAL(10, 2),
  -- Status
  status TEXT (pending, processing, shipped, delivered, cancelled, refunded),
  purchase_type TEXT (buy_now, bid_won),
  -- Tracking
  tracking_number TEXT,
  carrier TEXT,
  -- Timestamps
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP
)
```

### Auctions Table Updates

New columns added:
- `status` TEXT: 'active', 'sold', 'ended', 'cancelled'
- `sold_at` TIMESTAMP: When the item was sold

## Security (RLS Policies)

The migration includes Row Level Security policies:

**Orders Table:**
- Buyers can view their own purchases
- Sellers can view their own sales
- Users can only create orders as themselves
- Both parties can update order status

**Auctions Table:**
- Status is automatically set to 'sold' when order is created
- sold_at timestamp is set automatically

## Troubleshooting

### Migration Fails

**Error: "relation auctions does not exist"**
- Make sure previous migrations have been run first
- Check migrations 001-004 are applied

**Error: "function update_updated_at_column does not exist"**
- This function should exist from migration 003
- Re-run migration 003 if needed

### Orders Not Creating

**Check:**
1. Migration ran successfully
2. User is authenticated
3. Payment and shipping IDs are valid
4. Item is not already sold

**Debug:**
- Check browser console for errors
- Check Supabase logs in dashboard
- Verify RLS policies are enabled

### Email Not Sending

**Check:**
1. RESEND_API_KEY secret is set
2. Edge function is deployed
3. Email domain is verified in Resend
4. Check function logs: `supabase functions logs send-order-confirmation`

## Production Checklist

Before going live:

- [ ] Run database migration in production
- [ ] Test complete order flow
- [ ] Set up email notifications
- [ ] Verify sold items display correctly
- [ ] Test purchases page
- [ ] Configure Stripe payment processing (currently simulated)
- [ ] Set up order fulfillment workflow
- [ ] Add order status update notifications
- [ ] Implement refund handling
- [ ] Add order cancellation flow

## Next Steps

Consider implementing:
1. **Stripe Payment Integration**: Replace simulated payment with real Stripe processing
2. **Order Tracking**: Allow sellers to add tracking numbers
3. **Order Status Updates**: Email notifications when order status changes
4. **Disputes & Returns**: Handle customer service cases
5. **Analytics**: Track order metrics and revenue
6. **Invoices**: Generate PDF invoices for orders
7. **Seller Dashboard**: Enhanced view of sales and fulfillment

## Support

For issues or questions:
1. Check Supabase logs for database errors
2. Check browser console for frontend errors
3. Review the code in `/src/api/orders.ts` for API logic
4. See migration file for database schema details

---

**Created:** January 13, 2025
**Last Updated:** January 13, 2025
