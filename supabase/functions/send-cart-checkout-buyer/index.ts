// supabase/functions/send-cart-checkout-buyer/index.ts
//
// Fire-and-forget from the stripe-webhook cart branch (Cart-Task7) after a
// multi-seller cart checkout finishes. Sends ONE summary email to the buyer
// listing all N orders grouped by seller.
//
// Request body: { order_group_id: string }
// Caller passes the service-role Bearer token; no JWT verification needed.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// @ts-expect-error Deno env
const RESEND_API_KEY = Deno.env.get('VITE_RESEND_API_KEY') || ''
// @ts-expect-error Deno env
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
// @ts-expect-error Deno env
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Payload {
  order_group_id?: string
}

interface OrderRow {
  id: string
  listing_id: string
  seller_id: string
  item_price: number
  shipping_cost: number
  total: number
  order_number: string
}

interface ListingRow { id: string; title: string; photos: Array<{ url?: string }> | null }
interface UserRow { id: string; username: string | null; email: string | null }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!RESEND_API_KEY) {
      console.error('[send-cart-checkout-buyer] VITE_RESEND_API_KEY not set')
      return new Response('Email service not configured', { status: 503 })
    }

    const body: Payload = await req.json().catch(() => ({}))
    const groupId = body.order_group_id
    if (!groupId) return new Response('Missing order_group_id', { status: 400 })

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Load group + buyer + child orders.
    const { data: group } = await service
      .from('order_groups')
      .select('id, buyer_id, total_amount, created_at')
      .eq('id', groupId)
      .maybeSingle()
    if (!group) return new Response('Group not found', { status: 404 })

    const { data: buyer } = await service
      .from('users')
      .select('id, username, email')
      .eq('id', (group as { buyer_id: string }).buyer_id)
      .maybeSingle()
    if (!buyer || !(buyer as UserRow).email) {
      console.warn('[send-cart-checkout-buyer] buyer email missing, skipping')
      return new Response('ok', { status: 200 })
    }

    const { data: orders } = await service
      .from('orders')
      .select('id, listing_id, seller_id, item_price, shipping_cost, total, order_number')
      .eq('order_group_id', groupId)
    if (!orders || orders.length === 0) return new Response('No orders', { status: 404 })

    const orderRows = orders as OrderRow[]
    const listingIds = Array.from(new Set(orderRows.map((o) => o.listing_id)))
    const sellerIds = Array.from(new Set(orderRows.map((o) => o.seller_id)))

    const { data: listings } = await service
      .from('listings')
      .select('id, title, photos')
      .in('id', listingIds)
    const { data: sellers } = await service
      .from('users')
      .select('id, username')
      .in('id', sellerIds)

    const listingsById = new Map<string, ListingRow>(
      (listings ?? []).map((l) => [(l as ListingRow).id, l as ListingRow])
    )
    const sellersById = new Map<string, UserRow>(
      (sellers ?? []).map((s) => [(s as UserRow).id, s as UserRow])
    )

    // Group orders by seller for the email.
    const sellerGroups = new Map<string, { username: string; rows: OrderRow[]; subtotal: number }>()
    for (const o of orderRows) {
      const sellerUsername = sellersById.get(o.seller_id)?.username ?? 'seller'
      const g = sellerGroups.get(o.seller_id)
      if (g) {
        g.rows.push(o)
        g.subtotal += Number(o.total)
      } else {
        sellerGroups.set(o.seller_id, {
          username: sellerUsername,
          rows: [o],
          subtotal: Number(o.total),
        })
      }
    }

    const buyerEmail = (buyer as UserRow).email!
    const buyerName = (buyer as UserRow).username ?? buyerEmail
    const total = Number((group as { total_amount: number }).total_amount)

    const html = renderHtml({ buyerName, sellerGroups, listingsById, total, groupId })
    const text = renderText({ buyerName, sellerGroups, listingsById, total, groupId })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'InkStash <orders@inkstash.com>',
        to: buyerEmail,
        subject: `Your InkStash order — ${orderRows.length} item${orderRows.length === 1 ? '' : 's'} on the way`,
        html,
        text,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('[send-cart-checkout-buyer] Resend error', res.status, errBody)
      return new Response('Email send failed', { status: 502 })
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[send-cart-checkout-buyer] error', err)
    return new Response(`Server error: ${err instanceof Error ? err.message : 'unknown'}`, { status: 500 })
  }
})

