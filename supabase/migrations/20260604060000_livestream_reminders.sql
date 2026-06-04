-- Livestream reminders. When a viewer taps "Remind me" on a scheduled
-- (Coming Up) stream, we insert a row tying their auth user to that
-- livestream. The notification delivery (email / push) is a separate
-- follow-up; this migration only owns the persistence layer.

CREATE TABLE IF NOT EXISTS public.livestream_reminders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  livestream_id   uuid NOT NULL REFERENCES public.livestreams(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Set when the delivery job has emailed/pushed this row, so the job
  -- can skip already-sent reminders on its next run. Null until then.
  notified_at     timestamptz,
  UNIQUE (user_id, livestream_id)
);

CREATE INDEX IF NOT EXISTS livestream_reminders_user_idx
  ON public.livestream_reminders (user_id);
CREATE INDEX IF NOT EXISTS livestream_reminders_stream_idx
  ON public.livestream_reminders (livestream_id);
-- Used by the future delivery cron: "find reminders for streams going
-- live in the next N minutes that we haven't notified yet".
CREATE INDEX IF NOT EXISTS livestream_reminders_pending_idx
  ON public.livestream_reminders (notified_at)
  WHERE notified_at IS NULL;

ALTER TABLE public.livestream_reminders ENABLE ROW LEVEL SECURITY;

-- Users can see / create / delete only their own reminders. The
-- delivery job runs with the service role and bypasses RLS, so it can
-- read every pending reminder and mark them notified.

CREATE POLICY "users_select_own_reminders"
  ON public.livestream_reminders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_reminders"
  ON public.livestream_reminders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_reminders"
  ON public.livestream_reminders
  FOR DELETE
  USING (auth.uid() = user_id);
