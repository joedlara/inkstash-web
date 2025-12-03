-- Create follows table for user following functionality
CREATE TABLE IF NOT EXISTS "public"."follows" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
  "follower_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "following_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  CONSTRAINT "follows_follower_following_unique" UNIQUE ("follower_id", "following_id"),
  CONSTRAINT "follows_no_self_follow" CHECK ("follower_id" != "following_id")
);

ALTER TABLE "public"."follows" OWNER TO "postgres";

COMMENT ON TABLE "public"."follows" IS 'User follow relationships';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "follows_follower_id_idx" ON "public"."follows" USING btree ("follower_id");
CREATE INDEX IF NOT EXISTS "follows_following_id_idx" ON "public"."follows" USING btree ("following_id");

-- Enable Row Level Security
ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view follows (public data)
CREATE POLICY "Follows are viewable by everyone"
  ON "public"."follows"
  FOR SELECT
  USING (true);

-- Users can follow others
CREATE POLICY "Users can follow other users"
  ON "public"."follows"
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow (delete their own follows)
CREATE POLICY "Users can unfollow other users"
  ON "public"."follows"
  FOR DELETE
  USING (auth.uid() = follower_id);
