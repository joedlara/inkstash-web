// supabase/functions/send-listing-sold-buyer/index.ts
// Deploy with: supabase functions deploy send-listing-sold-buyer
//
// Fire-and-forget from open-listing-order (step 7). Sends a "You bought X"
// confirmation to the buyer. Called with service-role Bearer token — no
// --no-verify-jwt flag needed.

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

    // Fetch buyer email + username
    const { data: buyer, error: buyerErr } = await supabase
      .from('users')
      .select('email, username')
      .eq('id', payload.buyer_id)
      .maybeSingle()
    if (buyerErr || !buyer?.email) {
      console.error('[send-listing-sold-buyer] buyer lookup failed', buyerErr)
      return new Response(JSON.stringify({ success: false, error: 'buyer_not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Fetch seller username
    const { data: seller } = await supabase
      .from('users')
      .select('username')
      .eq('id', payload.seller_id)
      .maybeSingle()

    // Fetch listing cover photo
    const { data: listingRow } = await supabase
      .from('listings')
      .select('photos')
      .eq('id', payload.listing.id)
      .maybeSingle()
    const coverUrl: string | null = (listingRow?.photos as Array<{ url?: string }> | null)?.[0]?.url ?? null

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'InkStash <onboarding@resend.dev>',
        to: [buyer.email],
        subject: `You bought ${payload.listing.title} on InkStash`,
        html: renderBuyerHtml({ payload, buyer, seller, coverUrl }),
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Resend error: ${errorText}`)
    }

    const data = await emailResponse.json()
    console.log('[send-listing-sold-buyer] sent to', buyer.email, 'emailId', data.id)
    return new Response(JSON.stringify({ success: true, emailId: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[send-listing-sold-buyer] error', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

function renderBuyerHtml(ctx: {
  payload: Payload
  buyer: { email: string; username: string | null }
  seller: { username: string | null } | null
  coverUrl: string | null
}): string {
  const { payload, seller, coverUrl } = ctx
  const usd = (payload.amount_cents / 100).toFixed(2)
  const sellerHandle = seller?.username ? `@${seller.username}` : 'the seller'
  const isVault = payload.listing.source_inventory_id != null

  const coverBlock = coverUrl
    ? `<div style="text-align: center; margin-bottom: 18px;">
        <img src="${coverUrl}" alt="${payload.listing.title}" style="max-width: 160px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" />
      </div>`
    : ''

  const publisherChip = payload.listing.comic_publisher
    ? `<span style="display:inline-block; padding:2px 10px; border:1px solid #b91c1c; color:#b91c1c; border-radius:10px; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; margin-left:6px;">${payload.listing.comic_publisher}</span>`
    : ''

  const vaultBlock = isVault
    ? `<div style="background: #fff8ec; padding: 14px 18px; border-radius: 8px; border: 1px solid #fde7c0; margin-bottom: 16px;">
        <p style="margin: 0; color: #5b4a2e; font-size: 13px;">This book is shipping from the InkStash vault — expect it within 3–5 business days.</p>
      </div>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Purchase confirmed</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #b91c1c; padding: 28px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 26px;">Purchase confirmed</h1>
    <p style="color: #fde2e2; margin: 8px 0 0; font-size: 14px;">You bought a comic from ${sellerHandle}</p>
  </div>
  <div style="background: #faf7f2; padding: 28px; border-radius: 0 0 10px 10px;">
    <div style="background: #fff; padding: 22px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #eadfd2;">
      ${coverBlock}
      <h2 style="color: #b91c1c; margin-top: 0; font-size: 18px;">${payload.listing.title}${publisherChip}</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #555;">Seller</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${sellerHandle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #555;">Total charged</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">$${usd} USD</td>
        </tr>
      </table>
    </div>
    ${vaultBlock}
    <div style="background: #fff8ec; padding: 18px; border-radius: 8px; text-align: center; border: 1px solid #fde7c0; margin-bottom: 16px;">
      <p style="margin: 0 0 12px; color: #5b4a2e;">Your book is on its way to your stash.</p>
      <a href="https://inkstash.app/purchases" style="display: inline-block; background: #b91c1c; color: white; padding: 11px 26px; text-decoration: none; border-radius: 6px; font-weight: 600;">View My Purchases</a>
    </div>
    <div style="margin-top: 24px; text-align: center; color: #777; font-size: 12px;">
      <p>Payment reference: <span style="font-family: monospace;">${payload.payment_intent_id}</span></p>
      <p>Questions? <a href="mailto:support@inkstash.com" style="color: #b91c1c;">support@inkstash.com</a></p>
      <p>&copy; ${new Date().getFullYear()} InkStash</p>
    </div>
  </div>
</body>
</html>`
}
