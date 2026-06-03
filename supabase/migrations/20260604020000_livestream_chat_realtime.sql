-- Enable Supabase Realtime broadcast for livestream_chat so the chat panel
-- receives INSERT events in real time. Without adding the table to the
-- supabase_realtime publication, the frontend's
-- supabase.channel('livestream_chat:...').on('postgres_changes', ...)
-- subscription silently never receives events even though every message is
-- being inserted successfully.

ALTER PUBLICATION supabase_realtime ADD TABLE public.livestream_chat;
