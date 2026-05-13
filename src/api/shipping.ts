import { supabase } from './supabase/supabaseClient'
import type {
  ShippingRate,
  Shipment,
  GetRatesRequest,
  CreateLabelRequest,
  TrackingInfo,
  PackageDimensions,
} from '../types/shipping'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// Get shipping rates from ShipEngine via Edge Function
export const shippingRatesAPI = {
  // Get real-time shipping rates
  async getRates(request: GetRatesRequest): Promise<{
    rates: ShippingRate[]
    shipmentId?: string
    rateRequestId?: string
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${SUPABASE_URL}/functions/v1/get-shipping-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          shipFrom: request.shipFrom,
          shipTo: request.shipTo,
          packages: request.packages,
          confirmation: request.confirmation,
          insuranceValue: request.insuranceValue,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get shipping rates')
      }

      const data = await response.json()
      return {
        rates: data.rates.map((rate: any) => ({
          id: crypto.randomUUID(),
          carrierCode: rate.carrierCode,
          carrierName: rate.carrierName,
          serviceCode: rate.serviceCode,
          serviceName: rate.serviceName,
          shippingAmount: rate.shippingAmount,
          insuranceAmount: rate.insuranceAmount || 0,
          confirmationAmount: rate.confirmationAmount || 0,
          otherAmount: rate.otherAmount || 0,
          deliveryDays: rate.deliveryDays,
          guaranteedService: rate.guaranteedService,
          estimatedDeliveryDate: rate.estimatedDeliveryDate ? new Date(rate.estimatedDeliveryDate) : undefined,
          packageWeight: request.packages[0].weight,
          packageDimensions: request.packages[0].dimensions,
          isSelected: false,
          sellerPaysShipping: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: session?.user?.id || '',
          shipengineRateId: rate.rateId,
        })),
        shipmentId: data.shipmentId,
        rateRequestId: data.rateRequestId,
      }
    } catch (error) {
      console.error('Error getting shipping rates:', error)
      throw error
    }
  },

  // Save shipping rates to database for a listing
  async saveRatesForListing(listingId: string, rates: Partial<ShippingRate>[]): Promise<ShippingRate[]> {
    try {
      const { data, error } = await supabase
        .from('shipping_rates')
        .insert(
          rates.map(rate => ({
            listing_id: listingId,
            shipengine_rate_id: rate.shipengineRateId,
            carrier_code: rate.carrierCode,
            carrier_name: rate.carrierName,
            service_code: rate.serviceCode,
            service_name: rate.serviceName,
            shipping_amount: rate.shippingAmount,
            insurance_amount: rate.insuranceAmount,
            confirmation_amount: rate.confirmationAmount,
            other_amount: rate.otherAmount,
            delivery_days: rate.deliveryDays,
            guaranteed_service: rate.guaranteedService,
            estimated_delivery_date: rate.estimatedDeliveryDate,
            package_weight_value: rate.packageWeight?.value,
            package_weight_unit: rate.packageWeight?.unit,
            package_length: rate.packageDimensions?.length,
            package_width: rate.packageDimensions?.width,
            package_height: rate.packageDimensions?.height,
            package_dimension_unit: rate.packageDimensions?.unit,
            is_selected: rate.isSelected || false,
            seller_pays_shipping: rate.sellerPaysShipping || false,
          }))
        )
        .select()

      if (error) throw error
      return data as ShippingRate[]
    } catch (error) {
      console.error('Error saving shipping rates:', error)
      throw error
    }
  },

  // Get saved rates for a listing
  async getRatesForListing(listingId: string): Promise<ShippingRate[]> {
    try {
      const { data, error } = await supabase
        .from('shipping_rates')
        .select('*')
        .eq('listing_id', listingId)
        .order('shipping_amount', { ascending: true })

      if (error) throw error

      return (data || []).map(rate => ({
        id: rate.id,
        listingId: rate.listing_id,
        userId: rate.user_id,
        shipengineRateId: rate.shipengine_rate_id,
        carrierCode: rate.carrier_code,
        carrierName: rate.carrier_name,
        serviceCode: rate.service_code,
        serviceName: rate.service_name,
        shippingAmount: rate.shipping_amount,
        insuranceAmount: rate.insurance_amount,
        confirmationAmount: rate.confirmation_amount,
        otherAmount: rate.other_amount,
        deliveryDays: rate.delivery_days,
        guaranteedService: rate.guaranteed_service,
        estimatedDeliveryDate: rate.estimated_delivery_date ? new Date(rate.estimated_delivery_date) : undefined,
        packageWeight: {
          value: rate.package_weight_value,
          unit: rate.package_weight_unit,
        },
        packageDimensions: {
          length: rate.package_length,
          width: rate.package_width,
          height: rate.package_height,
          unit: rate.package_dimension_unit,
        },
        isSelected: rate.is_selected,
        sellerPaysShipping: rate.seller_pays_shipping,
        rateExpiresAt: rate.rate_expires_at ? new Date(rate.rate_expires_at) : undefined,
        createdAt: new Date(rate.created_at),
        updatedAt: new Date(rate.updated_at),
      }))
    } catch (error) {
      console.error('Error getting shipping rates:', error)
      throw error
    }
  },

  // Update selected rate for a listing
  async selectRate(listingId: string, rateId: string): Promise<void> {
    try {
      // First, deselect all rates for this listing
      await supabase
        .from('shipping_rates')
        .update({ is_selected: false })
        .eq('listing_id', listingId)

      // Then select the chosen rate
      const { error } = await supabase
        .from('shipping_rates')
        .update({ is_selected: true })
        .eq('id', rateId)

      if (error) throw error

      // Update listing with selected rate
      await supabase
        .from('listings')
        .update({ selected_shipping_rate_id: rateId })
        .eq('id', listingId)
    } catch (error) {
      console.error('Error selecting shipping rate:', error)
      throw error
    }
  },
}

