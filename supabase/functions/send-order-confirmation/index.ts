// Supabase Edge Function for sending order confirmation emails
// Deploy with: supabase functions deploy send-order-confirmation
// Set secret: supabase secrets set VITE_RESEND_API_KEY=your_key_here

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// @ts-expect-error - Deno is available in edge function runtime
const RESEND_API_KEY = Deno.env.get('VITE_RESEND_API_KEY') || ''

interface OrderConfirmationPayload {
  orderId: string
  orderNumber: string
  buyerEmail: string
  buyerName: string
  itemTitle: string
  itemPrice: number
  shippingCost: number
  tax: number
  total: number
  shippingAddress: {
    fullName: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: OrderConfirmationPayload = await req.json()

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Acme <onboarding@resend.dev>', // Resend test domain - works without verification
        to: [payload.buyerEmail],
        subject: `Order Confirmation - ${payload.orderNumber}`,
        html: generateOrderConfirmationEmail(payload),
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Failed to send email: ${errorText}`)
    }

    const data = await emailResponse.json()

    return new Response(
      JSON.stringify({ success: true, emailId: data.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function generateOrderConfirmationEmail(payload: OrderConfirmationPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmed!</h1>
    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Thank you for your purchase</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #667eea; margin-top: 0; font-size: 20px;">Order Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Order Number:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${payload.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Item:</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${payload.itemTitle}</td>
        </tr>
      </table>
    </div>

    <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="color: #667eea; margin-top: 0; font-size: 18px;">Order Summary</h3>
      <table style="width: 100%;">
        <tr>
          <td style="padding: 8px 0;">Item Price:</td>
          <td style="text-align: right; padding: 8px 0;">$${payload.itemPrice.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">Shipping:</td>
          <td style="text-align: right; padding: 8px 0;">$${payload.shippingCost.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">Tax:</td>
          <td style="text-align: right; padding: 8px 0;">$${payload.tax.toFixed(2)}</td>
        </tr>
        <tr style="border-top: 2px solid #667eea;">
          <td style="padding: 12px 0; font-size: 18px;"><strong>Total:</strong></td>
          <td style="text-align: right; padding: 12px 0; font-size: 18px; color: #667eea;"><strong>$${payload.total.toFixed(2)}</strong></td>
        </tr>
      </table>
    </div>

    <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="color: #667eea; margin-top: 0; font-size: 18px;">Shipping Address</h3>
      <p style="margin: 5px 0; line-height: 1.8;">
        <strong>${payload.shippingAddress.fullName}</strong><br>
        ${payload.shippingAddress.addressLine1}<br>
        ${payload.shippingAddress.addressLine2 ? payload.shippingAddress.addressLine2 + '<br>' : ''}
        ${payload.shippingAddress.city}, ${payload.shippingAddress.state} ${payload.shippingAddress.postalCode}<br>
        ${payload.shippingAddress.country}
      </p>
    </div>

    <div style="background: #e8eaf6; padding: 20px; border-radius: 8px; text-align: center;">
      <p style="margin: 0 0 15px 0; color: #555;">You can track your order status anytime</p>
      <a href="https://inkstash.com/purchases" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order</a>
    </div>

    <div style="margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
      <p>If you have any questions, please contact us at <a href="mailto:support@inkstash.com" style="color: #667eea;">support@inkstash.com</a></p>
      <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} InkStash. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `
}
