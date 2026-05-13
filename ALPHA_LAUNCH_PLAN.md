# InkStash Alpha Launch Plan
**Date:** January 26, 2026
**Target Launch:** 4-5 weeks from today

---

## Executive Summary

Based on comprehensive codebase analysis, InkStash is **70% complete** and ready for an aggressive alpha launch timeline. By adding **live auction functionality** (8-10 days of work), we create a significantly more compelling platform that competes directly with Whatnot while maintaining traditional marketplace features.

**Key Decision:** Include live auctions in alpha launch (not post-alpha)

**Rationale:**
1. Database infrastructure is 100% complete (tables, triggers, security)
2. Only requires frontend work (8-10 days)
3. Dramatically increases user engagement and platform stickiness
4. Core differentiator from eBay/Mercari
5. Critical for testing before scaling to beta

---

## Timeline Overview

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Marketplace Core** | 10-12 days | Checkout, fulfillment, search, auctions |
| **Live Auction MVP** | 8-10 days | Streaming, real-time bids, chat |
| **Polish & Testing** | 5-7 days | Mobile, bug fixes, QA |
| **Alpha Launch** | 5-7 days | Deploy, onboard 100 sellers |
| **TOTAL TO ALPHA** | **28-36 days (4-5 weeks)** | Live platform with 100 sellers |

---

## Week-by-Week Breakdown

### Week 1-2: Marketplace Core (10-12 days)

**Focus:** Complete the transaction flow

**Day 1-3: Stripe Checkout Integration**
- Complete payment processing in checkout page
- Handle payment success/failure states
- Create orders in database on successful payment
- Redirect to order confirmation
- Test with Stripe test cards

**Day 4-6: Order Fulfillment Dashboard**
- Add "Orders" tab to Seller Dashboard
- Display pending orders needing shipment
- "Mark as Shipped" with tracking number input
- Order status updates (processing → shipped → delivered)
- Buyer order tracking page

**Day 7-8: Shipping Label Integration**
- Connect create-shipping-label Edge Function to seller addresses
- Fetch seller's default ship-from address
- Display label download link in orders tab
- Error handling for failed label creation

**Day 9-10: Basic Search**
- Full-text search on listings (title, description)
- Filter by category, condition, price range
- Search results page with pagination
- Search bar integration in header

**Day 11-12: Auction Winner Logic**
- Edge Function to end expired auctions (cron job)
- Determine highest bidder as winner
- Create order for winning bid
- Email notifications to winner and seller

**Checkpoint:** End-to-end marketplace works (list → buy/bid → pay → ship → deliver)

---

### Week 3: Live Auction MVP (8-10 days)

**Focus:** Enable live selling with real-time features

**Day 1-2: Video Streaming Integration**
- Choose between Twitch embed or YouTube Live embed
- Implement video player component
- Basic stream detection (is_live status)
- Create livestream viewing page layout

**Day 3-4: Supabase Realtime Subscriptions**
- Set up Realtime channels for each livestream
- Live bid updates (postgres_changes subscription)
- Chat message broadcasting (broadcast channel)
- Viewer count updates (presence tracking)
- Test real-time synchronization across multiple clients

**Day 5-6: Stream Manager UI**
- Add content to "Stream Manager" tab in Seller Dashboard
- "Start Stream" button (creates livestream record, generates stream key if needed)
- Add auction items to queue (title, starting bid, reserve, buy now, image)
- Item sequencing (drag to reorder)
- "Next Item" button to advance auction
- Display current item with bid count
- Basic chat moderation controls

**Day 7-8: Live Auction Bidding**
- Create API wrapper for live_auction_bids table
- Adapt BidModal component for live auction context
- Display current item in viewing page
- Real-time bid updates (show new bids instantly)
- Quick bid buttons (increment by $5, $10, $25)
- Winner determination when seller ends item

**Day 9-10: Chat Component**
- Chat message display with scrolling
- User avatars, badges (subscriber, moderator, streamer)
- Message input and send functionality
- Real-time subscription to new messages
- Basic moderation (delete message button for streamer/mods)
- Emote support (optional, if time allows)

**Checkpoint:** Live streams work with real-time auctions and chat

---

### Week 4: Polish & Testing (5-7 days)

**Focus:** Mobile optimization and bug fixes

