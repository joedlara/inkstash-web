# Handoff: Live Stream — Live Auction, Chat & Win Moments

## Overview
This is the redesigned **viewer-side live-stream surface** for Inkstash (the `/live/:id`
page). It covers the live **auction/bidding flow**, the **chat** (colored usernames,
clickable profiles, @-mentions), **double-tap likes**, a **distraction-free tap mode**,
and a comic-native **"winner" celebration**. The chosen production settings from the
design review are:

- **Bidding card look:** _no glassmorphism_ — the lot reads as image + text directly over
  the stream (glassmorphism remains available but is OFF by default).
- **Win effect:** **Speed Lines** (manga-style radial focus lines). Other effects
  (Comic onomatopoeia burst, Confetti, Panel Snap) are implemented and selectable, but
  Speed Lines is the chosen default.

## About the Design Files
The files in this bundle are **design references created in HTML/CSS + in-browser React
(Babel)** — runnable prototypes that show the intended look and behavior. They are **not
production code to copy directly.** The task is to **recreate these designs in the existing
`inkstash-web` codebase** (React + TypeScript + MUI + Supabase + Stripe), using its
established components and patterns. Most of the corresponding production components
already exist (see "Mapping to the real app" below) — this redesign should be applied to
those files.

Open `Live Stream.html` to interact with the prototype. The auction auto-runs a simulation
(bots bid, the clock soft-closes, lots resolve and advance) so every state is observable.
A **Tweaks** panel (toggle from the toolbar) exposes the look/behavior options.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, motion, and interaction details
are all intended as-is. Recreate pixel-for-pixel using the codebase's libraries. All visual
values come from the existing design tokens (`src/theme/inkstashTokens.ts` / `theme.css`).

---

## Layout (responsive)

The page has **three responsive modes**, already matching the production breakpoints:

| Mode | Viewport | Layout |
|---|---|---|
| **Desktop** | ≥ 1240px | 3-column grid `320px / 1fr / 384px`, gap 18px: **Shop rail · Video card · Chat column**. AppShell (sidebar + top nav) visible. |
| **2-col** | 1024–1239px | Shop rail hidden → `1fr / 360px` (Video + Chat). |
| **Immersive** | ≤ 1024px (tablet/mobile) + fullscreen | Full-bleed video; chat, actions, auction all overlaid on the video. Top nav hidden. |

The **video feed** is a portrait `9 / 16` surface centered in a dark card
(`#08070A`, radius 22px, 1px border). On immersive it fills the viewport.

---

## Screens / Components

### 1. Shop rail (left, 320px)
Title "Shop", search row, filter chips, a "Products (n)" list (each: 68px gradient thumb +
name + `$price · n bids` + `Qty.` + a full-width **Buy** button — note: the button label is
**"Buy"**, not "Pre-bid"), divider, then "Upcoming Giveaways". Maps to the stream's
lots/listings.

### 2. Video stage overlays
- **Host pill** (top-left): avatar, `@username`, verified check, **Follow** button.
- **Viewer count** (top-right): brand-red pill with live dot + count.
- **Giveaway pill** (top-right, immersive only): gift icon + entry count.
- **Right action rail** (vertically centered, right): **More (•••)**, **Share**, **Items**,
  **Buy (wallet)**, and at the **bottom** a **Like heart** with the running like count below it.
- **Winner slot**: the win celebration renders here (see §6).

### 3. Auction block (bottom of video) — the core bidding UI
Sits on the video's bottom gradient scrim. **No card background by default** (just image +
text); glassmorphism is an option. Structure top→bottom:

1. **Status line** — small avatar + `username is winning!` (or `username won!` when sold, or
   `On the block / no bids yet`). Always uses the **actual username** (never "you're winning").
   - `username` color = the user's Twitch-style chat color (see §5).
2. **Lot row**:
   - 60px gradient **thumbnail** (radius 11px, halftone dot texture).
   - **Title** — Big Shoulders 900, UPPERCASE, 19px, ellipsis. _(Condition line was removed.)_
   - **Shipping** — mono 11.5px, e.g. `$4.75 Shipping + Taxes`.
   - **Price** — Big Shoulders 900, 27px, tabular numerals.
   - **Countdown timer** — mono 14px with a glowing dot, **amber `#FFC53D`** normally,
     blinking **red `#FF5B5B`** in the final ≤3s, green `#5BD08A` when `SOLD`. Format `00:08`.
3. **Bid row**:
   - **Custom** pill (frosted glass, clear bg, white border) → opens a small popover of
     higher jump amounts (`+$5 / +$10 / +$25` over current). Maps to placing a specific
     higher bid.
   - **Slide-to-bid** pill — **red 2px outline, clear/glass interior**. The red thumb is
     ~74% of the track; the remaining strip is the commit gap. Drag the thumb past the
     halfway point of the gap to confirm (prevents accidental taps). Label `Bid $N`.
     Two **chevrons** inside the thumb pulse left→right (staggered) to invite the drag.
     On confirm it briefly shows a check + "Bid placed". When you are the current high
     bidder the slider is replaced by a green **"You're the highest bidder"** lock.