interface RenderArgs {
  buyerName: string
  sellerGroups: Map<string, { username: string; rows: OrderRow[]; subtotal: number }>
  listingsById: Map<string, ListingRow>
  total: number
  groupId: string
}

function renderHtml(args: RenderArgs): string {
  const orderUrl = `https://inkstash.com/order-group/${args.groupId}`
  const sellerBlocks = Array.from(args.sellerGroups.values()).map((g) => {
    const itemRows = g.rows.map((o) => {
      const listing = args.listingsById.get(o.listing_id)
      const title = listing?.title ?? 'Comic'
      const cover = listing?.photos?.[0]?.url ?? ''
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #E8DFD2;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${cover ? `<td style="width:48px;padding-right:12px;"><img src="${cover}" alt="" width="48" style="border-radius:4px;display:block;" /></td>` : ''}
                <td>
                  <div style="font-size:14px;font-weight:600;color:#16110E;">${escapeHtml(title)}</div>
                  <div style="font-size:12px;color:#8A7F73;font-family:monospace;">Order #${escapeHtml(o.order_number)}</div>
                </td>
              </tr>
            </table>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #E8DFD2;text-align:right;font-family:monospace;font-size:14px;color:#16110E;vertical-align:top;">
            $${Number(o.total).toFixed(2)}
          </td>
        </tr>`
    }).join('')

    return `
      <div style="margin-bottom:24px;">
        <div style="font-family:monospace;font-size:11px;font-weight:700;color:#A1232C;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">
          From @${escapeHtml(g.username)}
        </div>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          ${itemRows}
          <tr>
            <td style="padding:10px 0 0;font-size:12px;color:#8A7F73;text-transform:uppercase;letter-spacing:0.05em;">Subtotal</td>
            <td style="padding:10px 0 0;text-align:right;font-family:monospace;font-weight:700;color:#16110E;">$${g.subtotal.toFixed(2)}</td>
          </tr>
        </table>
      </div>`
  }).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order confirmation</title></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:'Geist',system-ui,sans-serif;color:#16110E;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F2;padding:32px 16px;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;border:1px solid #E8DFD2;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="font-family:'Big Shoulders Display',sans-serif;font-weight:900;font-size:28px;text-transform:uppercase;letter-spacing:0.005em;margin-bottom:8px;">Order placed!</div>
          <div style="color:#8A7F73;font-size:15px;line-height:1.5;">Thanks, ${escapeHtml(args.buyerName)}. We've kicked off ${args.sellerGroups.size} seller${args.sellerGroups.size === 1 ? '' : 's'} on your behalf. You'll get a shipping update per item once each seller drops the package in the mail.</div>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          ${sellerBlocks}
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;border-top:2px solid #16110E;padding-top:16px;">
            <tr>
              <td style="font-family:'Big Shoulders Display',sans-serif;font-weight:800;font-size:16px;text-transform:uppercase;">Total charged</td>
              <td style="text-align:right;font-family:'Big Shoulders Display',sans-serif;font-weight:900;font-size:22px;color:#16110E;">$${args.total.toFixed(2)}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <a href="${orderUrl}" style="display:inline-block;background:#A1232C;color:#FFFFFF;padding:12px 24px;border-radius:6px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;text-decoration:none;font-size:13px;">View order</a>
        </td></tr>
        <tr><td style="background:#F2EDE5;padding:16px 32px;text-align:center;color:#8A7F73;font-size:11px;font-family:monospace;letter-spacing:0.05em;">
          InkStash · Comics, curated.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function renderText(args: RenderArgs): string {
  const lines: string[] = []
  lines.push(`Order placed!`)
  lines.push(``)
  lines.push(`Thanks, ${args.buyerName}. We've kicked off ${args.sellerGroups.size} seller${args.sellerGroups.size === 1 ? '' : 's'} on your behalf.`)
  lines.push(``)
  for (const g of args.sellerGroups.values()) {
    lines.push(`From @${g.username}:`)
    for (const o of g.rows) {
      const title = args.listingsById.get(o.listing_id)?.title ?? 'Comic'
      lines.push(`  ${title} — $${Number(o.total).toFixed(2)} (Order #${o.order_number})`)
    }
    lines.push(`  Subtotal: $${g.subtotal.toFixed(2)}`)
    lines.push(``)
  }
  lines.push(`Total charged: $${args.total.toFixed(2)}`)
  lines.push(``)
  lines.push(`View order: https://inkstash.com/order-group/${args.groupId}`)
  return lines.join('\n')
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case '\'': return '&#39;'
      default: return c
    }
  })
}
