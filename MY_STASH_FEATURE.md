# My Stash Feature - User Profile & Settings

## Overview

The "My Stash" feature is a comprehensive user profile and settings system inspired by eBay's "My eBay" interface. It provides users with a centralized dashboard to manage their collectibles, preferences, and account settings.

## Features Implemented

### 1. My Stash Page (`/my-stash`)

A unified dashboard with sidebar navigation containing multiple tabs:

#### **Summary Tab (Dashboard)**
- Activity statistics overview
  - Saved collectibles count
  - Liked collectibles count
  - Active bids count
  - Won auctions count
  - Total spent
  - Items watching
- Quick tips and recommendations
- Visual stat cards with icons

#### **Saved Collectibles Tab**
- View all bookmarked/saved collectibles
- Filter and sort saved items
- Quick access to auction details
- Remove items from saved list
- Empty state with call-to-action

#### **Liked Collectibles Tab**
- View all favorited collectibles
- Heart icon indicator on cards
- Remove items from liked list
- Browse similar items
- Empty state with call-to-action

#### **Current Bids Tab**
- View all active and past bids
- Bid status indicators (Winning, Outbid, Won, Lost)
- Real-time bid status updates
- Time remaining for active auctions
- Navigate to auction details
- Empty state with call-to-action

#### **Purchase History Tab**
- Complete order history
- Order status tracking (Pending, Shipped, Completed)
- Order details and total price
- Quick links to order management
- Empty state with call-to-action

#### **Preferences Tab**
- Collection preferences
  - Favorite characters (multi-select with custom input)
  - Favorite shows/franchises (multi-select with custom input)
  - Favorite categories (multi-select)
- Price range preferences (slider)
  - Min/max price defaults
- Display preferences
  - Items per page (12, 24, 48, 96)
  - Default sort order
- Save preferences button

### 2. Account Settings Page (`/settings`)

Complete account management interface:

#### **Profile Information**
- Avatar upload functionality
  - Image preview
  - Supabase Storage integration
  - File type validation (JPG, PNG, GIF)
  - Max file size: 5MB
- Username editor
- Email display (read-only, contact support to change)
- Bio/description editor
- Seller verification status badge
- Save profile button

#### **Password Management**
- Change password functionality
- New password field
- Confirm password field
- Password strength validation (min 6 characters)
- Supabase Auth integration

#### **Notification Preferences**
Email notifications:
- New bids on my items
- When I'm outbid
- Auction wins
- New items matching interests
- Promotions and updates

Push notifications (future implementation):
- Bid notifications
- Outbid alerts
- Win notifications

### 3. Database Schema

#### **Migration: `017_add_user_preferences_and_seller_verification.sql`**

**Users table updates:**
- `seller_verified` (boolean) - Seller verification status
- `seller_verified_at` (timestamp) - Verification timestamp
- `notification_preferences` (jsonb) - Notification settings

**New table: `user_preferences`**
- `user_id` (UUID, unique) - Foreign key to users
- `favorite_characters` (text[]) - Array of favorite characters
- `favorite_shows` (text[]) - Array of favorite shows/franchises
- `favorite_categories` (text[]) - Array of favorite categories
- `min_price` (decimal) - Minimum price preference
- `max_price` (decimal) - Maximum price preference
- `items_per_page` (integer) - Items per page preference
- `default_sort` (text) - Default sort order
- Row Level Security (RLS) policies enabled

**Existing tables used:**
- `auction_likes` - For liked collectibles
- `auction_saves` - For saved/bookmarked collectibles
- `bids` - For current bids tracking
- `orders` - For purchase history

### 4. Components Created

#### **MyStash Components** (`src/components/mystash/`)
- `DashboardTab.tsx` - Summary/dashboard view
- `SavedCollectiblesTab.tsx` - Saved items management
- `LikedCollectiblesTab.tsx` - Liked items management
- `CurrentBidsTab.tsx` - Active bids tracking
- `PurchaseHistoryTab.tsx` - Order history
- `PreferencesTab.tsx` - User preferences editor

#### **Common Components** (`src/components/common/`)
- `VerifiedBadge.tsx` - Reusable seller verification badge
  - Three variants: icon, chip, inline
  - Three sizes: small, medium, large
  - Tooltip with verification info
  - Material-UI styled

### 5. API Layer

**New API file:** `src/api/users/preferences.ts`

Functions:
- `getUserPreferences(userId)` - Fetch user preferences
- `upsertUserPreferences(preferences)` - Create/update preferences
- `deleteUserPreferences(userId)` - Delete preferences
- `getSavedCollectibles(userId)` - Get saved items
- `getLikedCollectibles(userId)` - Get liked items
- `saveCollectible(userId, auctionId)` - Save an item
- `unsaveCollectible(userId, auctionId)` - Unsave an item
- `likeCollectible(userId, auctionId)` - Like an item
- `unlikeCollectible(userId, auctionId)` - Unlike an item
- `isCollectibleSaved(userId, auctionId)` - Check if saved
- `isCollectibleLiked(userId, auctionId)` - Check if liked

