// supabase/functions/send-vendor-pack-confirmation/index.ts
// Deploy with: supabase functions deploy send-vendor-pack-confirmation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// @ts-expect-error Deno env
const RESEND_API_KEY = Deno.env.get('VITE_RESEND_API_KEY') || ''

interface PulledItem {
  comic_title: string
  cover_treatment: string | null
  declared_value: number | null
  image_url: string | null
  is_chase: boolean
}

interface Payload {
  buyerEmail: string
  buyerName: string
  packName: string
  vendorDisplayName: string
  vendorHandle: string
  amountUsdCents: number
  items: PulledItem[]
  purchaseId: string
  paymentIntentId: string
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
        subject: `Your pull from ${payload.vendorDisplayName} — ${payload.packName}`,
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
  const itemRows = p.items
    .map((it) => {
      const treatment = it.cover_treatment
        ? `<span style="display:inline-block; padding:2px 8px; border:1px solid #b91c1c; color:#b91c1c; border-radius:10px; font-size:10px; text-transform:uppercase; letter-spacing:0.04em; margin-left:6px;">${it.cover_treatment}</span>`
        : ''
      const chaseBadge = it.is_chase
        ? `<span style="display:inline-block; padding:2px 8px; background:#fbbf24; color:#5b3a00; border-radius:10px; font-size:10px; font-weight:700; text-transform:uppercase; margin-left:6px;">CHASE</span>`
        : ''
      const value = it.declared_value != null ? `$${it.declared_value.toFixed(2)}` : '—'
      return `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
            ${it.comic_title}${treatment}${chaseBadge}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-family: monospace;">${value}</td>
        </tr>`
    })
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Pack opened</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #b91c1c; padding: 28px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 26px;">Pack opened</h1>
    <p style="color: #fde2e2; margin: 8px 0 0; font-size: 14px;">From ${p.vendorDisplayName} (@${p.vendorHandle})</p>
  </div>
  <div style="background: #faf7f2; padding: 28px; border-radius: 0 0 10px 10px;">
    <div style="background: #fff; padding: 22px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #eadfd2;">
      <h2 style="color: #b91c1c; margin-top: 0; font-size: 18px;">${p.packName}</h2>
      <p style="margin: 0 0 14px; color: #555; font-size: 13px;">Amount paid: $${usd} USD</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr><th style="text-align:left; padding-bottom:6px; color:#666; font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">You pulled</th><th style="text-align:right; padding-bottom:6px; color:#666; font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">Value</th></tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
    <div style="background: #fff8ec; padding: 18px; border-radius: 8px; text-align: center; border: 1px solid #fde7c0;">
      <p style="margin: 0 0 12px; color: #5b4a2e;">Your books are vaulted. Keep them, or request shipping anytime.</p>
      <a href="https://inkstash.com/my-stash" style="display: inline-block; background: #b91c1c; color: white; padding: 11px 26px; text-decoration: none; border-radius: 6px; font-weight: 600;">View in My Stash</a>
    </div>
    <div style="margin-top: 24px; text-align: center; color: #777; font-size: 12px;">
      <p>Payment reference: <span style="font-family: monospace;">${p.paymentIntentId}</span></p>
      <p>Questions? <a href="mailto:support@inkstash.com" style="color: #b91c1c;">support@inkstash.com</a></p>
      <p>&copy; ${new Date().getFullYear()} InkStash</p>
    </div>
  </div>
</body>
</html>`
}
