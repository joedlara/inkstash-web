// Shipping types for ShipEngine integration

export type CarrierCode = 'usps' | 'ups' | 'fedex' | 'dhl_express' | 'stamps_com' | 'endicia' | 'other';

export type ShipmentStatus =
  | 'pending_label'
  | 'label_created'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type TrackingStatus =
  | 'pre_transit'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception'
  | 'unknown';

export type WeightUnit = 'ounce' | 'pound' | 'gram' | 'kilogram';
export type DimensionUnit = 'inch' | 'centimeter';

export interface PackageDimensions {
  weight: {
    value: number;
    unit: WeightUnit;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: DimensionUnit;
  };
}

export interface ShippingAddress {
  name: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface ShippingRate {
  id: string;
  listingId?: string;
  userId: string;

  // ShipEngine data
  shipengineRateId?: string;
  carrierCode: CarrierCode;
  carrierName: string;
  serviceCode: string;
  serviceName: string;

  // Pricing
  shippingAmount: number;
  otherAmount?: number;
  insuranceAmount?: number;
  confirmationAmount?: number;

  // Delivery estimates
  estimatedDeliveryDate?: Date;
  deliveryDays?: number;
  guaranteedService: boolean;

  // Package details
  packageWeight: {
    value: number;
    unit: WeightUnit;
  };
  packageDimensions: {
    length: number;
    width: number;
    height: number;
    unit: DimensionUnit;
  };

  // Seller preferences
  isSelected: boolean;
  sellerPaysShipping: boolean;

  // Rate validity
  rateExpiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface Shipment {
  id: string;
  orderId: string;
  listingId: string;
  sellerId: string;
  buyerId: string;

  // ShipEngine IDs
  shipengineShipmentId?: string;
  shipengineLabelId?: string;
  shipengineRateId?: string;

  // Carrier information
  carrierCode: CarrierCode;
  carrierName: string;
  serviceCode: string;
  serviceName: string;

  // Package details
  packageWeight: {
    value: number;
    unit: WeightUnit;
  };
  packageDimensions: {
    length: number;
    width: number;
    height: number;
    unit: DimensionUnit;
  };

  // Shipping addresses
  shipFrom: ShippingAddress;
  shipTo: ShippingAddress;

  // Rates and pricing
  shippingAmount: number;
  actualCost: number;
  sellerPaysShipping: boolean;

  // Delivery estimates
  estimatedDeliveryDate?: Date;
  deliveryDays?: number;

  // Label information
  labelUrl?: string;
  labelFormat: 'pdf' | 'png' | 'zpl';
  labelLayout: '4x6' | '8.5x11';

  // QR code for drop-off
  qrCodeUrl?: string;
  qrCodeData?: string;

  // Tracking
  trackingNumber?: string;
  trackingStatus?: TrackingStatus;
  trackingUrl?: string;

  // Fulfillment status
  status: ShipmentStatus;
  labelCreatedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ShipEngine API request/response types
export interface GetRatesRequest {
  shipFrom: ShippingAddress;
  shipTo: ShippingAddress;
  packages: PackageDimensions[];
  confirmation?: 'none' | 'delivery' | 'signature' | 'adult_signature' | 'direct_signature';
  insuranceValue?: number;
}

export interface ShipEngineRate {
  rateId: string;
  rateType: 'shipment' | 'check';
  carrierId: string;
  carrierCode: CarrierCode;
  carrierNickname: string;
  carrierFriendlyName: string;
  serviceCode: string;
  serviceType: string;
  shippingAmount: {
    currency: string;
    amount: number;
  };
  insuranceAmount?: {
    currency: string;
    amount: number;
  };
  confirmationAmount?: {
    currency: string;
    amount: number;
  };
  otherAmount?: {
    currency: string;
    amount: number;
  };
  deliveryDays?: number;
  guaranteedService: boolean;
  estimatedDeliveryDate?: string;
  carrierDeliveryDays?: string;
  shipDate?: string;
  packageType?: string;
  trackable: boolean;
  validation_status: 'valid' | 'invalid' | 'has_warnings' | 'unknown';
  warningMessages: string[];
  errorMessages: string[];
}

export interface GetRatesResponse {
  rateResponse: {
    rates: ShipEngineRate[];
    invalidRates: ShipEngineRate[];
    rateRequestId?: string;
    shipmentId?: string;
    createdAt: string;
    status: 'working' | 'completed' | 'partial' | 'error';
    errors: Array<{
      errorSource: string;
      errorType: string;
      errorCode: string;
      message: string;
    }>;
  };
}

export interface CreateLabelRequest {
  rateId?: string;
  shipment?: {
    shipFrom: ShippingAddress;
    shipTo: ShippingAddress;
    packages: PackageDimensions[];
    carrierCode?: CarrierCode;
    serviceCode?: string;
  };
  labelLayout?: '4x6' | '8.5x11';
  labelFormat?: 'pdf' | 'png' | 'zpl';
  labelDownloadType?: 'url' | 'inline';
  testLabel?: boolean;
}

export interface ShipEngineLabel {
  labelId: string;
  status: 'processing' | 'completed' | 'error' | 'voided';
  shipmentId: string;
  shipDate: string;
  createdAt: string;
  shipmentCost: {
    currency: string;
    amount: number;
  };
  insuranceCost?: {
    currency: string;
    amount: number;
  };
  trackingNumber: string;
  isReturnLabel: boolean;
  rmaNumber?: string;
  isInternational: boolean;
  batchId?: string;
  carrierId: string;
  carrierCode: CarrierCode;
  serviceCode: string;
  packageCode: string;
  voided: boolean;
  voidedAt?: string;
  labelFormat: 'pdf' | 'png' | 'zpl';
  labelLayout: string;
  trackable: boolean;
  labelImageId?: string;
  carrierStatusCode?: string;
  carrierStatusDescription?: string;
  trackingStatus: TrackingStatus;
  labelDownload: {
    pdf?: string;
    png?: string;
    zpl?: string;
    href: string;
  };
  formDownload?: {
    href: string;
    type?: string;
  };
  qrCodeUrl?: string;
}

export interface CreateLabelResponse {
  labelId: string;
  status: string;
  shipmentId: string;
  shipDate: string;
  createdAt: string;
  shipmentCost: {
    currency: string;
    amount: number;
  };
  trackingNumber: string;
  labelDownload: {
    pdf?: string;
    png?: string;
    zpl?: string;
    href: string;
  };
  qrCodeUrl?: string;
  formDownload?: {
    href: string;
  };
}

export interface TrackingInfo {
  trackingNumber: string;
  carrierCode: CarrierCode;
  statusCode: string;
  statusDescription: string;
  carrierStatusCode?: string;
  carrierStatusDescription?: string;
  shipDate?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  exceptionDescription?: string;
  events: Array<{
    occurredAt: string;
    carrierOccurredAt?: string;
    description: string;
    cityLocality?: string;
    stateProvince?: string;
    postalCode?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
    signer?: string;
  }>;
}

export interface VoidLabelRequest {
  labelId: string;
}

export interface VoidLabelResponse {
  approved: boolean;
  message: string;
}
