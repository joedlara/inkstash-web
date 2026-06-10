-- Persist resolved @mentions on chat rows. The composer client-side
-- parses "@username" tokens against the participants map (built from
-- recent chat authors + the host), resolves each to its real user_id,
-- and sends the array alongside the body. The receiver renders inline
-- pills by walking the body for @tokens whose resolved user_id appears
-- in this array — falls back to plain text for historical rows where
-- the column is the default '{}'.

ALTER TABLE public.livestream_chat
  ADD COLUMN IF NOT EXISTS mentioned_user_ids uuid[] NOT NULL DEFAULT '{}';

-- GIN supports the @> / && operators we'll want for "who was mentioned
-- in this stream?" / "where did stream X mention user Y?" queries that
-- a notifications surface will need in a later phase.
CREATE INDEX IF NOT EXISTS livestream_chat_mentioned_user_ids_idx
  ON public.livestream_chat USING gin (mentioned_user_ids);
