# Bidding & Buy Now System Documentation

## Overview
This document describes the complete bidding and buy now workflow implemented for the InkStash auction platform.

## Features Implemented

### 1. Database Schema ([supabase/migrations/004_create_bids_table.sql](supabase/migrations/004_create_bids_table.sql))

#### Bids Table
- **Purpose**: Track all bids placed on auctions
- **Fields**:
  - `id`: UUID primary key
  - `auction_id`: Reference to auctions table
  - `user_id`: Reference to users table
  - `amount`: Bid amount (must be positive)
  - `created_at`: Timestamp of when bid was placed

#### Database Functions

1. **`get_highest_bid(p_auction_id UUID)`**
   - Returns the highest bid for an auction
   - Includes user_id, amount, and timestamp
   - Ordered by amount DESC, then created_at ASC (first bid wins in tie)

2. **`place_bid(p_auction_id UUID, p_user_id UUID, p_amount DECIMAL)`**
   - Validates and places a bid with comprehensive checks:
     - ✅ Auction exists
     - ✅ Auction hasn't ended
     - ✅ User is not the seller
     - ✅ User is not already the highest bidder
     - ✅ Bid amount is higher than current bid
     - ✅ Bid amount meets minimum (starting bid)
   - Updates auction's `current_bid` and `bid_count`
   - Returns JSON with success/error status

3. **`get_bid_history(p_auction_id UUID, p_limit INT)`**
   - Returns bid history for an auction
   - Includes username for each bid
   - Default limit of 10 bids
   - Ordered by amount DESC

4. **`calculate_bid_increment(current_price DECIMAL)`**
   - eBay-style bid increment algorithm:
     - $0.00 - $0.99: $0.05 increment
     - $1.00 - $4.99: $0.25 increment
     - $5.00 - $14.99: $0.50 increment
     - $15.00 - $59.99: $1.00 increment
     - $60.00 - $149.99: $2.50 increment
     - $150.00 - $299.99: $5.00 increment
     - $300.00 - $599.99: $10.00 increment
     - $600.00 - $1,499.99: $25.00 increment
     - $1,500.00 - $2,999.99: $50.00 increment
     - $3,000.00+: $100.00 increment

#### Security (RLS Policies)
- ✅ Anyone can view all bids (for transparency)
- ✅ Only authenticated users can place bids
- ✅ Bids are immutable (cannot be updated or deleted)
- ✅ User authentication verified via `auth.uid()`

### 2. API Layer ([src/api/auctions/bids.ts](src/api/auctions/bids.ts))

#### Functions

1. **`placeBid(auctionId, userId, amount)`**
   - Calls the database `place_bid` function
   - Returns `{ success: boolean, error?: string, bid_id?: string, amount?: number }`

2. **`getHighestBid(auctionId)`**
   - Gets the current highest bid
   - Returns `Bid | null`

3. **`getBidHistory(auctionId, limit?)`**
   - Gets bid history with usernames
   - Returns `Bid[]` array

4. **`calculateBidIncrement(currentPrice)`**
   - Client-side mirror of database function
   - Used for generating bid options

5. **`generateBidOptions(currentPrice)`**
   - Generates 4 suggested bid amounts:
     - Current + 1x increment
     - Current + 2x increment
     - Current + 3x increment
     - Current + 5x increment

### 3. BidModal Component ([src/components/auctions/BidModal.tsx](src/components/auctions/BidModal.tsx))

#### Features
- 📱 **Quick Bid Options**: 4 pre-calculated bid amounts based on current price
- ✏️ **Custom Bid**: User can enter any amount higher than current bid
- ✅ **Real-time Validation**:
  - Must be higher than current bid
  - Must be a valid decimal number (2 decimal places max)
  - Prevents submission of invalid amounts
- 🎨 **Visual Feedback**:
  - Selected option highlighted
  - Error messages displayed
  - Bid summary showing final amount
  - Loading state during submission
- 🚫 **Error Handling**: Displays server-side validation errors

#### Props
```typescript
interface BidModalProps {
  open: boolean;
  onClose: () => void;
  currentBid: number;
  itemTitle: string;
  onPlaceBid: (amount: number) => Promise<{ success: boolean; error?: string }>;
}
```

### 4. ItemDetail Page Updates ([src/pages/ItemDetail.tsx](src/pages/ItemDetail.tsx))

#### Bidding Button States

The "Place Bid" button dynamically changes based on:

1. **Not Logged In**:
   - Text: "Place Bid (Login Required)"
   - Action: Redirects to login
   - Disabled: No

2. **Auction Ended**:
   - Text: "Auction Ended"
   - Disabled: Yes

3. **User is Seller**:
   - Text: "You Cannot Bid on Your Own Item"
   - Disabled: Yes

4. **User is Highest Bidder**:
   - Text: "You Are the Highest Bidder"
   - Disabled: Yes

5. **Normal State**:
   - Text: "Place Bid"
   - Action: Opens BidModal
   - Disabled: No

#### Buy Now Button States

The "Buy Now" button:
- Only appears if `buy_now_price` exists
- Disabled if auction has ended
- Disabled if user is the seller
- Navigates to `/payments` with purchase details

#### New State Variables
```typescript
const [bidModalOpen, setBidModalOpen] = useState(false);
const [highestBidUserId, setHighestBidUserId] = useState<string | null>(null);
const [isAuctionEnded, setIsAuctionEnded] = useState(false);
```

