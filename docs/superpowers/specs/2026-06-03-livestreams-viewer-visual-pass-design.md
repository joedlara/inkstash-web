# Livestreams Viewer Visual Pass — Design Spec

**Status:** Draft, ready to implement
**Date:** 2026-06-03
**Author:** Joe Lara + Claude

## Goal

Replace the current functional-but-rough viewer surface (`/live/:id`) with a polished WhatNot-style watch screen. **Mobile-first** — desktop renders the same mobile layout in a centered phone-aspect column with the existing rail treatment.

The auction strip, the slide-to-bid button, and the products list are **not** in this pass — they slot in during L2 (auctions). This pass reserves the visual real estate for them so L2 doesn't have to relayout the page.

## Out of scope

- Auction strip + slide-to-bid (L2)
- Products / queue list on desktop left rail (L2)
- Clip recording feature (L5+)
- Real winner banner (L4 raffles)
- Host page visual overhaul (separate pass — host has different needs)
- Stream-ended state polish (defer until L5 discovery surfaces exist)

## Visual reference

Two reference images informed this design:

1. **Mobile** (`IMG_7033.PNG`) — WhatNot iOS app, vertical phone layout
2. **Desktop** (`Screenshot 2026-06-03 at 12.13.46 PM.png`) — WhatNot web app, three-column layout

## Layout specification

### Mobile / centered phone column

```
┌─────────────────────────────────────────┐
│ [time]  [dynamic island]  [signal/wifi] │ ← iOS status bar (system, video bleeds under)
├─────────────────────────────────────────┤
│                                         │
│  ┌─── HOST PILL ───┐         ┌── × ──┐ │ ← top overlay row
│  │ 👤 @host ⭐ Follow│         │ 👁 104 │ │
│  └──────────────────┘         └────────┘
│                                         │
│                                         │
│           [VIDEO FULL-BLEED]            │
│           camera stays here             │
│           even with keyboard            │
│                                         │
│                                  ┌────┐
│                                  │More│
│                                  ├────┤
│                                  │Shar│  ← right rail
│                                  ├────┤
│                                  │Wall│
│                                  ├────┤
│                                  │Shop│
│                                  └────┘
│                                         │
│  [WINNER BANNER SLOT — stubbed]         │
│                                         │
│  💬 @user message                       │ ← chat overlay
│  💬 @user another message               │   (6 visible, top fade)
│  💬 @user latest                        │
│                                         │
│  [Say something…]              [→]      │ ← composer
└─────────────────────────────────────────┘
```

### Top header

**Left side (host pill cluster)**:
- Host avatar (28px circle)
- @username (bold, white, 14px)
- Star rating placeholder: `⭐ 5.0` (gold text, 12px — placeholder for now; real rating system later)
- Follow button (yellow pill, 11px uppercase) — stub for now, click does nothing in this pass

**Right side**:
- Viewer count badge (brand-red bg, white text, eye icon + count) — **wired up via LiveKit `Room.numParticipants`**
- Close button (`×` in a translucent dark circle)

Both clusters padded by `env(safe-area-inset-top)` so they sit below the dynamic island.

### Right rail (vertical action stack)

Position: absolutely positioned right edge of video, vertically centered.

Each icon button:
- 48px square translucent dark pill with `backdrop-filter: blur(8px)`
- White icon (24px lucide-react icon)
- 10px white label under the icon ("More", "Share", "Wallet", "Shop")
- 12px gap between buttons

Buttons (in this pass):
- **More**: opens a bottom drawer with `<List>` of placeholder rows (Report, Mute notifications, View on web) — all stubs except Close
- **Share**: tries `navigator.share({ url: window.location.href, title: stream.title })` → falls back to `navigator.clipboard.writeText()` + a toast "Link copied"
- **Wallet**: opens a drawer with "Manage payment methods" CTA that navigates to `/settings#payment-methods`
- **Shop**: disabled icon (opacity 0.4) with a tooltip "Coming with auctions"

### Winner banner slot

A reserved `<Box>` between the right rail and the chat list. Empty in this pass. When L4 raffles ship, this is where the "Giveaway Winner 🎉 @user" message renders.

Visual structure today: just an empty `<Box sx={{ minHeight: 0 }}>` that grows when populated. Costs nothing visually right now but means L4 plugs in without layout reshuffling.

### Chat overlay

Already in good shape from previous work. Light tweaks:
- Keep 6-message tail
- Keep pill bubbles + soft top fade
- **Add user avatars to bubbles** (already done in last commit)
- Increase font to 13px (current 12.5px reads too small with smaller bubbles)

### Composer

Already in good shape. No changes needed.

### Desktop variant

Same layout, just constrained to a 480px-wide column centered on a dark page background. The page background outside the column shows the user's full-screen black, matching the immersive feel.

**Future desktop expansion (L2):**
- Add a left rail (260px wide) with the products grid
- Add a right rail (320px wide) with the chat moved out of overlay and into a dedicated panel
- Both rails appear at `md+` breakpoint only

For this pass, desktop just sees the centered mobile column.

## Components to build / modify

| File | What changes |
|---|---|
| `src/pages/LiveStreamView.tsx` | Restructure to host the new overlay layout: host pill, viewer count, close, right rail, winner slot, chat |
| `src/components/livestreams/LiveStreamVideo.tsx` | Expose `numParticipants` via a callback prop so the viewer count badge can render it |
| `src/components/livestreams/HostPill.tsx` | NEW — avatar + username + rating + Follow chip cluster |
| `src/components/livestreams/ViewerCountBadge.tsx` | NEW — eye icon + animated count, brand-red pill |
| `src/components/livestreams/RightRailActions.tsx` | NEW — vertical stack of action buttons + drawer state for More/Wallet |
| `src/components/livestreams/ShareDrawer.tsx` | NEW — drawer that tries navigator.share, falls back to clipboard |
| `src/components/livestreams/MoreDrawer.tsx` | NEW — placeholder list rows |
| `src/components/livestreams/WalletDrawer.tsx` | NEW — "Manage payment methods" CTA |
| `src/components/livestreams/LiveStreamChat.tsx` | Tiny font bump (12.5 → 13px) |

## Implementation order

One tightly-scoped task list:

1. Add `onParticipantCountChange` callback to LiveStreamVideo, subscribe to ParticipantConnected/Disconnected in the Room
2. Build `ViewerCountBadge` + `HostPill`
3. Build `RightRailActions` + the three drawers (Share, More, Wallet)
4. Restructure LiveStreamView to host the new layout
5. Smoke test on phone via ngrok

Each step ships as its own commit.

## Visual tokens (reusing existing)

From `src/theme/inkstashTokens.ts`:
- `inkstashColors.live` — viewer count badge bg
- `inkstashColors.gold` — star rating + Follow chip bg
- `inkstashColors.brand` — accents
- `rgba(0,0,0,0.55)` + `backdropFilter: 'blur(8px)'` — translucent pill bg (already used)

No new tokens needed.
