

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_favorite_character"("p_user_id" "uuid", "p_character_name" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."add_favorite_character"("p_user_id" "uuid", "p_character_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_user_points"("user_id" "uuid", "points" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO user_progress (user_id, total_points) 
  VALUES (user_id, points)
  ON CONFLICT (user_id) 
  DO UPDATE SET total_points = user_progress.total_points + points;
END;
$$;


ALTER FUNCTION "public"."add_user_points"("user_id" "uuid", "points" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_user_xp"("p_user_id" "uuid", "p_xp_amount" integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."add_user_xp"("p_user_id" "uuid", "p_xp_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_unfeatured_on_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If status is changing to 'sold' or 'ended', set is_featured to false
  IF (NEW.status IN ('sold', 'ended')) AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.is_featured = false;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_unfeatured_on_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_bid_increment"("current_price" numeric) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  -- Standard eBay-style increment algorithm
  IF current_price < 1 THEN
    RETURN 0.05;
  ELSIF current_price < 5 THEN
    RETURN 0.25;
  ELSIF current_price < 15 THEN
    RETURN 0.50;
  ELSIF current_price < 60 THEN
    RETURN 1.00;
  ELSIF current_price < 150 THEN
    RETURN 2.50;
  ELSIF current_price < 300 THEN
    RETURN 5.00;
  ELSIF current_price < 600 THEN
    RETURN 10.00;
  ELSIF current_price < 1500 THEN
    RETURN 25.00;
  ELSIF current_price < 3000 THEN
    RETURN 50.00;
  ELSE
    RETURN 100.00;
  END IF;
END;
$$;


ALTER FUNCTION "public"."calculate_bid_increment"("current_price" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_discovery_score"("stream_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_recency_score INTEGER;
    v_engagement_score INTEGER;
    v_new_streamer_boost INTEGER;
    v_quality_score INTEGER;
    v_diversity_score INTEGER;
    v_total_score INTEGER;
    v_streamer_tier VARCHAR(50);
    v_category VARCHAR(100);
    v_is_saturated BOOLEAN;
    v_stream_age_hours INTEGER;
BEGIN
    -- Get stream details
    SELECT 
        l.category,
        EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 3600,
        sp.tier
    INTO v_category, v_stream_age_hours, v_streamer_tier
    FROM public.livestreams l
    LEFT JOIN public.streamer_profiles sp ON l.seller_id = sp.user_id
    WHERE l.id = stream_id;
    
    -- Recency Score (0-100): Newer streams get higher scores
    v_recency_score := GREATEST(0, 100 - (v_stream_age_hours * 2));
    
    -- Engagement Score (0-200): Based on likes, chat, bids
    SELECT 
        LEAST(200, 
            (SELECT COUNT(*) FROM public.livestream_likes WHERE livestream_id = stream_id) * 2 +
            (SELECT COUNT(*) FROM public.livestream_chat_messages WHERE livestream_id = stream_id) / 10 +
            (SELECT COUNT(*) FROM public.live_auction_bids WHERE livestream_id = stream_id) * 3
        )
    INTO v_engagement_score;
    
    -- New Streamer Boost (0-300): Massive boost for new streamers
    IF v_streamer_tier = 'new' THEN
        v_new_streamer_boost := 300;
    ELSIF v_streamer_tier = 'growing' THEN
        v_new_streamer_boost := 150;
    ELSE
        v_new_streamer_boost := 0;
    END IF;
    
    -- Quality Score (0-100): Based on completion rate and retention
    SELECT LEAST(100, average_engagement_rate * 10 + stream_completion_rate)
    INTO v_quality_score
    FROM public.streamer_profiles sp
    JOIN public.livestreams l ON sp.user_id = l.seller_id
    WHERE l.id = stream_id;
    
    v_quality_score := COALESCE(v_quality_score, 50); -- default to 50 if no data
    
    -- Diversity Score (0-100): Boost underrepresented categories
    SELECT is_saturated INTO v_is_saturated
    FROM public.category_stats
    WHERE category = v_category;
    
    IF v_is_saturated THEN
        v_diversity_score := 0; -- no boost for saturated categories
    ELSE
        v_diversity_score := 100; -- boost for non-saturated
    END IF;
    
    -- Calculate Total Score
    v_total_score := v_recency_score + v_engagement_score + v_new_streamer_boost + 
                     v_quality_score + v_diversity_score;
    
    -- Update the discovery metrics table
    INSERT INTO public.stream_discovery_metrics (
        livestream_id, recency_score, engagement_score, new_streamer_boost,
        quality_score, diversity_score, total_discovery_score, last_score_update
    )
    VALUES (
        stream_id, v_recency_score, v_engagement_score, v_new_streamer_boost,
        v_quality_score, v_diversity_score, v_total_score, NOW()
    )
    ON CONFLICT (livestream_id) 
    DO UPDATE SET
        recency_score = EXCLUDED.recency_score,
        engagement_score = EXCLUDED.engagement_score,
        new_streamer_boost = EXCLUDED.new_streamer_boost,
        quality_score = EXCLUDED.quality_score,
        diversity_score = EXCLUDED.diversity_score,
        total_discovery_score = EXCLUDED.total_discovery_score,
        last_score_update = NOW();
    
    RETURN v_total_score;
END;
$$;


ALTER FUNCTION "public"."calculate_discovery_score"("stream_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_xp_to_next"("current_level" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN (1000 * POWER(1.5, current_level - 1))::INTEGER;
END;
$$;


ALTER FUNCTION "public"."calculate_xp_to_next"("current_level" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_level_up"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_profile RECORD;
  leveled_up BOOLEAN := FALSE;
BEGIN
  SELECT * INTO current_profile FROM public.profiles WHERE id = user_id;
  
  WHILE current_profile.xp >= current_profile.xp_to_next LOOP
    UPDATE public.profiles 
    SET 
      level = level + 1,
      xp = xp - xp_to_next
    WHERE id = user_id;
    
    SELECT * INTO current_profile FROM public.profiles WHERE id = user_id;
    leveled_up := TRUE;
  END LOOP;
  
  RETURN leveled_up;
END;
$$;


ALTER FUNCTION "public"."check_level_up"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order"("p_auction_id" "uuid", "p_buyer_id" "uuid", "p_seller_id" "uuid", "p_total_amount" numeric, "p_shipping_address" "jsonb", "p_payment_method" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_order"("p_auction_id" "uuid", "p_buyer_id" "uuid", "p_seller_id" "uuid", "p_total_amount" numeric, "p_shipping_address" "jsonb", "p_payment_method" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order"("p_auction_id" "uuid", "p_buyer_id" "uuid", "p_payment_method_id" "uuid", "p_shipping_address_id" "uuid", "p_item_price" numeric, "p_shipping_cost" numeric, "p_tax" numeric, "p_purchase_type" "text", "p_stripe_payment_intent_id" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_auction RECORD;
  v_shipping_address RECORD;
  v_order_id UUID;
  v_order_number TEXT;
  v_total DECIMAL(10, 2);
  v_seller_id UUID;
  v_seller_exists BOOLEAN;
BEGIN
  -- Calculate total
  v_total := p_item_price + p_shipping_cost + p_tax;

  -- Get auction details
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;

  IF v_auction IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Auction not found');
  END IF;

  -- Get the seller_id from auction
  v_seller_id := v_auction.seller_id;

  -- Check if seller exists in auth.users (for data integrity)
  -- If seller doesn't exist, we'll still create the order but with NULL seller_id
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_seller_id) INTO v_seller_exists;

  IF NOT v_seller_exists THEN
    -- Log a warning (in production, you'd want to alert on this)
    RAISE WARNING 'Seller ID % does not exist in auth.users table for auction %', v_seller_id, p_auction_id;
    v_seller_id := NULL;
  END IF;

  -- Prevent buyer from being the seller (if seller exists)
  IF v_seller_id IS NOT NULL AND v_seller_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot purchase your own item');
  END IF;

  -- Get shipping address details (to store a snapshot)
  SELECT * INTO v_shipping_address FROM shipping_addresses WHERE id = p_shipping_address_id AND user_id = p_buyer_id;

  IF v_shipping_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid shipping address');
  END IF;

  -- Generate order number
  v_order_number := generate_order_number();

  -- Create the order
  INSERT INTO orders (
    order_number,
    auction_id,
    buyer_id,
    seller_id,
    payment_method_id,
    stripe_payment_intent_id,
    shipping_address_id,
    shipping_full_name,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_postal_code,
    shipping_country,
    shipping_phone,
    item_price,
    shipping_cost,
    tax,
    total,
    purchase_type,
    status
  ) VALUES (
    v_order_number,
    p_auction_id,
    p_buyer_id,
    v_seller_id, -- This can now be NULL if seller doesn't exist
    p_payment_method_id,
    p_stripe_payment_intent_id,
    p_shipping_address_id,
    v_shipping_address.full_name,
    v_shipping_address.address_line1,
    v_shipping_address.address_line2,
    v_shipping_address.city,
    v_shipping_address.state,
    v_shipping_address.postal_code,
    v_shipping_address.country,
    v_shipping_address.phone,
    p_item_price,
    p_shipping_cost,
    p_tax,
    v_total,
    p_purchase_type,
    'processing'
  ) RETURNING id INTO v_order_id;

  -- Mark the auction as sold
  UPDATE auctions
  SET status = 'sold',
      sold_at = NOW()
  WHERE id = p_auction_id;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_total
  );
END;
$$;


ALTER FUNCTION "public"."create_order"("p_auction_id" "uuid", "p_buyer_id" "uuid", "p_payment_method_id" "uuid", "p_shipping_address_id" "uuid", "p_item_price" numeric, "p_shipping_cost" numeric, "p_tax" numeric, "p_purchase_type" "text", "p_stripe_payment_intent_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_user_session"("p_session_id" "uuid", "p_exit_url" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.user_sessions
    SET 
        session_end = NOW(),
        total_duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INTEGER,
        exit_url = p_exit_url
    WHERE session_id = p_session_id;
    
    -- Also end any active livestream sessions
    UPDATE public.livestream_sessions
    SET 
        left_at = NOW(),
        exit_reason = 'user_left'
    WHERE session_id = p_session_id AND left_at IS NULL;
    
    -- Mark collectible views as inactive
    UPDATE public.collectible_views
    SET is_active = FALSE
    WHERE session_id = p_session_id AND is_active = TRUE;
END;
$$;


ALTER FUNCTION "public"."end_user_session"("p_session_id" "uuid", "p_exit_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_default_payment_method"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE payment_methods
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_default_payment_method"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_default_shipping_address"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE shipping_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_default_shipping_address"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_order_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  order_num TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate format: ORD-YYYYMMDD-XXXXX (e.g., ORD-20250113-A3F9K)
    order_num := 'ORD-' ||
                 TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                 UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 5));

    -- Check if this order number already exists
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = order_num) INTO exists_check;

    -- If it doesn't exist, we can use it
    IF NOT exists_check THEN
      RETURN order_num;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_bid_history"("p_auction_id" "uuid", "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "username" "text", "amount" numeric, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.user_id,
    u.username,
    b.amount,
    b.created_at
  FROM bids b
  LEFT JOIN users u ON b.user_id = u.id
  WHERE b.auction_id = p_auction_id
  ORDER BY b.amount DESC, b.created_at ASC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_bid_history"("p_auction_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_highest_bid"("p_auction_id" "uuid") RETURNS TABLE("user_id" "uuid", "amount" numeric, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT b.user_id, b.amount, b.created_at
  FROM bids b
  WHERE b.auction_id = p_auction_id
  ORDER BY b.amount DESC, b.created_at ASC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_highest_bid"("p_auction_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personalized_streams"("p_user_id" "uuid", "p_limit" integer DEFAULT 20) RETURNS TABLE("livestream_id" "uuid", "title" character varying, "thumbnail_url" "text", "category" character varying, "current_viewers" integer, "streamer_tier" character varying, "is_new_streamer" boolean, "discovery_score" integer, "relevance_score" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as livestream_id,
        l.title,
        l.thumbnail_url,
        l.category,
        l.current_viewers,
        sp.tier as streamer_tier,
        sp.is_new_streamer,
        sdm.total_discovery_score as discovery_score,
        -- Relevance score based on user preferences
        CASE
            WHEN ui.favorite_categories @> ARRAY[l.category] THEN 100
            ELSE 0
        END +
        CASE
            WHEN ui.show_small_streamers AND sp.is_new_streamer THEN 200
            ELSE 0
        END +
        CASE
            WHEN ui.discovery_mode = 'new_streamers' AND sp.tier = 'new' THEN 300
            WHEN ui.discovery_mode = 'balanced' THEN 100
            ELSE 0
        END as relevance_score
    FROM public.livestreams l
    LEFT JOIN public.streamer_profiles sp ON l.seller_id = sp.user_id
    LEFT JOIN public.stream_discovery_metrics sdm ON l.id = sdm.livestream_id
    LEFT JOIN public.user_interests ui ON ui.user_id = p_user_id
    WHERE l.is_live = TRUE
    AND (ui.max_viewer_threshold IS NULL OR l.current_viewers <= ui.max_viewer_threshold)
    ORDER BY 
        (COALESCE(sdm.total_discovery_score, 0) + 
         CASE
            WHEN ui.favorite_categories @> ARRAY[l.category] THEN 100
            ELSE 0
         END +
         CASE
            WHEN ui.show_small_streamers AND sp.is_new_streamer THEN 200
            ELSE 0
         END) DESC,
        RANDOM() -- Add randomness for variety
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_personalized_streams"("p_user_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_personalized_streams"("p_user_id" "uuid", "p_limit" integer) IS 'Returns personalized stream recommendations based on user preferences and fair discovery algorithm';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Insert user profile with default values
  -- This runs with elevated privileges and bypasses RLS
  INSERT INTO public.users (id, email, username, avatar_url, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Automatically creates a user profile when a new auth user is created. Uses SECURITY DEFINER to bypass RLS.';



CREATE OR REPLACE FUNCTION "public"."initialize_user_interests"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO public.user_interests (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."initialize_user_interests"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_user_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."initialize_user_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_bid"("p_auction_id" "uuid", "p_user_id" "uuid", "p_amount" numeric) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_auction RECORD;
  v_highest_bid RECORD;
  v_new_bid_id UUID;
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
  IF v_auction.end_time < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Auction has ended');
  END IF;

  -- Check if user is the seller
  IF v_auction.seller_id = p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'You cannot bid on your own auction');
  END IF;

  -- Get the highest current bid
  SELECT * INTO v_highest_bid
  FROM get_highest_bid(p_auction_id);

  -- Check if user is already the highest bidder
  IF v_highest_bid.user_id = p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'You are already the highest bidder');
  END IF;

  -- Validate bid amount is higher than current bid
  IF v_highest_bid.amount IS NOT NULL AND p_amount <= v_highest_bid.amount THEN
    RETURN json_build_object('success', false, 'error', 'Bid must be higher than current bid');
  END IF;

  -- Validate bid amount is at least the starting bid (current_bid)
  IF p_amount < v_auction.current_bid THEN
    RETURN json_build_object('success', false, 'error', 'Bid must be at least the starting bid');
  END IF;

  -- Insert the bid
  INSERT INTO bids (auction_id, user_id, amount)
  VALUES (p_auction_id, p_user_id, p_amount)
  RETURNING id INTO v_new_bid_id;

  -- Update the auction's current_bid and bid_count
  UPDATE auctions
  SET
    current_bid = p_amount,
    bid_count = COALESCE(bid_count, 0) + 1
  WHERE id = p_auction_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'bid_id', v_new_bid_id,
    'amount', p_amount
  );
END;
$$;


ALTER FUNCTION "public"."place_bid"("p_auction_id" "uuid", "p_user_id" "uuid", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_auction_view"("p_auction_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_last_view TIMESTAMP;
BEGIN
  -- Check if user has viewed this auction in the last hour (to prevent spam)
  SELECT viewed_at INTO v_last_view
  FROM auction_views
  WHERE auction_id = p_auction_id
    AND user_id = p_user_id
  ORDER BY viewed_at DESC
  LIMIT 1;

  -- Only insert if no view in the last hour or no previous view
  IF v_last_view IS NULL OR v_last_view < NOW() - INTERVAL '1 hour' THEN
    INSERT INTO auction_views (auction_id, user_id)
    VALUES (p_auction_id, p_user_id);
  END IF;
END;
$$;


ALTER FUNCTION "public"."record_auction_view"("p_auction_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_favorite_character"("p_user_id" "uuid", "p_character_name" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."remove_favorite_character"("p_user_id" "uuid", "p_character_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_click_conversion"("p_click_id" "uuid", "p_converted" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.click_events
    SET resulted_in_conversion = p_converted
    WHERE id = p_click_id;
    
    -- Also update recommendation if this was from a recommendation
    UPDATE public.recommendation_events
    SET resulted_in_engagement = p_converted
    WHERE recommended_item_id = (
        SELECT element_id FROM public.click_events WHERE id = p_click_id
    )
    AND created_at > NOW() - INTERVAL '1 hour'; -- recent recommendations only
END;
$$;


ALTER FUNCTION "public"."track_click_conversion"("p_click_id" "uuid", "p_converted" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_auction_status"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Set upcoming auctions to active when start time is reached
  UPDATE public.auctions
  SET status = 'active'
  WHERE status = 'upcoming'
    AND start_time <= NOW();

  -- Set active auctions to ended when end time is reached
  UPDATE public.auctions
  SET status = 'ended'
  WHERE status = 'active'
    AND end_time <= NOW();
END;
$$;


ALTER FUNCTION "public"."update_auction_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_auction_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_auction_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_collectible_view_time"("p_view_id" "uuid", "p_seconds_viewed" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.collectible_views
    SET 
        total_time_seconds = total_time_seconds + p_seconds_viewed,
        last_activity_at = NOW()
    WHERE id = p_view_id;
END;
$$;


ALTER FUNCTION "public"."update_collectible_view_time"("p_view_id" "uuid", "p_seconds_viewed" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_currency_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update user's balance
    UPDATE public.user_currency_balances
    SET 
        gems_balance = gems_balance + NEW.amount,
        total_gems_purchased = CASE 
            WHEN NEW.transaction_type = 'purchase' THEN total_gems_purchased + NEW.amount
            ELSE total_gems_purchased
        END,
        total_gems_spent = CASE 
            WHEN NEW.amount < 0 THEN total_gems_spent + ABS(NEW.amount)
            ELSE total_gems_spent
        END,
        total_gems_earned = CASE 
            WHEN NEW.transaction_type = 'earned' THEN total_gems_earned + NEW.amount
            ELSE total_gems_earned
        END,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- Create balance record if it doesn't exist
    INSERT INTO public.user_currency_balances (user_id, gems_balance)
    VALUES (NEW.user_id, NEW.amount)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_currency_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_live_auction_on_bid"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update all bids for this item to not winning
    UPDATE public.live_auction_bids
    SET is_winning = FALSE
    WHERE live_auction_item_id = NEW.live_auction_item_id;
    
    -- Set this bid as winning
    UPDATE public.live_auction_bids
    SET is_winning = TRUE
    WHERE id = NEW.id;
    
    -- Update the auction item
    UPDATE public.live_auction_items
    SET 
        current_bid = NEW.bid_amount,
        bid_count = bid_count + 1,
        current_winner_id = NEW.bidder_id,
        updated_at = NOW()
    WHERE id = NEW.live_auction_item_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_live_auction_on_bid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_livestream_viewer_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.livestreams
        SET current_viewers = current_viewers + 1,
            peak_viewers = GREATEST(peak_viewers, current_viewers + 1)
        WHERE id = NEW.livestream_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.livestreams
        SET current_viewers = GREATEST(0, current_viewers - 1)
        WHERE id = OLD.livestream_id;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_livestream_viewer_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_livestream_watch_time"("p_session_id" "uuid", "p_seconds_watched" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.livestream_sessions
    SET 
        total_watch_time_seconds = total_watch_time_seconds + p_seconds_watched,
        last_heartbeat_at = NOW()
    WHERE id = p_session_id;
END;
$$;


ALTER FUNCTION "public"."update_livestream_watch_time"("p_session_id" "uuid", "p_seconds_watched" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_streamer_tier"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update tier based on followers and streams
    IF NEW.total_followers < 100 AND NEW.total_streams < 10 THEN
        NEW.tier = 'new';
        NEW.is_new_streamer = TRUE;
        NEW.discovery_boost_multiplier = 2.0; -- 2x boost for new streamers
    ELSIF NEW.total_followers < 500 AND NEW.total_streams < 50 THEN
        NEW.tier = 'growing';
        NEW.is_new_streamer = FALSE;
        NEW.discovery_boost_multiplier = 1.5; -- 1.5x boost for growing
    ELSIF NEW.total_followers < 2000 THEN
        NEW.tier = 'established';
        NEW.is_new_streamer = FALSE;
        NEW.discovery_boost_multiplier = 1.0; -- no boost
    ELSE
        NEW.tier = 'partner';
        NEW.is_new_streamer = FALSE;
        NEW.discovery_boost_multiplier = 1.0; -- no boost
    END IF;
    
    NEW.tier_updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_streamer_tier"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_preferences"("p_user_id" "uuid", "p_preferences" "jsonb") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."update_user_preferences"("p_user_id" "uuid", "p_preferences" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_stat"("user_id" "uuid", "stat_name" character varying, "increment_value" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO user_progress (user_id) 
  VALUES (user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  CASE stat_name
    WHEN 'total_sales' THEN
      UPDATE user_progress SET total_sales = total_sales + increment_value WHERE user_progress.user_id = update_user_stat.user_id;
    WHEN 'total_purchases' THEN
      UPDATE user_progress SET total_purchases = total_purchases + increment_value WHERE user_progress.user_id = update_user_stat.user_id;
    WHEN 'items_sold' THEN
      UPDATE user_progress SET items_sold = items_sold + increment_value WHERE user_progress.user_id = update_user_stat.user_id;
    WHEN 'items_purchased' THEN
      UPDATE user_progress SET items_purchased = items_purchased + increment_value WHERE user_progress.user_id = update_user_stat.user_id;
    WHEN 'forum_posts' THEN
      UPDATE user_progress SET forum_posts = forum_posts + increment_value WHERE user_progress.user_id = update_user_stat.user_id;
    WHEN 'daily_login_streak' THEN
      UPDATE user_progress SET daily_login_streak = increment_value WHERE user_progress.user_id = update_user_stat.user_id;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."update_user_stat"("user_id" "uuid", "stat_name" character varying, "increment_value" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_xp_to_next"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.xp_to_next = calculate_xp_to_next(NEW.level);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_xp_to_next"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."livestream_followers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "streamer_id" "uuid" NOT NULL,
    "follower_id" "uuid" NOT NULL,
    "notify_on_live" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."livestream_followers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."livestream_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "livestream_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."livestream_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."livestreams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "thumbnail_url" "text",
    "status" character varying(50) DEFAULT 'scheduled'::character varying NOT NULL,
    "is_live" boolean DEFAULT false,
    "stream_key" "text",
    "playback_url" "text",
    "category" character varying(100),
    "tags" "text"[],
    "current_viewers" integer DEFAULT 0,
    "peak_viewers" integer DEFAULT 0,
    "total_views" integer DEFAULT 0,
    "scheduled_start_time" timestamp with time zone,
    "actual_start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "chat_enabled" boolean DEFAULT true,
    "donations_enabled" boolean DEFAULT true,
    "subscriber_only" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."livestreams" OWNER TO "postgres";


COMMENT ON TABLE "public"."livestreams" IS 'Main table for livestream information';



CREATE OR REPLACE VIEW "public"."active_livestreams_with_seller" AS
 SELECT "id",
    "seller_id",
    "title",
    "description",
    "thumbnail_url",
    "status",
    "is_live",
    "stream_key",
    "playback_url",
    "category",
    "tags",
    "current_viewers",
    "peak_viewers",
    "total_views",
    "scheduled_start_time",
    "actual_start_time",
    "end_time",
    "chat_enabled",
    "donations_enabled",
    "subscriber_only",
    "created_at",
    "updated_at",
    ( SELECT "count"(*) AS "count"
           FROM "public"."livestream_likes"
          WHERE ("livestream_likes"."livestream_id" = "l"."id")) AS "like_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."livestream_followers"
          WHERE ("livestream_followers"."streamer_id" = "l"."seller_id")) AS "follower_count"
   FROM "public"."livestreams" "l"
  WHERE ("is_live" = true)
  ORDER BY "current_viewers" DESC;


ALTER VIEW "public"."active_livestreams_with_seller" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auction_likes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "auction_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."auction_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auction_saves" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "auction_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."auction_saves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auction_views" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "auction_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."auction_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auctions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "condition" "text" NOT NULL,
    "starting_bid" numeric(10,2) NOT NULL,
    "current_bid" numeric(10,2) DEFAULT 0,
    "buy_now_price" numeric(10,2),
    "reserve_price" numeric(10,2),
    "bid_count" integer DEFAULT 0,
    "image_url" "text",
    "additional_images" "text"[] DEFAULT '{}'::"text"[],
    "start_time" timestamp with time zone DEFAULT "now"(),
    "end_time" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'upcoming'::"text",
    "is_featured" boolean DEFAULT false,
    "is_live" boolean DEFAULT false,
    "buy_now" boolean DEFAULT false,
    "make_offer" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sold_at" timestamp with time zone,
    CONSTRAINT "auctions_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'live'::"text", 'ended'::"text", 'sold'::"text", 'cancelled'::"text", 'draft'::"text", 'active'::"text"])))
);


ALTER TABLE "public"."auctions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bids" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "auction_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bids_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "bids_amount_positive" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."bids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."category_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" character varying(100) NOT NULL,
    "active_streams_count" integer DEFAULT 0,
    "total_viewers" integer DEFAULT 0,
    "average_viewers_per_stream" numeric(10,2) DEFAULT 0,
    "is_saturated" boolean DEFAULT false,
    "saturation_threshold" integer DEFAULT 20,
    "discovery_penalty" numeric(3,2) DEFAULT 1.0,
    "boost_small_streamers" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."category_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_moderation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "livestream_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "moderator_id" "uuid" NOT NULL,
    "action_type" character varying(50) NOT NULL,
    "duration_minutes" integer,
    "reason" "text",
    "is_active" boolean DEFAULT true,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_moderation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."click_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "uuid",
    "element_type" character varying(100) NOT NULL,
    "element_id" "uuid",
    "element_text" character varying(500),
    "page_url" "text" NOT NULL,
    "page_section" character varying(100),
    "position_index" integer,
    "click_context" "jsonb",
    "destination_url" "text",
    "resulted_in_conversion" boolean DEFAULT false,
    "device_type" character varying(50),
    "platform" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."click_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."click_events" IS 'Universal click tracking across the platform';



CREATE TABLE IF NOT EXISTS "public"."collectible_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collectible_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "session_id" "uuid",
    "ip_address" character varying(45),
    "user_agent" "text",
    "view_source" character varying(100),
    "referrer_url" "text",
    "started_viewing_at" timestamp with time zone DEFAULT "now"(),
    "last_activity_at" timestamp with time zone DEFAULT "now"(),
    "total_time_seconds" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "scrolled_to_images" boolean DEFAULT false,
    "scrolled_to_description" boolean DEFAULT false,
    "viewed_seller_profile" boolean DEFAULT false,
    "clicked_bid_button" boolean DEFAULT false,
    "clicked_buy_now" boolean DEFAULT false,
    "clicked_similar_items" boolean DEFAULT false,
    "device_type" character varying(50),
    "platform" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."collectible_views" OWNER TO "postgres";


COMMENT ON TABLE "public"."collectible_views" IS 'Track views and time spent on collectible listings';



CREATE OR REPLACE VIEW "public"."collectible_analytics" AS
 SELECT "collectible_id",
    "count"(DISTINCT "id") AS "total_views",
    "count"(DISTINCT "user_id") AS "unique_viewers",
    "avg"("total_time_seconds") AS "avg_time_spent_seconds",
    "sum"(
        CASE
            WHEN "clicked_bid_button" THEN 1
            ELSE 0
        END) AS "bid_button_clicks",
    "sum"(
        CASE
            WHEN "clicked_buy_now" THEN 1
            ELSE 0
        END) AS "buy_now_clicks",
    "sum"(
        CASE
            WHEN "viewed_seller_profile" THEN 1
            ELSE 0
        END) AS "seller_profile_views",
    "count"(DISTINCT "view_source") AS "unique_traffic_sources"
   FROM "public"."collectible_views" "cv"
  GROUP BY "collectible_id";


ALTER VIEW "public"."collectible_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."currency_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "transaction_type" character varying(50) NOT NULL,
    "amount" integer NOT NULL,
    "livestream_id" "uuid",
    "donation_id" "uuid",
    "payment_method" character varying(50),
    "payment_reference" character varying(255),
    "description" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."currency_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_auction_bids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "live_auction_item_id" "uuid" NOT NULL,
    "livestream_id" "uuid" NOT NULL,
    "bidder_id" "uuid" NOT NULL,
    "bid_amount" numeric(10,2) NOT NULL,
    "is_winning" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."live_auction_bids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_auction_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "livestream_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "image_url" "text",
    "category" character varying(100),
    "condition" character varying(50),
    "starting_bid" numeric(10,2) NOT NULL,
    "current_bid" numeric(10,2) DEFAULT 0,
    "reserve_price" numeric(10,2) DEFAULT 0,
    "buy_now_price" numeric(10,2) DEFAULT 0,
    "status" character varying(50) DEFAULT 'upcoming'::character varying NOT NULL,
    "is_active" boolean DEFAULT false,
    "bid_count" integer DEFAULT 0,
    "current_winner_id" "uuid",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "duration_minutes" integer DEFAULT 5,
    "sequence_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."live_auction_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."live_auction_items" IS 'Items being auctioned during livestreams';



CREATE TABLE IF NOT EXISTS "public"."livestream_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "livestream_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "session_id" "uuid",
    "ip_address" character varying(45),
    "entry_source" character varying(100),
    "referrer_url" "text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "left_at" timestamp with time zone,
    "last_heartbeat_at" timestamp with time zone DEFAULT "now"(),
    "total_watch_time_seconds" integer DEFAULT 0,
    "chat_messages_sent" integer DEFAULT 0,
    "likes_given" integer DEFAULT 0,
    "donations_sent" integer DEFAULT 0,
    "bids_placed" integer DEFAULT 0,
    "clicked_follow" boolean DEFAULT false,
    "clicked_share" boolean DEFAULT false,
    "clicked_report" boolean DEFAULT false,
    "switched_to_fullscreen" boolean DEFAULT false,
    "buffering_events" integer DEFAULT 0,
    "quality_changes" integer DEFAULT 0,
    "average_bitrate" character varying(20),
    "exit_reason" character varying(50),
    "next_stream_id" "uuid",
    "device_type" character varying(50),
    "platform" character varying(50),
    "browser" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."livestream_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."livestream_sessions" IS 'Track livestream viewing sessions and engagement';



CREATE OR REPLACE VIEW "public"."livestream_analytics" AS
 SELECT "livestream_id",
    "count"(DISTINCT "id") AS "total_sessions",
    "count"(DISTINCT "user_id") AS "unique_viewers",
    "avg"("total_watch_time_seconds") AS "avg_watch_time_seconds",
    "sum"("chat_messages_sent") AS "total_chat_messages",
    "sum"("bids_placed") AS "total_bids",
    "sum"("donations_sent") AS "total_donations",
    "sum"(
        CASE
            WHEN "clicked_follow" THEN 1
            ELSE 0
        END) AS "follow_clicks",
    "avg"("buffering_events") AS "avg_buffering_events"
   FROM "public"."livestream_sessions" "ls"
  GROUP BY "livestream_id";


ALTER VIEW "public"."livestream_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."livestream_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "livestream_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "message" "text" NOT NULL,
    "message_type" character varying(50) DEFAULT 'regular'::character varying,
    "username" character varying(100),
    "user_avatar_url" "text",
    "is_moderator" boolean DEFAULT false,
    "is_subscriber" boolean DEFAULT false,
    "is_streamer" boolean DEFAULT false,
    "badges" "text"[],
    "is_deleted" boolean DEFAULT false,
    "deleted_by" "uuid",
    "deleted_at" timestamp with time zone,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."livestream_chat_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."livestream_chat_messages" IS 'Chat messages for livestreams';



CREATE TABLE IF NOT EXISTS "public"."livestream_donations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "livestream_id" "uuid" NOT NULL,
    "donor_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "donation_type" character varying(50) NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency_code" character varying(10) DEFAULT 'USD'::character varying,
    "gems_amount" integer,
    "message" "text",
    "is_anonymous" boolean DEFAULT false,
    "display_name" character varying(100),
    "animation_type" character varying(50),
    "payment_status" character varying(50) DEFAULT 'pending'::character varying,
    "payment_reference" character varying(255),
    "platform_fee_percentage" numeric(5,2) DEFAULT 5.00,
    "platform_fee_amount" numeric(10,2),
    "recipient_receives" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."livestream_donations" OWNER TO "postgres";


COMMENT ON TABLE "public"."livestream_donations" IS 'Donations made during livestreams (money and virtual currency)';



CREATE TABLE IF NOT EXISTS "public"."livestream_viewers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "livestream_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "viewer_ip" character varying(45),
    "is_anonymous" boolean DEFAULT false,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_seen_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."livestream_viewers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "action_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_number" "text" NOT NULL,
    "auction_id" "uuid" NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "seller_id" "uuid",
    "payment_method_id" "uuid",
    "stripe_payment_intent_id" "text",
    "shipping_address_id" "uuid",
    "shipping_full_name" "text" NOT NULL,
    "shipping_address_line1" "text" NOT NULL,
    "shipping_address_line2" "text",
    "shipping_city" "text" NOT NULL,
    "shipping_state" "text" NOT NULL,
    "shipping_postal_code" "text" NOT NULL,
    "shipping_country" "text" DEFAULT 'US'::"text" NOT NULL,
    "shipping_phone" "text",
    "item_price" numeric(10,2) NOT NULL,
    "shipping_cost" numeric(10,2) NOT NULL,
    "tax" numeric(10,2) NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "purchase_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "tracking_number" "text",
    "carrier" "text",
    "shipped_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "order_total_check" CHECK (("total" = (("item_price" + "shipping_cost") + "tax"))),
    CONSTRAINT "orders_item_price_check" CHECK (("item_price" >= (0)::numeric)),
    CONSTRAINT "orders_purchase_type_check" CHECK (("purchase_type" = ANY (ARRAY['buy_now'::"text", 'bid_won'::"text"]))),
    CONSTRAINT "orders_shipping_cost_check" CHECK (("shipping_cost" >= (0)::numeric)),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'shipped'::"text", 'delivered'::"text", 'cancelled'::"text", 'refunded'::"text"]))),
    CONSTRAINT "orders_tax_check" CHECK (("tax" >= (0)::numeric)),
    CONSTRAINT "orders_total_check" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "uuid" NOT NULL,
    "page_url" "text" NOT NULL,
    "page_title" character varying(255),
    "page_type" character varying(100),
    "referrer_url" "text",
    "referrer_type" character varying(100),
    "page_load_time_ms" integer,
    "time_on_page_seconds" integer DEFAULT 0,
    "viewed_at" timestamp with time zone DEFAULT "now"(),
    "left_at" timestamp with time zone,
    "max_scroll_depth_percentage" integer DEFAULT 0,
    "scroll_events" integer DEFAULT 0,
    "clicks_on_page" integer DEFAULT 0,
    "forms_submitted" integer DEFAULT 0,
    "device_type" character varying(50),
    "platform" character varying(50),
    "browser" character varying(50),
    "screen_resolution" character varying(20),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."page_views" OWNER TO "postgres";


COMMENT ON TABLE "public"."page_views" IS 'Track page views and time on page';



CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_payment_method_id" "text" NOT NULL,
    "card_brand" "text",
    "card_last4" "text",
    "card_exp_month" integer,
    "card_exp_year" integer,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."search_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "uuid",
    "search_query" "text" NOT NULL,
    "search_type" character varying(50),
    "filters_applied" "jsonb",
    "sort_order" character varying(50),
    "results_count" integer DEFAULT 0,
    "clicked_result_position" integer,
    "clicked_result_id" "uuid",
    "had_results" boolean DEFAULT true,
    "resulted_in_click" boolean DEFAULT false,
    "resulted_in_conversion" boolean DEFAULT false,
    "search_duration_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."search_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."search_events" IS 'Track search queries and results';



CREATE OR REPLACE VIEW "public"."popular_searches" AS
 SELECT "search_query",
    "count"(*) AS "search_count",
    "avg"("results_count") AS "avg_results",
    "sum"(
        CASE
            WHEN "resulted_in_click" THEN 1
            ELSE 0
        END) AS "clicks",
    "sum"(
        CASE
            WHEN "resulted_in_conversion" THEN 1
            ELSE 0
        END) AS "conversions",
    "round"(((100.0 * ("sum"(
        CASE
            WHEN "resulted_in_click" THEN 1
            ELSE 0
        END))::numeric) / ("count"(*))::numeric), 2) AS "click_through_rate"
   FROM "public"."search_events"
  WHERE ("created_at" > ("now"() - '30 days'::interval))
  GROUP BY "search_query"
  ORDER BY ("count"(*)) DESC;


ALTER VIEW "public"."popular_searches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendation_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "recommended_item_type" character varying(50),
    "recommended_item_id" "uuid" NOT NULL,
    "recommendation_algorithm" character varying(100),
    "recommendation_score" numeric(10,2),
    "position_in_list" integer,
    "page_section" character varying(100),
    "context_data" "jsonb",
    "was_viewed" boolean DEFAULT false,
    "was_clicked" boolean DEFAULT false,
    "resulted_in_engagement" boolean DEFAULT false,
    "time_to_click_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recommendation_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."recommendation_events" IS 'Track recommendation performance';



CREATE TABLE IF NOT EXISTS "public"."shipping_addresses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "address_line1" "text" NOT NULL,
    "address_line2" "text",
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "country" "text" DEFAULT 'US'::"text" NOT NULL,
    "phone" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shipping_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stream_discovery_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "livestream_id" "uuid" NOT NULL,
    "recency_score" integer DEFAULT 0,
    "engagement_score" integer DEFAULT 0,
    "diversity_score" integer DEFAULT 0,
    "new_streamer_boost" integer DEFAULT 0,
    "quality_score" integer DEFAULT 0,
    "total_discovery_score" integer DEFAULT 0,
    "times_recommended" integer DEFAULT 0,
    "times_clicked" integer DEFAULT 0,
    "click_through_rate" numeric(5,2) DEFAULT 0,
    "last_score_update" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stream_discovery_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."stream_discovery_metrics" IS 'Discovery algorithm scores to promote new streamers';



CREATE TABLE IF NOT EXISTS "public"."streamer_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_streams" integer DEFAULT 0,
    "total_stream_hours" numeric(10,2) DEFAULT 0,
    "average_viewers" numeric(10,2) DEFAULT 0,
    "total_followers" integer DEFAULT 0,
    "is_new_streamer" boolean DEFAULT true,
    "discovery_boost_multiplier" numeric(3,2) DEFAULT 1.5,
    "first_stream_date" timestamp with time zone,
    "tier" character varying(50) DEFAULT 'new'::character varying,
    "tier_updated_at" timestamp with time zone DEFAULT "now"(),
    "average_engagement_rate" numeric(5,2) DEFAULT 0,
    "stream_completion_rate" numeric(5,2) DEFAULT 0,
    "viewer_retention_rate" numeric(5,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."streamer_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."streamer_profiles" IS 'Streamer statistics and tier classification for fair discovery';



CREATE OR REPLACE VIEW "public"."upcoming_livestreams" AS
 SELECT "id",
    "seller_id",
    "title",
    "description",
    "thumbnail_url",
    "status",
    "is_live",
    "stream_key",
    "playback_url",
    "category",
    "tags",
    "current_viewers",
    "peak_viewers",
    "total_views",
    "scheduled_start_time",
    "actual_start_time",
    "end_time",
    "chat_enabled",
    "donations_enabled",
    "subscriber_only",
    "created_at",
    "updated_at",
    ( SELECT "count"(*) AS "count"
           FROM "public"."livestream_followers"
          WHERE ("livestream_followers"."streamer_id" = "l"."seller_id")) AS "follower_count"
   FROM "public"."livestreams" "l"
  WHERE ((("status")::"text" = 'scheduled'::"text") AND ("scheduled_start_time" > "now"()))
  ORDER BY "scheduled_start_time";


ALTER VIEW "public"."upcoming_livestreams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_id" "text" NOT NULL,
    "awarded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_collections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "condition" "text" NOT NULL,
    "estimated_value" smallint,
    "purchase_price" smallint,
    "year" integer,
    "image_url" "text",
    "description" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_for_sale" boolean DEFAULT false,
    "date_added" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_collections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_currency_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "gems_balance" integer DEFAULT 0,
    "total_gems_purchased" integer DEFAULT 0,
    "total_gems_spent" integer DEFAULT 0,
    "total_gems_earned" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_currency_balances" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_currency_balances" IS 'User virtual currency balances (like Twitch bits)';



CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "uuid" NOT NULL,
    "session_start" timestamp with time zone DEFAULT "now"(),
    "session_end" timestamp with time zone,
    "total_duration_seconds" integer DEFAULT 0,
    "pages_viewed" integer DEFAULT 0,
    "livestreams_watched" integer DEFAULT 0,
    "collectibles_viewed" integer DEFAULT 0,
    "searches_performed" integer DEFAULT 0,
    "clicks_made" integer DEFAULT 0,
    "messages_sent" integer DEFAULT 0,
    "bids_placed" integer DEFAULT 0,
    "purchases_made" integer DEFAULT 0,
    "follows_added" integer DEFAULT 0,
    "likes_given" integer DEFAULT 0,
    "entry_url" "text",
    "exit_url" "text",
    "entry_source" character varying(100),
    "device_type" character varying(50),
    "platform" character varying(50),
    "browser" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_sessions" IS 'Aggregate user session data';



CREATE OR REPLACE VIEW "public"."user_engagement_summary" AS
 SELECT "user_id",
    "count"(DISTINCT "session_id") AS "total_sessions",
    "sum"("total_duration_seconds") AS "total_time_on_platform_seconds",
    "avg"("total_duration_seconds") AS "avg_session_duration_seconds",
    "sum"("livestreams_watched") AS "total_streams_watched",
    "sum"("collectibles_viewed") AS "total_collectibles_viewed",
    "sum"("bids_placed") AS "total_bids",
    "sum"("purchases_made") AS "total_purchases",
    "max"("session_start") AS "last_active_at"
   FROM "public"."user_sessions" "us"
  WHERE ("user_id" IS NOT NULL)
  GROUP BY "user_id";


ALTER VIEW "public"."user_engagement_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_interests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "favorite_categories" "text"[] DEFAULT '{}'::"text"[],
    "favorite_tags" "text"[] DEFAULT '{}'::"text"[],
    "preferred_stream_length" character varying(50),
    "preferred_stream_times" "text"[],
    "discovery_mode" character varying(50) DEFAULT 'balanced'::character varying,
    "show_small_streamers" boolean DEFAULT true,
    "max_viewer_threshold" integer,
    "notify_new_streamers" boolean DEFAULT true,
    "notify_categories" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_interests" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_interests" IS 'User preferences for personalized stream discovery';



CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "favorite_characters" "text"[] DEFAULT ARRAY[]::"text"[],
    "favorite_shows" "text"[] DEFAULT ARRAY[]::"text"[],
    "favorite_categories" "text"[] DEFAULT ARRAY[]::"text"[],
    "min_price" numeric(10,2) DEFAULT 0,
    "max_price" numeric(10,2) DEFAULT 10000,
    "items_per_page" integer DEFAULT 24,
    "default_sort" "text" DEFAULT 'newest'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_price_range" CHECK ((("min_price" >= (0)::numeric) AND ("max_price" >= "min_price")))
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_progress" (
    "user_id" "uuid" NOT NULL,
    "level" integer DEFAULT 1,
    "total_points" integer DEFAULT 0,
    "total_sales" numeric(10,2) DEFAULT 0,
    "total_purchases" numeric(10,2) DEFAULT 0,
    "items_sold" integer DEFAULT 0,
    "items_purchased" integer DEFAULT 0,
    "collections_created" integer DEFAULT 0,
    "forum_posts" integer DEFAULT 0,
    "livestream_attendance" integer DEFAULT 0,
    "referral_count" integer DEFAULT 0,
    "days_active" integer DEFAULT 0,
    "daily_login_streak" integer DEFAULT 0,
    "bidding_streak" integer DEFAULT 0,
    "selling_streak" integer DEFAULT 0,
    "forum_activity_streak" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_viewing_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "livestream_id" "uuid" NOT NULL,
    "started_watching_at" timestamp with time zone DEFAULT "now"(),
    "stopped_watching_at" timestamp with time zone,
    "total_watch_time_seconds" integer DEFAULT 0,
    "sent_chat_messages" integer DEFAULT 0,
    "placed_bids" integer DEFAULT 0,
    "sent_donations" integer DEFAULT 0,
    "liked_stream" boolean DEFAULT false,
    "watched_percentage" numeric(5,2),
    "engagement_score" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_viewing_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "username" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "bio" "text",
    "website_url" "text",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "favorite_characters" "text"[] DEFAULT '{}'::"text"[],
    "collection_focus" "text"[] DEFAULT '{}'::"text"[],
    "price_range" "jsonb" DEFAULT '{"max": 500, "min": 10}'::"jsonb",
    "seller_rating" numeric(3,2) DEFAULT 0,
    "verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "level" integer DEFAULT 1,
    "xp" integer DEFAULT 0,
    "xp_to_next" integer DEFAULT 1000,
    "preferences" "jsonb" DEFAULT '{"priceRange": {"max": 500, "min": 10}, "collectionFocus": [], "favoriteCharacters": []}'::"jsonb",
    "seller_verified" boolean DEFAULT false,
    "seller_verified_at" timestamp with time zone,
    "notification_preferences" "jsonb" DEFAULT '{"push_won": true, "email_won": true, "push_bids": true, "email_bids": true, "push_outbid": true, "email_outbid": true, "email_new_items": false, "email_promotions": false}'::"jsonb",
    "onboarding_completed" boolean DEFAULT false,
    "onboarding_completed_at" timestamp with time zone,
    CONSTRAINT "username_no_spaces" CHECK (("username" !~ '\s'::"text"))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."onboarding_completed" IS 'Indicates whether the user has completed the initial onboarding flow';



COMMENT ON COLUMN "public"."users"."onboarding_completed_at" IS 'Timestamp when the user completed onboarding';



ALTER TABLE ONLY "public"."auction_likes"
    ADD CONSTRAINT "auction_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auction_likes"
    ADD CONSTRAINT "auction_likes_user_id_auction_id_key" UNIQUE ("user_id", "auction_id");



ALTER TABLE ONLY "public"."auction_saves"
    ADD CONSTRAINT "auction_saves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auction_saves"
    ADD CONSTRAINT "auction_saves_user_id_auction_id_key" UNIQUE ("user_id", "auction_id");



ALTER TABLE ONLY "public"."auction_views"
    ADD CONSTRAINT "auction_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auction_views"
    ADD CONSTRAINT "auction_views_user_id_auction_id_key" UNIQUE ("user_id", "auction_id");



ALTER TABLE ONLY "public"."auctions"
    ADD CONSTRAINT "auctions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_stats"
    ADD CONSTRAINT "category_stats_category_key" UNIQUE ("category");



ALTER TABLE ONLY "public"."category_stats"
    ADD CONSTRAINT "category_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_moderation"
    ADD CONSTRAINT "chat_moderation_livestream_id_user_id_key" UNIQUE ("livestream_id", "user_id");



ALTER TABLE ONLY "public"."chat_moderation"
    ADD CONSTRAINT "chat_moderation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."click_events"
    ADD CONSTRAINT "click_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collectible_views"
    ADD CONSTRAINT "collectible_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."currency_transactions"
    ADD CONSTRAINT "currency_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_auction_bids"
    ADD CONSTRAINT "live_auction_bids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_auction_items"
    ADD CONSTRAINT "live_auction_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."livestream_chat_messages"
    ADD CONSTRAINT "livestream_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."livestream_donations"
    ADD CONSTRAINT "livestream_donations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."livestream_followers"
    ADD CONSTRAINT "livestream_followers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."livestream_followers"
    ADD CONSTRAINT "livestream_followers_streamer_id_follower_id_key" UNIQUE ("streamer_id", "follower_id");



ALTER TABLE ONLY "public"."livestream_likes"
    ADD CONSTRAINT "livestream_likes_livestream_id_user_id_key" UNIQUE ("livestream_id", "user_id");



ALTER TABLE ONLY "public"."livestream_likes"
    ADD CONSTRAINT "livestream_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."livestream_sessions"
    ADD CONSTRAINT "livestream_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."livestream_viewers"
    ADD CONSTRAINT "livestream_viewers_livestream_id_user_id_key" UNIQUE ("livestream_id", "user_id");



ALTER TABLE ONLY "public"."livestream_viewers"
    ADD CONSTRAINT "livestream_viewers_livestream_id_viewer_ip_key" UNIQUE ("livestream_id", "viewer_ip");



ALTER TABLE ONLY "public"."livestream_viewers"
    ADD CONSTRAINT "livestream_viewers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."livestreams"
    ADD CONSTRAINT "livestreams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_user_id_stripe_payment_method_id_key" UNIQUE ("user_id", "stripe_payment_method_id");



ALTER TABLE ONLY "public"."recommendation_events"
    ADD CONSTRAINT "recommendation_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."search_events"
    ADD CONSTRAINT "search_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipping_addresses"
    ADD CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stream_discovery_metrics"
    ADD CONSTRAINT "stream_discovery_metrics_livestream_id_key" UNIQUE ("livestream_id");



ALTER TABLE ONLY "public"."stream_discovery_metrics"
    ADD CONSTRAINT "stream_discovery_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."streamer_profiles"
    ADD CONSTRAINT "streamer_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."streamer_profiles"
    ADD CONSTRAINT "streamer_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE ("user_id", "badge_id");



ALTER TABLE ONLY "public"."user_collections"
    ADD CONSTRAINT "user_collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_currency_balances"
    ADD CONSTRAINT "user_currency_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_currency_balances"
    ADD CONSTRAINT "user_currency_balances_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_interests"
    ADD CONSTRAINT "user_interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_interests"
    ADD CONSTRAINT "user_interests_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."user_viewing_history"
    ADD CONSTRAINT "user_viewing_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



CREATE INDEX "idx_auction_likes_auction_id" ON "public"."auction_likes" USING "btree" ("auction_id");



CREATE INDEX "idx_auction_likes_user_id" ON "public"."auction_likes" USING "btree" ("user_id");



CREATE INDEX "idx_auction_saves_auction_id" ON "public"."auction_saves" USING "btree" ("auction_id");



CREATE INDEX "idx_auction_saves_user_id" ON "public"."auction_saves" USING "btree" ("user_id");



CREATE INDEX "idx_auction_views_auction_id" ON "public"."auction_views" USING "btree" ("auction_id");



CREATE INDEX "idx_auction_views_user_id" ON "public"."auction_views" USING "btree" ("user_id");



CREATE INDEX "idx_auction_views_viewed_at" ON "public"."auction_views" USING "btree" ("viewed_at");



CREATE INDEX "idx_auctions_category" ON "public"."auctions" USING "btree" ("category");



CREATE INDEX "idx_auctions_created_at" ON "public"."auctions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_auctions_current_bid" ON "public"."auctions" USING "btree" ("current_bid" DESC);



CREATE INDEX "idx_auctions_end_time" ON "public"."auctions" USING "btree" ("end_time");



CREATE INDEX "idx_auctions_is_featured" ON "public"."auctions" USING "btree" ("is_featured") WHERE ("is_featured" = true);



CREATE INDEX "idx_auctions_seller_id" ON "public"."auctions" USING "btree" ("seller_id");



CREATE INDEX "idx_auctions_status" ON "public"."auctions" USING "btree" ("status");



CREATE INDEX "idx_bids_auction_amount" ON "public"."bids" USING "btree" ("auction_id", "amount" DESC);



CREATE INDEX "idx_bids_auction_id" ON "public"."bids" USING "btree" ("auction_id");



CREATE INDEX "idx_bids_created_at" ON "public"."bids" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_bids_user_id" ON "public"."bids" USING "btree" ("user_id");



CREATE INDEX "idx_category_stats_category" ON "public"."category_stats" USING "btree" ("category");



CREATE INDEX "idx_category_stats_saturated" ON "public"."category_stats" USING "btree" ("is_saturated");



CREATE INDEX "idx_chat_moderation_active" ON "public"."chat_moderation" USING "btree" ("is_active");



CREATE INDEX "idx_chat_moderation_stream" ON "public"."chat_moderation" USING "btree" ("livestream_id");



CREATE INDEX "idx_chat_moderation_user" ON "public"."chat_moderation" USING "btree" ("user_id");



CREATE INDEX "idx_click_events_conversion" ON "public"."click_events" USING "btree" ("resulted_in_conversion");



CREATE INDEX "idx_click_events_created" ON "public"."click_events" USING "btree" ("created_at");



CREATE INDEX "idx_click_events_element_id" ON "public"."click_events" USING "btree" ("element_id");



CREATE INDEX "idx_click_events_element_type" ON "public"."click_events" USING "btree" ("element_type");



CREATE INDEX "idx_click_events_user" ON "public"."click_events" USING "btree" ("user_id");



CREATE INDEX "idx_collectible_views_created" ON "public"."collectible_views" USING "btree" ("created_at");



CREATE INDEX "idx_collectible_views_item" ON "public"."collectible_views" USING "btree" ("collectible_id");



CREATE INDEX "idx_collectible_views_session" ON "public"."collectible_views" USING "btree" ("session_id");



CREATE INDEX "idx_collectible_views_source" ON "public"."collectible_views" USING "btree" ("view_source");



CREATE INDEX "idx_collectible_views_user" ON "public"."collectible_views" USING "btree" ("user_id");



CREATE INDEX "idx_currency_transactions_stream" ON "public"."currency_transactions" USING "btree" ("livestream_id");



CREATE INDEX "idx_currency_transactions_type" ON "public"."currency_transactions" USING "btree" ("transaction_type");



CREATE INDEX "idx_currency_transactions_user" ON "public"."currency_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_live_auction_bids_bidder" ON "public"."live_auction_bids" USING "btree" ("bidder_id");



CREATE INDEX "idx_live_auction_bids_created" ON "public"."live_auction_bids" USING "btree" ("created_at");



CREATE INDEX "idx_live_auction_bids_item" ON "public"."live_auction_bids" USING "btree" ("live_auction_item_id");



CREATE INDEX "idx_live_auction_bids_stream" ON "public"."live_auction_bids" USING "btree" ("livestream_id");



CREATE INDEX "idx_live_auction_items_active" ON "public"."live_auction_items" USING "btree" ("is_active");



CREATE INDEX "idx_live_auction_items_status" ON "public"."live_auction_items" USING "btree" ("status");



CREATE INDEX "idx_live_auction_items_stream" ON "public"."live_auction_items" USING "btree" ("livestream_id");



CREATE INDEX "idx_live_auction_items_winner" ON "public"."live_auction_items" USING "btree" ("current_winner_id");



CREATE INDEX "idx_livestream_chat_created" ON "public"."livestream_chat_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_livestream_chat_deleted" ON "public"."livestream_chat_messages" USING "btree" ("is_deleted");



CREATE INDEX "idx_livestream_chat_stream" ON "public"."livestream_chat_messages" USING "btree" ("livestream_id");



CREATE INDEX "idx_livestream_chat_user" ON "public"."livestream_chat_messages" USING "btree" ("user_id");



CREATE INDEX "idx_livestream_donations_donor" ON "public"."livestream_donations" USING "btree" ("donor_id");



CREATE INDEX "idx_livestream_donations_recipient" ON "public"."livestream_donations" USING "btree" ("recipient_id");



CREATE INDEX "idx_livestream_donations_status" ON "public"."livestream_donations" USING "btree" ("payment_status");



CREATE INDEX "idx_livestream_donations_stream" ON "public"."livestream_donations" USING "btree" ("livestream_id");



CREATE INDEX "idx_livestream_followers_follower" ON "public"."livestream_followers" USING "btree" ("follower_id");



CREATE INDEX "idx_livestream_followers_streamer" ON "public"."livestream_followers" USING "btree" ("streamer_id");



CREATE INDEX "idx_livestream_likes_stream" ON "public"."livestream_likes" USING "btree" ("livestream_id");



CREATE INDEX "idx_livestream_likes_user" ON "public"."livestream_likes" USING "btree" ("user_id");



CREATE INDEX "idx_livestream_sessions_joined" ON "public"."livestream_sessions" USING "btree" ("joined_at");



CREATE INDEX "idx_livestream_sessions_stream" ON "public"."livestream_sessions" USING "btree" ("livestream_id");



CREATE INDEX "idx_livestream_sessions_user" ON "public"."livestream_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_livestream_sessions_watch_time" ON "public"."livestream_sessions" USING "btree" ("total_watch_time_seconds");



CREATE INDEX "idx_livestream_viewers_last_seen" ON "public"."livestream_viewers" USING "btree" ("last_seen_at");



CREATE INDEX "idx_livestream_viewers_stream" ON "public"."livestream_viewers" USING "btree" ("livestream_id");



CREATE INDEX "idx_livestream_viewers_user" ON "public"."livestream_viewers" USING "btree" ("user_id");



CREATE INDEX "idx_livestreams_is_live" ON "public"."livestreams" USING "btree" ("is_live");



CREATE INDEX "idx_livestreams_scheduled_start" ON "public"."livestreams" USING "btree" ("scheduled_start_time");



CREATE INDEX "idx_livestreams_seller_id" ON "public"."livestreams" USING "btree" ("seller_id");



CREATE INDEX "idx_livestreams_status" ON "public"."livestreams" USING "btree" ("status");



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_orders_auction_id" ON "public"."orders" USING "btree" ("auction_id");



CREATE INDEX "idx_orders_buyer_id" ON "public"."orders" USING "btree" ("buyer_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_order_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_seller_id" ON "public"."orders" USING "btree" ("seller_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_page_views_created" ON "public"."page_views" USING "btree" ("created_at");



CREATE INDEX "idx_page_views_page_type" ON "public"."page_views" USING "btree" ("page_type");



CREATE INDEX "idx_page_views_session" ON "public"."page_views" USING "btree" ("session_id");



CREATE INDEX "idx_page_views_user" ON "public"."page_views" USING "btree" ("user_id");



CREATE INDEX "idx_payment_methods_default" ON "public"."payment_methods" USING "btree" ("user_id", "is_default");



CREATE INDEX "idx_payment_methods_user_id" ON "public"."payment_methods" USING "btree" ("user_id");



CREATE INDEX "idx_recommendation_events_algorithm" ON "public"."recommendation_events" USING "btree" ("recommendation_algorithm");



CREATE INDEX "idx_recommendation_events_clicked" ON "public"."recommendation_events" USING "btree" ("was_clicked");



CREATE INDEX "idx_recommendation_events_created" ON "public"."recommendation_events" USING "btree" ("created_at");



CREATE INDEX "idx_recommendation_events_item" ON "public"."recommendation_events" USING "btree" ("recommended_item_id");



CREATE INDEX "idx_recommendation_events_user" ON "public"."recommendation_events" USING "btree" ("user_id");



CREATE INDEX "idx_search_events_conversion" ON "public"."search_events" USING "btree" ("resulted_in_conversion");



CREATE INDEX "idx_search_events_created" ON "public"."search_events" USING "btree" ("created_at");



CREATE INDEX "idx_search_events_had_results" ON "public"."search_events" USING "btree" ("had_results");



CREATE INDEX "idx_search_events_query" ON "public"."search_events" USING "btree" ("search_query");



CREATE INDEX "idx_search_events_user" ON "public"."search_events" USING "btree" ("user_id");



CREATE INDEX "idx_shipping_addresses_default" ON "public"."shipping_addresses" USING "btree" ("user_id", "is_default");



CREATE INDEX "idx_shipping_addresses_user_id" ON "public"."shipping_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_stream_discovery_metrics_new_boost" ON "public"."stream_discovery_metrics" USING "btree" ("new_streamer_boost" DESC);



CREATE INDEX "idx_stream_discovery_metrics_score" ON "public"."stream_discovery_metrics" USING "btree" ("total_discovery_score" DESC);



CREATE INDEX "idx_stream_discovery_metrics_stream" ON "public"."stream_discovery_metrics" USING "btree" ("livestream_id");



CREATE INDEX "idx_streamer_profiles_new" ON "public"."streamer_profiles" USING "btree" ("is_new_streamer");



CREATE INDEX "idx_streamer_profiles_tier" ON "public"."streamer_profiles" USING "btree" ("tier");



CREATE INDEX "idx_streamer_profiles_user" ON "public"."streamer_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_user_collections_category" ON "public"."user_collections" USING "btree" ("category");



CREATE INDEX "idx_user_collections_user_id" ON "public"."user_collections" USING "btree" ("user_id");



CREATE INDEX "idx_user_currency_user" ON "public"."user_currency_balances" USING "btree" ("user_id");



CREATE INDEX "idx_user_interests_user" ON "public"."user_interests" USING "btree" ("user_id");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_sessions_created" ON "public"."user_sessions" USING "btree" ("created_at");



CREATE INDEX "idx_user_sessions_session_id" ON "public"."user_sessions" USING "btree" ("session_id");



CREATE INDEX "idx_user_sessions_user" ON "public"."user_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_user_viewing_history_stream" ON "public"."user_viewing_history" USING "btree" ("livestream_id");



CREATE INDEX "idx_user_viewing_history_user" ON "public"."user_viewing_history" USING "btree" ("user_id");



CREATE INDEX "idx_user_viewing_history_watch_time" ON "public"."user_viewing_history" USING "btree" ("total_watch_time_seconds");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_level" ON "public"."users" USING "btree" ("level" DESC, "xp" DESC);



CREATE INDEX "idx_users_onboarding_completed" ON "public"."users" USING "btree" ("onboarding_completed");



CREATE INDEX "idx_users_seller_verified" ON "public"."users" USING "btree" ("seller_verified");



CREATE INDEX "idx_users_username" ON "public"."users" USING "btree" ("username");



CREATE INDEX "idx_users_verified" ON "public"."users" USING "btree" ("verified");



CREATE OR REPLACE TRIGGER "on_user_created_init_preferences" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."initialize_user_preferences"();



CREATE OR REPLACE TRIGGER "trigger_auto_unfeatured" BEFORE UPDATE ON "public"."auctions" FOR EACH ROW EXECUTE FUNCTION "public"."auto_unfeatured_on_status_change"();



CREATE OR REPLACE TRIGGER "trigger_single_default_payment_method" BEFORE INSERT OR UPDATE ON "public"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_default_payment_method"();



CREATE OR REPLACE TRIGGER "trigger_single_default_shipping_address" BEFORE INSERT OR UPDATE ON "public"."shipping_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_default_shipping_address"();



CREATE OR REPLACE TRIGGER "trigger_update_xp_to_next" BEFORE INSERT OR UPDATE OF "level" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_xp_to_next"();



CREATE OR REPLACE TRIGGER "update_auction_on_new_bid" AFTER INSERT ON "public"."live_auction_bids" FOR EACH ROW EXECUTE FUNCTION "public"."update_live_auction_on_bid"();



CREATE OR REPLACE TRIGGER "update_auctions_updated_at" BEFORE UPDATE ON "public"."auctions" FOR EACH ROW EXECUTE FUNCTION "public"."update_auction_updated_at"();



CREATE OR REPLACE TRIGGER "update_balance_on_transaction" AFTER INSERT ON "public"."currency_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_currency_balance"();



CREATE OR REPLACE TRIGGER "update_live_auction_items_updated_at" BEFORE UPDATE ON "public"."live_auction_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_livestreams_updated_at" BEFORE UPDATE ON "public"."livestreams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_methods_updated_at" BEFORE UPDATE ON "public"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shipping_addresses_updated_at" BEFORE UPDATE ON "public"."shipping_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_stream_discovery_metrics_timestamp" BEFORE UPDATE ON "public"."stream_discovery_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_streamer_profiles_timestamp" BEFORE UPDATE ON "public"."streamer_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tier_on_stats_change" BEFORE UPDATE ON "public"."streamer_profiles" FOR EACH ROW WHEN ((("old"."total_followers" IS DISTINCT FROM "new"."total_followers") OR ("old"."total_streams" IS DISTINCT FROM "new"."total_streams"))) EXECUTE FUNCTION "public"."update_streamer_tier"();



CREATE OR REPLACE TRIGGER "update_user_collections_updated_at" BEFORE UPDATE ON "public"."user_collections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_currency_balances_updated_at" BEFORE UPDATE ON "public"."user_currency_balances" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_interests_timestamp" BEFORE UPDATE ON "public"."user_interests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_progress_updated_at" BEFORE UPDATE ON "public"."user_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_viewer_count_on_join" AFTER INSERT ON "public"."livestream_viewers" FOR EACH ROW EXECUTE FUNCTION "public"."update_livestream_viewer_count"();



CREATE OR REPLACE TRIGGER "update_viewer_count_on_leave" AFTER DELETE ON "public"."livestream_viewers" FOR EACH ROW EXECUTE FUNCTION "public"."update_livestream_viewer_count"();



ALTER TABLE ONLY "public"."auction_likes"
    ADD CONSTRAINT "auction_likes_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auction_likes"
    ADD CONSTRAINT "auction_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auction_saves"
    ADD CONSTRAINT "auction_saves_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auction_saves"
    ADD CONSTRAINT "auction_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auction_views"
    ADD CONSTRAINT "auction_views_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auction_views"
    ADD CONSTRAINT "auction_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_moderation"
    ADD CONSTRAINT "chat_moderation_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "public"."livestreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_moderation"
    ADD CONSTRAINT "chat_moderation_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."chat_moderation"
    ADD CONSTRAINT "chat_moderation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."click_events"
    ADD CONSTRAINT "click_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."collectible_views"
    ADD CONSTRAINT "collectible_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."currency_transactions"
    ADD CONSTRAINT "currency_transactions_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "public"."livestreams"("id");



ALTER TABLE ONLY "public"."currency_transactions"
    ADD CONSTRAINT "currency_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_auction_bids"
    ADD CONSTRAINT "live_auction_bids_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_auction_bids"
    ADD CONSTRAINT "live_auction_bids_live_auction_item_id_fkey" FOREIGN KEY ("live_auction_item_id") REFERENCES "public"."live_auction_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_auction_bids"
    ADD CONSTRAINT "live_auction_bids_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "public"."livestreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_auction_items"
    ADD CONSTRAINT "live_auction_items_current_winner_id_fkey" FOREIGN KEY ("current_winner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."live_auction_items"
    ADD CONSTRAINT "live_auction_items_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "public"."livestreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."livestream_chat_messages"
    ADD CONSTRAINT "livestream_chat_messages_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."livestream_chat_messages"
    ADD CONSTRAINT "livestream_chat_messages_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "public"."livestreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."livestream_chat_messages"
    ADD CONSTRAINT "livestream_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."livestream_donations"
    ADD CONSTRAINT "livestream_donations_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."livestream_donations"
    ADD CONSTRAINT "livestream_donations_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "public"."livestreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."livestream_donations"
    ADD CONSTRAINT "livestream_donations_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."livestream_followers"
    ADD CONSTRAINT "livestream_followers_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."livestream_followers"
    ADD CONSTRAINT "livestream_followers_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."livestream_likes"
    ADD CONSTRAINT "livestream_likes_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "public"."livestreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."livestream_likes"
    ADD CONSTRAINT "livestream_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."livestream_sessions"
    ADD CONSTRAINT "livestream_sessions_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "public"."livestreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."livestream_sessions"
    ADD CONSTRAINT "livestream_sessions_next_stream_id_fkey" FOREIGN KEY ("next_stream_id") REFERENCES "public"."livestreams"("id");



ALTER TABLE ONLY "public"."livestream_sessions"
    ADD CONSTRAINT "livestream_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."livestream_viewers"
    ADD CONSTRAINT "livestream_viewers_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "public"."livestreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."livestream_viewers"
    ADD CONSTRAINT "livestream_viewers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."livestreams"
    ADD CONSTRAINT "livestreams_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."shipping_addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_events"
    ADD CONSTRAINT "recommendation_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."search_events"
    ADD CONSTRAINT "search_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shipping_addresses"
    ADD CONSTRAINT "shipping_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_discovery_metrics"
    ADD CONSTRAINT "stream_discovery_metrics_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "public"."livestreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."streamer_profiles"
    ADD CONSTRAINT "streamer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_currency_balances"
    ADD CONSTRAINT "user_currency_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_interests"
    ADD CONSTRAINT "user_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_viewing_history"
    ADD CONSTRAINT "user_viewing_history_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "public"."livestreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_viewing_history"
    ADD CONSTRAINT "user_viewing_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can insert users" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can insert views" ON "public"."auction_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read user profiles" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Anyone can update users" ON "public"."users" FOR UPDATE USING (true);



CREATE POLICY "Anyone can view all auctions" ON "public"."auctions" FOR SELECT USING (true);



CREATE POLICY "Anyone can view auction views" ON "public"."auction_views" FOR SELECT USING (true);



CREATE POLICY "Anyone can view bids" ON "public"."bids" FOR SELECT USING (true);



CREATE POLICY "Anyone can view bids" ON "public"."live_auction_bids" FOR SELECT USING (true);



CREATE POLICY "Anyone can view category stats" ON "public"."category_stats" FOR SELECT USING (true);



CREATE POLICY "Anyone can view chat messages" ON "public"."livestream_chat_messages" FOR SELECT USING ((("is_deleted" = false) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Anyone can view discovery metrics" ON "public"."stream_discovery_metrics" FOR SELECT USING (true);



CREATE POLICY "Anyone can view donations (public)" ON "public"."livestream_donations" FOR SELECT USING ((("is_anonymous" = false) OR ("auth"."uid"() = "donor_id")));



CREATE POLICY "Anyone can view followers" ON "public"."livestream_followers" FOR SELECT USING (true);



CREATE POLICY "Anyone can view likes" ON "public"."auction_likes" FOR SELECT USING (true);



CREATE POLICY "Anyone can view likes" ON "public"."livestream_likes" FOR SELECT USING (true);



CREATE POLICY "Anyone can view live auction items" ON "public"."live_auction_items" FOR SELECT USING (true);



CREATE POLICY "Anyone can view saves" ON "public"."auction_saves" FOR SELECT USING (true);



CREATE POLICY "Anyone can view streamer profiles" ON "public"."streamer_profiles" FOR SELECT USING (true);



CREATE POLICY "Anyone can view user profiles" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Anyone can view viewer counts" ON "public"."livestream_viewers" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create auctions" ON "public"."auctions" FOR INSERT WITH CHECK (("auth"."uid"() = "seller_id"));



CREATE POLICY "Authenticated users can donate" ON "public"."livestream_donations" FOR INSERT WITH CHECK (("auth"."uid"() = "donor_id"));



CREATE POLICY "Authenticated users can insert bids" ON "public"."bids" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can insert orders" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."uid"() = "buyer_id"));



CREATE POLICY "Authenticated users can place bids" ON "public"."live_auction_bids" FOR INSERT WITH CHECK (("auth"."uid"() = "bidder_id"));



CREATE POLICY "Authenticated users can send messages" ON "public"."livestream_chat_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Buyers and sellers can update orders" ON "public"."orders" FOR UPDATE USING ((("auth"."uid"() = "buyer_id") OR ("auth"."uid"() = "seller_id")));



CREATE POLICY "Buyers can view their own orders" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "buyer_id"));



CREATE POLICY "Livestreams are viewable by everyone" ON "public"."livestreams" FOR SELECT USING (true);



CREATE POLICY "Sellers can view their sales" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "seller_id"));



CREATE POLICY "Streamers and mods can moderate" ON "public"."chat_moderation" USING ((EXISTS ( SELECT 1
   FROM "public"."livestreams"
  WHERE (("livestreams"."id" = "chat_moderation"."livestream_id") AND ("livestreams"."seller_id" = "auth"."uid"())))));



CREATE POLICY "Streamers can manage their auction items" ON "public"."live_auction_items" USING ((EXISTS ( SELECT 1
   FROM "public"."livestreams"
  WHERE (("livestreams"."id" = "live_auction_items"."livestream_id") AND ("livestreams"."seller_id" = "auth"."uid"())))));



CREATE POLICY "Streamers can update their own profile" ON "public"."streamer_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "System can create transactions" ON "public"."currency_transactions" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert recommendations" ON "public"."recommendation_events" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can create their own livestreams" ON "public"."livestreams" FOR INSERT WITH CHECK (("auth"."uid"() = "seller_id"));



CREATE POLICY "Users can delete own auctions with no bids" ON "public"."auctions" FOR DELETE USING ((("auth"."uid"() = "seller_id") AND ("bid_count" = 0)));



CREATE POLICY "Users can delete own preferences" ON "public"."user_preferences" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own likes" ON "public"."auction_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own livestreams" ON "public"."livestreams" FOR DELETE USING (("auth"."uid"() = "seller_id"));



CREATE POLICY "Users can delete their own messages" ON "public"."livestream_chat_messages" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("is_moderator" = true)));



CREATE POLICY "Users can delete their own payment methods" ON "public"."payment_methods" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own saves" ON "public"."auction_saves" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own shipping addresses" ON "public"."shipping_addresses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can follow streamers" ON "public"."livestream_followers" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can insert own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own clicks" ON "public"."click_events" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert their own collectible views" ON "public"."collectible_views" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert their own history" ON "public"."user_viewing_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own likes" ON "public"."auction_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own livestream sessions" ON "public"."livestream_sessions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert their own page views" ON "public"."page_views" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert their own payment methods" ON "public"."payment_methods" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own saves" ON "public"."auction_saves" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own searches" ON "public"."search_events" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert their own sessions" ON "public"."user_sessions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert their own shipping addresses" ON "public"."shipping_addresses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can join as viewers" ON "public"."livestream_viewers" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("is_anonymous" = true)));



CREATE POLICY "Users can leave as viewers" ON "public"."livestream_viewers" FOR DELETE USING ((("auth"."uid"() = "user_id") OR ("is_anonymous" = true)));



CREATE POLICY "Users can like streams" ON "public"."livestream_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own collections" ON "public"."user_collections" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own notifications" ON "public"."notifications" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own badges" ON "public"."user_badges" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own progress" ON "public"."user_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can unfollow streamers" ON "public"."livestream_followers" FOR DELETE USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can unlike streams" ON "public"."livestream_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own auctions" ON "public"."auctions" FOR UPDATE USING (("auth"."uid"() = "seller_id"));



CREATE POLICY "Users can update own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own interests" ON "public"."user_interests" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own livestreams" ON "public"."livestreams" FOR UPDATE USING (("auth"."uid"() = "seller_id"));



CREATE POLICY "Users can update their own payment methods" ON "public"."payment_methods" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own shipping addresses" ON "public"."shipping_addresses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own views" ON "public"."auction_views" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can view own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own balance" ON "public"."user_currency_balances" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own clicks" ON "public"."click_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own collectible views" ON "public"."collectible_views" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own history" ON "public"."user_viewing_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own interests" ON "public"."user_interests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own livestream sessions" ON "public"."livestream_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own page views" ON "public"."page_views" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own payment methods" ON "public"."payment_methods" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own recommendations" ON "public"."recommendation_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own searches" ON "public"."search_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sessions" ON "public"."user_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own shipping addresses" ON "public"."shipping_addresses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own transactions" ON "public"."currency_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."auction_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auction_saves" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auction_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auctions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."category_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_moderation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."click_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collectible_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."currency_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_auction_bids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_auction_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."livestream_chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."livestream_donations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."livestream_followers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."livestream_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."livestream_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."livestream_viewers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."livestreams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."page_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendation_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."search_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipping_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stream_discovery_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."streamer_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_currency_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_viewing_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_favorite_character"("p_user_id" "uuid", "p_character_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_favorite_character"("p_user_id" "uuid", "p_character_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_favorite_character"("p_user_id" "uuid", "p_character_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_user_points"("user_id" "uuid", "points" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_user_points"("user_id" "uuid", "points" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_user_points"("user_id" "uuid", "points" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_user_xp"("p_user_id" "uuid", "p_xp_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_user_xp"("p_user_id" "uuid", "p_xp_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_user_xp"("p_user_id" "uuid", "p_xp_amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_unfeatured_on_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_unfeatured_on_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_unfeatured_on_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_bid_increment"("current_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_bid_increment"("current_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_bid_increment"("current_price" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_discovery_score"("stream_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_discovery_score"("stream_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_discovery_score"("stream_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_xp_to_next"("current_level" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_xp_to_next"("current_level" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_xp_to_next"("current_level" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_level_up"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_level_up"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_level_up"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order"("p_auction_id" "uuid", "p_buyer_id" "uuid", "p_seller_id" "uuid", "p_total_amount" numeric, "p_shipping_address" "jsonb", "p_payment_method" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order"("p_auction_id" "uuid", "p_buyer_id" "uuid", "p_seller_id" "uuid", "p_total_amount" numeric, "p_shipping_address" "jsonb", "p_payment_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order"("p_auction_id" "uuid", "p_buyer_id" "uuid", "p_seller_id" "uuid", "p_total_amount" numeric, "p_shipping_address" "jsonb", "p_payment_method" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order"("p_auction_id" "uuid", "p_buyer_id" "uuid", "p_payment_method_id" "uuid", "p_shipping_address_id" "uuid", "p_item_price" numeric, "p_shipping_cost" numeric, "p_tax" numeric, "p_purchase_type" "text", "p_stripe_payment_intent_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order"("p_auction_id" "uuid", "p_buyer_id" "uuid", "p_payment_method_id" "uuid", "p_shipping_address_id" "uuid", "p_item_price" numeric, "p_shipping_cost" numeric, "p_tax" numeric, "p_purchase_type" "text", "p_stripe_payment_intent_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order"("p_auction_id" "uuid", "p_buyer_id" "uuid", "p_payment_method_id" "uuid", "p_shipping_address_id" "uuid", "p_item_price" numeric, "p_shipping_cost" numeric, "p_tax" numeric, "p_purchase_type" "text", "p_stripe_payment_intent_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."end_user_session"("p_session_id" "uuid", "p_exit_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."end_user_session"("p_session_id" "uuid", "p_exit_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_user_session"("p_session_id" "uuid", "p_exit_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_payment_method"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_payment_method"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_payment_method"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_shipping_address"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_shipping_address"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_shipping_address"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bid_history"("p_auction_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_bid_history"("p_auction_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bid_history"("p_auction_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_highest_bid"("p_auction_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_highest_bid"("p_auction_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_highest_bid"("p_auction_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personalized_streams"("p_user_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_personalized_streams"("p_user_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personalized_streams"("p_user_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_user_interests"() TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_user_interests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_user_interests"() TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_user_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_user_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_user_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."place_bid"("p_auction_id" "uuid", "p_user_id" "uuid", "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."place_bid"("p_auction_id" "uuid", "p_user_id" "uuid", "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."place_bid"("p_auction_id" "uuid", "p_user_id" "uuid", "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."record_auction_view"("p_auction_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."record_auction_view"("p_auction_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_auction_view"("p_auction_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_favorite_character"("p_user_id" "uuid", "p_character_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_favorite_character"("p_user_id" "uuid", "p_character_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_favorite_character"("p_user_id" "uuid", "p_character_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."track_click_conversion"("p_click_id" "uuid", "p_converted" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."track_click_conversion"("p_click_id" "uuid", "p_converted" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_click_conversion"("p_click_id" "uuid", "p_converted" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_auction_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_auction_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_auction_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_auction_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_auction_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_auction_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_collectible_view_time"("p_view_id" "uuid", "p_seconds_viewed" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_collectible_view_time"("p_view_id" "uuid", "p_seconds_viewed" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_collectible_view_time"("p_view_id" "uuid", "p_seconds_viewed" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_currency_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_currency_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_currency_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_live_auction_on_bid"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_live_auction_on_bid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_live_auction_on_bid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_livestream_viewer_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_livestream_viewer_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_livestream_viewer_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_livestream_watch_time"("p_session_id" "uuid", "p_seconds_watched" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_livestream_watch_time"("p_session_id" "uuid", "p_seconds_watched" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_livestream_watch_time"("p_session_id" "uuid", "p_seconds_watched" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_streamer_tier"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_streamer_tier"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_streamer_tier"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_preferences"("p_user_id" "uuid", "p_preferences" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_preferences"("p_user_id" "uuid", "p_preferences" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_preferences"("p_user_id" "uuid", "p_preferences" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_stat"("user_id" "uuid", "stat_name" character varying, "increment_value" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_stat"("user_id" "uuid", "stat_name" character varying, "increment_value" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_stat"("user_id" "uuid", "stat_name" character varying, "increment_value" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_xp_to_next"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_xp_to_next"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_xp_to_next"() TO "service_role";


















GRANT ALL ON TABLE "public"."livestream_followers" TO "anon";
GRANT ALL ON TABLE "public"."livestream_followers" TO "authenticated";
GRANT ALL ON TABLE "public"."livestream_followers" TO "service_role";



GRANT ALL ON TABLE "public"."livestream_likes" TO "anon";
GRANT ALL ON TABLE "public"."livestream_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."livestream_likes" TO "service_role";



GRANT ALL ON TABLE "public"."livestreams" TO "anon";
GRANT ALL ON TABLE "public"."livestreams" TO "authenticated";
GRANT ALL ON TABLE "public"."livestreams" TO "service_role";



GRANT ALL ON TABLE "public"."active_livestreams_with_seller" TO "anon";
GRANT ALL ON TABLE "public"."active_livestreams_with_seller" TO "authenticated";
GRANT ALL ON TABLE "public"."active_livestreams_with_seller" TO "service_role";



GRANT ALL ON TABLE "public"."auction_likes" TO "anon";
GRANT ALL ON TABLE "public"."auction_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."auction_likes" TO "service_role";



GRANT ALL ON TABLE "public"."auction_saves" TO "anon";
GRANT ALL ON TABLE "public"."auction_saves" TO "authenticated";
GRANT ALL ON TABLE "public"."auction_saves" TO "service_role";



GRANT ALL ON TABLE "public"."auction_views" TO "anon";
GRANT ALL ON TABLE "public"."auction_views" TO "authenticated";
GRANT ALL ON TABLE "public"."auction_views" TO "service_role";



GRANT ALL ON TABLE "public"."auctions" TO "anon";
GRANT ALL ON TABLE "public"."auctions" TO "authenticated";
GRANT ALL ON TABLE "public"."auctions" TO "service_role";



GRANT ALL ON TABLE "public"."bids" TO "anon";
GRANT ALL ON TABLE "public"."bids" TO "authenticated";
GRANT ALL ON TABLE "public"."bids" TO "service_role";



GRANT ALL ON TABLE "public"."category_stats" TO "anon";
GRANT ALL ON TABLE "public"."category_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."category_stats" TO "service_role";



GRANT ALL ON TABLE "public"."chat_moderation" TO "anon";
GRANT ALL ON TABLE "public"."chat_moderation" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_moderation" TO "service_role";



GRANT ALL ON TABLE "public"."click_events" TO "anon";
GRANT ALL ON TABLE "public"."click_events" TO "authenticated";
GRANT ALL ON TABLE "public"."click_events" TO "service_role";



GRANT ALL ON TABLE "public"."collectible_views" TO "anon";
GRANT ALL ON TABLE "public"."collectible_views" TO "authenticated";
GRANT ALL ON TABLE "public"."collectible_views" TO "service_role";



GRANT ALL ON TABLE "public"."collectible_analytics" TO "anon";
GRANT ALL ON TABLE "public"."collectible_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."collectible_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."currency_transactions" TO "anon";
GRANT ALL ON TABLE "public"."currency_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."currency_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."live_auction_bids" TO "anon";
GRANT ALL ON TABLE "public"."live_auction_bids" TO "authenticated";
GRANT ALL ON TABLE "public"."live_auction_bids" TO "service_role";



GRANT ALL ON TABLE "public"."live_auction_items" TO "anon";
GRANT ALL ON TABLE "public"."live_auction_items" TO "authenticated";
GRANT ALL ON TABLE "public"."live_auction_items" TO "service_role";



GRANT ALL ON TABLE "public"."livestream_sessions" TO "anon";
GRANT ALL ON TABLE "public"."livestream_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."livestream_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."livestream_analytics" TO "anon";
GRANT ALL ON TABLE "public"."livestream_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."livestream_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."livestream_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."livestream_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."livestream_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."livestream_donations" TO "anon";
GRANT ALL ON TABLE "public"."livestream_donations" TO "authenticated";
GRANT ALL ON TABLE "public"."livestream_donations" TO "service_role";



GRANT ALL ON TABLE "public"."livestream_viewers" TO "anon";
GRANT ALL ON TABLE "public"."livestream_viewers" TO "authenticated";
GRANT ALL ON TABLE "public"."livestream_viewers" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."page_views" TO "anon";
GRANT ALL ON TABLE "public"."page_views" TO "authenticated";
GRANT ALL ON TABLE "public"."page_views" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."search_events" TO "anon";
GRANT ALL ON TABLE "public"."search_events" TO "authenticated";
GRANT ALL ON TABLE "public"."search_events" TO "service_role";



GRANT ALL ON TABLE "public"."popular_searches" TO "anon";
GRANT ALL ON TABLE "public"."popular_searches" TO "authenticated";
GRANT ALL ON TABLE "public"."popular_searches" TO "service_role";



GRANT ALL ON TABLE "public"."recommendation_events" TO "anon";
GRANT ALL ON TABLE "public"."recommendation_events" TO "authenticated";
GRANT ALL ON TABLE "public"."recommendation_events" TO "service_role";



GRANT ALL ON TABLE "public"."shipping_addresses" TO "anon";
GRANT ALL ON TABLE "public"."shipping_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."shipping_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."stream_discovery_metrics" TO "anon";
GRANT ALL ON TABLE "public"."stream_discovery_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."stream_discovery_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."streamer_profiles" TO "anon";
GRANT ALL ON TABLE "public"."streamer_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."streamer_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."upcoming_livestreams" TO "anon";
GRANT ALL ON TABLE "public"."upcoming_livestreams" TO "authenticated";
GRANT ALL ON TABLE "public"."upcoming_livestreams" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



GRANT ALL ON TABLE "public"."user_collections" TO "anon";
GRANT ALL ON TABLE "public"."user_collections" TO "authenticated";
GRANT ALL ON TABLE "public"."user_collections" TO "service_role";



GRANT ALL ON TABLE "public"."user_currency_balances" TO "anon";
GRANT ALL ON TABLE "public"."user_currency_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."user_currency_balances" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."user_engagement_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_engagement_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_engagement_summary" TO "service_role";



GRANT ALL ON TABLE "public"."user_interests" TO "anon";
GRANT ALL ON TABLE "public"."user_interests" TO "authenticated";
GRANT ALL ON TABLE "public"."user_interests" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_viewing_history" TO "anon";
GRANT ALL ON TABLE "public"."user_viewing_history" TO "authenticated";
GRANT ALL ON TABLE "public"."user_viewing_history" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