**Day 1-3: Mobile Responsiveness**
- Test all pages on mobile (iOS/Android simulators)
- Fix layout issues in:
  - Listing creation (photo upload, dimensions input)
  - Checkout flow (payment method, shipping address)
  - Live stream viewing (video player, chat, bids)
  - Seller Dashboard (tabs, orders, stream manager)
- Mobile navigation improvements

**Day 4-5: User Experience Enhancements**
- Payment method editing/deletion
- Shipping address editing
- Improved error messages and loading states
- Empty states for no listings, no orders, etc.

**Day 6-7: Testing & Bug Fixes**
- End-to-end testing of all critical flows:
  - User onboarding
  - Seller verification
  - List item (regular auction + buy now)
  - Place bid (regular + live auction)
  - Checkout and payment
  - Order fulfillment
  - Live streaming
- Fix high-priority bugs
- Performance optimization (slow queries, image loading)

**Checkpoint:** Production-ready alpha

---

### Week 5: Alpha Launch (5-7 days)

**Focus:** Deploy and onboard first 100 sellers

**Day 1-2: Production Deployment**
- Deploy to production (Vercel/Netlify)
- Set up production Supabase project
- Configure production environment variables:
  - Stripe production keys
  - ShipEngine API key
  - Plaid production credentials
  - OpenAI API key
  - Resend API key (emails)
- Run database migrations
- Test production checkout with real payment (small amount)
- Set up monitoring (error tracking, analytics)

**Day 3-4: Alpha Tester Onboarding**
- Send invitations to first 100 sellers (alpha testers)
- Welcome email with:
  - Platform overview and unique features
  - Alpha tester benefits (5% fee, lifetime 7% rate)
  - Getting started guide
  - Feedback channels (Discord, email)
- Manual verification for first batch of sellers (if needed)
- Onboarding calls with interested streamers (10-20 sellers)

**Day 5-7: Monitoring & Support**
- Monitor real-time analytics:
  - Sign-ups, listings created, transactions completed
  - Live streams conducted, chat messages sent
  - Error rates, failed payments, support tickets
- Rapid bug fixing (critical issues only)
- Collect qualitative feedback (user interviews, surveys)
- Iterate on onboarding flow based on feedback

**Success Metrics for Week 1 of Alpha:**
- 100 sellers signed up ✓
- 50+ sellers completed onboarding
- 20+ listings created
- 5+ live streams conducted
- 3+ successful live auction sales
- 10+ total transactions (regular + live)
- 0 critical payment or security bugs

---

## What's Already Built (70% Complete)

### ✅ Database (100% Complete)
- 30+ tables with comprehensive schemas
- Row-Level Security policies on all tables
- Triggers for bid updates, viewer counts, watch time
- Functions for tier calculation, discovery scoring

### ✅ Authentication & User Management
- Google OAuth + email/password
- User onboarding flow (4 steps)
- Profile system with followers/following
- Session management with auto-refresh

### ✅ Seller Verification
- Plaid bank linking
- Plaid identity verification
- Seller onboarding UI with progress tracking
- Mock mode for development

### ✅ Listing Creation
- Photo upload (8 images max) to Supabase Storage
- AI title/description generation (OpenAI)
- Category, condition, graded items support
- Auction vs Buy Now pricing
- Package dimensions input
- Real-time shipping rate quotes (ShipEngine)
- Ship-from address management
- Auto-save drafts

### ✅ Buyer Experience
- Item browsing and detail pages
- Auction countdown timers
- Bid placement with validation
- Shopping cart with persistence
- Like/save/view tracking
- User dashboard (My Stash)

### ✅ Integrations
- Stripe (payment intents, setup intents, tax calculation)
- ShipEngine (shipping rates, label creation APIs)
- Plaid (bank + identity verification)
- OpenAI (AI descriptions, price suggestions)
- Supabase (Auth, Database, Storage, Edge Functions)

---

## What Needs to Be Built (30% Remaining)

### Week 1-2: Marketplace Core
1. ❌ Complete Stripe checkout flow
2. ❌ Order fulfillment for sellers
3. ❌ Shipping label integration
4. ❌ Basic search functionality
5. ❌ Auction winner determination

### Week 3: Live Auctions
6. ❌ Video streaming integration (Twitch/YouTube embed)
7. ❌ Supabase Realtime subscriptions
8. ❌ Stream Manager UI
9. ❌ Live auction bidding API + UI
10. ❌ Chat component

