# Payment & Shipping Setup Guide

This guide explains how to set up and use the payment and shipping functionality in InkStash.

## Overview

The payment and shipping system integrates Stripe for secure payment method storage and uses Supabase for shipping address management. Users can:

- Add and manage multiple payment methods (credit/debit cards)
- Add and manage multiple shipping addresses
- Set default payment methods and shipping addresses
- Securely store payment information via Stripe

## Setup Instructions

### 1. Database Migration

Run the Supabase migration to create the necessary tables:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the SQL in your Supabase SQL editor
```

The migration file is located at: `supabase/migrations/003_create_payment_and_shipping.sql`

This creates:
- `payment_methods` table - stores Stripe payment method references
- `shipping_addresses` table - stores user shipping addresses
- Row Level Security (RLS) policies for data protection
- Triggers to ensure only one default payment method/address per user

### 2. Environment Variables

Add the following to your `.env` file (use `.env.example` as a template):

```env
# Stripe Configuration
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_publishable_key
VITE_STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

**Getting your Stripe keys:**
1. Create a Stripe account at https://stripe.com
2. Go to Developers > API keys
3. Copy your "Publishable key" (starts with `pk_test_` or `pk_live_`) → Use for `VITE_STRIPE_PUBLIC_KEY`
4. Copy your "Secret key" (starts with `sk_test_` or `sk_live_`) → Use for `VITE_STRIPE_SECRET_KEY`
5. **IMPORTANT:** Never commit your actual keys to the repository! Keep them only in your `.env` file

### 3. Install Dependencies

The required packages are already installed:
- `@stripe/stripe-js` - Stripe JavaScript SDK
- `@stripe/react-stripe-js` - Stripe React components

## File Structure

```
src/
├── api/
│   └── payments.ts              # API functions for payment & shipping
├── components/
│   └── payments/
│       ├── AddPaymentMethodForm.tsx
│       ├── AddShippingAddressForm.tsx
│       ├── EditShippingAddressForm.tsx
│       ├── PaymentMethodsList.tsx
│       └── ShippingAddressesList.tsx
├── config/
│   └── stripe.ts               # Stripe initialization
└── pages/
    └── PaymentAndShipping.tsx  # Main page component

supabase/
└── migrations/
    └── 003_create_payment_and_shipping.sql
```

## Usage

### Accessing the Page

Users can access the payment and shipping page by:
1. Clicking their profile avatar in the top right
2. Clicking "Payments & Shipping" in the profile dropdown
3. Or navigating directly to `/payments`

### Features

**Payment Methods:**
- Add credit/debit cards via Stripe Elements
- View all saved payment methods
- Set a default payment method
- Delete payment methods (except default if multiple exist)
- Card information is securely stored by Stripe

**Shipping Addresses:**
- Add new shipping addresses with full address details
- Edit existing addresses
- Set a default shipping address
- Delete addresses (except default if multiple exist)
- Phone number is optional

## Security

- Payment card data never touches your server - it's handled by Stripe
- Only Stripe payment method IDs are stored in your database
- Row Level Security ensures users can only access their own data
- All API calls are authenticated via Supabase Auth

## API Reference

### Payment Methods API

```typescript
import { paymentMethodsAPI } from '@/api/payments';

// Get all payment methods for current user
const methods = await paymentMethodsAPI.getAll();

// Add a new payment method
const method = await paymentMethodsAPI.add(stripePaymentMethodId, cardDetails);

// Set as default
await paymentMethodsAPI.setDefault(methodId);

// Delete a payment method
await paymentMethodsAPI.delete(methodId);
```

### Shipping Addresses API

```typescript
import { shippingAddressesAPI } from '@/api/payments';

// Get all addresses for current user
const addresses = await shippingAddressesAPI.getAll();

// Add a new address
const address = await shippingAddressesAPI.add(addressData);

// Update an address
await shippingAddressesAPI.update(addressId, updates);

// Set as default
await shippingAddressesAPI.setDefault(addressId);

// Delete an address
await shippingAddressesAPI.delete(addressId);
```

## Next Steps

Now that payment and shipping is set up, you can:

1. **Implement checkout flow** - Use the default payment method and shipping address during checkout
2. **Add order processing** - Create orders with payment intent via Stripe
3. **Handle payment confirmations** - Implement webhook handlers for payment events
4. **Add buyer workflow** - Complete the buying and bidding system for collectibles

## Testing

### Test Mode

Stripe test mode is enabled by default with test API keys. Use these test card numbers:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0027 6000 3184`

Use any future expiration date, any 3-digit CVC, and any ZIP code.

### Testing Workflow

1. Log in to your application
2. Navigate to Payments & Shipping
3. Add a test payment method using `4242 4242 4242 4242`
4. Add a test shipping address
5. Verify data is saved correctly
6. Test setting default methods
7. Test editing and deleting

## Troubleshooting

**"Stripe publishable key not found" or Stripe not loading**
- Ensure `VITE_STRIPE_PUBLIC_KEY` is set in your `.env` file with your publishable key (starts with `pk_test_` or `pk_live_`)
- Restart your dev server after adding environment variables (`npm run dev`)
- Check that the Content Security Policy in `index.html` allows Stripe domains

**CSP (Content Security Policy) Errors**
- If you see "violates the following Content Security Policy directive" errors for Stripe:
  - Verify `index.html` includes `https://js.stripe.com` in `script-src` and `frame-src`
  - Verify `https://api.stripe.com` is in `connect-src`
  - The CSP has already been configured for Stripe, but check if any custom CSP settings are overriding it

**"Failed to save payment method"**
- Check that your Stripe public key is valid and active
- Verify the database migration has been run
- Check browser console for detailed error messages
- Make sure you're using the test key (`pk_test_`) in development

**RLS Policy Errors**
- Ensure user is properly authenticated
- Verify RLS policies were created by the migration
- Check that `auth.uid()` matches the user's ID

## Support

For issues or questions:
- Check the Stripe documentation: https://stripe.com/docs
- Check the Supabase documentation: https://supabase.com/docs
- Review the code comments in the source files
