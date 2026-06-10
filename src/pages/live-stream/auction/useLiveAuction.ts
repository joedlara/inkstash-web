// useLiveAuction — drives the on-block lot from the real livestream_items
// row (Phase 3b). Replaces the Phase 2 mock loop with a Supabase realtime
// subscription + 3s polling fallback for the case where the websocket
// goes stale (we share the same channel + heartbeat hooks as Phase 3a's
// ShopRail via useLivestreamItemsChannel).
//
// The returned shape is the Phase-3 contract: consumers (AuctionBlock,
// LotRow) read flat fields (`currentItem`, `currentPriceCents`, etc.)
// and call `placeBid` / `placeCustomBid` which are real async RPCs.
// `currentItem` is an AuctionDisplayItem — a flat shape that LotRow
// already consumes (title + ship + grad), built from the joined
// listings.title + a deterministic fallback gradient.
//
// 402 (no_card_on_file) handshake: the place-bid edge fn throws
// Error.name === 'no_card_on_file' when the bidder has no saved card.
// We call onNeedCard?.() (parent opens the WalletSheet), remember the
// in-flight bid via pendingBidRef, and window-listen ONCE for
// 'inkstash:wallet-card-ready' (dispatched by WalletSheet on a
// successful SetupIntent confirm) to retry the bid.
//
// Win resolution: when bidding_ends_at passes for a live item, call
// resolveBidding() once (guarded by resolvedRef). When the row flips to
// 'sold' (via realtime), mount the WinnerBanner with the winner's
// username — looked up inline from public.users and cached on a
// username Map so repeated wins by the same user don't re-query. If
// the viewer is the winner, fire chargeWin() once (guarded by
// chargedRef); the UI doesn't wait — already_charged is non-error.
import { useCallback, useEffect, useRef, useState } from 'react';
import { livestreamsAPI, type LivestreamItemRow } from '../../../api/livestreams';
import { supabase } from '../../../api/supabase/supabaseClient';
import {
  useLivestreamItemsChannel,
  getLastHeartbeat,
} from '../shop/useLivestreamItemsChannel';
import { avatarGrad, type AvatarGradient } from '../chat/usernameColor';

type Args = {
  livestreamId: string;
  /** Viewer's user id. null = not signed in; bids will fail at the
   *  edge fn's auth gate, which we surface as a toast. */
  viewerId: string | null;
  /** Called when place-bid 402s with 'no_card_on_file'. The parent
   *  opens the WalletSheet; once a card is added it dispatches
   *  'inkstash:wallet-card-ready' and we retry the pending bid. */
  onNeedCard?: () => void;
};

export type AuctionStatus = 'idle' | 'bidding' | 'sold' | 'passed';

export type WinnerBannerInfo = {
  itemId: string;
  winnerUsername: string;
  finalPriceCents: number;
};

/** Flat shape LotRow consumes. Built from a LivestreamItemRow + a
 *  deterministic gradient fallback per listing id. Phase 3b keeps `ship`
 *  as a static line ("Shipping + taxes at checkout") — the listings
 *  table doesn't store shipping copy, and per-stream shipping math
 *  lands in a later phase. */
export type AuctionDisplayItem = {
  id: string;
  title: string;
  thumbUrl: string | null;
  ship: string;
  grad: AvatarGradient;
};

export type UseLiveAuction = {
  currentItem: AuctionDisplayItem | null;
  status: AuctionStatus;
  currentPriceCents: number;
  currentWinnerId: string | null;
  bidCount: number;
  /** Soft-close deadline in ms epoch (CountdownTimer reads ms). Null while idle. */
  endsAt: number | null;
  placeBid: () => Promise<void>;
  placeCustomBid: (amountCents: number) => Promise<void>;
  winnerBanner: WinnerBannerInfo | null;
  dismissWinnerBanner: () => void;
};

// Polling fallback cadence + staleness threshold for the realtime
// channel. Mirrors Phase 3a's ShopRail behaviour exactly.
const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_STALE_MS = 5000;
const WINNER_BANNER_AUTOHIDE_MS = 6000;

function thumbFromListing(listing: LivestreamItemRow['listing']): string | null {
  if (!listing?.photos) return null;
  const first = listing.photos[0];
  const url = first && typeof first === 'object' ? first.url : null;
  return typeof url === 'string' ? url : null;
}

function displayFromRow(row: LivestreamItemRow): AuctionDisplayItem {
  // grad is deterministic per listing id so the lot card's fallback
  // color is stable across refetches (matches ShopRail's behaviour).
  return {
    id: row.id,
    title: row.listing?.title ?? 'Untitled lot',
    thumbUrl: thumbFromListing(row.listing),
    ship: 'Shipping + taxes at checkout',
    grad: avatarGrad(row.listing_id),
  };
}

