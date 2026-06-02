-- Simple Anthropic API usage log. Lets us watch cost per feature without
-- relying on the Anthropic billing dashboard. Service-role-only access;
-- this is ops data, not user-visible.

CREATE TABLE IF NOT EXISTS public.anthropic_usage (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  feature        text NOT NULL,
  model          text,
  input_tokens   integer,
  output_tokens  integer,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS anthropic_usage_feature_created_at_idx
  ON public.anthropic_usage (feature, created_at DESC);

ALTER TABLE public.anthropic_usage ENABLE ROW LEVEL SECURITY;

-- No client-facing policies. Only service role can read/write.
