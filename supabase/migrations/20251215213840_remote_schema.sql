drop view if exists "public"."seller_profiles";

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