### Week 4: Polish
11. ❌ Mobile responsiveness
12. ❌ Payment/address management
13. ❌ Testing and bug fixes

---

## Alpha Tester Incentive Structure

### First 100 Sellers (Alpha Testers)

**Pricing:**
- **5% selling fee** (vs 12% standard) = **58% discount**
- **2.9% + $0.30** payment processing (standard Stripe, no markup)
- **Total: ~8% + $0.30** per sale (vs 15% + $0.30 standard)
- **No streaming fees** for first 6 months (vs 2% standard)

**Payout:**
- **3 days** after delivery confirmation (vs 7 days standard)
- Transition to **7% lifetime rate** after 6 months (grandfathered)

**Perks:**
- 500 active listing limit (vs 50 standard)
- "Alpha Tester" badge on profile (upgrades to "OG Seller" after 6 months)
- Private Discord channel with founders
- Vote on feature priorities
- Free promotional posts on InkStash social media
- Priority customer support

**Example:** $100 sale
- Selling fee: $5.00 (5%)
- Payment processing: $3.20 (2.9% + $0.30)
- **Seller receives: $91.80** (vs $84.80 for casual sellers)
- Payout in 3 days

**Value Proposition:**
- **$6.80 more per $100 sale** than standard sellers
- **Lifetime 7% rate** (vs 12% standard) = **42% permanent discount**
- Early influence on platform direction

---

## Post-Alpha Roadmap (Weeks 6-8)

After alpha launch, focus on:

1. **Batch Checkout** - Buy multiple items at once
2. **Seller Analytics** - Sales charts, top listings, traffic
3. **Advanced Search** - Filters, sorting, saved searches
4. **Collections** - Users create custom collections
5. **Premium Streamer Features** - Custom overlays, analytics
6. **Virtual Currency** - InkPoints for engagement rewards
7. **Referral Program** - Sellers invite other sellers for bonuses

**Goal:** Prepare for beta launch with 500 sellers (alpha 100 + beta 400)

---

## Success Metrics

### Alpha Launch (Week 5)
- 100 sellers onboarded ✓
- 50+ sellers with listings
- 20+ total listings
- 5+ live streams conducted
- 10+ successful transactions
- $500+ GMV (Gross Merchandise Value)

### End of Month 1 (Week 8)
- 100 sellers (retaining alpha cohort)
- 100+ active listings
- 10+ active streamers
- 30+ transactions
- $2,000+ GMV
- 70%+ seller retention (70 of 100 still active)

### End of Month 2 (Beta Prep)
- 150 sellers (adding 50 more before full beta)
- 200+ listings
- 20+ streamers
- 75+ transactions
- $6,000+ GMV
- Ready to onboard 400 beta testers

---

## Risk Mitigation

### Technical Risks
**Risk:** Payment processing bugs lose money or reputation
**Mitigation:**
- Extensive testing in Stripe test mode
- Small real payment test before launch
- Error logging and monitoring
- Refund process ready

**Risk:** Live streaming infrastructure fails during alpha
**Mitigation:**
- Use proven platforms (Twitch/YouTube) not custom
- Fallback to marketplace-only if streaming has issues
- Clear communication with streamers about alpha limitations

**Risk:** Database performance issues with real-time features
**Mitigation:**
- Load testing with simulated traffic
- Database connection pooling configured
- Supabase Pro plan ready if needed (better limits)

