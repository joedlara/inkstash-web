// ShopRail — left 320px rail. Phase 3a-fix: shows the HOST'S marketplace
// inventory (pure buy-now display, no bidding, no per-stream queue). This
// is the same set of items the seller has listed anywhere else on the
// site; the rail just surfaces it inside the stream so viewers can shop
// while they watch. For the auction queue (on-the-block / next-up) see
// livestreamsAPI.listItems — that powers Phase 3b's auction block, NOT
// this rail.
//
// No realtime here: marketplace inventory doesn't change often enough
// during a stream to justify a websocket subscription. Buy goes through
// useCart.addItem and opens the cart drawer (same flow as ItemDetail).
import { useEffect, useState } from 'react';
import { listingsAPI, type SellerInventoryItem } from '../../../api/listings';
import { useCart } from '../../../contexts/CartContext';
import { type AvatarGradient } from '../chat/usernameColor';
import { ShopProductCard } from './ShopProductCard';

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

type Props = { hostUserId: string };

// Optional periodic refresh — 30s is plenty for marketplace inventory,
// which only changes when the seller lists/delists.
const REFRESH_MS = 30_000;

export function ShopRail({ hostUserId }: Props) {
  const [chip, setChip] = useState<string>('all');
  const [items, setItems] = useState<SellerInventoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { addItem, setDrawerOpen } = useCart();

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    const fetchOnce = async () => {
      const rows = await listingsAPI.listSellerInventory(hostUserId);
      if (!cancelled) {
        setItems(rows);
        setLoaded(true);
      }
    };
    void fetchOnce();
    const interval = window.setInterval(fetchOnce, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hostUserId]);

  const handleBuy = async (listingId: string) => {
    try {
      await addItem(listingId);
      setDrawerOpen(true);
    } catch (e) {
      // CartContext logs + rolls back on its side; the most common cause
      // here is "not signed in" — keep the surface quiet so the page
      // doesn't yelp into the console during read-only browsing.
      console.error('[ShopRail] add to cart failed', e);
    }
  };

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
          This seller has no items listed yet.
        </div>
      )}
      {items.map((item) => (
        <ShopProductCard
          key={item.id}
          name={item.title}
          priceDollars={item.buy_now_price ?? 0}
          qty={item.quantity}
          thumbUrl={extractFirstPhoto(item.photos)}
          gradient={gradientForListing(item.id)}
          onBuy={() => handleBuy(item.id)}
        />
      ))}
    </aside>
  );
}
