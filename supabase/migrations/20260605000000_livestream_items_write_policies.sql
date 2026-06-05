-- Write policies for livestream_items.
--
-- The Phase 1 authoring migration enabled RLS + a SELECT policy ("any
-- authed user can read") but never added INSERT/UPDATE/DELETE policies.
-- That worked for Phase 2 because the seller dashboard always wrote
-- through the start-livestream edge fn (which uses the service role).
-- The Creator Hub composer writes from the client (persistItems.ts),
-- so it gets 403'd.
--
-- Also: Live Control's pushToBlock updates status from the client
-- (queued -> live, live -> passed). Same problem.
--
-- All three writes are scoped to "the host of the livestream owns the
-- write". Add policies that check livestream_items.livestream_id ->
-- livestreams.host_user_id matches auth.uid().

CREATE POLICY "hosts_insert_their_livestream_items"
  ON public.livestream_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.livestreams ls
      WHERE ls.id = livestream_items.livestream_id
        AND ls.host_user_id = auth.uid()
    )
  );

CREATE POLICY "hosts_update_their_livestream_items"
  ON public.livestream_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.livestreams ls
      WHERE ls.id = livestream_items.livestream_id
        AND ls.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.livestreams ls
      WHERE ls.id = livestream_items.livestream_id
        AND ls.host_user_id = auth.uid()
    )
  );

CREATE POLICY "hosts_delete_their_livestream_items"
  ON public.livestream_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.livestreams ls
      WHERE ls.id = livestream_items.livestream_id
        AND ls.host_user_id = auth.uid()
    )
  );
