// supabase/functions/send-listing-sold-seller/index.ts
// Deploy with: supabase functions deploy send-listing-sold-seller
//
// Fire-and-forget from open-listing-order (step 7). Sends a "You sold X"
// notification to the seller with gross/fee/net payout breakdown.
// Called with service-role Bearer token — no --no-verify-jwt flag needed.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// @ts-expect-error Deno env
const RESEND_API_KEY = Deno.env.get('VITE_RESEND_API_KEY') || ''

interface Payload {
  orderId: string
  listing: {
    id: string
    title: string
    comic_publisher: string | null
    source_inventory_id: string | null
  }
  buyer_id: string
  seller_id: string
  amount_cents: number
  payment_intent_id: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const payload: Payload = await req.json()

    // Fetch seller email + username
    const { data: seller, error: sellerErr } = await supabase
      .from('users')
      .select('email, username')
      .eq('id', payload.seller_id)
      .maybeSingle()
    if (sellerErr || !seller?.email) {
      console.error('[send-listing-sold-seller] seller lookup failed', sellerErr)
      return new Response(JSON.stringify({ success: false, error: 'seller_not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Fetch listing details: buy_now_price, application_fee_pct, photos
    const { data: listingRow } = await supabase
      .from('listings')
      .select('buy_now_price, application_fee_pct, photos')
      .eq('id', payload.listing.id)
      .maybeSingle()

    const coverUrl: string | null = (listingRow?.photos as Array<{ url?: string }> | null)?.[0]?.url ?? null

    // Compute gross / fee / net breakdown
    const itemCents = Math.round(Number(listingRow?.buy_now_price ?? 0) * 100)
    const shippingCents = Math.max(0, payload.amount_cents - itemCents)
    const feePct = Number(listingRow?.application_fee_pct ?? 0.1)
    const feeCents = Math.round(itemCents * feePct)
    // Seller receives: full amount charged minus InkStash fee
    // (shipping passes through in full; fee only on item price)
    const netCents = payload.amount_cents - feeCents

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'InkStash <onboarding@resend.dev>',
        to: [seller.email],
        subject: `You sold ${payload.listing.title} on InkStash`,
        html: renderSellerHtml({
          payload,
          seller,
          coverUrl,
          itemCents,
          shippingCents,
          feeCents,
          netCents,
        }),
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Resend error: ${errorText}`)
    }

    const data = await emailResponse.json()
    console.log('[send-listing-sold-seller] sent to', seller.email, 'emailId', data.id)
    return new Response(JSON.stringify({ success: true, emailId: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[send-listing-sold-seller] error', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

function renderSellerHtml(ctx: {
  payload: Payload
  seller: { email: string; username: string | null }
  coverUrl: string | null
  itemCents: number
  shippingCents: number
  feeCents: number
  netCents: number
}): string {
  const { payload, seller, coverUrl, itemCents, shippingCents, feeCents, netCents } = ctx
  const isVault = payload.listing.source_inventory_id != null
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

  const coverBlock = coverUrl
    ? `<div style="text-align: center; margin-bottom: 18px;">
        <img src="${coverUrl}" alt="${payload.listing.title}" style="max-width: 160px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" />
      </div>`
    : ''

  const publisherChip = payload.listing.comic_publisher
    ? `<span style="display:inline-block; padding:2px 10px; border:1px solid #b91c1c; color:#b91c1c; border-radius:10px; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; margin-left:6px;">${payload.listing.comic_publisher}</span>`
    : ''

  const shippingRow = shippingCents > 0
    ? `<tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #555;">Shipping collected</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${fmt(shippingCents)}</td>
      </tr>`
    : ''

  const shippingContext = isVault
    ? `<div style="background: #f0fdf4; padding: 14px 18px; border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 16px;">
        <p style="margin: 0; color: #166534; font-size: 13px;">InkStash will ship from the vault — no action required from you.</p>
      </div>`
    : `<div style="background: #fff8ec; padding: 14px 18px; border-radius: 8px; border: 1px solid #fde7c0; margin-bottom: 16px;">
        <p style="margin: 0; color: #5b4a2e; font-size: 13px;">Please ship to the buyer within 5 business days. Buyer address will be sent in a follow-up email when the shipping label is generated.</p>
      </div>`

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Sale confirmed</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #166534; padding: 28px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 26px;">You made a sale!</h1>
    <p style="color: #bbf7d0; margin: 8px 0 0; font-size: 14px;">Your listing sold on InkStash</p>
  </div>
  <div style="background: #faf7f2; padding: 28px; border-radius: 0 0 10px 10px;">
    <div style="background: #fff; padding: 22px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #eadfd2;">
      ${coverBlock}
      <h2 style="color: #166534; margin-top: 0; font-size: 18px;">${payload.listing.title}${publisherChip}</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #555;">Item price</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${fmt(itemCents)}</td>
        </tr>
        ${shippingRow}
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #555;">Gross sale</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${fmt(payload.amount_cents)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #b91c1c;">InkStash fee</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: #b91c1c;">&minus;${fmt(feeCents)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #166534; font-weight: 700;">Your payout</td>
          <td style="padding: 8px 0; text-align: right; color: #166534; font-weight: 700;">${fmt(netCents)}</td>
        </tr>
      </table>
    </div>
    ${shippingContext}
    <div style="background: #f0fdf4; padding: 18px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0; margin-bottom: 16px;">
      <p style="margin: 0 0 12px; color: #166534;">Manage your active listings and payouts in your seller dashboard.</p>
      <a href="https://inkstash.app/seller-dashboard" style="display: inline-block; background: #166534; color: white; padding: 11px 26px; text-decoration: none; border-radius: 6px; font-weight: 600;">Go to Seller Dashboard</a>
    </div>
    <div style="margin-top: 24px; text-align: center; color: #777; font-size: 12px;">
      <p>Hello, ${seller.username ? `@${seller.username}` : seller.email}</p>
      <p>Payment reference: <span style="font-family: monospace;">${payload.payment_intent_id}</span></p>
      <p>Questions? <a href="mailto:support@inkstash.com" style="color: #b91c1c;">support@inkstash.com</a></p>
      <p>&copy; ${new Date().getFullYear()} InkStash</p>
    </div>
  </div>
</body>
</html>`
}
