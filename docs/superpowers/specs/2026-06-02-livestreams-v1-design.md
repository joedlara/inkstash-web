# Livestreams v1 — Design Spec

**Status:** Draft, awaiting user review
**Date:** 2026-06-02
**Author:** Joe Lara + Claude

## Goal

Build a live-broadcast surface where active sellers can run real-time auctions of comic inventory in front of a live audience. The product north star is "**Whatnot speed with eBay Live's deal range, in a less cluttered UI**." The flagship interaction is the **blitz auction**: 10-second timer, $1 starts, bids extend the clock, items often sell for 50–500× starting bid driven by live FOMO.

This spec covers the **full Livestreams roadmap** (5 phases) but ships them as separate milestones so we get value incrementally rather than launching one giant 3-month surface.

## Out of scope (deferred to future specs)

- Multi-host streams (collabs, takeovers)
- Pre-recorded "stream replays" (VOD)
- Streamer monetization beyond auction-take (subs, tips, paid emotes)
- Vendor-pack openings live (could revisit once vendor streams ramp)
- Mobile-native apps (web only in v1; the layout MUST work on phone browsers)

## Phasing (5 milestones)

Each phase ships independently. A user could stop at Phase 1 and the product is real (just not the money-maker yet). Each phase has its own implementation plan; this doc is the umbrella.

| Phase | What ships | Why this slice |
|---|---|---|
| **L1** | Streamer can go live, viewers can watch, basic text chat | Validates infra + latency before adding money to it |
| **L2** | Live auctions (blitz mode), bid slider, winner flow | The money loop. Hooks into existing Stripe Connect + orders pipeline |
| **L3** | Streamer queue management + hammer auctions for high-value items | Power-user tools so streamers can run long shows |
| **L4** | Follow-gated raffles (the in-stream feature for lurker conversion) | The other promised feature; rides on top of L1+L2 infra |
| **L5** | Discovery (live now grid, follow notifications, recommended streams) | Growth surface — only makes sense after the production loop exists |

The rest of this doc covers all 5 phases in design detail. Implementation plans for L1–L5 will live in `docs/superpowers/plans/` as separate files written one at a time when we're ready to build each phase.

---

## 1. Architecture

### 1.1 Stack additions

| Concern | Service | Why |
|---|---|---|
| **Video ingest + delivery** | **LiveKit Cloud** | WebRTC-based, sub-300ms latency end-to-end. Critical for blitz auctions where every second of lag is a missed bid. Managed (no SFU ops). |
| **Real-time bid + chat fan-out** | **LiveKit Data Channels + Supabase Realtime** (dual-write) | LiveKit data channels deliver bids to viewers in <100ms. Supabase Realtime + tables persist bids so latecomers see the current state when they join mid-auction. |
| **Auction state of record** | **Supabase Postgres** | Source of truth. Bids, auction outcomes, winners, payouts, follows, raffle entries. Every realtime event also writes here. |
| **Payments** | **Existing Stripe Connect destination charges** | Same pipeline as M3 listing buys. Auction win = a PaymentIntent against the winner's saved card, $X goes to seller via Connect, 10% fee to platform. |
| **Chat moderation** | **Postgres triggers + LiveKit data channel ban** | v1: profanity filter + manual ban from streamer's control panel. AI moderation deferred to v2. |

### 1.2 Why LiveKit over Mux / Cloudflare Stream

Latency math: a 10-second auction with a Mux/HLS stream (2–5s glass-to-glass) means a viewer sees the auction with 2–5s of lag and their bid arrives at the server 0.5s later. By the time the server confirms the bid, the auction is already over from the streamer's perspective. Snipers near the source win every time.

LiveKit's WebRTC pipeline is sub-second (~200–300ms), which is the only architecture that makes blitz auctions feel fair. The cost premium (~2×) is worth it because the core product **is** the auction.

### 1.3 Realtime data flow

