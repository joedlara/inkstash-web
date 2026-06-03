-- Enable Supabase Realtime broadcast for the livestreams table so the
-- viewer page can react to status changes in real time (e.g. host ends
-- the stream → all viewers auto-eject to /live). Without this, viewers
-- would have to manually refresh to discover the stream is over.

ALTER PUBLICATION supabase_realtime ADD TABLE public.livestreams;
