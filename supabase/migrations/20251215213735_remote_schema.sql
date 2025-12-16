drop extension if exists "pg_net";

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


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Anyone can view avatars yfngw_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'user-uploads'::text));



  create policy "Users can delete their own avatars yfngw_0"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[1] = 'avatars'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));



  create policy "Users can update their own avatars yfngw_0"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[1] = 'avatars'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));



  create policy "Users can upload their own avatars yfngw_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[1] = 'avatars'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));



