# Email Notification Setup Guide

This guide will help you set up all email notifications for InkStash using Resend and Supabase Edge Functions.

## Prerequisites

1. **Resend Account**
   - Sign up at https://resend.com
   - Verify your sending domain (or use their test domain for development)
   - Get your API key from the dashboard

2. **Supabase CLI**
   - Already installed (you mentioned you have it)

## Step 1: Set Resend API Key as Secret

Run this command to set your Resend API key as a Supabase secret:

```bash
npx supabase secrets set VITE_RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

Replace `re_xxxxxxxxxxxxxxxxxxxxx` with your actual Resend API key.

## Step 2: Deploy Edge Functions

Deploy all the email edge functions with these commands:

```bash
# Deploy order confirmation emails
npx supabase functions deploy send-order-confirmation

# Deploy bid notification emails
npx supabase functions deploy send-bid-notification

# Deploy auction win emails
npx supabase functions deploy send-auction-win

# Deploy shipping notification emails
npx supabase functions deploy send-shipping-notification
```

Or deploy all at once:

```bash
npx supabase functions deploy send-order-confirmation && \
npx supabase functions deploy send-bid-notification && \
npx supabase functions deploy send-auction-win && \
npx supabase functions deploy send-shipping-notification
```

## Step 3: Verify Deployment

After deploying, you can test each function:

### Test Order Confirmation Email

```bash
npx supabase functions invoke send-order-confirmation --data '{
  "orderId": "test-123",
  "orderNumber": "ORD-20250113-ABC12",
  "buyerEmail": "your-email@example.com",
  "buyerName": "Test User",
  "itemTitle": "Test Item",
  "itemPrice": 100.00,
  "shippingCost": 10.00,
  "tax": 8.00,
  "total": 118.00,
  "shippingAddress": {
    "fullName": "Test User",
    "addressLine1": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "USA"
  }
}'
```

### Test Bid Notification Email

```bash
npx supabase functions invoke send-bid-notification --data '{
  "userEmail": "your-email@example.com",
  "userName": "Test User",
  "itemTitle": "Vintage Comic Book",
  "itemImageUrl": "https://example.com/image.jpg",
  "itemId": "abc-123",
  "previousBidAmount": 50.00,
  "newBidAmount": 55.00,
  "timeRemaining": "2d 5h"
}'
```

### Test Auction Win Email

```bash
npx supabase functions invoke send-auction-win --data '{
  "userEmail": "your-email@example.com",
  "userName": "Test User",
  "itemTitle": "Rare Trading Card",
  "itemImageUrl": "https://example.com/image.jpg",
  "itemId": "xyz-789",
  "winningBidAmount": 150.00,
  "auctionEndTime": "2025-01-13T12:00:00Z"
}'
```

### Test Shipping Notification Email

```bash
npx supabase functions invoke send-shipping-notification --data '{
  "userEmail": "your-email@example.com",
  "userName": "Test User",
  "orderNumber": "ORD-20250113-ABC12",
  "itemTitle": "Collectible Figure",
  "itemImageUrl": "https://example.com/image.jpg",
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "estimatedDelivery": "Jan 18, 2025",
  "shippingAddress": {
    "fullName": "Test User",
    "addressLine1": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "USA"
  }
}'
```

## Step 4: Configure Email Sending Domain (Production)

For production use:

1. Go to Resend Dashboard → Domains
2. Add your domain (e.g., `inkstash.com`)
3. Add the DNS records they provide to your domain registrar
4. Wait for verification (usually takes a few minutes)
5. Update the `from` addresses in the edge functions:
   - `orders@inkstash.com` for order confirmations
   - `notifications@inkstash.com` for bids and wins
   - `shipping@inkstash.com` for shipping updates

## Email Types Overview

### 1. Order Confirmation Email
**Trigger:** When an order is successfully placed
**Function:** `send-order-confirmation`
**Contains:** Order details, shipping address, total breakdown

### 2. Bid Notification Email
**Trigger:** When user is outbid on an auction
**Function:** `send-bid-notification`
**Contains:** Item details, previous vs new bid, time remaining, CTA to bid again

### 3. Auction Win Email
**Trigger:** When user wins an auction
**Function:** `send-auction-win`
**Contains:** Winning bid amount, next steps, CTA to complete purchase

### 4. Shipping Notification Email
**Trigger:** When order is marked as shipped
**Function:** `send-shipping-notification`
**Contains:** Tracking number, carrier, delivery estimate, tracking link

## Integration Points

The email functions are already integrated into the codebase:

1. **Order Confirmation:** Called in `src/pages/Checkout.tsx` after successful order
2. **Bid Notification:** Can be triggered via database trigger or application logic
3. **Auction Win:** Can be triggered when auction ends via cron job or manual process
4. **Shipping Update:** Called in `src/api/orders.ts` when order status is updated to "shipped"

## Troubleshooting

### Emails not sending?

1. **Check secrets are set:**
   ```bash
   npx supabase secrets list
   ```
   You should see `VITE_RESEND_API_KEY` in the list

2. **Check function logs:**
   ```bash
   npx supabase functions logs send-order-confirmation
   ```

3. **Verify Resend API key is valid:**
   - Log into Resend dashboard
   - Check API Keys section
   - Make sure the key hasn't been revoked

4. **Check email in spam folder:**
   - During development with unverified domains, emails often go to spam
   - Verify your domain to improve deliverability

### Rate Limits

Resend free tier includes:
- 100 emails/day
- 3,000 emails/month

For production, consider upgrading to a paid plan.

## Next Steps

1. Set up database triggers to automatically send bid notifications
2. Create a cron job to check ended auctions and send win notifications
3. Monitor email delivery rates in Resend dashboard
4. Set up email templates in Resend (optional - currently using inline HTML)
5. Add unsubscribe functionality for notification emails

## Security Notes

- Never commit your Resend API key to version control
- The API key is stored securely in Supabase secrets
- Edge functions run in a secure Deno runtime
- All email endpoints use CORS headers for security
