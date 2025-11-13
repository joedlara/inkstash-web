import { loadStripe, type Stripe } from '@stripe/stripe-js';

const stripePublishableKey = (import.meta as any).env.VITE_STRIPE_PUBLIC_KEY as string;

let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};