```
Streamer's bid hammer click
  -> POST /functions/v1/place-bid (Supabase edge fn)
       -> INSERT into auction_bids (Postgres)
       -> publish to LiveKit data channel "auction:{id}:bids"
       -> Supabase Realtime broadcast (Supabase channel for late joiners)

Viewer's screen
  -> Subscribes to LiveKit data channel (primary, <300ms)
  -> Falls back to Supabase Realtime if WebRTC connection drops
  -> Initial state hydrated from REST query of auction + last N bids
```

### 1.4 Authorization layers

| Action | Gate |
|---|---|
| Go live (start a stream) | `seller_status='active'` |
| View any stream | Authed user (no gating in v1; geo-block deferred) |
| Bid | Authed + has Stripe customer + payment method on file |
| Chat | Authed |
| Enter raffle | Authed + following the streamer + currently watching live |
| Moderate chat (ban/timeout) | Stream owner or stream's named moderators |

## 2. Phase L1 — Broadcast + chat (no auctions)

### 2.1 User stories

1. **Active seller**: I can click "Go Live" from my seller dashboard, grant camera/mic permissions, see a preview, and start broadcasting.
2. **Viewer**: I can browse a list of live streams from `/live`, click into one, and see the video + send chat messages in real time.
3. **Streamer**: I can see my live chat next to my preview, ban a chatter, and end the stream.

### 2.2 Schema

```sql
-- Stream sessions (one row per "go live" event)
CREATE TABLE livestreams (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id      uuid NOT NULL REFERENCES users(id),
  title             text NOT NULL,
  description       text,
  cover_image_url   text,
  livekit_room_name text NOT NULL UNIQUE,   -- LiveKit room identifier
  status            text NOT NULL DEFAULT 'preparing'
                      CHECK (status IN ('preparing','live','ended','aborted')),
  started_at        timestamptz,
  ended_at          timestamptz,
  viewer_peak       integer DEFAULT 0,
  total_unique_viewers integer DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX livestreams_status_started_idx ON livestreams (status, started_at DESC);
CREATE INDEX livestreams_host_idx           ON livestreams (host_user_id, started_at DESC);

-- Chat messages (persisted; LiveKit data channels are NOT recorded)
CREATE TABLE livestream_chat (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livestream_id uuid NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id),
  body          text NOT NULL CHECK (length(body) BETWEEN 1 AND 280),
  is_mod_action boolean DEFAULT false,       -- e.g. "Streamer banned X"
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX livestream_chat_stream_time_idx ON livestream_chat (livestream_id, created_at);

-- Bans (per-stream, not platform-wide)
CREATE TABLE livestream_bans (
  livestream_id uuid NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id),
  banned_by     uuid NOT NULL REFERENCES users(id),
  banned_at     timestamptz DEFAULT now(),
  PRIMARY KEY (livestream_id, user_id)
);
```

### 2.3 Edge functions

| Function | Purpose |
|---|---|
| `start-livestream` | Auth'd. Creates `livestreams` row, calls LiveKit API to create the room + ingress, returns the LiveKit publish token. |
| `join-livestream` | Auth'd. Returns the LiveKit subscribe token + initial chat tail (last 50 messages). |
| `end-livestream` | Auth'd (host only). Closes the LiveKit room, sets `status='ended'`, stamps `ended_at`, snapshots viewer counts. |
| `post-chat` | Auth'd. INSERTs `livestream_chat`, publishes to LiveKit data channel `chat`. Refuses if user is banned. |
| `ban-chatter` | Auth'd (host or mod). INSERTs `livestream_bans`, kicks user from LiveKit room. |

### 2.4 Frontend surfaces

- **`/live` (rebuild)**: grid of current live streams. Sort: viewer count desc, then started_at desc. Each tile shows host avatar, title, live badge with viewer count, cover image (or last video frame).
- **`/live/:id`** (viewer page): video full-bleed, chat overlay docked right (or bottom on mobile), follow button, stream metadata pill (host avatar + name + viewer count) top-left, like the Whatnot reference.
- **`/live/start`** (host page): camera preview + title input + "Go Live" CTA. After live: same screen but with chat panel and an "End Stream" button.
- **Seller dashboard**: "Go Live" button added next to the existing seller actions. Routes to `/live/start`.