### Business Risks
**Risk:** Low seller sign-ups (don't hit 100)
**Mitigation:**
- Aggressive outreach to collectibles communities (Reddit, Discord, Facebook groups)
- Partnerships with local card/comic shops
- Referral incentives ($25 credit for both parties)

**Risk:** No one uses live streaming
**Mitigation:**
- Personal onboarding calls with interested streamers
- Equipment setup guides
- Example streams by founders to demonstrate

**Risk:** High seller churn after alpha
**Mitigation:**
- Weekly check-ins with alpha sellers
- Rapid response to feedback and bug fixes
- Grandfathered rates incentivize staying

---

## Technical Implementation Details

### Video Streaming Recommendation: Twitch Embed

**Why Twitch:**
1. Many collectibles sellers already stream on Twitch
2. Embed is free and easy to implement
3. No video infrastructure needed
4. Chat can still be custom (better moderation)
5. Can migrate to custom streaming in v2 if needed

**Implementation:**
```tsx
<iframe
  src={`https://player.twitch.tv/?channel=${twitchUsername}&parent=${window.location.hostname}`}
  height="480"
  width="854"
  allowfullscreen
/>
```

**Seller Setup:**
1. Seller links Twitch account in settings
2. Goes live on Twitch with OBS
3. Clicks "Start Stream" in InkStash
4. InkStash detects stream via Twitch API
5. Viewers watch in InkStash with custom auction UI + chat

**Alternative:** YouTube Live (same embed approach)

---

### Supabase Realtime Implementation

**Live Bids:**
```typescript
const bidsChannel = supabase
  .channel(`live-auction-${itemId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'live_auction_bids',
    filter: `live_auction_item_id=eq.${itemId}`
  }, (payload) => {
    // Update UI with new bid
    setCurrentBid(payload.new.bid_amount);
    setHighestBidder(payload.new.bidder_id);
  })
  .subscribe();
```

**Chat Messages:**
```typescript
const chatChannel = supabase
  .channel(`livestream-chat-${streamId}`)
  .on('broadcast', { event: 'new_message' }, (payload) => {
    setMessages(prev => [...prev, payload.payload]);
  })
  .subscribe();

// Send message
chatChannel.send({
  type: 'broadcast',
  event: 'new_message',
  payload: { username, message, avatar_url }
});
```

**Viewer Presence:**
```typescript
const presenceChannel = supabase
  .channel(`livestream-presence-${streamId}`)
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    setViewerCount(Object.keys(state).length);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({ user_id: userId });
    }
  });
```

---

## Resource Requirements

### Development Team
- **1 Full-stack developer** (can complete in 4-5 weeks)
- OR **2 developers** (can complete in 2-3 weeks with parallel work)

**If 2 developers:**
- **Dev 1:** Marketplace core (checkout, fulfillment, search)
- **Dev 2:** Live auctions (streaming, realtime, chat)
- **Both:** Polish and testing together

### Tools & Services (Monthly Costs)

| Service | Plan | Cost | Notes |
|---------|------|------|-------|
| **Supabase** | Pro | $25/mo | May need during alpha for higher limits |
| **Vercel** | Hobby | $0 | Free tier sufficient for alpha |
| **Stripe** | Standard | 2.9% + $0.30 | No monthly fee, pay-per-transaction |
| **ShipEngine** | Essential | $10/mo | 10 labels/month included |
| **Plaid** | Launch | $0 | Free tier (1,000 verifications/mo) |
| **OpenAI** | Pay-as-go | ~$20/mo | Estimate for 1,000 descriptions |
| **Resend** | Free | $0 | 3,000 emails/month free |
| **Domain** | .com | ~$15/yr | One-time annual |

**Total Alpha Costs: ~$60-80/month + transaction fees**

---

## Next Steps (Immediate Actions)

1. **Review & Approve Timeline**
   - Confirm 4-5 week timeline is acceptable
   - Approve live auctions as part of alpha (not post-alpha)
   - Approve alpha tester fee structure (5% rate)

2. **Prioritize Features**
   - Any features to cut or add?
   - Any changes to fee structure?

3. **Set Up Tracking**
   - Create project management board (Trello, Linear, or Notion)
   - Break down tasks into individual tickets
   - Assign work if multiple developers

4. **Prepare Marketing**
   - Draft alpha tester invitation email
   - Identify outreach channels (subreddits, Facebook groups, Discord servers)
   - Create landing page for alpha sign-ups

5. **Legal & Compliance**
   - Review terms of service and privacy policy
   - Ensure Stripe account is business account
   - Sales tax compliance (Stripe Automatic Tax handles this)

6. **Start Development**
   - Begin Week 1 tasks (Stripe checkout integration)
   - Set up staging environment for testing

---

## Questions to Answer Before Starting

1. **Team Size:** Is this a solo project or do you have developers?
2. **Timeline Flexibility:** Is 4-5 weeks acceptable, or do you need faster/slower?
3. **Feature Scope:** Approve live auctions in alpha, or launch without and add later?
4. **Fee Structure:** Approve 5% alpha rate, or adjust percentages?
5. **Platform Choice:** Twitch embed for video, or prefer YouTube Live?
6. **Alpha Testers:** Do you have connections in collectibles community, or need help with outreach?
7. **Budget:** $60-80/month for services acceptable during alpha?

---

**Document Owner:** InkStash Founding Team
**Next Update:** After alpha launch (target: Week 5)
