CREATE OR REPLACE FUNCTION update_user_stat(user_id UUID, stat_name VARCHAR, increment_value INTEGER DEFAULT 1)
RETURNS void AS $$