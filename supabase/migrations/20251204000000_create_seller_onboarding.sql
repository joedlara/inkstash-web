-- Create seller_onboarding table
CREATE TABLE IF NOT EXISTS public.seller_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Onboarding status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'verified', 'rejected')),

  -- Terms and conditions
  agreed_to_terms BOOLEAN NOT NULL DEFAULT FALSE,
  terms_agreed_at TIMESTAMPTZ,

  -- Plaid integration tokens
  plaid_bank_token TEXT,
  plaid_bank_access_token TEXT,
  plaid_bank_item_id TEXT,
  plaid_identity_token TEXT,
  plaid_identity_access_token TEXT,
  plaid_identity_item_id TEXT,

  -- Bank account details (encrypted in production)
  bank_account_id TEXT,
  bank_routing_number TEXT,
  bank_account_number_last4 TEXT,
  bank_name TEXT,

  -- Personal information
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  phone_number TEXT,
  ssn_last4 TEXT,

  -- Business information
  business_name TEXT,
  business_type TEXT,
  tax_id TEXT,

  -- Address
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip_code TEXT,
  address_country TEXT DEFAULT 'US',

  -- Verification details
  identity_verified_at TIMESTAMPTZ,
  bank_verified_at TIMESTAMPTZ,
  verification_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_seller_onboarding_user_id ON public.seller_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_onboarding_status ON public.seller_onboarding(status);

-- seller_verified field already exists in users table from remote schema

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_seller_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_seller_onboarding_updated_at_trigger ON public.seller_onboarding;
CREATE TRIGGER update_seller_onboarding_updated_at_trigger
  BEFORE UPDATE ON public.seller_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_onboarding_updated_at();

-- Enable Row Level Security
ALTER TABLE public.seller_onboarding ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own seller onboarding data
CREATE POLICY "Users can view their own seller onboarding"
  ON public.seller_onboarding
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own seller onboarding data
CREATE POLICY "Users can create their own seller onboarding"
  ON public.seller_onboarding
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own seller onboarding data
CREATE POLICY "Users can update their own seller onboarding"
  ON public.seller_onboarding
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a view for seller profiles (public information only)
CREATE OR REPLACE VIEW public.seller_profiles AS
SELECT
  so.user_id,
  u.username,
  u.full_name,
  u.avatar_url,
  u.seller_verified,
  u.seller_rating,
  so.status,
  so.business_name,
  so.created_at as seller_since,
  so.identity_verified_at,
  so.bank_verified_at
FROM public.seller_onboarding so
JOIN public.users u ON u.id = so.user_id
WHERE so.status = 'verified' AND u.seller_verified = TRUE;

-- Grant access to the view
GRANT SELECT ON public.seller_profiles TO authenticated;

-- Comment on table
COMMENT ON TABLE public.seller_onboarding IS 'Stores seller onboarding and verification information';