#### New Functions

1. **`handlePlaceBid(amount)`**
   - Validates user is logged in
   - Calls API to place bid
   - Updates UI with new bid amount
   - Updates highest bidder state
   - Returns result to modal

2. **`handleBuyNow()`**
   - Validates user is logged in
   - Navigates to `/payments` with state:
     - `auctionId`
     - `itemTitle`
     - `price` (buy now price)
     - `imageUrl`
     - `type: 'buy_now'`
     - `sellerId`

3. **`getBidButtonState()`**
   - Determines button text and disabled state
   - Checks all conditions (login, ended, seller, highest bidder)

## Workflow Diagrams

### Bidding Workflow
```
User clicks "Place Bid"
  ↓
Check if logged in
  ├─ No → Navigate to /login
  └─ Yes → Open BidModal
           ↓
       User selects/enters bid amount
           ↓
       Click "Place Bid" in modal
           ↓
       API validates and places bid
           ├─ Success → Update UI, close modal
           └─ Error → Display error message
```

### Buy Now Workflow
```
User clicks "Buy Now"
  ↓
Check if logged in
  ├─ No → Show alert
  └─ Yes → Navigate to /payments with details
           ↓
       Payment & Shipping page
           ↓
       Complete purchase
```

### Bid Validation Flow
```
place_bid() function
  ↓
1. Check auction exists → Error if not
  ↓
2. Check auction hasn't ended → Error if ended
  ↓
3. Check user != seller → Error if seller
  ↓
4. Check user != highest bidder → Error if highest bidder
  ↓
5. Check amount > current bid → Error if too low
  ↓
6. Insert bid into database
  ↓
7. Update auction current_bid & bid_count
  ↓
8. Return success
```

## Setup Instructions

### 1. Run Database Migration

```bash
# Option 1: Using Supabase Dashboard
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Copy contents of supabase/migrations/004_create_bids_table.sql
# 3. Paste and run

# Option 2: Using Supabase CLI
supabase db push
```

### 2. Verify Database Setup

Check that the following were created:
- ✅ `bids` table
- ✅ Indexes on auction_id, user_id, created_at
- ✅ RLS policies enabled
- ✅ Functions: `get_highest_bid`, `place_bid`, `get_bid_history`, `calculate_bid_increment`

### 3. Test the Features

1. **Test Bidding**:
   - Log in as User A
   - Navigate to an auction item
   - Click "Place Bid"
   - Try quick bid options
   - Try custom bid amount
   - Verify bid is placed successfully

2. **Test Button States**:
   - As seller: Verify "You Cannot Bid on Your Own Item"
   - After placing bid: Verify "You Are the Highest Bidder"
   - After auction ends: Verify "Auction Ended"
   - Not logged in: Verify "Place Bid (Login Required)"

3. **Test Buy Now**:
   - Click "Buy Now" on item with buy_now_price
   - Verify navigation to /payments with correct state

4. **Test Validation**:
   - Try bidding lower than current bid (should fail)
   - Try bidding on own item (should fail)
   - Try bidding when already highest bidder (should fail)

## Future Enhancements

Potential improvements to consider:

1. **Proxy/Auto Bidding**: Allow users to set max bid, system auto-bids for them
2. **Bid Notifications**: Real-time notifications when outbid
3. **Bid History Display**: Show full bid history on item detail page
4. **Bid Retraction**: Allow users to retract bids within X minutes
5. **Reserve Price**: Minimum price that must be met
6. **Auction Extension**: Auto-extend auction if bid placed in last X minutes
7. **Bid Confirmation**: Email/SMS confirmation after placing bid
8. **Watchlist Integration**: Notify users of bids on watched items

## Files Created/Modified

### Created
- `supabase/migrations/004_create_bids_table.sql`
- `src/api/auctions/bids.ts`
- `src/components/auctions/BidModal.tsx`
- `BIDDING_SYSTEM.md` (this file)

### Modified
- `src/pages/ItemDetail.tsx`
  - Added imports for bidding functions and BidModal
  - Added state for bid modal, highest bidder, auction ended
  - Added bid button state logic
  - Added buy now handler
  - Integrated BidModal component

## Database Schema Reference

### Bids Table
```sql
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX idx_bids_auction_id ON bids(auction_id);
CREATE INDEX idx_bids_user_id ON bids(user_id);
CREATE INDEX idx_bids_created_at ON bids(created_at DESC);
CREATE INDEX idx_bids_auction_amount ON bids(auction_id, amount DESC);
```

## Troubleshooting

### Bid Not Placing
- Check user is authenticated
- Verify auction hasn't ended
- Ensure bid is higher than current bid
- Check user is not the seller
- Check database function exists and has correct permissions

### Button Not Updating
- Verify `getHighestBid()` is being called in useEffect
- Check `highestBidUserId` state is being set correctly
- Ensure `isAuctionEnded` is updating based on countdown

### Buy Now Not Working
- Verify `/payments` route exists
- Check payment page can receive location state
- Ensure `buy_now_price` field exists in auctions table

## Support

For issues or questions:
1. Check the database migration ran successfully
2. Verify all RLS policies are enabled
3. Check browser console for errors
4. Review Supabase logs for API errors