### 2.5 Latency budget (L1)

| Hop | Target |
|---|---|
| Host video frame → first viewer | < 500 ms |
| Viewer sends chat → all viewers see it | < 300 ms |
| Host clicks "End stream" → stream visibly ends for viewers | < 1 s |

---

## 3. Phase L2 — Blitz auctions

The reason the rest of this product exists.

### 3.1 User stories

1. **Streamer**: I can pick an item from my inventory or the auction queue, set a starting bid, click "Start auction." A 10-second countdown begins and shows on the viewer screen.
2. **Viewer**: I see the auction card at the bottom of my screen with the item, current high bid, who's winning, and a slide-to-bid button. I slide to bid; the high bid updates instantly; the timer extends.
3. **Streamer**: Auction ends. Winner is announced on screen. The winner's saved card is charged automatically. Item ships from the seller's address.

### 3.2 Auction mechanics

- **Blitz mode** (default, used 95% of the time):
  - Streamer sets `starting_bid_cents` (default $1) and `bid_increment_cents` (default $1).
  - Timer starts at `10s`.
  - Each accepted bid:
    - Bumps current high by `bid_increment_cents`.
    - Resets timer to `max(remaining, 5s)`.
  - When timer hits 0 with no new bids: highest bidder wins.
- **Hammer mode** (high-value items, streamer's pick):
  - No automatic timer. Streamer manually clicks "Going once" (5s pause), "Going twice" (3s pause), "Sold."
  - During each pause, any new bid resets the pause timer back to its start.
  - Better UX for $200+ items where suspense > speed.

### 3.3 Schema

```sql
-- Items queued for auction in a stream. Streamer can pre-queue or add live.
CREATE TYPE auction_mode AS ENUM ('blitz','hammer');

CREATE TABLE livestream_auctions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livestream_id       uuid NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,

  -- Source of the item: either an existing listing or a free-form "stream-only" item.
  listing_id          uuid REFERENCES listings(id),       -- listed item
  source_inventory_id uuid REFERENCES user_inventory(id), -- straight from vault
  -- For free-form one-off items not in inventory:
  ad_hoc_title        text,
  ad_hoc_photos       jsonb,
  ad_hoc_description  text,

  mode                auction_mode NOT NULL DEFAULT 'blitz',
  starting_bid_cents  integer NOT NULL CHECK (starting_bid_cents >= 100),
  bid_increment_cents integer NOT NULL DEFAULT 100 CHECK (bid_increment_cents >= 50),

  -- Lifecycle
  status              text NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued','live','sold','passed','aborted')),
  started_at          timestamptz,
  ended_at            timestamptz,
  -- Snapshot of the winning bid at auction close. Denormalized for fast reads.
  winning_bid_id      uuid,
  winning_user_id     uuid REFERENCES users(id),
  winning_amount_cents integer,

  queue_position      integer NOT NULL,  -- streamer's ordering
  created_at          timestamptz DEFAULT now(),

  -- Exactly one source of item content
  CONSTRAINT livestream_auctions_source_chk CHECK (
    (listing_id IS NOT NULL)::int + (source_inventory_id IS NOT NULL)::int +
    (ad_hoc_title IS NOT NULL)::int = 1
  )
);
CREATE INDEX livestream_auctions_stream_status_idx
  ON livestream_auctions (livestream_id, status, queue_position);

-- Individual bids
CREATE TABLE livestream_bids (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id     uuid NOT NULL REFERENCES livestream_auctions(id) ON DELETE CASCADE,
  bidder_user_id uuid NOT NULL REFERENCES users(id),
  amount_cents   integer NOT NULL CHECK (amount_cents >= 100),
  placed_at      timestamptz DEFAULT now(),
  -- Server timestamp the bid was accepted. Diff from placed_at lets us
  -- diagnose latency issues post-hoc.
  accepted_at    timestamptz DEFAULT now()
);
CREATE INDEX livestream_bids_auction_amount_idx
  ON livestream_bids (auction_id, amount_cents DESC, accepted_at);

ALTER TABLE livestream_auctions
  ADD CONSTRAINT livestream_auctions_winning_bid_fk
  FOREIGN KEY (winning_bid_id) REFERENCES livestream_bids(id);

-- Bid placement happens in an atomic SQL function so two simultaneous bids
-- can't both win the same auction. Locks the auction row FOR UPDATE,
-- validates timer state, then inserts the bid and extends the timer.
CREATE OR REPLACE FUNCTION place_blitz_bid(
  p_auction_id uuid,
  p_user_id    uuid,
  p_amount_cents integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_auction record;
  v_now timestamptz := now();
  v_new_bid_id uuid;
  v_new_end_at timestamptz;
BEGIN
  SELECT id, mode, status, starting_bid_cents, bid_increment_cents,
         winning_amount_cents, ended_at
  INTO v_auction FROM livestream_auctions WHERE id = p_auction_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'auction_not_found'; END IF;
  IF v_auction.status != 'live' THEN RAISE EXCEPTION 'not_live'; END IF;
  IF v_auction.ended_at <= v_now THEN RAISE EXCEPTION 'auction_ended'; END IF;
  IF v_auction.mode != 'blitz' THEN RAISE EXCEPTION 'wrong_mode'; END IF;

  IF v_auction.winning_amount_cents IS NOT NULL AND
     p_amount_cents <= v_auction.winning_amount_cents THEN
    RAISE EXCEPTION 'bid_too_low';
  END IF;

  INSERT INTO livestream_bids (auction_id, bidder_user_id, amount_cents)
    VALUES (p_auction_id, p_user_id, p_amount_cents)
    RETURNING id INTO v_new_bid_id;

  -- Extend timer to max(remaining, 5s) since this bid was just accepted.
  v_new_end_at := GREATEST(v_auction.ended_at, v_now + interval '5 seconds');

  UPDATE livestream_auctions
    SET winning_bid_id     = v_new_bid_id,
        winning_user_id    = p_user_id,
        winning_amount_cents = p_amount_cents,
        ended_at           = v_new_end_at
    WHERE id = p_auction_id;

  RETURN jsonb_build_object(
    'bid_id', v_new_bid_id,
    'new_end_at', v_new_end_at,
    'winning_amount_cents', p_amount_cents
  );
END $$;
```

### 3.4 Edge functions

| Function | Purpose |
|---|---|
| `start-auction` | Host only. Sets auction `status='live'`, computes initial `ended_at = now() + 10s`, broadcasts to LiveKit + Realtime. |
| `place-bid` | Auth'd. Calls `place_blitz_bid()` RPC, broadcasts result. Maps SQL exceptions to readable errors (bid_too_low, auction_ended). |
| `end-auction` | Triggered by cron AND by manual host action. Finds auctions where `ended_at <= now() AND status = 'live'`, marks `sold` (or `passed` if no bids), kicks off the order-creation pipeline. |
| `start-hammer-stage` | Host only. Hammer mode: advances "going once/twice/sold" state. |

### 3.5 Order creation on auction win

Reuse the existing M3 pipeline as much as possible. When `end-auction` marks an auction sold:

1. Resolve the seller's Connect ID (already populated for active sellers).
2. Create a Stripe PaymentIntent in `off_session` mode against the winner's saved card:
   - `amount` = `winning_amount_cents + shipping_cost`
   - `customer` = winner's `stripe_customer_id`
   - `payment_method` = winner's default card (last used / set as default)
   - `confirm: true` (off-session capture)
   - `application_fee_amount` = 10% of amount
   - `transfer_data.destination` = seller's Connect ID
   - `metadata.payment_type` = `'auction'`
   - `metadata.auction_id` = auction id
3. If charge succeeds → webhook fires, hands off to a new `open-auction-order` edge fn that creates the order row + payout entry (mirrors `open-listing-order`).
4. If charge fails (card declined, etc.):
   - Auction status → `'sold_charge_failed'` (new state).
   - Stream chat posts a mod message: "Charge failed. Re-running auction in 30s."
   - Auction re-opens to second-highest bidder with their last bid as new winning amount + 60s timer.

### 3.6 Bid UI (viewer side)

From your reference image:

- **Auction card** (bottom of screen): item thumbnail (left), title + condition + shipping (middle), winning bid + countdown timer (right). Yellow leader bar above the card: "@bossmanro89 is winning!"
- **Slide-to-bid bar** (below auction card):
  - Yellow pill: "Bid: $X >>"
  - User drags the pill **right** across the bar to confirm.
  - Resets to left position after each confirm (so next bid is also a slide).
  - On confirm: optimistic UI bumps the bid + flashes the user's avatar in the leader strip.
- **Custom button** (left of slide bar): opens a sheet with two inputs — "Bid now" (immediate single bid) and "Max bid" (proxy: server auto-bids on your behalf up to this cap as others bid, never above). Max bids are a v1.1 add; v1 ships single-bid only.

### 3.7 Anti-fraud / anti-abuse (minimum viable)

- Bid requires a saved payment method (no anonymous bidding).
- Per-user-per-auction bid rate cap: 1 bid per 200ms (UI-side debounce + server-side reject if exceeded).
- If a user's card declines on auction win, they're flagged `auction_holdouts=true` on their user row and can't bid in any auction for 24h.
- Auctions over $500 final bid require explicit confirm modal even when slide is used (failsafe against a slip).

---

## 4. Phase L3 — Queue management + hammer mode

### 4.1 Queue UI for streamers

- **Pre-stream queue**: streamer builds queue from `/live/start` before going live. Can pick from inventory or paste in ad-hoc items. Drag-to-reorder.
- **Live queue panel**: docked to streamer's view during the broadcast. Shows next 5 queued items. "Start next" button advances to the next auction.
- **Live add**: streamer can add items mid-stream (search inventory, drop a photo, set starting price). New items append to end of queue.

### 4.2 Hammer mode UX

- Streamer toggles a per-item "hammer mode" before starting.
- During hammer: no auto-timer; instead the stream shows a `Going once / Going twice / Sold!` status pinned to the auction card.
- Streamer clicks `Going once` → 5s pause (cancelable by any new bid). Each stage same. Final "Sold" closes the auction.
- Better suspense for high-value items where the streamer is doing the showmanship.

### 4.3 Schema additions

```sql
ALTER TABLE livestream_auctions
  ADD COLUMN hammer_stage text CHECK (hammer_stage IN ('going_once','going_twice','sold'));
```

(Mode-specific data; only set when `mode='hammer'`.)

---

## 5. Phase L4 — Follow-gated raffles

The "Drops sidebar entry" reorganization in `raffles-teardown` was prep for this — raffles ship inside streams, not as a standalone destination.

### 5.1 Mechanic

- Streamer clicks **"Start raffle"** in their control panel.
- Modal: pick item (from inventory or ad-hoc), set `entry_count` cap (default 100), set duration (default 90s).
- Raffle pops on viewers' screens with a big **"Enter raffle"** CTA.
- CTA is disabled with a tooltip ("Follow @streamer to enter") for non-followers.
- When viewer follows → CTA enables → tap to enter.
- Timer ticks down. At 0: random entrant wins, name announced on stream, item ships (free for winner; streamer absorbs shipping).

### 5.2 Schema

```sql
CREATE TABLE livestream_raffles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livestream_id uuid NOT NULL REFERENCES livestreams(id) ON DELETE CASCADE,
  -- Item content (same polymorphic shape as auctions)
  listing_id          uuid REFERENCES listings(id),
  source_inventory_id uuid REFERENCES user_inventory(id),
  ad_hoc_title        text,
  ad_hoc_photos       jsonb,

  duration_seconds integer NOT NULL DEFAULT 90 CHECK (duration_seconds BETWEEN 30 AND 600),
  entry_cap        integer,   -- nullable = unlimited entries
  status           text NOT NULL DEFAULT 'live'
                     CHECK (status IN ('live','drawing','complete','aborted')),
  started_at       timestamptz NOT NULL DEFAULT now(),
  ends_at          timestamptz NOT NULL,
  winner_user_id   uuid REFERENCES users(id)
);

CREATE TABLE livestream_raffle_entries (
  raffle_id uuid NOT NULL REFERENCES livestream_raffles(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users(id),
  entered_at timestamptz DEFAULT now(),
  PRIMARY KEY (raffle_id, user_id)
);

-- The follow relationship that gates raffle entry
CREATE TABLE follows (
  follower_id uuid NOT NULL REFERENCES users(id),
  followee_id uuid NOT NULL REFERENCES users(id),
  followed_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id != followee_id)
);
CREATE INDEX follows_followee_idx ON follows (followee_id);
```

### 5.3 Edge functions

- `start-raffle` — host only. Creates raffle row, broadcasts.
- `enter-raffle` — auth'd. Validates: user is following the host AND is actively watching the stream (LiveKit presence check). INSERT entry.
- `draw-raffle-winner` — triggered when `ends_at <= now()` (cron) or when host clicks "Draw now." Random select from entries, set winner, mark `complete`, broadcast.

### 5.4 Why the follow gate

It's the lever you specifically called out: raffles convert lurkers into followers and followers into recurring viewers. Without the gate, raffles are a one-shot freebie. With the gate, they're an acquisition engine for the streamer.

---

## 6. Phase L5 — Discovery + notifications

Growth surface. Doesn't unlock new product value but multiplies the value of L1–L4.

### 6.1 Surfaces

- **Live grid on home page**: top 3 live streams shown above the fold.
- **`/live` rebuild**: full grid, filter pills by category (Comics / Cards / Sealed Wax / Funko).
- **Push notifications** (web push): "Your followed seller @kyunns just went live." Opt-in at follow time.
- **Email digest**: weekly "what you missed" summary (deferred to L5+).

---

## 7. Open questions for user review

1. **Shipping on auction wins.** Buyer pays separately from the bid (collected at end of stream as a single charge per stream)? Or per-auction (each win = ship cost in the charge)? Whatnot bundles shipping per stream which is buyer-friendly. Bundling matters for `place-bid` UX (no shipping shown until later) but adds an `order_groups`-style fan-out for the seller.

2. **Time limit on hammer "going once/twice" pauses.** Right now I spec'd 5s/3s. Whatnot uses ~3s/2s. Faster keeps energy up but punishes slow connections.

3. **Should we record streams to VOD?** Off by default in v1 (compliance + storage cost). But this affects schema (need `recording_url`) and LiveKit egress config. Lock the answer in v1 to avoid migration later.

4. **Per-user spending cap during live auctions.** Should we cap how much one viewer can spend in a single stream (e.g., $500/stream)? Protects buyers from blackout-state overbidding, slows streamer revenue. Whatnot doesn't cap.

5. **What's the streamer's payout cadence for stream auction revenue?** Same daily payout as listings (existing Connect schedule), or hold for 24h post-stream as fraud cushion?

---

## 8. Implementation order (plan files written one at a time)

- **L1 plan** — written next. ~6 tasks, ships first as standalone PR.
- L2 plan — written after L1 merges and we've seen real streams.
- L3 / L4 / L5 plans — written after L2 ships.

This phasing protects context (you don't have to hold 5 phases of detail in your head at once) and lets us course-correct between phases based on real usage.

---

## 9. References

- Whatnot reference screenshots (provided 2026-06-02): post-auction "Won!" state + live slide-to-bid state.
- LiveKit Cloud docs — https://docs.livekit.io
- Existing in-app raffle design intent — `~/.claude memory: project_inkstream_raffles`
- Marketplace v1 spec — `docs/superpowers/specs/2026-05-29-marketplace-v1-design.md` (auctions reuse this Connect + order pipeline)
