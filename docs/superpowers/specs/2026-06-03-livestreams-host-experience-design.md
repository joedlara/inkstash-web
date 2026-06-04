# Livestreams Host Experience Design Spec

**Status:** Draft, executing
**Date:** 2026-06-03
**Author:** Joe Lara + Claude

## Goal

Today the host page is bare-bones: a title input → big red "Start broadcasting" button → full-bleed camera with a single End button. There's no way to set a thumbnail, add a description, queue items, or manage the stream once live. Viewers get a polished WhatNot-style surface; hosts get a 2014-era webcam page.

This spec rebuilds the host experience in three phases:

1. **Phase 1 — Pre-live overhaul**: Real authoring surface before going live.
2. **Phase 2 — Live host view (single-device)**: Floating controls + control drawer the host can toggle without losing the camera.
3. **Phase 3 — Live host view (dual-device studio booth)**: A control panel that runs on a *second* device (laptop, tablet, second phone) so the host can manage items and chat without crowding the broadcast surface.

The dual-device flow is the most important insight: the host's **camera surface** and the host's **control surface** are two different jobs that should each get their own canvas. Real WhatNot streamers run their phone as the broadcaster and their laptop as the studio booth.

## Out of scope

- Auctions (slide-to-bid, blitz/hammer modes, order creation) — L2
- Raffles (follower-gated giveaways) — L4
- Multi-host streams — future
- Recording / VOD — future

## Phase 1 — Pre-live overhaul

The "Go Live" page becomes a real authoring surface.

### Surfaces

The pre-live page renders inside AppShell (existing nav stays visible). Centered single-column layout, max width 540px.

```
┌──────────────────────────────────────┐
│  Go Live                              │
│  Set up your stream, then broadcast.  │
│                                       │
│  ┌─ Live camera preview ──────────┐  │
│  │                                │  │
│  │         [host's face]          │  │
│  │                                │  │
│  │              [⟲ flip camera]   │  │
│  └────────────────────────────────┘  │
│                                       │
│  Title *                              │
│  [____________________________]       │
│                                       │
│  Description (optional)               │
│  [____________________________]       │
│  [____________________________]       │
│                                       │
│  Thumbnail (optional)                 │
│  [📷 Upload image]                    │
│                                       │
│  Schedule for later (optional)        │
│  [📅 Pick date + time]                │
│                                       │
│  Pre-stream queue (optional)          │
│  ┌─────────────────────────────┐     │
│  │ + Add items from inventory  │     │
│  └─────────────────────────────┘     │
│  (Items appear in the shop rail when  │
│   the stream goes live)               │
│                                       │
│  [   🔴 Go Live Now   ]              │
└──────────────────────────────────────┘
```

### Components

| File | What |
|---|---|
| `src/components/livestreams/host/PreLiveCameraPreview.tsx` | NEW. Wraps `getUserMedia` (camera + mic preview only; no LiveKit yet). Includes flip-camera button. Releases tracks on unmount. |
| `src/components/livestreams/host/ThumbnailUploader.tsx` | NEW. File input → Supabase storage upload → returns public URL. Reuses the same `user-uploads` bucket as listings. Drag-to-replace, click-to-remove preview. |
| `src/components/livestreams/host/SchedulePicker.tsx` | NEW. MUI DateTimePicker with "Schedule for later" toggle. When unchecked, the stream goes live immediately. When checked, persists `scheduled_start_at`. |
| `src/components/livestreams/host/PreStreamQueue.tsx` | NEW. "Add items from inventory" button → modal with a multi-select grid of the host's `status='active'` listings. Selected items render as a vertical strip beneath. Saves to new `livestream_items` table when the host clicks Go Live. |
| `src/pages/LiveStreamHost.tsx` (rebuild pre-live phase only) | Compose the new components inside the existing AppShell layout. |

### Schema additions

