// src/components/checkout/StripePaymentElement.tsx
//
// Shared Stripe Payment Element wrapper. Mounts the Payment Element
// (which auto-shows Apple Pay, Google Pay, PayPal, Link, and card based on
// the device + payment method types Stripe returns for the PaymentIntent).
//
// Two payment types in Phase 5:
//   - ruby_bundle  — buys Rubies, no Connect routing
//   - vendor_pack  — buys a single vendor pack open, routes 90% to the
//                    vendor's Connect account via destination charge
//
// The component calls the unified create-payment-intent edge function,
// receives the client_secret, and renders <PaymentElement>. On confirm,
// Stripe handles the redirect; the webhook does the post-payment work.

import { useEffect, useState } from 'react';
import { loadStripe, type Stripe as StripeJS } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import { supabase } from '../../api/supabase/supabaseClient';

const stripePromise: Promise<StripeJS | null> = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
);

export type PaymentType = 'ruby_bundle' | 'vendor_pack';

export interface StripePaymentElementProps {
  /** What kind of purchase this is — drives the edge function branch. */
  paymentType: PaymentType;
  /** Bundle id for ruby_bundle, pack id for vendor_pack. */
  targetId: string;
  /** Display label for the confirm button, e.g. "Pay $14.99". */
  buttonLabel: string;
  /** URL Stripe redirects to after payment completes. The webhook
   *  does the real work; this page just shows a confirmation. */
  returnUrl: string;
  onError?: (err: Error) => void;
}

export default function StripePaymentElement(props: StripePaymentElementProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('You must be logged in.');

        const { data, error } = await supabase.functions.invoke(
          'create-payment-intent',
          {
            body: {
              payment_type: props.paymentType,
              target_id: props.targetId,
            },
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        if (!data?.clientSecret) throw new Error('No client secret returned');
        if (!cancelled) setClientSecret(data.clientSecret);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start checkout';
        if (!cancelled) setInitError(msg);
        props.onError?.(err instanceof Error ? err : new Error(msg));
      }
    })();
    return () => { cancelled = true; };
  }, [props.paymentType, props.targetId]);

  if (initError) {
    return <Alert severity="error" sx={{ mt: 2 }}>{initError}</Alert>;
  }

  if (!clientSecret) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: 'stripe' },
      }}
    >
      <PaymentForm buttonLabel={props.buttonLabel} returnUrl={props.returnUrl} />
    </Elements>
  );
}

function PaymentForm({
  buttonLabel,
  returnUrl,
}: {
  buttonLabel: string;
  returnUrl: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    // confirmPayment only returns here on error; success triggers
    // the return_url redirect and this component unmounts.
    if (result.error) {
      setError(result.error.message ?? 'Payment failed');
      setSubmitting(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <PaymentElement />
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={!stripe || submitting}
        sx={{ mt: 2, py: 1.4, fontWeight: 700 }}
      >
        {submitting ? <CircularProgress size={20} color="inherit" /> : buttonLabel}
      </Button>
    </Box>
  );
}
