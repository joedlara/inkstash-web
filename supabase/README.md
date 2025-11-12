# Database Setup Instructions

## Running Migrations

To set up the auction likes, saves, and views functionality, you need to run the SQL migrations in your Supabase project.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor (left sidebar)
3. Click "New query"
4. Copy the contents of `migrations/001_create_likes_and_saves.sql`
5. Paste into the SQL editor
6. Click "Run" to execute the migration
7. Repeat for `migrations/002_create_auction_views.sql`

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

## What These Migrations Create

The migrations create the following tables:

### `auction_likes` (Migration 001)
- Stores which users have liked which auctions
- Prevents duplicate likes with a unique constraint
- Automatically deletes likes when user or auction is deleted

### `auction_saves` (Migration 001)
- Stores which users have saved/bookmarked which auctions
- Prevents duplicate saves with a unique constraint
- Automatically deletes saves when user or auction is deleted

### `auction_views` (Migration 002)
- Tracks unique views per auction
- Supports both authenticated and anonymous users
- Prevents duplicate views per user (updates timestamp on revisit)
- Includes a helper function `record_auction_view()` for easy tracking

### Security (RLS Policies)
- Anyone can view likes, saves, and views (for displaying counts)
- Users can only create their own likes/saves
- Users can only delete their own likes/saves
- Anyone can insert views (including anonymous users)
- Authenticated users are automatically verified via `auth.uid()`

## Verifying the Setup

After running the migrations, you can verify they worked by:

1. Going to the Table Editor in Supabase
2. You should see three new tables: `auction_likes`, `auction_saves`, and `auction_views`
3. Check the "Policies" tab to confirm RLS is enabled and policies are created
4. In the Database Functions section, you should see `record_auction_view()`

## Features

### Item Detail Page (`/item/:id`)
- **Like button (heart icon)**: Saves to `auction_likes` table
- **Save button (bookmark icon)**: Saves to `auction_saves` table
- **Share button**: Opens native share dialog or copies link to clipboard
- **View tracking**: Automatically records a view when the page loads
- **Stats display**: Shows total views, bids, and saves for each auction
- Active states persist across page refreshes for logged-in users

### Saved Items Page (`/saved`)
- Displays all items saved by the current user
- Shows current bid, buy now price, and time remaining
- Clicking any item navigates to its detail page
- Automatically updates when items are saved/unsaved
- Empty state with call-to-action when no items are saved