```sql
-- New migration: 20260604040000_livestream_authoring.sql

-- Already exists: livestreams.cover_image_url, livestreams.description.
-- Verify present; if missing, add. Otherwise no-op.
ALTER TABLE public.livestreams
  ADD COLUMN IF NOT EXISTS scheduled_start_at timestamptz;

CREATE INDEX IF NOT EXISTS livestreams_scheduled_idx
  ON public.livestreams (scheduled_start_at)
  WHERE status = 'preparing';

-- New join table for pre-stream queue + in-stream additions
CREATE TABLE public.livestream_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livestream_id uuid NOT NULL REFERENCES public.livestreams(id) ON DELETE CASCADE,
  listing_id    uuid NOT NULL REFERENCES public.listings(id),
  position      integer NOT NULL,
  status        text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','live','sold','passed','removed')),
  added_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (livestream_id, listing_id)
);
CREATE INDEX livestream_items_stream_pos_idx
  ON public.livestream_items (livestream_id, position);

ALTER TABLE public.livestream_items ENABLE ROW LEVEL SECURITY;

-- Viewers can read the queue for any live stream (used by the shop rail).
CREATE POLICY "Items public to authed users" ON public.livestream_items
  FOR SELECT USING (auth.uid() IS NOT NULL);
```

### Edge function changes

`start-livestream` accepts new optional fields and writes them on the livestreams row + populates `livestream_items` if a `queue` array is provided:

```typescript
interface RequestBody {
  title: string
  description?: string
  cover_image_url?: string
  scheduled_start_at?: string | null  // ISO; null/undef = go live immediately
  queue?: string[]                     // listing IDs in display order
}
```

If `scheduled_start_at` is set and in the future, status is `'preparing'` (a future cron flips it to `'live'` at the scheduled time). Otherwise `'live'` as today.

## Phase 2 — Live host view (single-device, phone-first)

The host on a phone uses one device for both camera and controls. We can't pollute the camera surface, so we use a half-height bottom drawer the host can toggle.

### Layout

- Full-bleed camera with the existing safe-area-padded overlays:
  - **Top-left**: viewer count pill (live count via LiveKit `room.numParticipants`)
  - **Top-right**: End Stream button with confirmation modal
