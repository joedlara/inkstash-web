# Database Setup Instructions

## Running Migrations

To set up the auction likes and saves functionality, you need to run the SQL migration in your Supabase project.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor (left sidebar)
3. Click "New query"
4. Copy the contents of `migrations/001_create_likes_and_saves.sql`
5. Paste into the SQL editor
6. Click "Run" to execute the migration

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Make sure you're in the project root
cd /path/to/inkstash-web

# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push
```

## What This Migration Creates

The migration creates the following tables:

### `auction_likes`
- Stores which users have liked which auctions
- Prevents duplicate likes with a unique constraint
- Automatically deletes likes when user or auction is deleted

### `auction_saves`
- Stores which users have saved/bookmarked which auctions
- Prevents duplicate saves with a unique constraint
- Automatically deletes saves when user or auction is deleted

### Security (RLS Policies)
- Anyone can view likes and saves (for displaying counts)
- Users can only create their own likes/saves
- Users can only delete their own likes/saves
- Authenticated users are automatically verified via `auth.uid()`

## Verifying the Setup

After running the migration, you can verify it worked by:

1. Going to the Table Editor in Supabase
2. You should see two new tables: `auction_likes` and `auction_saves`
3. Check the "Policies" tab to confirm RLS is enabled and policies are created

## Testing

Once the tables are created, the like, save, and share buttons on the item detail page should work:
- Like button (heart icon): Saves to `auction_likes` table
- Save button (bookmark icon): Saves to `auction_saves` table
- Share button: Opens native share dialog or copies link to clipboard
- Active states persist across page refreshes for logged-in users
