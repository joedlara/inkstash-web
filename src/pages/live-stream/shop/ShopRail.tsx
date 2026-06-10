// ShopRail — left 320px rail. Phase 3a: reads real livestream_items via
// livestreamsAPI.listItems + subscribes to realtime UPDATE/INSERT/DELETE via
// useLivestreamItemsChannel. A 3s polling fallback covers websocket gaps —
// if no heartbeat in >5s, we refetch. Search bar + chip group are still
// local-only placeholders (will get real wiring in a later phase).
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  livestreamsAPI,
  type LivestreamItemRow,
} from '../../../api/livestreams';
import { type AvatarGradient } from '../chat/usernameColor';
import { ShopProductCard } from './ShopProductCard';
import { useLivestreamItemsChannel, getLastHeartbeat } from './useLivestreamItemsChannel';

const Search = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="16"
    height="16"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const CHIPS: ReadonlyArray<readonly [string, string]> = [
  ['all', 'Filter'],
  ['sort', 'Sort'],
  ['auction', 'Auction'],
  ['giveaway', 'Giveaway'],
  ['sold', 'Sold'],
];

// Deterministic gradient picker — same hash pattern as usernameColor.ts so
// the fallback color for a given listing is stable across renders/sessions.
const GRAD_PALETTE: ReadonlyArray<AvatarGradient> = [
  ['#C2362F', '#5C1116'],
  ['#1F3A6E', '#0E1D3E'],
  ['#5B3DB8', '#2A1A5C'],
  ['#B8893A', '#5C3F0F'],
  ['#3F6F4A', '#1B3024'],
  ['#1A1A1A', '#454545'],
];
function gradientForListing(listingId: string): AvatarGradient {
  let h = 0;
  for (let i = 0; i < listingId.length; i++) h = (h * 31 + listingId.charCodeAt(i)) >>> 0;
  return GRAD_PALETTE[h % GRAD_PALETTE.length];
}

// Listings store `photos` as jsonb. Confirmed shape from ItemDetail.tsx:166
// (`listingData.photos?.[0]?.url`) — an array of `{ url: string }` objects.
// Defensive: tolerate plain string arrays too, in case older rows exist.
function extractFirstPhoto(photos: unknown): string | null {
  if (!photos || !Array.isArray(photos)) return null;
  const first = photos[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'url' in first) {
    const url = (first as { url?: unknown }).url;
    return typeof url === 'string' ? url : null;
  }
  return null;
}

// Price display: live > start > listing's buy-now (already a dollar value
// per the listings schema — buy_now_price is a numeric, not cents).
function priceForItem(item: LivestreamItemRow): number {
  if (item.current_price_cents != null) return item.current_price_cents / 100;
  if (item.start_price_cents != null) return item.start_price_cents / 100;
  if (item.listing?.buy_now_price != null) return item.listing.buy_now_price;
  return 0;
}

type Props = { livestreamId: string };

export function ShopRail({ livestreamId }: Props) {
  const [chip, setChip] = useState<string>('all');
  const [items, setItems] = useState<LivestreamItemRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Hold the refetch as a ref so realtime + polling effect can call it
  // without re-subscribing on every items change.
  const refetchRef = useRef<() => Promise<void>>(async () => {});

  const refetch = useCallback(async () => {
    const rows = await livestreamsAPI.listItems(livestreamId);
    setItems(rows);
    setLoaded(true);
  }, [livestreamId]);

  refetchRef.current = refetch;

  // Initial fetch (and on livestreamId change).
  useEffect(() => {
    setLoaded(false);
    void refetch();
  }, [refetch]);

  // Realtime: UPDATE → patch in place; INSERT/DELETE → refetch.
  useLivestreamItemsChannel(livestreamId, (payload) => {
    if (payload.eventType === 'UPDATE') {
      const next = payload.new;
      if (!next?.id) return;
      setItems((prev) =>
        prev.map((row) => (row.id === next.id ? { ...row, ...next } : row)),
      );
    } else {
      // INSERT or DELETE → refetch (need full listing join + correct ordering).
      void refetchRef.current();
    }
  });

  // 3s polling fallback: if no realtime heartbeat in >5s, refetch.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const last = getLastHeartbeat(livestreamId);
      if (Date.now() - last > 5000) {
        void refetchRef.current();
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [livestreamId]);

  return (
    <aside className="ls-shop-col ls-stream-card">
      <h3 className="ls-shop-title">Shop</h3>
      <div className="ls-shop-search">
        <Search /> <span>Search this show…</span>
      </div>
      <div className="ls-shop-filters">
        {CHIPS.map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={'ls-shop-chip' + (chip === id ? ' ls-active' : '')}
            onClick={() => setChip(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="ls-shop-section-label">Products ({items.length})</div>
      {loaded && items.length === 0 && (
        <div style={{ color: 'var(--muted)', padding: '12px', fontSize: '13px' }}>
          No items yet — the host hasn't queued anything.
        </div>
      )}
      {items.map((item) => (
        <ShopProductCard
          key={item.id}
          name={item.listing?.title ?? 'Untitled item'}
          priceDollars={priceForItem(item)}
          bids={item.bid_count}
          qty={1}
          thumbUrl={extractFirstPhoto(item.listing?.photos)}
          gradient={gradientForListing(item.listing_id)}
          status={item.status}
          onBuy={() => {
            // TODO(phase4): wire to checkout. No clean single-call entry point
            // exists today (ItemDetail uses a multi-step flow). Tracking as
            // follow-up.
            console.log('TODO: wire buy-now for', item.listing_id);
          }}
        />
      ))}
    </aside>
  );
}
