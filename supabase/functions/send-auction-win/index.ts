// Supabase Edge Function for sending auction win notification emails
// Deploy with: supabase functions deploy send-auction-win
// Set secret: supabase secrets set VITE_RESEND_API_KEY=your_key_here

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// @ts-expect-error - Deno is available in edge function runtime
const RESEND_API_KEY = Deno.env.get('VITE_RESEND_API_KEY') || ''

interface AuctionWinPayload {
  userEmail: string
  userName: string
  itemTitle: string
  itemImageUrl: string
  itemId: string
  winningBidAmount: number
  auctionEndTime: string
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
    const payload: AuctionWinPayload = await req.json()

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
        subject: `🎉 Congratulations! You won "${payload.itemTitle}"`,
        html: generateAuctionWinEmail(payload),
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

function generateAuctionWinEmail(payload: AuctionWinPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You Won the Auction!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 60px; margin-bottom: 10px;">🎉</div>
    <h1 style="color: white; margin: 0; font-size: 32px;">Congratulations!</h1>
    <p style="color: white; margin: 10px 0 0 0; font-size: 18px;">You won the auction!</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${payload.itemImageUrl}" alt="${payload.itemTitle}" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 300px; object-fit: cover;">
      </div>

      <h2 style="color: #667eea; margin-top: 0; font-size: 24px; text-align: center;">${payload.itemTitle}</h2>

      <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;">
          <strong>Your Winning Bid</strong>
        </p>
        <p style="margin: 0; font-size: 32px; color: #667eea; font-weight: bold;">
          $${payload.winningBidAmount.toFixed(2)}
        </p>
      </div>

      <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #2e7d32; font-size: 14px; text-align: center;">
          <strong>✓ You had the highest bid when the auction ended</strong>
        </p>
      </div>

      <h3 style="color: #667eea; font-size: 18px; margin-top: 30px;">What's Next?</h3>
      <ul style="color: #555; padding-left: 20px;">
        <li style="margin: 10px 0;">Complete your purchase to claim your item</li>
        <li style="margin: 10px 0;">You'll receive an order confirmation once payment is processed</li>
        <li style="margin: 10px 0;">The seller will ship your item within 3-5 business days</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://inkstash.com/item/${payload.itemId}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">Complete Purchase</a>
    </div>

    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        ⏰ <strong>Important:</strong> Please complete your purchase within 48 hours to secure your item.
      </p>
    </div>

    <div style="margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
      <p>Questions? Contact us at <a href="mailto:support@inkstash.com" style="color: #667eea;">support@inkstash.com</a></p>
      <p style="margin-top: 20px;">&copy; ${new Date().getFullYear()} InkStash. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `
}
