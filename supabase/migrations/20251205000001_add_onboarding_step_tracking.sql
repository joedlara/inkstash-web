-- Add step tracking to seller_onboarding table to persist progress across refreshes
ALTER TABLE public.seller_onboarding
ADD COLUMN IF NOT EXISTS current_step INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_connected BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_seller_onboarding_current_step ON public.seller_onboarding(current_step);

-- Add comment
COMMENT ON COLUMN public.seller_onboarding.current_step IS 'Current step in onboarding flow (0=Terms, 1=Bank, 2=Identity, 3=Review)';
COMMENT ON COLUMN public.seller_onboarding.bank_connected IS 'Whether bank connection has been completed';
COMMENT ON COLUMN public.seller_onboarding.identity_verified IS 'Whether identity verification has been completed';
