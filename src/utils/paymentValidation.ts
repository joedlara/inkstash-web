import { paymentMethodsAPI, shippingAddressesAPI } from '../api/payments';

export interface PaymentShippingStatus {
  hasPayment: boolean;
  hasShipping: boolean;
  hasBoth: boolean;
  missingItems: ('payment' | 'shipping')[];
}

/**
 * Checks if the current user has valid payment method and shipping address
 * @returns PaymentShippingStatus object with validation status
 */
export async function checkPaymentAndShipping(): Promise<PaymentShippingStatus> {
  try {
    const [paymentMethods, shippingAddresses] = await Promise.all([
      paymentMethodsAPI.getAll(),
      shippingAddressesAPI.getAll(),
    ]);

    const hasPayment = paymentMethods.length > 0;
    const hasShipping = shippingAddresses.length > 0;
    const hasBoth = hasPayment && hasShipping;

    const missingItems: ('payment' | 'shipping')[] = [];
    if (!hasPayment) missingItems.push('payment');
    if (!hasShipping) missingItems.push('shipping');

    return {
      hasPayment,
      hasShipping,
      hasBoth,
      missingItems,
    };
  } catch (error) {
    console.error('Error checking payment and shipping:', error);
    // In case of error, assume they don't have valid payment/shipping
    return {
      hasPayment: false,
      hasShipping: false,
      hasBoth: false,
      missingItems: ['payment', 'shipping'],
    };
  }
}

/**
 * Determines what setup is required based on the status
 * @param status PaymentShippingStatus object
 * @returns 'both' | 'payment' | 'shipping' | 'none'
 */
export function getRequiredSetup(status: PaymentShippingStatus): 'both' | 'payment' | 'shipping' | 'none' {
  if (!status.hasPayment && !status.hasShipping) {
    return 'both';
  } else if (!status.hasPayment) {
    return 'payment';
  } else if (!status.hasShipping) {
    return 'shipping';
  } else {
    return 'none';
  }
}
