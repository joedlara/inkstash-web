// supabase/functions/send-ruby-bundle-confirmation/index.ts
// Deploy with: supabase functions deploy send-ruby-bundle-confirmation
// Uses VITE_RESEND_API_KEY (already configured per other send-* functions).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// @ts-expect-error Deno env
const RESEND_API_KEY = Deno.env.get('VITE_RESEND_API_KEY') || ''

interface Payload {
  buyerEmail: string
  buyerName: string
  bundleName: string
  rubyTotal: number
  amountUsdCents: number
  paymentIntentId: string
  purchasedAt: string // ISO
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload: Payload = await req.json()

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'InkStash <onboarding@resend.dev>',
        to: [payload.buyerEmail],
        subject: `Your Ruby bundle is ready — ${payload.rubyTotal.toLocaleString()} Rubies`,
        html: renderHtml(payload),
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Resend error: ${errorText}`)
    }

    const data = await emailResponse.json()
    return new Response(JSON.stringify({ success: true, emailId: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

function renderHtml(p: Payload): string {
  const usd = (p.amountUsdCents / 100).toFixed(2)
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Ruby bundle confirmed</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #b91c1c; padding: 28px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 26px;">Rubies credited</h1>
    <p style="color: #fde2e2; margin: 8px 0 0; font-size: 14px;">${p.rubyTotal.toLocaleString()} 💎 added to your balance</p>
  </div>
  <div style="background: #faf7f2; padding: 28px; border-radius: 0 0 10px 10px;">
    <div style="background: #fff; padding: 22px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #eadfd2;">
      <h2 style="color: #b91c1c; margin-top: 0; font-size: 18px;">Purchase details</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;">Bundle</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${p.bundleName}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;">Rubies</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${p.rubyTotal.toLocaleString()} 💎</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;">Amount charged</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">$${usd} USD</td></tr>
        <tr><td style="padding: 8px 0;">Payment reference</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${p.paymentIntentId}</td></tr>
      </table>
    </div>
    <div style="background: #fff8ec; padding: 18px; border-radius: 8px; text-align: center; border: 1px solid #fde7c0;">
      <p style="margin: 0 0 12px; color: #5b4a2e;">Open your next pack with your new Rubies.</p>
      <a href="https://inkstash.com/packs" style="display: inline-block; background: #b91c1c; color: white; padding: 11px 26px; text-decoration: none; border-radius: 6px; font-weight: 600;">Browse packs</a>
    </div>
    <div style="margin-top: 24px; text-align: center; color: #777; font-size: 12px;">
      <p>Questions? <a href="mailto:support@inkstash.com" style="color: #b91c1c;">support@inkstash.com</a></p>
      <p>&copy; ${new Date().getFullYear()} InkStash</p>
    </div>
  </div>
</body>
</html>`
}
