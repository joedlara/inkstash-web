// Supabase Edge Function for creating shipping labels with ShipEngine
// Deploy with: supabase functions deploy create-shipping-label
// Set secret: supabase secrets set VITE_SHIPSTATION_API_KEY=your_key_here

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import QRCode from 'https://esm.sh/qrcode@1.5.3'

// @ts-expect-error - Deno is available in edge function runtime
const SHIPSTATION_API_KEY = Deno.env.get('VITE_SHIPSTATION_API_KEY') || ''
// @ts-expect-error - Deno is available in edge function runtime
const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') || ''
// @ts-expect-error - Deno is available in edge function runtime
const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY') || ''

interface CreateLabelPayload {
  orderId: string
  rateId?: string
  labelLayout?: '4x6' | '8.5x11'
  labelFormat?: 'pdf' | 'png' | 'zpl'
  testLabel?: boolean
  generateQRCode?: boolean
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
    const payload: CreateLabelPayload = await req.json()

    // Validate payload
    if (!payload.orderId) {
      throw new Error('Missing required field: orderId')
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { authorization: authHeader },
      },
    })

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', payload.orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // Verify user is the seller
    if (order.seller_id !== user.id) {
      throw new Error('Unauthorized: Only the seller can create labels for this order')
    }

    // Get the shipping rate if a rate ID is provided
    let selectedRate = null
    if (payload.rateId) {
      const { data: rate } = await supabase
        .from('shipping_rates')
        .select('*')
        .eq('id', payload.rateId)
        .single()

      selectedRate = rate
    }

    // Get listing details for package information
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', order.listing_id || order.auction_id)
      .single()

    if (listingError || !listing) {
      throw new Error('Listing not found')
    }

    // Get seller's default shipping address or profile
    const { data: sellerProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    // Create label request
    const labelRequest: any = {
      label_layout: payload.labelLayout || '4x6',
      label_format: payload.labelFormat || 'pdf',
      label_download_type: 'url',
      test_label: payload.testLabel || SHIPSTATION_API_KEY.startsWith('TEST_'),
    }

    // If we have a rate ID from ShipEngine, use it
    if (selectedRate?.shipengine_rate_id) {
      labelRequest.rate_id = selectedRate.shipengine_rate_id
    } else {
      // Create shipment on the fly
      labelRequest.shipment = {
        ship_to: {
          name: order.shipping_full_name,
          address_line1: order.shipping_address_line1,
          address_line2: order.shipping_address_line2,
          city_locality: order.shipping_city,
          state_province: order.shipping_state,
          postal_code: order.shipping_postal_code,
          country_code: order.shipping_country || 'US',
          phone: order.shipping_phone,
          address_residential_indicator: 'yes',
        },
        ship_from: {
          name: sellerProfile?.full_name || 'Seller',
          address_line1: '123 Main St', // TODO: Get from seller's profile/shipping address
          city_locality: 'San Francisco',
          state_province: 'CA',
          postal_code: '94105',
          country_code: 'US',
          address_residential_indicator: 'no',
        },
        packages: [
          {
            weight: {
              value: listing.package_weight_value || 8,
              unit: listing.package_weight_unit || 'ounce',
            },
            dimensions: {
              length: listing.package_length || 6,
              width: listing.package_width || 4,
              height: listing.package_height || 1,
              unit: listing.package_dimension_unit || 'inch',
            },
          },
        ],
      }

      // Add service code if available from selected rate
      if (selectedRate?.service_code) {
        labelRequest.shipment.service_code = selectedRate.service_code
      }
    }

    // Create label with ShipEngine API
    const labelResponse = await fetch('https://api.shipengine.com/v1/labels', {
      method: 'POST',
      headers: {
        'API-Key': SHIPSTATION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(labelRequest),
    })

    if (!labelResponse.ok) {
      const errorText = await labelResponse.text()
      throw new Error(`ShipEngine API error: ${errorText}`)
    }

    const label = await labelResponse.json()

    // Generate QR code if requested
    let qrCodeData = null
    let qrCodeUrl = null

    if (payload.generateQRCode) {
      // Create QR code data with tracking number and carrier info
      qrCodeData = JSON.stringify({
        trackingNumber: label.tracking_number,
        carrierCode: label.carrier_code,
        serviceCode: label.service_code,
        orderId: payload.orderId,
      })

      // Generate QR code as data URL
      qrCodeUrl = await QRCode.toDataURL(qrCodeData, {
        width: 300,
        margin: 2,
      })
    }

    // Create shipment record in database
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        order_id: payload.orderId,
        listing_id: order.listing_id || order.auction_id,
        seller_id: order.seller_id,
        buyer_id: order.buyer_id,

        shipengine_shipment_id: label.shipment_id,
        shipengine_label_id: label.label_id,
        shipengine_rate_id: selectedRate?.shipengine_rate_id,

        carrier_code: label.carrier_code,
        carrier_name: label.carrier_friendly_name || label.carrier_code,
        service_code: label.service_code,
        service_name: label.service_type || label.service_code,

        package_weight_value: listing.package_weight_value,
        package_weight_unit: listing.package_weight_unit,
        package_length: listing.package_length,
        package_width: listing.package_width,
        package_height: listing.package_height,
        package_dimension_unit: listing.package_dimension_unit,

        ship_from_name: labelRequest.shipment?.ship_from?.name,
        ship_from_address_line1: labelRequest.shipment?.ship_from?.address_line1,
        ship_from_city: labelRequest.shipment?.ship_from?.city_locality,
        ship_from_state: labelRequest.shipment?.ship_from?.state_province,
        ship_from_postal_code: labelRequest.shipment?.ship_from?.postal_code,
        ship_from_country: labelRequest.shipment?.ship_from?.country_code,

        ship_to_name: order.shipping_full_name,
        ship_to_address_line1: order.shipping_address_line1,
        ship_to_address_line2: order.shipping_address_line2,
        ship_to_city: order.shipping_city,
        ship_to_state: order.shipping_state,
        ship_to_postal_code: order.shipping_postal_code,
        ship_to_country: order.shipping_country,
        ship_to_phone: order.shipping_phone,

        shipping_amount: order.shipping_cost,
        actual_cost: label.shipment_cost.amount,
        seller_pays_shipping: listing.seller_pays_shipping || false,

        label_url: label.label_download.href,
        label_format: payload.labelFormat || 'pdf',
        label_layout: payload.labelLayout || '4x6',

        qr_code_url: qrCodeUrl,
        qr_code_data: qrCodeData,

        tracking_number: label.tracking_number,
        tracking_status: label.tracking_status || 'pre_transit',
        tracking_url: `https://www.shipengine.com/tracking/${label.tracking_number}`,

        status: 'label_created',
        label_created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (shipmentError) {
      throw new Error(`Failed to save shipment: ${shipmentError.message}`)
    }

    // Update order with shipment ID and tracking info
    await supabase
      .from('orders')
      .update({
        shipment_id: shipment.id,
        tracking_number: label.tracking_number,
        carrier: label.carrier_code,
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.orderId)

    return new Response(
      JSON.stringify({
        success: true,
        shipment: {
          id: shipment.id,
          labelId: label.label_id,
          trackingNumber: label.tracking_number,
          labelUrl: label.label_download.href,
          labelPdfUrl: label.label_download.pdf,
          qrCodeUrl: qrCodeUrl,
          carrierCode: label.carrier_code,
          serviceCode: label.service_code,
          cost: label.shipment_cost.amount,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    console.error('Error creating shipping label:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create shipping label',
        details: error.response?.data || error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
