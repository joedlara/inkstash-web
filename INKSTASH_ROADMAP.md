# InkStash Product Roadmap
**Last Updated:** January 26, 2026
**Project Status:** Pre-Alpha (70% Complete)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [What We've Accomplished](#what-weve-accomplished)
3. [What's Left for Alpha Launch](#whats-left-for-alpha-launch)
4. [Future Features (Post-Alpha)](#future-features-post-alpha)
5. [New Feature Concept: Digital Comic Blind Bags](#new-feature-concept-digital-comic-blind-bags)
6. [Timeline & Milestones](#timeline--milestones)

---

## Executive Summary

**InkStash** is a collectibles marketplace platform combining traditional auction/marketplace functionality with live streaming capabilities. Built with React 19, TypeScript, Supabase, and integrated with Stripe (payments), ShipEngine (shipping), Plaid (seller verification), and OpenAI (AI features).

### Current State
- **14,321 lines of code** across 112 TypeScript files
- **30+ database tables** with Row-Level Security
- **4 major integrations** (Stripe, Plaid, ShipEngine, OpenAI)
- **Core buyer/seller flows** 70% complete

### Target Launch
**Alpha Launch Goal:** 2-3 weeks (estimated ~15-20 business days of focused development)

---

## What We've Accomplished

### ✅ Authentication & User Management
- [x] Google OAuth and email/password authentication (Supabase Auth)
- [x] User onboarding flow (4 steps: username, interests, notifications, feed preview)
- [x] Session management with automatic token refresh
- [x] Protected route guards for authenticated pages
- [x] User profile system with avatars, bios, social links
- [x] XP/leveling system (database ready, UI partially implemented)
- [x] Follow/follower system with modals
- [x] User preferences storage

### ✅ Buyer Experience
- [x] Landing page with hero sections for new visitors
- [x] Dashboard with live streams, featured collectibles, popular shows
- [x] Category browsing (Pokemon, Sports Cards, Comics, TCG, Funko, etc.)
- [x] Item detail pages with image galleries
- [x] Auction system:
  - [x] Place bids with bid modal
  - [x] Real-time highest bid tracking
  - [x] Auction countdown timers
  - [x] Buy Now option support
  - [x] Like/Save/View tracking
- [x] Shopping cart with localStorage persistence
- [x] Checkout page UI:
  - [x] Payment method selection
  - [x] Shipping address management
  - [x] Apple Pay UI (testing mode)
  - [x] Tax calculation via Stripe
  - [x] Order summary breakdown
- [x] "My Stash" dashboard:
  - [x] Current bids tab
  - [x] Liked collectibles
  - [x] Saved items
  - [x] Purchase history view
  - [x] User preferences

### ✅ Seller Experience
- [x] Seller verification onboarding:
  - [x] Terms & conditions acceptance
  - [x] Bank account connection via Plaid
  - [x] Identity verification via Plaid
  - [x] Progress tracking with state persistence
  - [x] Mock mode for development testing
- [x] Seller Dashboard UI:
  - [x] Stream Manager tab
  - [x] Analytics tab (UI only)
  - [x] My Store inventory management
  - [x] Community tab
  - [x] Monetization tab
  - [x] Settings
- [x] List Item flow:
  - [x] Photo upload (up to 8 images via Supabase Storage)
  - [x] AI-powered title/description generation (OpenAI)
  - [x] Category and condition selection
  - [x] Auction vs Buy Now pricing
  - [x] Auction duration picker (1-14 days)
  - [x] Package dimensions input
  - [x] Ship-from address management
  - [x] Real-time shipping rate quotes (USPS, UPS, FedEx via ShipEngine)
  - [x] Graded items support (PSA, BGS, CGC)
  - [x] Auto-save/listing persistence
- [x] Ship-from addresses CRUD operations

### ✅ Infrastructure & Integrations
- [x] Supabase setup:
  - [x] PostgreSQL database with 30+ tables
  - [x] Row-Level Security policies on all tables
  - [x] Storage bucket for user uploads
  - [x] 14 Edge Functions deployed
- [x] Stripe integration:
  - [x] Payment intents setup
  - [x] Setup intents for saving cards
  - [x] Automatic tax calculation
  - [x] Stripe Connect schema (ready for payouts)
- [x] ShipEngine integration:
  - [x] Real-time shipping rate calculation
  - [x] Multi-carrier support (USPS, UPS, FedEx)
  - [x] Label creation API ready
- [x] Plaid integration:
  - [x] Bank account linking
  - [x] Identity verification (KYC)
  - [x] Mock mode for testing
- [x] OpenAI integration:
  - [x] AI description generation
  - [x] Price suggestions (schema ready)
  - [x] Tag generation for SEO

### ✅ Social Features
- [x] User profiles with @username routing
- [x] Public profile pages with stats (sales, purchases, auctions)
- [x] Follower/following system
- [x] Seller ratings and verification badges
- [x] Profile customization (avatar, bio, links)

### ✅ Analytics & Tracking
- [x] Click tracking system
- [x] Search events logging
- [x] User viewing history
- [x] Recommendation events tracking
- [x] Dashboard statistics API

---

## What's Left for Alpha Launch

### 🔴 CRITICAL (Must-Have for Alpha)

#### 1. Complete Checkout Flow
**Status:** Payment processing incomplete
**Estimated Time:** 2-3 days
**Tasks:**
- [ ] Implement actual Stripe payment processing in checkout
- [ ] Handle payment success/failure states
- [ ] Create orders in database upon successful payment
- [ ] Redirect to order confirmation page
- [ ] Test with Stripe test cards
- [ ] Error handling and user feedback

#### 2. Order Fulfillment Workflow
**Status:** Seller dashboard has no order management
**Estimated Time:** 3 days
**Tasks:**
- [ ] Create "Orders" tab in Seller Dashboard
- [ ] Display pending orders needing fulfillment
- [ ] "Mark as Shipped" functionality
- [ ] Integrate shipping label creation
- [ ] Order status updates (processing, shipped, delivered)
- [ ] Buyer order tracking page completion

#### 3. Shipping Label Creation
**Status:** API exists but needs seller address integration
**Estimated Time:** 1 day
**Tasks:**
- [ ] Fetch seller's default ship-from address
- [ ] Pass to ShipEngine Edge Function
- [ ] Store label URL in shipments table
- [ ] Display label in seller dashboard
- [ ] Handle label creation errors

#### 4. Auction Winner Logic
**Status:** Bidding works, but no winner determination
**Estimated Time:** 2 days
**Tasks:**
- [ ] Cron job or scheduled function to end auctions
- [ ] Determine highest bidder as winner
- [ ] Create order for winning bid
- [ ] Send notifications to winner and seller
- [ ] Handle reserve prices (if implemented)
- [ ] Failed payment handling for winning bidder

#### 5. Basic Search Functionality
**Status:** Search bar exists, no backend
**Estimated Time:** 2-3 days
**Tasks:**
- [ ] Implement full-text search on listings table
- [ ] Search by title, description, tags
- [ ] Filter by category, condition, price range
- [ ] Search results page with pagination
- [ ] Search autocomplete/suggestions
- [ ] Track search events for analytics

#### 6. Email Notifications
**Status:** Edge Functions exist, need Resend API setup
**Estimated Time:** 1 day
**Tasks:**
- [ ] Set up Resend account and API key
- [ ] Configure environment variables
- [ ] Test email templates:
  - [ ] Order confirmation
  - [ ] Shipping notification
  - [ ] Auction won/lost
  - [ ] New follower
  - [ ] Bid outbid notification
- [ ] Email preference management

#### 7. Payment Method Management
**Status:** Can add cards, can't edit/delete
**Estimated Time:** 1 day
**Tasks:**
- [ ] Delete payment method from Stripe
- [ ] Set default payment method
- [ ] Update payment method UI in settings
- [ ] Confirmation modals for deletion

---

### 🟡 HIGH PRIORITY (Important for User Experience)

#### 8. Mobile Responsiveness
**Status:** Some pages not optimized
**Estimated Time:** 2-3 days
**Tasks:**
- [ ] Test all pages on mobile (iOS/Android)
- [ ] Fix checkout flow on mobile
- [ ] Optimize listing creation on mobile
- [ ] Ensure image upload works on mobile
- [ ] Test navigation and menus

#### 9. Batch Checkout
**Status:** UI shows but not implemented
**Estimated Time:** 2 days
**Tasks:**
- [ ] Support multiple items in cart checkout
- [ ] Calculate combined shipping if from same seller
- [ ] Handle multiple sellers in one cart
- [ ] Split payments if needed

#### 10. Collectible Suggestions API
**Status:** Placeholder during listing creation
**Estimated Time:** 2 days
**Tasks:**
- [ ] Build API to search existing collectibles
- [ ] Integrate with OpenAI for intelligent matching
- [ ] Dropdown suggestions during item listing
- [ ] Help sellers with accurate titles/categories

#### 11. Shipping Address Editing
**Status:** Can add, can't edit
**Estimated Time:** 1 day
**Tasks:**
- [ ] Edit shipping address modal
- [ ] Update address in database
- [ ] Set default shipping address
- [ ] Delete addresses

#### 12. Tracking Webhooks
**Status:** Schema ready, webhook handling incomplete
**Estimated Time:** 1-2 days
**Tasks:**
- [ ] Set up ShipEngine webhook endpoint
- [ ] Handle tracking status updates
- [ ] Update shipments table with tracking events
- [ ] Notify buyers of delivery status changes

---

### 🔴 CRITICAL (Must-Have for Alpha) - ADDED TO ALPHA SCOPE

#### 13. Live Streaming Integration
**Status:** 70% complete (database schema fully built), needs frontend implementation
**Estimated Time:** 8-10 days
**Priority:** **NOW CRITICAL - Adding to Alpha Launch**

**Why This Is Critical:**
- Live auctions drive user engagement and platform stickiness
- Differentiates InkStash from static marketplaces (eBay, Mercari)
- Competes with Whatnot's live selling model
- Database infrastructure already complete (tables, triggers, RLS policies)
- Only needs frontend integration and real-time subscriptions

**What's Already Built:**
- ✅ Complete database schema (livestreams, live_auction_items, live_auction_bids, chat)
- ✅ Database triggers for bid updates and viewer counts
- ✅ Row-Level Security policies
- ✅ Email notifications (auction won/outbid)
- ✅ Basic LiveStreams display component
- ✅ Bid placement logic (can adapt for live auctions)

**What Needs to Be Built:**
- [ ] Video player integration (Twitch/YouTube embed - **2 days**)
  - Embed Twitch/YouTube player (no custom video infrastructure)
  - Detect when stream is live
  - Display stream in viewing page
- [ ] Supabase Realtime subscriptions (**2 days**)
  - Live bid updates (broadcast to all viewers)
  - Chat message broadcasting
  - Viewer count updates
  - Current auction item changes
- [ ] Stream Manager UI (**2-3 days**)
  - Start/stop stream controls
  - Add auction items to queue
  - Set starting bids, reserve prices, buy now prices
  - Advance to next item
  - View current bids and chat moderation
- [ ] Live auction bidding API + UI (**1-2 days**)
  - Frontend wrapper for live_auction_bids table
  - Bid validation and placement
  - Real-time bid display component
  - Winner determination when item closes
- [ ] Chat component (**2 days**)
  - Message display with user avatars and badges
  - Send message input
  - Real-time subscription to new messages
  - Basic moderation (delete message, timeout user)

**Technical Approach:**
1. **Video:** Use Twitch/YouTube embed (fastest, no video infrastructure needed)
2. **Real-time:** Supabase Realtime (already have Supabase, just implement subscriptions)
3. **Bidding:** Adapt existing BidModal component for live auction context
4. **Chat:** Custom component with Supabase Realtime broadcast

**Implementation Order:**
1. Day 1-2: Twitch/YouTube embed + basic viewing page
2. Day 3-4: Supabase Realtime subscriptions (bids, chat, viewers)
3. Day 5-6: Stream Manager UI (add items, start stream)
4. Day 7-8: Live bidding API and UI component
5. Day 9-10: Chat component with real-time messaging

**Total: 9-10 days to add live auctions to alpha**

#### 14. Virtual Currency System (InkPoints)
**Status:** Database schema complete, no UI
**Estimated Time:** 2-3 days
**Tasks:**
- [ ] Display InkPoints balance in user profile
- [ ] Award points for actions (listings, purchases, referrals)
- [ ] Redeem points for discounts or perks
- [ ] Transaction history page

#### 15. Seller Analytics Dashboard
**Status:** Tab exists, no data visualization
**Estimated Time:** 2-3 days
**Tasks:**
- [ ] Sales charts (revenue over time)
- [ ] Top-performing listings
- [ ] Traffic sources
- [ ] Conversion rates
- [ ] Inventory value

#### 16. Collections Feature
**Status:** Database schema ready, no UI
**Estimated Time:** 2 days
**Tasks:**
- [ ] Create custom collections
- [ ] Add items to collections
- [ ] Public/private collection settings
- [ ] Share collections

#### 17. Badges & Achievements
**Status:** Database schema ready, minimal UI
**Estimated Time:** 2 days
**Tasks:**
- [ ] Define achievement criteria
- [ ] Award badges automatically
- [ ] Display badges on profiles
- [ ] Achievement notification system

---

## Future Features (Post-Alpha)

### Phase 2: Enhanced Marketplace
- [ ] Advanced filtering (rarity, year, brand, etc.)
- [ ] Price history tracking and charts
- [ ] Watchlists with price alerts
- [ ] Seller storefronts with custom branding
- [ ] Bulk listing tools for sellers
- [ ] CSV import for inventory
- [ ] Promoted listings (paid ads)
- [ ] Featured seller program

### Phase 3: Community & Engagement
- [ ] User-to-user messaging
- [ ] Community forums/discussions
- [ ] User reviews and ratings system
- [ ] Dispute resolution center
- [ ] Referral program
- [ ] Leaderboards and competitions
- [ ] Content creator partnerships

### Phase 4: Advanced Features
- [ ] Machine learning price predictions
- [ ] Fraud detection system
- [ ] Image recognition for item verification
- [ ] AR preview for collectibles
- [ ] Escrow service for high-value items
- [ ] Consignment services
- [ ] Trading/swap functionality
- [ ] Portfolio tracking and valuation

### Phase 5: Business & Monetization
- [ ] Subscription tiers for sellers (lower fees, premium features)
- [ ] White-label solution for brands
- [ ] API for third-party integrations
- [ ] Mobile apps (iOS/Android)
- [ ] International expansion (multi-currency, localization)

---

## New Feature Concept: Digital Comic Blind Bags

### Overview
Inspired by boxed.gg's digital pack-opening model for trading cards, we want to create a similar experience for the current **comic book blind bag trend**. This feature would allow users to:
1. Purchase digital "blind bags" containing randomized comic books
2. "Open" the bag digitally to reveal contents
3. Choose to:
   - **Sell back** to InkStash for a percentage of value
   - **Store** in digital wallet/collection
   - **Request physical shipment** of the actual comic book

### Key Differentiators
Unlike existing solutions (which focus on graded CGC slabs), we'd target:
- **Raw comics** (non-graded)
- **Modern variants** and blind bag items currently trending
- **Lower price points** for accessibility
- **Gamification** with rarity tiers (common, uncommon, rare, chase)

### Technical Implementation

#### New Components Needed
1. **Blind Bag System**
   - Database: `blind_bags` table (name, price, contents pool, rarity odds)
   - Database: `blind_bag_purchases` table (user, bag type, unopened/opened status)
   - Database: `blind_bag_inventory` table (digital items owned by users)
   - API: Purchase blind bag endpoint
   - API: Open blind bag endpoint (randomization logic)
   - UI: Blind bag store/marketplace
   - UI: Opening animation (card flip reveal)

2. **Digital Wallet**
   - Database: `digital_collectibles` table (user, item, condition, acquired_date)
   - UI: User's digital collection page
   - UI: Item detail view (3D viewer, stats, rarity)
   - Feature: Organize by rarity, value, or acquisition date

3. **Buyback System**
   - Database: `buyback_offers` table (item, percentage of value, expiration)
   - API: Get buyback price for digital item
   - API: Accept buyback offer (transfer ownership to InkStash)
   - UI: Buyback modal with price display
   - Feature: Dynamic pricing based on market demand

4. **Physical Redemption**
   - Database: `redemption_requests` table (user, digital_item_id, shipping_address, status)
   - Integration: Link to existing ShipEngine shipping flow
   - API: Request physical shipment
   - UI: Redemption modal (confirm address, acknowledge digital item removal)
   - Workflow: Mark digital item as "redeemed" (no longer in wallet)

5. **Rarity & Value System**
   - Database: `collectible_rarity` table (item, rarity_tier, estimated_value)
   - Algorithm: Determine pull odds (e.g., 60% common, 25% uncommon, 10% rare, 5% chase)
   - API: Market value tracking for buyback pricing
   - UI: Rarity badges and value indicators

#### Business Model
- **Revenue sources:**
  - Blind bag sales (markup on acquisition cost)
  - Buyback spread (buy back at 60-80% of value, resell at 100%)
  - Premium subscriptions (better odds, exclusive bags)
  - Transaction fees on user-to-user digital sales

- **Cost considerations:**
  - Physical inventory storage
  - Shipping costs for redemptions
  - Insurance for high-value items
  - Licensing/IP rights for certain comics

### Intellectual Property Considerations

**Is this patentable?**
Likely **no**, as the core concept exists (boxed.gg for sports cards/TCG, similar models in gaming loot boxes). However:

- **Not a new concept:** Digital pack opening + buyback + physical redemption is established
- **Novelty:** Applying it to **modern comics/blind bags** (not graded slabs) *could* be a market gap, but not IP-protectable
- **Trade secret potential:** Your specific **randomization algorithm**, **buyback pricing formula**, or **rarity distribution** could be kept as trade secrets rather than patents

**Recommendation:**
Instead of pursuing IP protection, focus on:
1. **First-mover advantage** in the comic blind bag space
2. **Superior UX** (better animations, mobile app, social features)
3. **Community building** (collectors, influencers, partnerships with comic shops)
4. **Exclusive partnerships** with publishers or artists for limited drops

**Legal considerations:**
- **Gambling laws:** Ensure compliance (may be considered gambling in some jurisdictions)
- **Consumer protection:** Clearly display odds/rarity percentages (loot box regulations)
- **Terms of service:** Define ownership of digital items, buyback rights, redemption policies
- **Licensing:** May need agreements with publishers for certain comics

### MVP Implementation Timeline

**Phase 1: Basic Digital Blind Bags (2-3 weeks)**
- [ ] Design database schema
- [ ] Create blind bag purchase flow
- [ ] Implement randomization logic with weighted odds
- [ ] Build opening animation/reveal UI
- [ ] Digital wallet page to view owned items

**Phase 2: Buyback System (1-2 weeks)**
- [ ] Buyback pricing algorithm
- [ ] Buyback offer UI and acceptance flow
- [ ] Admin panel to manage buyback inventory

**Phase 3: Physical Redemption (1 week)**
- [ ] Redemption request flow
- [ ] Integration with shipping system
- [ ] Inventory management for physical items

**Phase 4: Gamification & Social (2 weeks)**
- [ ] Rarity badges and collection stats
- [ ] Leaderboards for best pulls
- [ ] Share pulls on social media
- [ ] Trading between users (P2P marketplace)

**Total: 6-8 weeks** after alpha launch of core marketplace

---

## Timeline & Milestones

### REVISED TIMELINE WITH LIVE AUCTIONS IN ALPHA

---

### Week 1-2: Critical Marketplace Features (10-12 days)
**Focus:** Make checkout and order fulfillment work end-to-end

- [ ] Days 1-3: Complete Stripe payment processing
- [ ] Days 4-6: Build order fulfillment dashboard for sellers
- [ ] Days 7-8: Shipping label integration with seller addresses
- [ ] Days 9-10: Basic search functionality
- [ ] Days 11-12: Auction winner determination and email notifications

**Deliverable:** Working marketplace with checkout → fulfillment → shipping

---

### Week 3: Live Auction MVP (8-10 days)
**Focus:** Enable live auction selling with Twitch/YouTube integration

**Why This Is Essential:**
Live auctions drive engagement and differentiate InkStash. With 70% of infrastructure already built (database, schemas, RLS policies), adding this now requires only 8-10 days and significantly increases alpha appeal.

- [ ] Days 1-2: Twitch/YouTube embed player + stream detection
- [ ] Days 3-4: Supabase Realtime subscriptions (live bids, chat, viewer counts)
- [ ] Days 5-6: Stream Manager UI (start stream, add auction items, controls)
- [ ] Days 7-8: Live auction bidding API + bid display component
- [ ] Days 9-10: Chat component with real-time messaging

**Deliverable:** Functional live streaming with real-time auctions and chat

**Technical Approach:**
- Use Twitch/YouTube embed (no custom video infrastructure needed)
- Leverage existing bid system and database schemas
- Supabase Realtime for all real-time features (bids, chat, viewers)
- Adapt existing BidModal component for live auction context

---

### Week 4: Polish & Testing (5-7 days)
**Focus:** Mobile optimization and bug fixes

- [ ] Days 1-3: Mobile responsiveness (listing, checkout, live streams)
- [ ] Days 4-5: Payment method and address management
- [ ] Days 6-7: End-to-end testing and bug fixes

**Deliverable:** Production-ready alpha with live auctions

---

### Week 5: Alpha Launch (5-7 days)
**Focus:** Deploy and onboard first 100 sellers (alpha testers)

- [ ] Days 1-2: Production deployment
- [ ] Days 3-4: Onboard alpha testers (target: 100 sellers)
- [ ] Days 5-7: Monitor metrics, collect feedback, emergency bug fixes

**Deliverable:** Live platform with early users

**Alpha Success Metrics:**
- 100 sellers onboarded
- 20+ listings created
- 5+ live streams conducted
- 10+ successful transactions (regular + live auction)
- 0 critical payment/security bugs

---

### Week 6-8: Post-Alpha Iteration (15-20 days)
**Focus:** Address feedback and add high-priority features

- [ ] Week 6:
  - Batch checkout for multiple items
  - Seller analytics dashboard (basic version)
  - Bug fixes from alpha feedback

- [ ] Week 7:
  - Advanced search filters (category, price, condition)
  - Collections feature (users can create collections)
  - Streamer discovery improvements

- [ ] Week 8:
  - Premium streamer features (custom overlays, analytics)
  - Virtual currency (InkPoints) MVP
  - Referral program for sellers

**Deliverable:** Feature-complete beta ready for 500+ users

---

### Week 9-12: Beta Launch & Scale (20-25 days)
**Focus:** Onboard next 400 sellers (beta testers) and optimize

- [ ] Week 9: Open beta invitations, marketing push
- [ ] Week 10: Performance optimization (database queries, caching)
- [ ] Week 11: Advanced seller tools (bulk listing, CSV import)
- [ ] Week 12: Mobile app (PWA or React Native) initial version

**Deliverable:** Platform ready for public launch

**Beta Success Metrics:**
- 500 total sellers (100 alpha + 400 beta)
- 500+ active listings
- 50+ active streamers
- 200+ transactions
- $20,000+ GMV
- 30%+ user retention

---

### Month 4-5: Public Launch Preparation
**Focus:** Scale infrastructure and add final features

- [ ] Weeks 13-14: Stress testing, load balancing, CDN setup
- [ ] Weeks 15-16: Marketing materials, PR, partnerships
- [ ] Weeks 17-18: Final feature additions (badges, achievements, leaderboards)
- [ ] Weeks 19-20: Soft public launch (remove invite-only requirement)

**Deliverable:** Publicly available platform

---

### Month 6+: Digital Blind Bags (Optional Post-Launch Feature)
**Focus:** Build and launch if validated by user demand during alpha/beta

- [ ] Weeks 21-22: Design blind bag system (database, randomization, rarity)
- [ ] Weeks 23-24: Build digital wallet and opening UI
- [ ] Weeks 25-26: Buyback and physical redemption flows
- [ ] Weeks 27-28: Beta test with limited inventory, collect feedback

**Deliverable:** New revenue stream and engagement feature

**Validation Criteria:**
- Survey alpha/beta users: >60% interested in digital collectibles
- Successful live auction adoption (proves appetite for gamification)
- Legal review completed (gambling compliance)

---

## Updated Timeline Summary

| Phase | Duration | Key Features | Target Users |
|-------|----------|--------------|--------------|
| **Alpha Prep** | 3-4 weeks | Checkout + Fulfillment + Live Auctions | Internal testing |
| **Alpha Launch** | Week 5 | Deploy with 100 sellers | 100 alpha testers |
| **Post-Alpha** | Weeks 6-8 | Iteration + High-priority features | 100 sellers + 200-500 buyers |
| **Beta Launch** | Weeks 9-12 | Scale to 500 sellers + Mobile | 500 beta testers |
| **Public Launch** | Weeks 17-20 | Open platform | General public |
| **Digital Blind Bags** | Weeks 21-28 | New feature (if validated) | Existing user base |

**Total Time to Public Launch: 4-5 months**
**Total Time to Alpha with Live Auctions: 4-5 weeks**

---

### Month 3-4: Digital Blind Bags (Optional)
**Focus:** Build and launch new feature if validated by user demand

- [ ] Weeks 9-10: Design and build blind bag system
- [ ] Weeks 11-12: Buyback and redemption flows
- [ ] Weeks 13-14: Gamification and social features
- [ ] Weeks 15-16: Beta test with limited comic inventory

**Deliverable:** New revenue stream and engagement driver

---

## Success Metrics (Alpha)

**Week 1 Targets:**
- 50+ user sign-ups
- 10+ completed listings
- 5+ successful purchases
- 0 critical bugs or payment failures

**Month 1 Targets:**
- 200+ total users
- 50+ active sellers
- 100+ listings
- 25+ completed transactions
- $1,000+ GMV (Gross Merchandise Value)
- Net Promoter Score (NPS) > 40

**Month 3 Targets (Beta):**
- 1,000+ users
- 200+ sellers
- 500+ listings
- 200+ transactions
- $10,000+ GMV
- Retention rate > 30%
- Live streaming: 10+ active streamers, 500+ stream viewers

---

## Risk Assessment

### Technical Risks
- **Payment processing bugs:** Stripe test mode required before production
- **Shipping label failures:** ShipEngine API errors need graceful handling
- **Database performance:** Optimize queries for auction countdowns and live bidding
- **File upload limits:** Supabase storage quotas may need upgrade

**Mitigation:** Extensive testing, error logging, and fallback mechanisms

### Business Risks
- **Low seller adoption:** Need marketing and seller incentives
- **Chicken-and-egg problem:** No buyers without listings, no sellers without buyers
- **Shipping costs:** High shipping may deter buyers
- **Trust and safety:** Fraud, scams, or fake listings

**Mitigation:** Invite-only alpha, curated seller onboarding, seller verification, escrow for high-value items

### Legal Risks
- **Gambling laws:** If implementing blind bags, consult legal counsel
- **IP/licensing:** Ensure sellers have rights to sell items
- **Consumer protection:** Clear return/refund policies
- **Tax compliance:** Sales tax, 1099 reporting for sellers

**Mitigation:** Terms of service, seller agreements, legal review before launch

---

## Conclusion

InkStash is **70% complete** and well-positioned for an alpha launch within **2-3 weeks** if focused on critical checkout, order fulfillment, and auction completion features. The codebase is well-architected with a solid foundation for scaling.

The **digital blind bags concept** is an exciting post-alpha feature that could differentiate InkStash in the comic collectibles market, but should be validated with user demand during alpha/beta before significant investment.

### Next Steps
1. **Prioritize critical alpha features** (checkout, fulfillment, search)
2. **Launch closed alpha** with 20-50 early adopters
3. **Collect feedback** and iterate rapidly
4. **Expand to beta** with broader user base
5. **Evaluate blind bags feature** based on community interest

---

**Document Owner:** InkStash Product Team
**Questions/Feedback:** [Your contact info]

---

## Appendix: Tech Stack Reference

**Frontend:**
- React 19.1.0 + TypeScript
- Material-UI v7.3.5
- Redux Toolkit v2.8.2
- React Router v7.7.1
- Vite build tool

**Backend:**
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Node.js for serverless functions

**Integrations:**
- Stripe v18.4.0 (payments, tax)
- ShipEngine v1.0.7 (shipping)
- Plaid (bank/identity verification)
- OpenAI v5.11.0 (AI features)
- Resend (email notifications)

**Infrastructure:**
- Supabase Cloud (Postgres + Auth)
- Vercel or Netlify (frontend hosting)
- Supabase Edge Functions (serverless backend)
- Supabase Storage (image/file hosting)

**Total LOC:** 14,321 TypeScript lines across 112 files
**Database Tables:** 30+ with Row-Level Security