### 4. Distraction-free mode (tablet/mobile + fullscreen)
**Single-tap** the center of the stream → chat, bidding, action rail, and top bar **fade out**
(opacity 0, 0.35s) for an unobstructed view. **Single-tap again** to bring them back.
**Double-tap** still **likes** (the two are disambiguated with a ~300ms tap delay).
This toggle is gated to `≤1024px` or fullscreen only.

### 5. Chat
- **Desktop:** right column — two stacked cards: a **Giveaway banner** (entry count, expand
  to "Enter giveaway") above a **Chat card** (Chat/Watching tabs, message list, composer).
- **Immersive:** chat overlaid on the lower video, **capped to ~4 messages** (`max-height:
  28vh`) with a top fade mask, **scrollable** up/down through history.
- **Usernames** are rendered in **deterministic Twitch-style colors** (hash → palette of 10
  bright, legible hues) and are **clickable** → open the **Profile card** (§5a).
- **Message** text supports highlighted `@mention` pills.
- **Composer** (`ChatComposer`): real input + **Send**. Typing `@` opens an **autocomplete**
  dropdown of chat participants (filtered as you type; ↑/↓ to move, Enter/Tab to pick,
  Esc to dismiss). On send, the first valid `@name` becomes a highlighted mention.

#### 5a. Profile card (username click)
Centered modal over a blurred scrim: large avatar, **username** (in its chat color, wraps if
long), and a **row of two side-by-side buttons** — **Follow / Following** (toggle) and
**View profile**. _(No @handle line, no follower/joined stats — intentionally minimal.)_
Click the scrim to dismiss. **Note:** use a unique class name — the global `styles.css`
already defines an unrelated `.profile-card` (Creator Hub teaser) that is `display:flex`;
the prototype renames its card to `.uprofile-card` to avoid the collision.

### 6. Win celebration (replaces a generic confetti)
When a lot resolves to **sold**, a **"Winner 🎉"** banner drops in (glass, centered near the
top) reading `username won for $N!`. If the viewer won, it also shows the Stripe charge state
("Charging your card on file…" → "Card on file charged · $N").

Behind/around the banner, the chosen **Win effect** plays (Tweakable):
- **Speed Lines (DEFAULT):** manga radial focus lines (two layered conic-gradient sunbursts,
  white + crimson) snap in toward the win, then fade. ~1.6s.
- **Comic:** halftone Ben-Day action-burst behind the banner + comic onomatopoeia words
  ("POW!", "SOLD!", "KAPOW!"…) in Big Shoulders italic with ink outlines, popping outward
  and floating up.
- **Confetti:** crimson/gold paper drop (kept for comparison; the "Whatnot-style" default).
- **Panel Snap:** a comic-panel ink frame slams over the stream with a "SOLD!" corner stamp.

All effects honor `prefers-reduced-motion` (hidden).

---

## Interactions & Behavior

| Element | Behavior |
|---|---|
| Slide-to-bid | Pointer drag; commit at half-gap; snaps back if not committed; resets on price change; locks to green "highest bidder" when you lead. |
| Custom pill | Toggles a popover of higher amounts; selecting places that specific bid. |
| Countdown | Ticks every 200ms off `bidding_ends_at`; each new bid extends the clock (anti-snipe, min ~6s). |
| Double-tap video | Like → floating heart drifts up & fades; like count +1 (persisted). |
| Single-tap video (≤1024/fullscreen) | Toggle distraction-free fade of overlays. |
| Username click | Opens profile card. |
| `@` in composer | Mention autocomplete. |
| Win | Banner + selected win effect for ~4.6s, then the next lot starts. |

### Animations (durations / easing)
- Slide thumb spring-back: 220ms `cubic-bezier(.34,1.4,.64,1)`.
- Chevron pulse: 1.25s loop, 0.2s stagger.
- Heart float: 1.05s.
- Winner banner drop: 0.42s.
- Speed lines: 1.6–1.7s ease-out. Comic words: 1.3–2.2s. Panel snap: 1.9s overshoot.
- Overlay fade (clean mode): 0.35s.

---

## Mapping to the real app (`inkstash-web`)

This redesign maps onto existing production code. Wire the prototype's behavior to these:

