# Supabase Edge Functions for InkStash

This directory contains Supabase Edge Functions for handling server-side operations.

## Available Functions

### send-order-confirmation

Sends order confirmation emails to buyers when they complete a purchase.

## Setup Instructions

### 1. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

### 2. Link Your Project

```bash
# Navigate to project root
cd /path/to/inkstash-web

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Set Up Email Service (Resend)

1. Sign up for [Resend](https://resend.com) (free tier available)
2. Verify your domain or use their test domain
3. Create an API key from the Resend dashboard
4. Set the secret in Supabase:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### 4. Deploy Edge Functions

```bash
# Deploy the order confirmation function
supabase functions deploy send-order-confirmation

# Or deploy all functions
supabase functions deploy
```

### 5. Test the Function Locally (Optional)

```bash
# Start the local Supabase stack
supabase start

# Serve functions locally
supabase functions serve send-order-confirmation --env-file .env.local

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-order-confirmation' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "orderId": "test-123",
    "orderNumber": "ORD-20250113-ABCDE",
    "buyerEmail": "test@example.com",
    "buyerName": "Test Buyer",
    "itemTitle": "Test Item",
    "itemPrice": 100.00,
    "shippingCost": 10.00,
    "tax": 8.80,
    "total": 118.80,
    "shippingAddress": {
      "fullName": "Test Buyer",
      "addressLine1": "123 Test St",
      "city": "Test City",
      "state": "CA",
      "postalCode": "12345",
      "country": "US"
    }
  }'
```

## Email Configuration

### Using Resend

Resend is the recommended email provider for this project. Benefits:
- Simple API
- Free tier: 100 emails/day, 3,000/month
- Great deliverability
- Support for custom domains

### Alternative Email Providers

You can modify the edge function to use other providers:
- **SendGrid**: Good for high volume
- **Amazon SES**: Cost-effective for large scale
- **Postmark**: Excellent deliverability
- **Mailgun**: Feature-rich

To switch providers, update the API call in `send-order-confirmation/index.ts`.

## Environment Variables

Set these secrets in Supabase:

```bash
# Required for email
supabase secrets set RESEND_API_KEY=your_resend_api_key

# List all secrets
supabase secrets list

# Unset a secret
supabase secrets unset SECRET_NAME
```

## Monitoring

### View Function Logs

```bash
# View logs for a specific function
supabase functions logs send-order-confirmation

# Follow logs in real-time
supabase functions logs send-order-confirmation --follow
```

### View Function Invocations

Check the Supabase Dashboard:
1. Go to Edge Functions section
2. Click on `send-order-confirmation`
3. View Invocations tab for request/response logs

## Troubleshooting

### "Function not found" error
- Make sure the function is deployed: `supabase functions deploy send-order-confirmation`
- Check your project is linked: `supabase status`

### Email not sending
- Verify RESEND_API_KEY is set: `supabase secrets list`
- Check Resend dashboard for API key permissions
- Verify your domain is verified in Resend (or use test domain)
- Check function logs: `supabase functions logs send-order-confirmation`

### CORS errors
- The function includes CORS headers for browser requests
- If you need to restrict origins, update the `corsHeaders` in the function

## Development Workflow

1. Make changes to function code
2. Test locally: `supabase functions serve`
3. Deploy: `supabase functions deploy send-order-confirmation`
4. Monitor: `supabase functions logs send-order-confirmation --follow`

## Cost Considerations

### Resend Free Tier
- 100 emails/day
- 3,000 emails/month
- Good for development and small-scale production

### Supabase Edge Functions
- Free tier: 500K requests/month
- 2M compute seconds/month
- Generally free for most use cases

For high-volume applications, consider:
- Upgrading to Resend paid plan ($20/month for 50,000 emails)
- Using batch email sending
- Implementing email queuing for better rate limit management

## Security Notes

1. Never commit API keys to version control
2. Use Supabase Secrets for sensitive data
3. Implement rate limiting if needed
4. Validate all input data in edge functions
5. Use RLS policies to protect database access

## Future Enhancements

Potential improvements to consider:
- Add email templates for different order statuses
- Implement shipping notification emails
- Add email queuing for better reliability
- Support for email attachments (receipts, invoices)
- Email preference management
- Internationalization for email content