### 6. Navigation Updates

**Profile Dropdown Changes:**
- Changed "My Bids" button to "My Stash"
- Updated icon to folder icon
- Routes to `/my-stash`

**New Routes in `main.tsx`:**
- `/my-stash` → MyStash page
- `/settings` → AccountSettings page

### 7. Seller Verification Badge System

**VerifiedBadge Component Features:**
- Three display variants for different use cases
- Responsive sizing options
- Accessible tooltips
- Consistent branding with success color
- Easy to integrate anywhere in the app

**Usage Examples:**
```tsx
// Icon only
<VerifiedBadge variant="icon" size="small" />

// Chip with label
<VerifiedBadge variant="chip" showLabel />

// Inline with text
<VerifiedBadge variant="inline" showLabel size="medium" />
```

## File Structure

```
src/
├── pages/
│   ├── MyStash.tsx                    # Main My Stash page
│   └── AccountSettings.tsx            # Account settings page
├── components/
│   ├── mystash/
│   │   ├── DashboardTab.tsx
│   │   ├── SavedCollectiblesTab.tsx
│   │   ├── LikedCollectiblesTab.tsx
│   │   ├── CurrentBidsTab.tsx
│   │   ├── PurchaseHistoryTab.tsx
│   │   └── PreferencesTab.tsx
│   ├── common/
│   │   └── VerifiedBadge.tsx
│   └── home/
│       └── ProfileDropdown.tsx        # Updated
├── api/
│   └── users/
│       └── preferences.ts             # New API layer
└── main.tsx                           # Updated with new routes

supabase/
└── migrations/
    └── 017_add_user_preferences_and_seller_verification.sql
```

## Design Inspiration

The My Stash page is inspired by eBay's "My eBay" interface:
- Clean sidebar navigation
- Tabbed content areas
- Card-based item display
- Status indicators and chips
- Responsive mobile drawer
- Empty states with CTAs

## Responsive Design

### Desktop
- Fixed sidebar (280px wide)
- Sticky positioning
- Full grid layouts

### Mobile
- Hamburger menu
- Drawer navigation
- Stacked layouts
- Touch-friendly controls

## Future Enhancements

1. **Analytics Dashboard**
   - Detailed spending analytics
   - Bidding success rate
   - Collection value tracking
   - Activity graphs and charts

2. **Advanced Filtering**
   - Filter saved items by category
   - Sort by price, date, status
   - Search within saved items

3. **Recommendations**
   - Personalized item recommendations based on preferences
   - Similar items suggestions
   - Price drop alerts

4. **Social Features**
   - Following other collectors
   - Public/private collection sharing
   - Collection showcases

5. **Export Functionality**
   - Export purchase history to CSV
   - Generate collection reports
   - Tax documentation

6. **Push Notifications**
   - Real-time bid updates
   - Price drop alerts
   - Auction ending reminders

## Database Migration Instructions

1. **Using Supabase CLI (if Docker is running):**
   ```bash
   npx supabase db reset
   ```

2. **Manual migration via Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy contents of `supabase/migrations/017_add_user_preferences_and_seller_verification.sql`
   - Run the SQL script
   - Verify tables and columns were created

3. **Verify migration:**
   ```sql
   -- Check user_preferences table
   SELECT * FROM user_preferences LIMIT 1;

   -- Check new users columns
   SELECT seller_verified, seller_verified_at, notification_preferences
   FROM users LIMIT 1;
   ```

## Testing Checklist

- [ ] Navigate to My Stash from profile dropdown
- [ ] View all tabs in My Stash
- [ ] Save a collectible
- [ ] Like a collectible
- [ ] View current bids
- [ ] View purchase history
- [ ] Update preferences (characters, shows, categories)
- [ ] Adjust price range
- [ ] Change display preferences
- [ ] Navigate to Account Settings
- [ ] Upload avatar
- [ ] Update profile information
- [ ] Change password
- [ ] Toggle notification preferences
- [ ] View seller verification badge (if verified)
- [ ] Test responsive mobile view
- [ ] Test sidebar navigation on mobile

## Known Limitations

1. Avatar uploads require Supabase Storage bucket `user-uploads` to be created
2. Seller verification is manual (admin must set `seller_verified` = true)
3. Push notifications are UI-only (backend implementation needed)
4. Docker must be running to apply migrations via CLI

## Support

For issues or questions about this feature:
1. Check the implementation files
2. Verify database migration was successful
3. Check browser console for errors
4. Verify Supabase Storage bucket exists for avatar uploads
