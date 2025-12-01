-- Add onboarding_completed column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on onboarding status
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON public.users(onboarding_completed);

-- Add comment for documentation
COMMENT ON COLUMN public.users.onboarding_completed IS 'Indicates whether the user has completed the initial onboarding flow';
COMMENT ON COLUMN public.users.onboarding_completed_at IS 'Timestamp when the user completed onboarding';
