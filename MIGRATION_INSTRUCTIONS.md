# Database Migration Instructions

## Issue
The checkout process is failing with a foreign key constraint error. The `seller_id` field in the `auctions` table needs to properly reference `auth.users`.

## Solution
Run the migration file `006_fix_seller_id_constraint.sql` in your Supabase dashboard.

## Steps to Apply Migration

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Navigate to your project: `zbicqlinvffnmsukkitk`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Open the file: `supabase/migrations/006_fix_seller_id_constraint.sql`
   - Copy the entire contents

4. **Paste and Run**
   - Paste the SQL into the query editor
   - Click "Run" or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)

5. **Verify**
   - The migration should complete successfully
   - You can verify by checking the "Database" → "Tables" section
   - Look at the `auctions` table and verify the `seller_id` constraint references `auth.users`

## Alternative: Run All Migrations
If you haven't run the other migrations (001-005), you should run them in order:

```sql
-- Run each file in order from supabase/migrations/
-- 001_create_likes_and_saves.sql
-- 002_create_auction_views.sql
-- 003_create_payment_and_shipping.sql
-- 004_create_bids_table.sql
-- 005_create_orders_table.sql
-- 006_fix_seller_id_constraint.sql
```

## What This Migration Does

1. Drops any existing foreign key constraints on `seller_id`
2. Ensures `seller_id` is a UUID type and NOT NULL
3. Adds a proper foreign key constraint to `auth.users`
4. Creates an index for better query performance

## After Migration

Once the migration is complete, the checkout process should work correctly without the foreign key constraint error.

## Troubleshooting

If you encounter any errors:

1. **Check if auctions table exists**
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'auctions';
   ```

2. **Check existing seller_id values**
   ```sql
   SELECT seller_id, COUNT(*) FROM auctions GROUP BY seller_id;
   ```

3. **Verify seller_id values exist in auth.users**
   ```sql
   SELECT a.seller_id
   FROM auctions a
   LEFT JOIN auth.users u ON a.seller_id = u.id
   WHERE u.id IS NULL;
   ```

   If this returns any rows, those seller_id values don't exist in auth.users and need to be fixed before the migration can succeed.
