drop trigger if exists "sync_auction_views_timestamps_trigger" on "public"."auction_views";

drop function if exists "public"."sync_auction_views_timestamps"();

drop view if exists "public"."seller_profiles";

alter table "public"."auction_views" drop column "created_at";

alter table "public"."auctions" drop column "artist";

alter table "public"."auctions" drop column "international_shipping";

alter table "public"."auctions" drop column "us_shipping";

alter table "public"."user_preferences" add column "default_sort" text default 'newest'::text;

alter table "public"."user_preferences" add column "items_per_page" integer default 24;

alter table "public"."user_preferences" add column "max_price" numeric(10,2) default 10000;

alter table "public"."user_preferences" add column "min_price" numeric(10,2) default 0;

alter table "public"."users" add column "collection_focus" text[] default '{}'::text[];

alter table "public"."users" add column "favorite_characters" text[] default '{}'::text[];

alter table "public"."users" add column "preferences" jsonb default '{"priceRange": {"max": 500, "min": 10}, "collectionFocus": [], "favoriteCharacters": []}'::jsonb;

alter table "public"."users" add column "price_range" jsonb default '{"max": 500, "min": 10}'::jsonb;

alter table "public"."user_preferences" add constraint "valid_price_range" CHECK (((min_price >= (0)::numeric) AND (max_price >= min_price))) not valid;

alter table "public"."user_preferences" validate constraint "valid_price_range";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.record_auction_view(p_auction_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

create or replace view "public"."seller_profiles" as  SELECT so.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    u.seller_verified,
    u.seller_rating,
    so.status,
    so.business_name,
    so.created_at AS seller_since,
    so.identity_verified_at,
    so.bank_verified_at
   FROM (public.seller_onboarding so
     JOIN public.users u ON ((u.id = so.user_id)))
  WHERE ((so.status = 'verified'::text) AND (u.seller_verified = true));



