-- Fix the record_auction_view function to use viewed_at instead of created_at
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
