# InkStash — Comic Niche Pivot Design Spec
**Date:** 2026-05-13
**Branch:** nuke-restructure
**Approach:** Surgical swap (keep auth/Supabase/payments foundation, replace home + add new gamification features)

---

## Overview

InkStash pivots from a general collectibles marketplace to a **comic book-first platform** combining:
- CS:GO/Apex-style blind bag pack opening
- Live streaming with integrated raffles and drops
- Standard comic marketplace (fixed price + auctions)
- Publisher/vendor collaboration drops (Pop Mart style)

Revenue model: marketplace cut on all transactions + house margin on InkStash-operated packs + optional seller subscriptions (post-launch).

Primary audience for public/logged-out home page: **buyers and collectors**. Seller tools remain accessible via the Creator Dashboard.

---

## Feature Priority Order

1. Blind bag / pack ripping (Phase 1)
2. Live streaming & auctions (Phase 2)
3. Standard marketplace (Phase 3 — already partially built)
4. Live raffles + Pop Mart-style drops (Phase 4 — integrates into live streaming)

---

## Section 1: Home Page & Navigation

### Navigation

Replace current generic nav with comic-first tabs:

| Tab | Route | Description |
|-----|-------|-------------|
| Packs | `/packs` | Browse and buy blind bags (default landing for new users) |
| Live | `/live` | Active streams, upcoming breaks |
| Marketplace | `/marketplace` | Fixed-price and auction comic listings |
| Drops | `/drops` | Scheduled publisher drops with live countdowns |
| Raffles | `/raffles` | Active raffle entries tied to live stream events |

### Home Page Layout (Option A — Pack-First Hero)

Sections top to bottom:

1. **Hero** — left side: tagline ("Rip packs. Chase keys. Go live.") + two CTAs ("Open a Pack — $X.XX" and "Watch Live Breaks"). Right side: pack reveal preview showing revealed/locked cards with rarity badges. Live publisher collab badge in top-left if an active collab drop is running.

2. **Drop countdown banner** — full-width bar below hero. Shows next scheduled publisher drop name, partner name, countdown timer (hh/mm/ss), and "Notify Me" CTA.

3. **Open Now** — 4-column pack grid. Each tile shows: cover art, COLLAB/HOT/NEW/SOLD OUT badge, pack name, partner, price, legendary odds. Links to `/packs`.

4. **Live Breaks** — 3-column stream grid. Each tile shows: thumbnail, LIVE badge + viewer count, stream title, host username, active raffle/drop status. Links to `/live`.

5. **Trending** — top 5 most-purchased/watched comics this week with price. Replaces "Featured Collectibles."

### Pages Removed

- `src/pages/BrowseFeatured.tsx` — deleted
- `src/pages/FeaturedArtists.tsx` — deleted
- `src/pages/PopularShows.tsx` — deleted
- Generic home components in `src/components/home/` — replaced

---

## Section 2: Pack Engine

### Data Model (new Supabase tables)

**`packs`**
```
id uuid PK
name text
partner text (e.g. "Marvel", "Image Comics", "InkStash House")
price numeric
item_count int
rarity_tiers jsonb (e.g. {"common": 0.70, "rare": 0.25, "legendary": 0.05})
status text (active | sold_out | upcoming | archived)
cover_image text
drop_at timestamptz (null = available now)
created_at timestamptz
```

**`pack_items`**
```
id uuid PK
pack_id uuid FK -> packs
comic_title text
issue_number text
grade text (e.g. "CGC 9.8", "Raw NM")
condition text
rarity text (common | rare | legendary)
estimated_value numeric
image_url text
quantity int (pool size)
remaining int (decrements on purchase)
```

**`pack_purchases`**
```
id uuid PK
user_id uuid FK -> auth.users
pack_id uuid FK -> packs
items_received jsonb (array of pack_item ids + reveal data)
order_id uuid FK -> orders (for payment linkage)
revealed_at timestamptz
created_at timestamptz
```

### Pack Purchase Flow

1. User clicks "Open a Pack" on pack tile or detail page
2. Stripe checkout initiated (existing payment infrastructure reused)
3. On payment success → Edge Function runs server-side random draw from `pack_items` pool weighted by `rarity_tiers` odds
4. Result written to `pack_purchases.items_received`
5. Client receives result → navigates to `/pack-reveal/:purchaseId`
6. Cinematic reveal plays (see below)
7. Items land in user's **My Stash** collection tab
8. User can list any received item directly to Marketplace from the result screen

### Pack Reveal Animation (cinematic)

