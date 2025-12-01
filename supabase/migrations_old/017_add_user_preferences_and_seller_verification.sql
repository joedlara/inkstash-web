-- Migration: Add user preferences and seller verification
-- This migration adds structured preferences and seller verification to users table

-- Add seller verification fields to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS seller_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS seller_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email_bids": true,
  "email_outbid": true,
  "email_won": true,
  "email_new_items": false,
  "email_promotions": false,
  "push_bids": true,
  "push_outbid": true,
  "push_won": true
}'::jsonb;

-- Create user_preferences table for structured preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,

  -- Collection preferences
  favorite_characters TEXT[] DEFAULT ARRAY[]::TEXT[],
  favorite_shows TEXT[] DEFAULT ARRAY[]::TEXT[],
  favorite_categories TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Price range preferences
  min_price DECIMAL(10,2) DEFAULT 0,
  max_price DECIMAL(10,2) DEFAULT 10000,

  -- Display preferences
  items_per_page INTEGER DEFAULT 24,
  default_sort TEXT DEFAULT 'newest',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_price_range CHECK (min_price >= 0 AND max_price >= min_price)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_users_seller_verified ON public.users(seller_verified);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
-- Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own preferences" ON public.user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at on preferences changes
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize user preferences on signup
CREATE OR REPLACE FUNCTION public.initialize_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize preferences when user is created
DROP TRIGGER IF EXISTS on_user_created_init_preferences ON public.users;
CREATE TRIGGER on_user_created_init_preferences
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_preferences();
