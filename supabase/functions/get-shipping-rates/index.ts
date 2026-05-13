// Supabase Edge Function for getting shipping rates from ShipEngine
// Deploy with: supabase functions deploy get-shipping-rates
// Set secret: supabase secrets set VITE_SHIPSTATION_API_KEY=your_key_here

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// @ts-expect-error - Deno is available in edge function runtime
const SHIPSTATION_API_KEY = Deno.env.get('VITE_SHIPSTATION_API_KEY') || ''

interface PackageDimensions {
  weight: {
    value: number
    unit: 'ounce' | 'pound' | 'gram' | 'kilogram'
  }
  dimensions: {
    length: number
    width: number
    height: number
    unit: 'inch' | 'centimeter'
  }
}

interface ShippingAddress {
  name: string
  company?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone?: string
}

interface GetRatesPayload {
  shipFrom: ShippingAddress
  shipTo: ShippingAddress
  packages: PackageDimensions[]
  confirmation?: 'none' | 'delivery' | 'signature' | 'adult_signature' | 'direct_signature'
  insuranceValue?: number
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
    const payload: GetRatesPayload = await req.json()

    // Validate payload
    if (!payload.shipFrom || !payload.shipTo || !payload.packages || payload.packages.length === 0) {
      throw new Error('Missing required fields: shipFrom, shipTo, and packages are required')
    }

    // Convert our format to ShipEngine format
    const shipment = {
      ship_to: {
        name: payload.shipTo.name,
        phone: payload.shipTo.phone || '555-555-5555', // ShipEngine requires phone, use placeholder if not provided
        company_name: payload.shipTo.company || undefined,
        address_line1: payload.shipTo.addressLine1,
        address_line2: payload.shipTo.addressLine2 || undefined,
        city_locality: payload.shipTo.city,
        state_province: payload.shipTo.state,
        postal_code: payload.shipTo.postalCode,
        country_code: payload.shipTo.country,
        address_residential_indicator: 'unknown',
      },
      ship_from: {
        name: payload.shipFrom.name,
        phone: payload.shipFrom.phone || '555-555-5555', // ShipEngine requires phone, use placeholder if not provided
        company_name: payload.shipFrom.company || undefined,
        address_line1: payload.shipFrom.addressLine1,
        address_line2: payload.shipFrom.addressLine2 || undefined,
        city_locality: payload.shipFrom.city,
        state_province: payload.shipFrom.state,
        postal_code: payload.shipFrom.postalCode,
        country_code: payload.shipFrom.country,
        address_residential_indicator: 'unknown',
      },
      packages: payload.packages.map(pkg => ({
        weight: {
          value: pkg.weight.value,
          unit: pkg.weight.unit,
        },
        dimensions: {
          length: pkg.dimensions.length,
          width: pkg.dimensions.width,
          height: pkg.dimensions.height,
          unit: pkg.dimensions.unit,
        },
      })),
      confirmation: payload.confirmation || 'none',
      insurance_provider: payload.insuranceValue ? 'carrier' : 'none',
      ...(payload.insuranceValue && {
        insured_value: {
          amount: payload.insuranceValue,
          currency: 'usd',
        },
      }),
    }

    // Get rates from ShipEngine API
    const rateResponse = await fetch('https://api.shipengine.com/v1/rates', {
      method: 'POST',
      headers: {
        'API-Key': SHIPSTATION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shipment }),
    })

    if (!rateResponse.ok) {
      const errorText = await rateResponse.text()
      throw new Error(`ShipEngine API error: ${errorText}`)
    }

    const rateData = await rateResponse.json()

    // Transform response to our format
    const rates = rateData.rate_response.rates.map((rate: any) => ({
      rateId: rate.rate_id,
      carrierId: rate.carrier_id,
      carrierCode: rate.carrier_code,
      carrierName: rate.carrier_friendly_name,
      serviceCode: rate.service_code,
      serviceName: rate.service_type,
      shippingAmount: rate.shipping_amount.amount,
      insuranceAmount: rate.insurance_amount?.amount || 0,
      confirmationAmount: rate.confirmation_amount?.amount || 0,
      otherAmount: rate.other_amount?.amount || 0,
      deliveryDays: rate.delivery_days,
      guaranteedService: rate.guaranteed_service,
      estimatedDeliveryDate: rate.estimated_delivery_date,
      carrierDeliveryDays: rate.carrier_delivery_days,
      packageType: rate.package_type,
      trackable: rate.trackable,
      validationStatus: rate.validation_status,
      warningMessages: rate.warning_messages || [],
      errorMessages: rate.error_messages || [],
    }))

    // Filter out invalid rates
    const validRates = rates.filter((rate: any) =>
      rate.validationStatus === 'valid' || rate.validationStatus === 'has_warnings'
    )

    // Sort by price (cheapest first)
    validRates.sort((a: any, b: any) => a.shippingAmount - b.shippingAmount)

    return new Response(
      JSON.stringify({
        success: true,
        rates: validRates,
        shipmentId: rateData.rate_response.shipment_id,
        rateRequestId: rateData.rate_response.rate_request_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    console.error('Error getting shipping rates:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to get shipping rates',
        details: error.response?.data || error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
