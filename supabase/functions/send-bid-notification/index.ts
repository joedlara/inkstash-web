// Supabase Edge Function for sending bid notification emails
// Deploy with: supabase functions deploy send-bid-notification
// Set secret: supabase secrets set VITE_RESEND_API_KEY=your_key_here

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// @ts-expect-error - Deno is available in edge function runtime
const RESEND_API_KEY = Deno.env.get('VITE_RESEND_API_KEY') || ''

interface BidNotificationPayload {
  userEmail: string
  userName: string
  itemTitle: string
  itemImageUrl: string
  itemId: string
  previousBidAmount: number
  newBidAmount: number
  timeRemaining: string
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
    const payload: BidNotificationPayload = await req.json()

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'InkStash <notifications@inkstash.com>',
        to: [payload.userEmail],
        subject: `You've been outbid on "${payload.itemTitle}"`,
        html: generateBidNotificationEmail(payload),
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

function generateBidNotificationEmail(payload: BidNotificationPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've Been Outbid</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⚡ You've Been Outbid!</h1>
    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Don't let this one get away</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${payload.itemImageUrl}" alt="${payload.itemTitle}" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 300px; object-fit: cover;">
      </div>

      <h2 style="color: #f5576c; margin-top: 0; font-size: 22px; text-align: center;">${payload.itemTitle}</h2>

      <div style="background: #fff3cd; border-left: 4px solid #f5576c; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #856404;">
          <strong>Someone just placed a higher bid!</strong><br>
          Your bid of <strong>$${payload.previousBidAmount.toFixed(2)}</strong> has been outbid by <strong>$${payload.newBidAmount.toFixed(2)}</strong>
        </p>
      </div>

      <table style="width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 10px 0; color: #666;">Current Bid:</td>
          <td style="padding: 10px 0; text-align: right; font-size: 20px; color: #f5576c; font-weight: bold;">$${payload.newBidAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666;">Time Remaining:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600;">${payload.timeRemaining}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://inkstash.com/item/${payload.itemId}" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(245, 87, 108, 0.3);">Place a Higher Bid</a>
    </div>

    <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px;">
      <p style="margin: 0; color: #2e7d32; font-size: 14px;">
        💡 <strong>Pro Tip:</strong> Set a maximum bid to automatically bid up to your limit!
      </p>
    </div>

    <div style="margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
      <p>Don't want these notifications? <a href="https://inkstash.com/settings" style="color: #f5576c;">Manage preferences</a></p>
      <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} InkStash. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `
}