- **Bottom-right floating button stack** (matches viewer's right rail visually but with host-only actions):
  - Flip Camera (existing, moved here)
  - Mic Mute toggle
  - "+ Add Item" (opens picker modal; defers to L2 for auction)
  - "Control" (opens the bottom drawer)
- **Bottom drawer** (toggled): vertical-tabbed sheet pulled up from the bottom, ~60% of screen height. Tabs: `Chat` / `Queue` / `Stats`. Camera stays visible in the top 40% so the host can still see what they're broadcasting.

### Components

| File | What |
|---|---|
| `src/components/livestreams/host/HostFloatingControls.tsx` | NEW. The 4-button floating stack on the right edge of the camera. Same visual treatment as the viewer's `RightRailActions` for consistency. |
| `src/components/livestreams/host/HostControlDrawer.tsx` | NEW. Bottom sheet with `Chat` / `Queue` / `Stats` tabs. Uses MUI `SwipeableDrawer` so it can be swiped open/closed. |
| `src/components/livestreams/host/HostChatPanel.tsx` | NEW. Same `useLivestreamChat` hook but with moderation: each message has a small "..." → "delete" + "ban" actions. |
| `src/components/livestreams/host/HostQueuePanel.tsx` | NEW. Drag-reorder list of queued items (uses `livestream_items` table). "Start auction" button per item (no-op until L2). "+ Add item" opens the inventory picker. |
| `src/components/livestreams/host/HostStatsPanel.tsx` | NEW. Big tiles: viewer count, total joined, stream duration, items sold (always 0 until L2). |
| `src/components/livestreams/host/EndStreamConfirmModal.tsx` | NEW. Two-tap confirmation so a misplaced finger doesn't kill a stream. "End the stream? You'll have to start a new one to broadcast again." |
| `src/pages/LiveStreamHost.tsx` (rebuild live phase) | Compose the floating controls + drawer. |

### Schema additions

None for Phase 2 — uses the `livestream_items` table from Phase 1.

## Phase 3 — Live host view (dual-device studio booth)

The host's laptop / tablet / second phone runs a separate "studio booth" surface that controls the stream without showing the camera (the broadcasting device handles that). Both devices act on the same stream ID via the database.

### Where it lives

- Re-uses `/seller-dashboard` with a new "📡 You're live" mode that activates when the seller has a `status='live'` stream.
- Top of dashboard: big banner with stream title + viewer count + duration + crimson **End Stream** button.
- Main content swaps to the studio booth layout:

```
┌─ Studio booth (md+) ──────────────────────────────────────┐
│                                                            │
│  ┌─ Currently on screen ──┐  ┌─ Queue ──────────────┐    │
│  │ [item cover]            │  │ ≡ 01. Spawn #1       │    │
│  │ Spawn #1 — CGC 9.6      │  │   $50 → Start auction│    │
│  │ Current bid: $50        │  │ ≡ 02. ASM #300       │    │
│  │ [End auction] [Skip]    │  │   $200 → Start       │    │
│  └────────────────────────┘  │ ≡ 03. Wolverine #1   │    │
│                              │   $400 → Start       │    │
│  ┌─ Chat (mod) ─────┐         │ [+ Add item]        │    │
│  │ @kyunns: hi       │         └────────────────────┘    │
│  │ @user: nice card  │                                    │
│  │ ...               │         ┌─ Stats ──────────────┐  │
│  │ [Say something..] │         │ 12 viewers           │  │
│  └───────────────────┘         │ 47 joined            │  │
│                                │ 23m live              │  │
│                                │ 3 items sold          │  │
│                                └──────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Components

| File | What |
|---|---|
| `src/components/livestreams/host/StudioBoothBanner.tsx` | NEW. Top "You're live" banner: title + viewer count + duration + End Stream button. |
| `src/components/livestreams/host/StudioCurrentItem.tsx` | NEW. Big card for whatever's currently on screen (or empty state if no auction running). End/Skip buttons. Defers wiring to L2. |
| `src/components/livestreams/host/StudioQueueColumn.tsx` | NEW. Re-uses `HostQueuePanel` from Phase 2 but in column layout. |
| `src/components/livestreams/host/StudioChatColumn.tsx` | NEW. Re-uses `HostChatPanel` from Phase 2 in column layout. |
| `src/components/livestreams/host/StudioStatsTiles.tsx` | NEW. 4-tile grid of stream metrics. |
| `src/pages/SellerDashboard.tsx` (modify) | When the seller has a `status='live'` stream, switch the dashboard to the studio booth layout. |

### Realtime sync

All Phase 3 surfaces subscribe to the same Supabase Realtime channels the viewer page uses:
- `livestream_chat:{id}` — chat messages
- `livestreams:{id}` — status updates (ended → both devices navigate away)
- `livestream_items:{id}` — queue ordering + status changes

The host's *broadcasting* phone subscribes too, so when the host hits "Start auction" on the studio booth, the broadcasting phone sees the auction strip update too.

## Implementation order

Phase 1 ships first as a standalone PR. Phases 2 and 3 land separately so each is reviewable. After Phase 3, this branch merges and we have the surface area ready for L2 auctions.

## Open questions for the user

1. **Single-device control drawer vs no drawer**: do you want the host on a phone to have a drawer at all, or should single-device just mean "you go live and that's it; for control, use the studio booth on another device"? Drawer is more code; cleaner UX is the dual-device-only stance.

2. **Mic mute**: real mute or just "stop broadcasting audio"? LiveKit can mute the audio track; the simpler version is mute = enabled false on the local audio track.

3. **Scheduled start cron**: do we ship the cron to flip `preparing` → `live` at the scheduled time now, or defer until we have actual scheduled streams in production? Argument for deferring: scheduled streams are an edge case until vendors actually use them. Argument for shipping now: without the cron, the field is a lie.

4. **Item queue persistence**: should queued items show on the shop rail to viewers BEFORE the auction starts on them ("upcoming items")? Or hidden until they're called? Whatnot shows them upcoming with a "Pre-bid" badge — I'd lean that way.
