// ShopRail — left 320px rail. Ported 1:1 from docs/design-system/live_stream/
// stream-view.jsx's ShopPanel. Reads from mockProducts + mockUpcoming. Search
// is a static placeholder + chips toggle a local "active" state only.
import { useState } from 'react';
import { mockProducts, mockUpcoming } from '../_mock/streamData.mock';
import { gradStyle } from '../chat/usernameColor';
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

const Gift = () => (
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
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13" />
    <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    <path d="M12 8C12 8 11 3 8 3a2 2 0 0 0 0 4z" />
    <path d="M12 8s1-5 4-5a2 2 0 0 1 0 4z" />
  </svg>
);

const CHIPS: ReadonlyArray<readonly [string, string]> = [
  ['all', 'Filter'],
  ['sort', 'Sort'],
  ['auction', 'Auction'],
  ['giveaway', 'Giveaway'],
  ['sold', 'Sold'],
];

export function ShopRail() {
  const [chip, setChip] = useState<string>('all');

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

      <div className="ls-shop-section-label">Products ({mockProducts.length})</div>
      {mockProducts.map((p) => (
        <ShopProductCard
          key={p.id}
          name={p.name}
          priceDollars={p.price}
          bids={p.bids}
          qty={p.qty}
          gradient={p.gradient}
        />
      ))}

      <div className="ls-shop-divider" />

      <div className="ls-shop-section-label">Upcoming Giveaways ({mockUpcoming.length})</div>
      {mockUpcoming.map((u) => (
        <div className="ls-upcoming-row" key={u.id}>
          <div className="ls-product-thumb" style={{ background: gradStyle(u.gradient) }}>
            <span className="ls-product-bookmark">
              <Gift />
            </span>
          </div>
          <div>
            <div className="ls-upcoming-name">{u.name}</div>
            <div className="ls-upcoming-qty">Qty. {u.qty}</div>
          </div>
        </div>
      ))}
    </aside>
  );
}