Full-screen experience at `/pack-reveal/:purchaseId`:
- Dark background with animated particle field
- Cards appear one at a time with a suspense beat between each (~1.5s)
- Each card flips with a CSS 3D transform
- Rarity determines glow color: common = white, rare = purple (#7c3aed), legendary = gold (#f59e0b)
- Legendary pull triggers screen-wide particle burst + sound cue
- After all cards revealed: summary screen showing all items sorted rarity-high-to-low with "List on Marketplace" and "Add to My Stash" actions

### New Components

- `src/components/packs/PackCard.tsx` — pack tile for grid
- `src/components/packs/PackGrid.tsx` — responsive grid wrapper
- `src/components/packs/PackRevealAnimation.tsx` — cinematic reveal sequence
- `src/components/packs/RarityBadge.tsx` — rarity chip (common/rare/legendary)
- `src/pages/Packs.tsx` — pack browsing page
- `src/pages/PackReveal.tsx` — reveal experience page

---

## Section 3: Live Streaming & Raffles

### Live Stream Flow

Builds on existing `SellerDashboard` stream tab scaffold:

1. Seller schedules a stream (title, start time, description) → appears in `/live` with "Starting Soon" state
2. At stream time: seller goes live via embedded video (existing stream infrastructure)
3. During stream, seller can trigger:
   - **Raffle** — set item, ticket price, max spots; buyers purchase tickets; seller triggers draw at their discretion
   - **Live Drop** — timed item release (Pop Mart style); first-come queue, one per account; appears on home page drop banner

### Raffle Mechanics

- Seller configures: item being raffled, ticket price ($), max spots
- Buyers see raffle widget on stream page; purchase tickets in real time
- When spots fill OR seller manually triggers: winner drawn server-side (Edge Function)
- Winner: item ships to winner
- Non-winners: platform credit or full refund (seller's choice at raffle creation)
- Raffle state is real-time via Supabase Realtime subscriptions

### Live Drop Mechanics (Pop Mart Style)

- Seller or InkStash house schedules a drop: item, quantity, price, drop time
- Drop appears on home page countdown banner and `/drops` page
- At drop time: item goes live, first-come queue (one per account, enforced server-side)
- After queue closes or stock depletes: drop ends, standard order flow continues

### New Components

- `src/components/live/StreamCard.tsx` — stream tile for live grid
- `src/components/live/RaffleWidget.tsx` — raffle entry UI on stream page
- `src/components/live/LiveDropWidget.tsx` — drop queue UI
- `src/pages/Live.tsx` — live discovery page
- `src/pages/Drops.tsx` — upcoming/active drops
- `src/pages/Raffles.tsx` — active raffles

---

## Section 4: My Stash (Collection Tab)

The purchases/collection tab in MyStash is renamed **"My Stash"** (brand play on InkStash). It replaces the generic purchase history view and shows:

- Comics received from pack openings (with rarity badge and pack origin)
- Comics purchased from Marketplace
- Each item has quick actions: "List on Marketplace", "View Details"

This is a rename + enhancement of the existing `PurchaseHistoryTab.tsx`.

---

## Section 5: Standard Marketplace

Already partially built. Scoped changes for the comic niche:

**Category list trimmed to comic-relevant only:**
- Floppies (single issues)
- Trade Paperbacks / OGNs
- Graded Slabs (CGC, CBCS, PGX)
- Variant Covers
- Keys & First Appearances
- Golden Age / Silver Age
- Limited Edition / Signed

**Remove from `ListItem.tsx`:** Funko Pop, Action Figures, Video Games, Other — not relevant to comic niche focus.

**Condition options** remain the same (new/used grades apply to comics too).

---

## Section 6: Database Migrations Needed

1. `create_packs_table.sql` — packs, pack_items, pack_purchases tables
2. `create_drops_table.sql` — scheduled drops table
3. `create_raffles_table.sql` — raffles + raffle_tickets tables

---

## Section 7: What Is NOT Changing

The following existing infrastructure is kept as-is:
- Auth flow (`authManager.ts`, `RouteGuard.tsx`, `AuthModal.tsx`)
- Supabase client and all existing migrations
- Orders table and orders API
- Stripe payment integration
- Seller onboarding and verification flow
- Creator Dashboard (stream, analytics, my store, monetization tabs)
- Shipping infrastructure (ShipEngine Edge Functions)
- Onboarding modal and flow

---

## Implementation Phases

### Phase 1 — Home page + navigation restructure
- New `Home.tsx` (Option A layout)
- New nav with 5 tabs
- Remove deleted pages (`BrowseFeatured`, `FeaturedArtists`, `PopularShows`)
- Add redirects: `/browse` → `/packs`, `/featured` → `/packs` so no existing links 404
- Static pack/stream data (no backend yet — placeholder cards)

### Phase 2 — Pack engine
- Database migrations
- Pack purchase + server-side draw Edge Function
- Cinematic reveal page

### Phase 3 — Marketplace comic scoping
- Trim categories in `ListItem.tsx`
- Rename My Stash tab

### Phase 4 — Live streaming + raffles + drops
- Wire up stream scheduling
- Raffle and drop widgets
- Drop countdown on home page (live data)
