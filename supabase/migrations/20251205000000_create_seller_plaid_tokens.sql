-- Create seller_plaid_tokens table to store Plaid access tokens
CREATE TABLE IF NOT EXISTS seller_plaid_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_access_token TEXT NOT NULL,
  plaid_item_id TEXT NOT NULL,
  token_type TEXT NOT NULL CHECK (token_type IN ('bank', 'identity')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token_type)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS seller_plaid_tokens_user_id_idx ON seller_plaid_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE seller_plaid_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own tokens
CREATE POLICY "Users can view own plaid tokens"
  ON seller_plaid_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own tokens
CREATE POLICY "Users can insert own plaid tokens"
  ON seller_plaid_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own tokens
CREATE POLICY "Users can update own plaid tokens"
  ON seller_plaid_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE seller_plaid_tokens IS 'Stores Plaid access tokens for seller bank accounts and identity verification';
