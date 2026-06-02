// supabase/functions/purchase-shipping-label/index.ts
//
// Authenticated. Buys a ShipEngine label against the rate the buyer
// selected at checkout. Updates the order with label_url + tracking +
// auto-flips status to 'shipped'. Fires the existing buyer shipping
// notification email.
//
// Body: { order_id: string }
// Response: { label_url, tracking_number, carrier }
//
// Idempotent: if the order already has a label_url, returns it without
// re-buying. ShipEngine label purchases are not reversible without a
// void-label call, so retries must NOT re-charge.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  order_id?: string
}

interface ShipEngineLabelResponse {
  label_id?: string
  status?: string
  tracking_number?: string
  carrier_code?: string
  carrier_id?: string
  label_download?: {
    pdf?: string
    href?: string
    png?: string
    zpl?: string
  }
  errors?: Array<{ message?: string; error_code?: string }>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // @ts-expect-error Deno env
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    // @ts-expect-error Deno env
    const shipEngineKey = Deno.env.get('SHIPENGINE_API_KEY')
      // Fall back to older secret names — both are in use across envs.
      // @ts-expect-error Deno env
      ?? Deno.env.get('SHIPSTATION_API_KEY')
      // @ts-expect-error Deno env
      ?? Deno.env.get('VITE_SHIPSTATION_API_KEY')

    if (!shipEngineKey) {
      return json({ error: 'Shipping is not configured (no SHIPENGINE_API_KEY).' }, 503)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body: RequestBody = await req.json()
    if (!body.order_id) return json({ error: 'order_id is required' }, 400)

    // Load order — auth check on seller_id below.
    const { data: order, error: orderErr } = await serviceClient
      .from('orders')
      .select('id, seller_id, buyer_id, listing_id, selected_shipping_rate_id, label_url, tracking_number, carrier, status, order_number, shipping_full_name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country')
      .eq('id', body.order_id)
      .maybeSingle()

    if (orderErr) {
      console.error('[purchase-shipping-label] order fetch failed', orderErr)
      return json({ error: 'Failed to load order' }, 500)
    }
    if (!order) return json({ error: 'Order not found' }, 404)
    if (order.seller_id !== user.id) return json({ error: 'Not your order' }, 403)

    // Idempotency: if the label already exists, return it. The seller
    // probably double-clicked or the previous response was lost in flight.
    if (order.label_url) {
      return json({
        label_url: order.label_url,
        tracking_number: order.tracking_number,
        carrier: order.carrier,
        already_purchased: true,
      }, 200)
    }

    if (!order.selected_shipping_rate_id) {
      return json({ error: 'Order has no shipping rate selected. The buyer did not pick a rate at checkout.' }, 400)
    }

    // Look up the ShipEngine rate_id this row maps to. shipping_rates.id is
    // our internal PK; shipengine_rate_id is the one ShipEngine assigns.
    const { data: rateRow, error: rateErr } = await serviceClient
      .from('shipping_rates')
      .select('id, shipengine_rate_id, carrier_friendly_name, service_type, carrier_code')
      .eq('id', order.selected_shipping_rate_id)
      .maybeSingle()

    if (rateErr || !rateRow) {
      console.error('[purchase-shipping-label] rate lookup failed', rateErr)
      return json({ error: 'Failed to look up the shipping rate' }, 500)
    }
    if (!rateRow.shipengine_rate_id) {
      return json({ error: 'Shipping rate is missing its ShipEngine ID' }, 500)
    }

    // Buy the label against the rate. Single-step purchase.
    const labelRes = await fetch(
      `https://api.shipengine.com/v1/labels/rates/${rateRow.shipengine_rate_id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-Key': shipEngineKey,
        },
        body: JSON.stringify({
          label_format: 'pdf',
          label_layout: '4x6',
        }),
      },
    )

    const labelData = await labelRes.json() as ShipEngineLabelResponse

    if (!labelRes.ok || labelData.errors?.length) {
      const errMsg = labelData.errors?.[0]?.message ?? `ShipEngine ${labelRes.status}`
      console.error('[purchase-shipping-label] ShipEngine error', errMsg, labelData)
      return json({ error: errMsg }, 502)
    }

    const labelUrl = labelData.label_download?.pdf ?? labelData.label_download?.href
    if (!labelUrl) {
      console.error('[purchase-shipping-label] no label URL in response', labelData)
      return json({ error: 'ShipEngine did not return a label URL' }, 502)
    }

    const trackingNumber = labelData.tracking_number ?? ''
    const carrier = labelData.carrier_code ?? rateRow.carrier_code ?? rateRow.carrier_friendly_name ?? ''

    // Persist on the order row + auto-flip status to 'shipped'.
    const { error: updErr } = await serviceClient
      .from('orders')
      .update({
        label_url: labelUrl,
        label_purchased_at: new Date().toISOString(),
        tracking_number: trackingNumber,
        carrier,
        status: 'shipped',
        shipped_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updErr) {
      // Label is bought - we cannot un-buy. Log and continue so the seller
      // still gets the label URL back; ops can reconcile manually.
      console.error('[purchase-shipping-label] order update failed AFTER label purchase', updErr)
    }

    // Fire the buyer shipping email. Non-blocking failure - don't fail the
    // label purchase if email fails.
    try {
      // Need the buyer's email; service client can read public.users.
      const { data: buyerRow } = await serviceClient
        .from('users')
        .select('email')
        .eq('id', order.buyer_id)
        .maybeSingle()

      if (buyerRow?.email) {
        await serviceClient.functions.invoke('send-shipping-notification-email', {
          body: {
            userEmail: buyerRow.email,
            userName: order.shipping_full_name,
            orderNumber: order.order_number,
            itemTitle: '', // filled by the email fn from the listing if needed
            itemImageUrl: '',
            trackingNumber,
            carrier,
            shippingAddress: {
              fullName: order.shipping_full_name,
              addressLine1: order.shipping_address_line1,
              addressLine2: order.shipping_address_line2,
              city: order.shipping_city,
              state: order.shipping_state,
              postalCode: order.shipping_postal_code,
              country: order.shipping_country,
            },
          },
        })
      }
    } catch (emailErr) {
      console.warn('[purchase-shipping-label] shipping email failed (non-fatal)', emailErr)
    }

    return json({
      label_url: labelUrl,
      tracking_number: trackingNumber,
      carrier,
    }, 200)
  } catch (err) {
    console.error('[purchase-shipping-label] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
