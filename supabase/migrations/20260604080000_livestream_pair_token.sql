-- Dual-device pairing for Go Live.
--
-- Composer on the laptop calls start-livestream with prepare_dual_device:
-- true, which holds the row at status='preparing' and mints a short
-- pair_token. The composer encodes the token + livestream id into a QR.
-- The seller scans on their phone; the phone POSTs to pair-livestream
-- with { livestream_id, pair_token } and gets back a host LiveKit
-- token to start broadcasting. Once the phone is publishing, the
-- composer calls go-live-livestream which flips status 'preparing' ->
-- 'live' and nulls the pair_token so it can't be reused.

ALTER TABLE public.livestreams
  ADD COLUMN IF NOT EXISTS pair_token text;

-- Partial index so the pairing lookup is constant-time (only
-- preparing-state rows with an active token are interesting; once a
-- stream goes live the token is nulled).
CREATE INDEX IF NOT EXISTS livestreams_pair_token_idx
  ON public.livestreams (pair_token)
  WHERE pair_token IS NOT NULL;
