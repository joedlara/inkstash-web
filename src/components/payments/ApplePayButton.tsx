import { useState, useEffect } from 'react';
import { Box, Button, Alert, CircularProgress } from '@mui/material';
import { Apple } from '@mui/icons-material';

interface ApplePayButtonProps {
  amount: number;
  label: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export default function ApplePayButton({
  amount,
  label,
  onSuccess,
  onError,
  disabled = false,
}: ApplePayButtonProps) {
  const [isApplePayAvailable, setIsApplePayAvailable] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Check if Apple Pay is available
    if (window.ApplePaySession) {
      const canMakePayments = window.ApplePaySession.canMakePayments();
      setIsApplePayAvailable(canMakePayments);
    }
  }, []);

  const handleApplePayClick = async () => {
    if (!window.ApplePaySession) {
      onError('Apple Pay is not supported on this device');
      return;
    }

    // Check if HTTPS is being used
    if (window.location.protocol !== 'https:') {
      onError('Apple Pay requires HTTPS. Please test on a deployed environment.');
      return;
    }

    setProcessing(true);

    try {
      // Define the payment request with shipping info request
      const paymentRequest = {
        countryCode: 'US',
        currencyCode: 'USD',
        supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
        merchantCapabilities: ['supports3DS'],
        total: {
          label: label,
          amount: amount.toFixed(2),
        },
        requiredShippingContactFields: ['name', 'phone', 'email', 'postalAddress'],
      };

      // Create an Apple Pay session
      const session = new window.ApplePaySession(3, paymentRequest);

      // Handle merchant validation
      session.onvalidatemerchant = async (event: any) => {
        try {
          // In production, you would call your backend to validate with Apple
          // For now, this is a placeholder
          const merchantSession = await fetch('/api/apple-pay/validate-merchant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ validationURL: event.validationURL }),
          }).then(res => res.json());

          session.completeMerchantValidation(merchantSession);
        } catch (error) {
          session.abort();
          onError('Failed to validate merchant');
          setProcessing(false);
        }
      };

      // Handle payment authorization
      session.onpaymentauthorized = async (event: any) => {
        try {
          const payment = event.payment;

          // Extract shipping information from Apple Pay
          const shippingContact = payment.shippingContact;
          const paymentDataWithShipping = {
            ...payment,
            shippingInfo: shippingContact ? {
              fullName: `${shippingContact.givenName || ''} ${shippingContact.familyName || ''}`.trim(),
              addressLine1: shippingContact.addressLines?.[0] || '',
              addressLine2: shippingContact.addressLines?.[1] || '',
              city: shippingContact.locality || '',
              state: shippingContact.administrativeArea || '',
              postalCode: shippingContact.postalCode || '',
              country: shippingContact.countryCode || 'US',
              phone: shippingContact.phoneNumber || '',
              email: shippingContact.emailAddress || '',
            } : null,
          };

          // Process the payment on your backend
          // For now, this is a placeholder
          const result = await fetch('/api/apple-pay/process-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentToken: payment.token,
              amount: amount,
              shippingInfo: paymentDataWithShipping.shippingInfo,
            }),
          }).then(res => res.json());

          if (result.success) {
            session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
            onSuccess(paymentDataWithShipping);
          } else {
            session.completePayment(window.ApplePaySession.STATUS_FAILURE);
            onError('Payment failed');
          }
        } catch (error) {
          session.completePayment(window.ApplePaySession.STATUS_FAILURE);
          onError('Payment processing failed');
        } finally {
          setProcessing(false);
        }
      };

      // Handle cancellation
      session.oncancel = () => {
        setProcessing(false);
      };

      // Begin the session
      session.begin();
    } catch (error) {
      console.error('Apple Pay error:', error);
      onError('Failed to initialize Apple Pay');
      setProcessing(false);
    }
  };

  if (!isApplePayAvailable) {
    return null;
  }

  return (
    <Button
      variant="contained"
      fullWidth
      size="large"
      onClick={handleApplePayClick}
      disabled={disabled || processing}
      startIcon={processing ? <CircularProgress size={20} /> : <Apple />}
      sx={{
        bgcolor: '#000',
        color: '#fff',
        '&:hover': {
          bgcolor: '#333',
        },
        textTransform: 'none',
        fontWeight: 600,
      }}
    >
      {processing ? 'Processing...' : 'Pay with Apple Pay'}
    </Button>
  );
}

// Extend the Window interface to include ApplePaySession
declare global {
  interface Window {
    ApplePaySession?: any;
  }
}