function pickLiveRow(rows: LivestreamItemRow[]): LivestreamItemRow | null {
  // Host-side panel sets exactly one item to 'live' at a time. If
  // there's an in-progress 'sold'/'passed' row whose banner we still
  // want to show, that's handled separately via winnerBanner — pickLive
  // only feeds currentItem.
  return rows.find((r) => r.status === 'live') ?? null;
}

function computeStatus(row: LivestreamItemRow | null): AuctionStatus {
  if (!row) return 'idle';
  if (row.status === 'sold') return 'sold';
  if (row.status === 'passed') return 'passed';
  if (row.status !== 'live') return 'idle';
  const endsAt = row.bidding_ends_at ? new Date(row.bidding_ends_at).getTime() : null;
  if (endsAt !== null && endsAt > Date.now()) return 'bidding';
  return 'idle';
}

export function useLiveAuction({ livestreamId, viewerId, onNeedCard }: Args): UseLiveAuction {
  // Full row drives derived fields. We hold the LiveRow + an optional
  // "just resolved" row (the row that flipped to sold/passed last) so
  // WinnerBanner can read final price without racing the next live row.
  const [liveRow, setLiveRow] = useState<LivestreamItemRow | null>(null);
  const [winnerBanner, setWinnerBanner] = useState<WinnerBannerInfo | null>(null);
  const [, setTickN] = useState(0);

  const liveRowRef = useRef<LivestreamItemRow | null>(null);
  liveRowRef.current = liveRow;
  const viewerIdRef = useRef<string | null>(viewerId);
  viewerIdRef.current = viewerId;
  const onNeedCardRef = useRef<typeof onNeedCard>(onNeedCard);
  onNeedCardRef.current = onNeedCard;

  // Per-item-id resolve/charge guards. resolveBidding is idempotent on
  // the RPC side, but firing it twice per tick burns network for no
  // reason. chargeWin is also idempotent (returns 'already_charged')
  // but same reasoning applies.
  const resolvedRef = useRef<Set<string>>(new Set());
  const chargedRef = useRef<Set<string>>(new Set());
  // In-flight bid that 402'd. After 'inkstash:wallet-card-ready' fires
  // we retry the same kind of bid (flat $1 vs custom amount) and clear.
  // Tagged union so a custom amount round-trips correctly through the
  // wallet handshake — Phase 3b stored a boolean here and would have
  // silently re-fired the flat bid even if the original ask was a
  // custom amount.
  type PendingBid = { kind: 'flat' } | { kind: 'custom'; amountCents: number };
  const pendingBidRef = useRef<PendingBid | null>(null);
  // Cache winner username lookups so repeated wins by the same user
  // don't re-hit users table.
  const usernameCacheRef = useRef<Map<string, string>>(new Map());

  // ─── Fetch + patch helpers ─────────────────────────────────────────
  const refetchAll = useCallback(async () => {
    const rows = await livestreamsAPI.listItems(livestreamId);
    const live = pickLiveRow(rows);
    if (live) {
      setLiveRow(live);
    } else {
      // No live row right now — but check if our previous live row
      // just flipped to sold/passed (resolve happens elsewhere in the
      // stack). Promote that row so WinnerBanner can read its final
      // state from the same liveRow source.
      const prev = liveRowRef.current;
      if (prev) {
        const updated = rows.find((r) => r.id === prev.id);
        if (updated && (updated.status === 'sold' || updated.status === 'passed')) {
          setLiveRow(updated);
        } else if (!updated) {
          setLiveRow(null);
        }
      } else {
        setLiveRow(null);
      }
    }
  }, [livestreamId]);

  // Initial fetch + on livestreamId change.
  useEffect(() => {
    void refetchAll();
    // Reset per-stream guard state so switching streams doesn't carry
    // a stale resolve/charge marker.
    resolvedRef.current = new Set();
    chargedRef.current = new Set();
    pendingBidRef.current = null;
    setWinnerBanner(null);
    setLiveRow(null);
  }, [livestreamId, refetchAll]);

  // Realtime UPDATEs patch the local row when the changed row is our
  // current live item; INSERT/DELETE refetches because they can change
  // which row is live. UPDATE on a different row also refetches (host
  // may have just flipped a new item to 'live').
  useLivestreamItemsChannel(livestreamId, (payload) => {
    const eventType = payload.eventType;
    if (eventType === 'INSERT' || eventType === 'DELETE') {
      void refetchAll();
      return;
    }
    const newRow = payload.new;
    const cur = liveRowRef.current;
    if (cur && newRow && (newRow.id as string | undefined) === cur.id) {
      // Patch the changed columns into the existing row (preserves the
      // joined listing data the realtime payload doesn't include).
      setLiveRow((prev) => (prev ? { ...prev, ...(newRow as Partial<LivestreamItemRow>) } : prev));
    } else if (newRow?.status === 'live') {
      // A different row just went live — refetch the whole list to
      // pick up the joined listing data we need for the display.
      void refetchAll();
    } else {
      // Defensive: out-of-band update (e.g. a queued row's position
      // changed). Refetch is cheap enough.
      void refetchAll();
    }
  });

  // Polling fallback + countdown re-render. We re-render every
  // POLL_INTERVAL_MS so CountdownTimer ticks even if the parent
  // doesn't re-render for any other reason, AND if the realtime
  // heartbeat is stale we kick a refetch.
  useEffect(() => {
    const id = setInterval(() => {
      setTickN((n) => n + 1);
      const lastBeat = getLastHeartbeat(livestreamId);
      if (Date.now() - lastBeat > HEARTBEAT_STALE_MS) {
        void refetchAll();
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [livestreamId, refetchAll]);

  // Win resolution: once bidding_ends_at passes for a live row, call
  // resolve_livestream_bid. Server will flip the row, which arrives
  // via realtime and triggers the WinnerBanner side-effect below.
  useEffect(() => {
    const tick = setInterval(() => {
      const cur = liveRowRef.current;
      if (!cur || cur.status !== 'live' || !cur.bidding_ends_at) return;
      if (resolvedRef.current.has(cur.id)) return;
      const endsAt = new Date(cur.bidding_ends_at).getTime();
      if (Date.now() < endsAt) return;
      resolvedRef.current.add(cur.id);
      // Fire-and-forget: server is the source of truth. We don't
      // optimistically flip status — the realtime UPDATE will tell us.
      livestreamsAPI.resolveBidding(cur.id).catch((err) => {
        console.error('[useLiveAuction] resolveBidding failed', err);
        // Re-arm so a retry can happen next tick.
        resolvedRef.current.delete(cur.id);
      });
    }, 500);
    return () => clearInterval(tick);
  }, []);

  // WinnerBanner side effect — fires when the current row flips to
  // 'sold'. Also kicks off chargeWin() if the viewer is the winner.
  useEffect(() => {
    if (!liveRow) return;
    if (liveRow.status !== 'sold') return;
    const finalPriceCents = liveRow.current_price_cents ?? 0;
    const winnerId = liveRow.current_winner_id;
    const itemId = liveRow.id;
    if (!winnerId) {
      // Sold without a winner shouldn't happen but defend against it.
      setWinnerBanner({ itemId, winnerUsername: '', finalPriceCents });
      return;
    }
    // Try cache first; otherwise fetch and set the banner once the
    // username resolves. We render the banner immediately with a
    // placeholder so the visual transition isn't blocked on the lookup.
    const cached = usernameCacheRef.current.get(winnerId);
    if (cached) {
      setWinnerBanner({ itemId, winnerUsername: cached, finalPriceCents });
    } else {
      setWinnerBanner({ itemId, winnerUsername: '…', finalPriceCents });
      (async () => {
        const { data } = await supabase
          .from('users')
          .select('username')
          .eq('id', winnerId)
          .maybeSingle();
        const username = (data as { username?: string | null } | null)?.username ?? 'winner';
        usernameCacheRef.current.set(winnerId, username);
        // Only patch the banner if it's still the one for this item id.
        setWinnerBanner((cur) =>
          cur && cur.itemId === itemId ? { ...cur, winnerUsername: username } : cur,
        );
      })().catch((err) => console.error('[useLiveAuction] winner username fetch failed', err));
    }

    // Auto-dismiss the banner after the prototype's ~6s window.
    const t = setTimeout(() => {
      setWinnerBanner((cur) => (cur && cur.itemId === itemId ? null : cur));
    }, WINNER_BANNER_AUTOHIDE_MS);

    // Viewer-is-winner → charge their card. chargeWin is idempotent so
    // double-fire is harmless; ref-guard avoids the network spend.
    if (viewerIdRef.current && winnerId === viewerIdRef.current && !chargedRef.current.has(itemId)) {
      chargedRef.current.add(itemId);
      livestreamsAPI.chargeWin(itemId).catch((err) => {
        // 'already_charged' is non-error per the API contract; only
        // real failures show up here.
        console.error('[useLiveAuction] chargeWin failed', err);
      });
    }

    return () => clearTimeout(t);
  }, [liveRow]);

  // ─── Bid actions ───────────────────────────────────────────────────
  // Shared bid implementation. `amountCents === undefined` → flat $1
  // bump (server-controlled increment); a number → explicit custom
  // bid. Phase 3b-2 wires the custom path end-to-end (RPC + edge fn +
  // API client). The 402 wallet handshake remembers which kind of bid
  // was in flight so the retry after card-add matches the original ask.
  const placeBidImpl = useCallback(async (amountCents?: number): Promise<void> => {
    const cur = liveRowRef.current;
    if (!cur) return;
    if (computeStatus(cur) !== 'bidding') return;
    const viewer = viewerIdRef.current;

    // Optimistic: bump local row so the UI feels instant. The realtime
    // UPDATE will reconcile (server's amount is source of truth — if
    // someone else bid the same instant our optimistic price may be
    // wrong, and the websocket patch fixes it within ~1-2s).
    const before = cur;
    const optimisticPrice =
      amountCents !== undefined ? amountCents : (cur.current_price_cents ?? 0) + 100;
    setLiveRow({
      ...cur,
      current_price_cents: optimisticPrice,
      current_winner_id: viewer,
      bid_count: cur.bid_count + 1,
    });

    try {
      await livestreamsAPI.placeBid(cur.id, amountCents);
    } catch (err) {
      const name = (err as Error).name;
      if (name === 'no_card_on_file') {
        // Roll back optimistic state, remember which kind of bid was
        // pending, ask the parent to open the wallet sheet. The
        // wallet-card-ready listener below retries the same shape once
        // a card lands.
        setLiveRow(before);
        pendingBidRef.current =
          amountCents !== undefined
            ? { kind: 'custom', amountCents }
            : { kind: 'flat' };
        onNeedCardRef.current?.();
      } else {
        // Reconcile from server and re-throw so AuctionBlock can flash
        // its toast based on err.name (incl. new 'bid_below_minimum').
        void refetchAll();
      }
      throw err;
    }
  }, [refetchAll]);

  const placeBid = useCallback(async () => {
    await placeBidImpl();
  }, [placeBidImpl]);

  // Phase 3b-2: passes the explicit amountCents through to the server,
  // which now validates against the row-locked current_price_cents +
  // $1 floor. A losing-the-race bid (someone else jumped past your
  // target before your request landed) raises 'bid_below_minimum',
  // which AuctionBlock surfaces as a toast.
  const placeCustomBid = useCallback(
    async (amountCents: number) => {
      await placeBidImpl(amountCents);
    },
    [placeBidImpl],
  );

  // Wallet handshake — fires after WalletSheet's confirmSetup() succeeds.
  // We only retry if a bid was actually pending (avoids spurious
  // bid-after-card-add when the user opened the wallet from the rail).
  // Tagged union lets us route flat-vs-custom retries to the same
  // amountCents that 402'd, so the custom popover's $5/$10/$25 choice
  // survives the card-add detour.
  useEffect(() => {
    const onReady = () => {
      const pending = pendingBidRef.current;
      if (!pending) return;
      pendingBidRef.current = null;
      const retry =
        pending.kind === 'flat'
          ? placeBidImpl()
          : placeBidImpl(pending.amountCents);
      void retry.catch(() => {
        // placeBidImpl re-throws; we already rolled back / refetched.
      });
    };
    window.addEventListener('inkstash:wallet-card-ready', onReady);
    return () => window.removeEventListener('inkstash:wallet-card-ready', onReady);
  }, [placeBidImpl]);

  // If the wallet sheet was dismissed WITHOUT adding a card, drop any
  // pending bid so it doesn't auto-fire the next time a card-ready event
  // arrives from an unrelated rail-opened wallet flow. Safe to no-op when
  // pendingBidRef is already null (e.g. when the dismiss followed a
  // successful add — wallet-card-ready cleared the ref during its retry).
  useEffect(() => {
    const onDismiss = () => {
      pendingBidRef.current = null;
    };
    window.addEventListener('inkstash:wallet-sheet-dismissed', onDismiss);
    return () => window.removeEventListener('inkstash:wallet-sheet-dismissed', onDismiss);
  }, []);

  const dismissWinnerBanner = useCallback(() => setWinnerBanner(null), []);

  // ─── Derived flat fields ───────────────────────────────────────────
  const currentItem = liveRow ? displayFromRow(liveRow) : null;
  const status = computeStatus(liveRow);
  const currentPriceCents = liveRow?.current_price_cents ?? 0;
  const currentWinnerId = liveRow?.current_winner_id ?? null;
  const bidCount = liveRow?.bid_count ?? 0;
  const endsAt = liveRow?.bidding_ends_at ? new Date(liveRow.bidding_ends_at).getTime() : null;

  return {
    currentItem,
    status,
    currentPriceCents,
    currentWinnerId,
    bidCount,
    endsAt,
    placeBid,
    placeCustomBid,
    winnerBanner,
    dismissWinnerBanner,
  };
}
