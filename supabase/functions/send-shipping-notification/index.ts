// Supabase Edge Function for sending shipping notification emails
// Deploy with: supabase functions deploy send-shipping-notification
// Set secret: supabase secrets set VITE_RESEND_API_KEY=your_key_here

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// @ts-expect-error - Deno is available in edge function runtime
const RESEND_API_KEY = Deno.env.get('VITE_RESEND_API_KEY') || ''

interface ShippingNotificationPayload {
  userEmail: string
  userName: string
  orderNumber: string
  itemTitle: string
  itemImageUrl: string
  trackingNumber: string
  carrier: string
  estimatedDelivery?: string
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

// Generate carrier tracking URL
function getTrackingUrl(carrier: string, trackingNumber: string): string {
  const carrierUrls: { [key: string]: string } = {
    'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
    'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
  }

  return carrierUrls[carrier] || `https://www.google.com/search?q=${carrier}+tracking+${trackingNumber}`
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: ShippingNotificationPayload = await req.json()

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Acme <onboarding@resend.dev>', // Resend test domain - works without verification
        to: [payload.userEmail],
        subject: `📦 Your order ${payload.orderNumber} has shipped!`,
        html: generateShippingNotificationEmail(payload),
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

function generateShippingNotificationEmail(payload: ShippingNotificationPayload): string {
  const trackingUrl = getTrackingUrl(payload.carrier, payload.trackingNumber)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Order Has Shipped</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 60px; margin-bottom: 10px;">📦</div>
    <h1 style="color: white; margin: 0; font-size: 32px;">Your Order Has Shipped!</h1>
    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">It's on its way to you</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #4facfe; margin-top: 0; font-size: 20px;">Order ${payload.orderNumber}</h2>

      <div style="display: flex; align-items: center; margin: 20px 0; padding: 20px; background: #f0f9ff; border-radius: 8px;">
        <div style="flex: 0 0 80px; margin-right: 15px;">
          <img src="${payload.itemImageUrl}" alt="${payload.itemTitle}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
        </div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 5px 0; font-size: 16px; color: #333;">${payload.itemTitle}</h3>
          <p style="margin: 0; color: #666; font-size: 14px;">Shipped via ${payload.carrier}</p>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe15 0%, #00f2fe15 100%); border-left: 4px solid #4facfe; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Tracking Number:</td>
            <td style="text-align: right; padding: 8px 0; font-weight: 600; color: #4facfe;">${payload.trackingNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Carrier:</td>
            <td style="text-align: right; padding: 8px 0; font-weight: 600;">${payload.carrier}</td>
          </tr>
          ${payload.estimatedDelivery ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">Estimated Delivery:</td>
            <td style="text-align: right; padding: 8px 0; font-weight: 600;">${payload.estimatedDelivery}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${trackingUrl}" style="display: inline-block; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(79, 172, 254, 0.3);">Track Your Package</a>
      </div>
    </div>

    <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="color: #4facfe; margin-top: 0; font-size: 18px;">Shipping To</h3>
      <p style="margin: 5px 0; line-height: 1.8; color: #555;">
        <strong>${payload.shippingAddress.fullName}</strong><br>
        ${payload.shippingAddress.addressLine1}<br>
        ${payload.shippingAddress.addressLine2 ? payload.shippingAddress.addressLine2 + '<br>' : ''}
        ${payload.shippingAddress.city}, ${payload.shippingAddress.state} ${payload.shippingAddress.postalCode}<br>
        ${payload.shippingAddress.country}
      </p>
    </div>

    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        💡 <strong>Tip:</strong> Click "Track Your Package" to see real-time updates on your delivery status.
      </p>
    </div>

    <div style="margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
      <p>Questions about your order? <a href="mailto:support@inkstash.com" style="color: #4facfe;">Contact Support</a></p>
      <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} InkStash. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `
}