// Shipment label management
export const shipmentAPI = {
  // Create shipping label via Edge Function
  async createLabel(request: {
    orderId: string
    rateId?: string
    labelLayout?: '4x6' | '8.5x11'
    labelFormat?: 'pdf' | 'png' | 'zpl'
    testLabel?: boolean
    generateQRCode?: boolean
  }): Promise<{
    id: string
    labelId: string
    trackingNumber: string
    labelUrl: string
    labelPdfUrl?: string
    qrCodeUrl?: string
    carrierCode: string
    serviceCode: string
    cost: number
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-shipping-label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create shipping label')
      }

      const data = await response.json()
      return data.shipment
    } catch (error) {
      console.error('Error creating shipping label:', error)
      throw error
    }
  },

  // Get shipment by order ID
  async getByOrderId(orderId: string): Promise<Shipment | null> {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('order_id', orderId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }

      return data ? transformShipmentFromDB(data) : null
    } catch (error) {
      console.error('Error getting shipment:', error)
      throw error
    }
  },

  // Get all shipments for a seller
  async getSellerShipments(sellerId?: string): Promise<Shipment[]> {
    try {
      let query = supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false })

      if (sellerId) {
        query = query.eq('seller_id', sellerId)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []).map(transformShipmentFromDB)
    } catch (error) {
      console.error('Error getting seller shipments:', error)
      throw error
    }
  },

  // Get all shipments for a buyer
  async getBuyerShipments(buyerId?: string): Promise<Shipment[]> {
    try {
      let query = supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false })

      if (buyerId) {
        query = query.eq('buyer_id', buyerId)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []).map(transformShipmentFromDB)
    } catch (error) {
      console.error('Error getting buyer shipments:', error)
      throw error
    }
  },

  // Update shipment status
  async updateStatus(shipmentId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({
          status,
          ...(status === 'picked_up' && { shipped_at: new Date().toISOString() }),
          ...(status === 'delivered' && { delivered_at: new Date().toISOString() }),
          ...(status === 'cancelled' && { cancelled_at: new Date().toISOString() }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', shipmentId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating shipment status:', error)
      throw error
    }
  },

  // Get tracking information
  async getTracking(trackingNumber: string, carrierCode: string): Promise<TrackingInfo | null> {
    // TODO: Implement tracking via ShipEngine Edge Function
    console.warn('Tracking not yet implemented')
    return null
  },
}

// Helper function to transform database row to Shipment type
function transformShipmentFromDB(data: any): Shipment {
  return {
    id: data.id,
    orderId: data.order_id,
    listingId: data.listing_id,
    sellerId: data.seller_id,
    buyerId: data.buyer_id,
    shipengineShipmentId: data.shipengine_shipment_id,
    shipengineLabelId: data.shipengine_label_id,
    shipengineRateId: data.shipengine_rate_id,
    carrierCode: data.carrier_code,
    carrierName: data.carrier_name,
    serviceCode: data.service_code,
    serviceName: data.service_name,
    packageWeight: {
      value: data.package_weight_value,
      unit: data.package_weight_unit,
    },
    packageDimensions: {
      length: data.package_length,
      width: data.package_width,
      height: data.package_height,
      unit: data.package_dimension_unit,
    },
    shipFrom: {
      name: data.ship_from_name,
      company: data.ship_from_company,
      addressLine1: data.ship_from_address_line1,
      addressLine2: data.ship_from_address_line2,
      city: data.ship_from_city,
      state: data.ship_from_state,
      postalCode: data.ship_from_postal_code,
      country: data.ship_from_country,
      phone: data.ship_from_phone,
    },
    shipTo: {
      name: data.ship_to_name,
      company: data.ship_to_company,
      addressLine1: data.ship_to_address_line1,
      addressLine2: data.ship_to_address_line2,
      city: data.ship_to_city,
      state: data.ship_to_state,
      postalCode: data.ship_to_postal_code,
      country: data.ship_to_country,
      phone: data.ship_to_phone,
    },
    shippingAmount: data.shipping_amount,
    actualCost: data.actual_cost,
    sellerPaysShipping: data.seller_pays_shipping,
    estimatedDeliveryDate: data.estimated_delivery_date ? new Date(data.estimated_delivery_date) : undefined,
    deliveryDays: data.delivery_days,
    labelUrl: data.label_url,
    labelFormat: data.label_format,
    labelLayout: data.label_layout,
    qrCodeUrl: data.qr_code_url,
    qrCodeData: data.qr_code_data,
    trackingNumber: data.tracking_number,
    trackingStatus: data.tracking_status,
    trackingUrl: data.tracking_url,
    status: data.status,
    labelCreatedAt: data.label_created_at ? new Date(data.label_created_at) : undefined,
    shippedAt: data.shipped_at ? new Date(data.shipped_at) : undefined,
    deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
    cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}
