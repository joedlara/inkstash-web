-- Migration: Create missing RPC functions for application features
-- This migration adds all the missing RPC functions that are called from the frontend

-- =============================================================================
-- DROP EXISTING FUNCTIONS (if they exist with different signatures)
-- =============================================================================

DROP FUNCTION IF EXISTS record_auction_view(UUID, UUID);
DROP FUNCTION IF EXISTS create_order(UUID, UUID, UUID, DECIMAL, JSONB, TEXT);
DROP FUNCTION IF EXISTS update_user_preferences(UUID, JSONB);
DROP FUNCTION IF EXISTS add_favorite_character(UUID, TEXT);
DROP FUNCTION IF EXISTS remove_favorite_character(UUID, TEXT);
DROP FUNCTION IF EXISTS add_user_xp(UUID, INTEGER);

-- =============================================================================
-- AUCTION INTERACTIONS FUNCTIONS
-- =============================================================================

-- Function to record auction view with deduplication
CREATE OR REPLACE FUNCTION record_auction_view(
  p_auction_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
DECLARE
  v_last_view TIMESTAMP;
BEGIN
  -- Check if user has viewed this auction in the last hour (to prevent spam)
  SELECT created_at INTO v_last_view
  FROM auction_views
  WHERE auction_id = p_auction_id
    AND user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Only insert if no view in the last hour or no previous view
  IF v_last_view IS NULL OR v_last_view < NOW() - INTERVAL '1 hour' THEN
    INSERT INTO auction_views (auction_id, user_id)
    VALUES (p_auction_id, p_user_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ORDER MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to create an order with validation
CREATE OR REPLACE FUNCTION create_order(
  p_auction_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID,
  p_total_amount DECIMAL(10, 2),
  p_shipping_address JSONB,
  p_payment_method TEXT
)
RETURNS JSON AS $$
DECLARE
  v_auction RECORD;
  v_new_order_id UUID;
BEGIN
  -- Get auction details
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id;

  -- Check if auction exists
  IF v_auction IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Auction not found');
  END IF;

  -- Check if auction has ended
  IF v_auction.end_time > NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Auction has not ended yet');
  END IF;

  -- Check if buyer is trying to buy their own item
  IF v_auction.seller_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'You cannot buy your own item');
  END IF;

  -- Check if order already exists
  IF EXISTS (SELECT 1 FROM orders WHERE auction_id = p_auction_id) THEN
    RETURN json_build_object('success', false, 'error', 'Order already exists for this auction');
  END IF;

  -- Create the order
  INSERT INTO orders (
    auction_id,
    buyer_id,
    seller_id,
    total_amount,
    shipping_address,
    payment_method,
    status
  )
  VALUES (
    p_auction_id,
    p_buyer_id,
    p_seller_id,
    p_total_amount,
    p_shipping_address,
    p_payment_method,
    'pending'
  )
  RETURNING id INTO v_new_order_id;

  -- Update auction status to sold
  UPDATE auctions
  SET status = 'sold'
  WHERE id = p_auction_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'order_id', v_new_order_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- USER PREFERENCE FUNCTIONS
-- =============================================================================

-- Function to update user preferences
CREATE OR REPLACE FUNCTION update_user_preferences(
  p_user_id UUID,
  p_preferences JSONB
)
RETURNS JSON AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update the user's preferences
  UPDATE users
  SET
    preferences = p_preferences,
    updated_at = NOW()
  WHERE id = p_user_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  RETURN json_build_object('success', true, 'preferences', p_preferences);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a favorite character
CREATE OR REPLACE FUNCTION add_favorite_character(
  p_user_id UUID,
  p_character_name TEXT
)
RETURNS JSON AS $$
DECLARE
  v_current_favorites JSONB;
  v_updated_favorites JSONB;
BEGIN
  -- Get current favorites
  SELECT COALESCE(preferences->'favorite_characters', '[]'::jsonb)
  INTO v_current_favorites
  FROM users
  WHERE id = p_user_id;

  -- Check if character is already in favorites
  IF v_current_favorites ? p_character_name THEN
    RETURN json_build_object('success', false, 'error', 'Character already in favorites');
  END IF;

  -- Add character to favorites
  v_updated_favorites := v_current_favorites || jsonb_build_array(p_character_name);

  -- Update user preferences
  UPDATE users
  SET
    preferences = jsonb_set(
      COALESCE(preferences, '{}'::jsonb),
      '{favorite_characters}',
      v_updated_favorites
    ),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'favorite_characters', v_updated_favorites
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a favorite character
CREATE OR REPLACE FUNCTION remove_favorite_character(
  p_user_id UUID,
  p_character_name TEXT
)
RETURNS JSON AS $$
DECLARE
  v_current_favorites JSONB;
  v_updated_favorites JSONB;
BEGIN
  -- Get current favorites
  SELECT COALESCE(preferences->'favorite_characters', '[]'::jsonb)
  INTO v_current_favorites
  FROM users
  WHERE id = p_user_id;

  -- Remove character from favorites
  v_updated_favorites := (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements_text(v_current_favorites) elem
    WHERE elem != p_character_name
  );

  -- Handle case where no favorites remain
  IF v_updated_favorites IS NULL THEN
    v_updated_favorites := '[]'::jsonb;
  END IF;

  -- Update user preferences
  UPDATE users
  SET
    preferences = jsonb_set(
      COALESCE(preferences, '{}'::jsonb),
      '{favorite_characters}',
      v_updated_favorites
    ),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'favorite_characters', v_updated_favorites
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- USER GAMIFICATION FUNCTIONS
-- =============================================================================

-- Function to add XP to user
CREATE OR REPLACE FUNCTION add_user_xp(
  p_user_id UUID,
  p_xp_amount INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_current_xp INTEGER;
  v_new_xp INTEGER;
  v_current_level INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Get current XP and level
  SELECT
    COALESCE((profile->'xp')::INTEGER, 0),
    COALESCE((profile->'level')::INTEGER, 1)
  INTO v_current_xp, v_current_level
  FROM users
  WHERE id = p_user_id;

  -- Calculate new XP
  v_new_xp := v_current_xp + p_xp_amount;

  -- Calculate new level (simple formula: level = floor(xp / 100) + 1)
  v_new_level := FLOOR(v_new_xp / 100.0) + 1;

  -- Update user profile
  UPDATE users
  SET
    profile = jsonb_set(
      jsonb_set(
        COALESCE(profile, '{}'::jsonb),
        '{xp}',
        to_jsonb(v_new_xp)
      ),
      '{level}',
      to_jsonb(v_new_level)
    ),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'xp', v_new_xp,
    'level', v_new_level,
    'level_up', v_new_level > v_current_level
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANT EXECUTE PERMISSIONS
-- =============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION record_auction_view(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_order(UUID, UUID, UUID, DECIMAL, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_preferences(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_favorite_character(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_favorite_character(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_xp(UUID, INTEGER) TO authenticated;