**Live bidding** — `src/api/livestreams.ts` (`livestreamsAPI`):
- `startBidding(item_id, start_price_cents)` → `start-bidding` edge fn (sets `bidding_ends_at`, ~10s soft close).
- `placeBid(item_id)` → `place-bid` edge fn. **Flat $1 bump.** Returns `{ current_price_cents, current_winner_id, bid_count, bidding_ends_at }`. Returns **402 `no_card_on_file`** when the bidder has no saved card → open the wallet/add-card sheet, then auto-retry (the prototype listens for an `inkstash:wallet-card-ready` event; production uses the wallet drawer's card-saved signal).
- `resolveBidding(item_id)` → `resolve_livestream_bid` RPC (flips `sold`/`passed`).
- `chargeWin(item_id)` → `charge-auction-win` edge fn → **charges the winner's saved card via the seller's Stripe Connect account.** Returns `charged | charge_failed | already_charged | no_winner`.
- Data: `livestream_items { current_price_cents, bid_count, bidding_ends_at, current_winner_id, status }`, joined to `listings { title, buy_now_price, photos }`. Subscribe via Supabase realtime (`postgres_changes` on `livestream_items`) with a 3s polling fallback.

**Existing components to update:**
- `src/pages/LiveStreamView.tsx` — the page shell / responsive modes.
- `src/components/livestreams/CurrentItemBar.tsx` and `MobileAuctionCard.tsx` — the auction block (apply: no-bg default, amber timer, removed condition, removed bid count line, username-only status).
- `src/components/livestreams/SlideToBid.tsx` — apply the 2px red outline / clear interior / pulsing chevrons / removed "Slide to bid" hint text.
- `src/components/livestreams/GiveawayBanner.tsx` — mirror its winner moment for the **auction** winner banner.
- `src/components/livestreams/StreamChatRail.tsx` / `LiveStreamChat.tsx` — colored usernames, profile card, `@`-mention composer.
- `src/components/livestreams/RightRailActions.tsx` — add the bottom **Like** control.
- Stripe: `src/api/stripe.ts` (SetupIntent for add-card, PaymentIntent/Connect for the win charge).

**New backend work required:**
- **Likes:** add a `livestream_likes` table (or a `like_count` column on `livestreams`) + an
  increment endpoint, and surface the count. The product intent is that **like volume feeds a
  stream's "featured" ranking** — extend `livestreamsAPI.listSections` (which currently ranks
  by `viewer_peak` / `total_unique_viewers`) to factor in likes.
- **Profiles/Follow:** wire the profile card + Follow to the `users` table and the follow
  relationship.
- **@-mentions:** persist a mention reference on the chat message (the `post-chat-message`
  edge fn) so the mentioned user can be notified / highlighted.

---

## Design Tokens
From `theme.css` / `src/theme/inkstashTokens.ts` (warm paper + crimson + gold):

- **Colors:** brand `#A1232C`, brand-deep `#7A1A21`, brand-soft `#FCEAEB`, gold `#B8893A`,
  bg `#FAF7F2`, bg-elev `#FFFFFF`, bg-sunken `#F2EDE5`, ink `#16110E`, ink-2 `#3A302A`,
  muted `#8A7F73`, border `#E8DFD2`, success `#2E6F4F`, stage `#08070A`. Status accents on the
  dark stage: amber `#FFC53D`, green `#5BD08A`, danger `#FF5B5B`.
- **Username palette (10):** `#FF6B5E #54B2FF #5BD08A #FFC53D #C99BFF #FF8FBE #5FE3D0 #FFA24B #9AE65C #7FA8FF` (hash username → index).
- **Fonts:** Display = **Big Shoulders Display** (700–900, condensed, UPPERCASE titles/prices);
  UI/body = **Geist** (400–700); Mono = **Geist Mono** (counts, timers, labels).
- **Radii:** sm 6 / md 10 / lg 16 / xl 22 / pill 999. **Shadows:** see `--shadow-*` in theme.css.

## Assets
No raster assets. Thumbnails/avatars are CSS gradients (deterministic per name) standing in for
real listing photos / user avatars — wire those to `listings.photos` and `users.avatar_url`.
Icons are inline SVGs (replace with the codebase's icon set / lucide, which the app already uses).

## Files in this bundle
- `Live Stream.html` — entry point; load order for all scripts/styles.
- `live_stream/stream-view.jsx` — page shell, Shop/Video/Chat, likes, profile card, chat composer, Tweaks, win-effect switch.
- `live_stream/auction.jsx` — `useLiveAuction` engine + `SlideToBid`, `AuctionBlock`, `AuctionWinnerBanner`, `WalletSheet`, and the win effects (`Confetti`, `ComicWin`, `SpeedLines`, `PanelSnap`). Includes a `LiveAuctionAPI` mock whose method names/return shapes mirror the real `livestreamsAPI`.
- `live_stream/stream.css` — all live-stream styling (auction block, slide-to-bid, chat composer, profile card, likes, win effects).
- `live_stream/stream-data.js` — sample host/lots/chat data.
- `theme.css` — design tokens. `styles.css` — shared app-shell + tokens (the surrounding sidebar/top-nav). `tweaks-panel.jsx`, `components.jsx`, `data.js`, `live_breaks/breaks-data.js` — supporting shell/data so the prototype runs.
