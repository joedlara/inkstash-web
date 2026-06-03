-- Profanity denylist for L1 chat. Edge function post-chat-message calls
-- public.contains_profanity(body text) before insert; on hit, returns a
-- 400 with code 'profanity_blocked'.
--
-- Starter list is intentionally small + boring; we expand based on real
-- chat incidents. Operators can edit the table directly without code deploys.

CREATE TABLE profanity_denylist (
  word text PRIMARY KEY,
  added_by uuid REFERENCES users(id),
  added_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO profanity_denylist (word) VALUES
  ('fuck'),('shit'),('bitch'),('asshole'),('cunt'),('whore'),('faggot');
-- Operators can extend via SQL: INSERT INTO profanity_denylist (word) VALUES ('newword');

CREATE OR REPLACE FUNCTION public.contains_profanity(p_body text)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_lower text := lower(p_body);
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profanity_denylist
    WHERE v_lower ~* ('\m' || word || '\M')
  );
END $$;

GRANT EXECUTE ON FUNCTION public.contains_profanity(text) TO service_role;
