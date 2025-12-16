// Supabase Edge Function for sending seller verification confirmation emails
// Deploy with: supabase functions deploy send-seller-verification-confirmation
// Set secret: supabase secrets set VITE_RESEND_API_KEY=your_key_here

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// @ts-expect-error - Deno is available in edge function runtime
const RESEND_API_KEY = Deno.env.get('VITE_RESEND_API_KEY') || ''

interface SellerVerificationPayload {
  email: string
  name: string
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
    const payload: SellerVerificationPayload = await req.json()

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Acme <onboarding@resend.dev>', // Resend test domain - works without verification
        to: [payload.email],
        subject: 'Welcome to the InkStash Creator Community!',
        html: generateSellerVerificationEmail(payload),
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

function generateSellerVerificationEmail(payload: SellerVerificationPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to InkStash Creator Community</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #0078FF 0%, #005ACC 100%); padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🎉 Welcome to InkStash!</h1>
    <p style="color: white; margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">You're now a verified creator</p>
  </div>

  <!-- Main Content -->
  <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

    <!-- Greeting -->
    <div style="margin-bottom: 30px;">
      <p style="font-size: 18px; margin: 0 0 20px 0; color: #333;">Hi ${payload.name || 'there'},</p>
      <p style="font-size: 16px; margin: 0 0 15px 0; line-height: 1.8; color: #555;">
        Thank you for submitting your application to become a verified seller on InkStash! We're thrilled to have you join our community of creators.
      </p>
      <p style="font-size: 16px; margin: 0 0 15px 0; line-height: 1.8; color: #555;">
        We appreciate your interest in sharing your collectibles and connecting with collectors through live streaming. Your application has been received and you're all set to get started!
      </p>
    </div>

    <!-- What's Next Section -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #0078FF;">
      <h2 style="color: #0078FF; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">What's Next?</h2>
      <p style="font-size: 15px; margin: 0 0 12px 0; color: #555; line-height: 1.7;">
        You'll receive updates soon on how to start streaming and posting collectibles for sale. In the meantime, you can:
      </p>
      <ul style="margin: 15px 0; padding-left: 20px; color: #555;">
        <li style="margin-bottom: 10px; line-height: 1.6;">Set up your creator profile</li>
        <li style="margin-bottom: 10px; line-height: 1.6;">Add your first collectibles to inventory</li>
        <li style="margin-bottom: 10px; line-height: 1.6;">Explore the Creator Dashboard</li>
        <li style="margin-bottom: 10px; line-height: 1.6;">Plan your first livestream</li>
      </ul>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 35px 0;">
      <a href="https://inkstash.com/creator-dashboard" style="display: inline-block; background: #0078FF; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 120, 255, 0.3);">
        Go to Creator Dashboard
      </a>
    </div>

    <!-- Support Info -->
    <div style="background: #fff8e1; padding: 20px; border-radius: 8px; margin-top: 30px;">
      <p style="margin: 0 0 10px 0; font-size: 15px; color: #666;">
        <strong style="color: #f57c00;">💡 Need Help?</strong>
      </p>
      <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.6;">
        Check out our Creator Handbook or reach out to our support team at <a href="mailto:support@inkstash.com" style="color: #0078FF; text-decoration: none;">support@inkstash.com</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 14px;">
      <p style="margin: 0 0 10px 0;">
        We're excited to see what you'll create and share with the InkStash community!
      </p>
      <p style="margin: 20px 0 0 0; font-size: 13px;">
        &copy; ${new Date().getFullYear()} InkStash. All rights reserved.
      </p>
    </div>
  </div>

</body>
</html>
  `
}