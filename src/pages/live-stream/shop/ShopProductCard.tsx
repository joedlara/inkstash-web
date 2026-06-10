// ShopProductCard — single row in the Shop rail. Ported 1:1 from the
// .product-row block of docs/design-system/live_stream/stream-view.jsx's
// ShopPanel. Buy button is a no-op in Phase 2 (Phase 3a rewrites entirely).
import { gradStyle, type AvatarGradient } from '../chat/usernameColor';

const Bookmark = () => (
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
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

type Props = {
  name: string;
  priceDollars: number;
  bids: number;
  qty: number;
  gradient: AvatarGradient;
};

export function ShopProductCard({ name, priceDollars, bids, qty, gradient }: Props) {
  return (
    <div className="ls-product-row">
      <div className="ls-product-main">
        <div className="ls-product-thumb" style={{ background: gradStyle(gradient) }}>
          <span className="ls-product-bookmark">
            <Bookmark />
          </span>
        </div>
        <div className="ls-product-info">
          <div className="ls-product-name">{name}</div>
          <div className="ls-product-meta">
            <span className="ls-price">${priceDollars}</span>
            <span className="ls-dot">·</span>
            {bids} bids
          </div>
          <div className="ls-product-qty">Qty. {qty}</div>
        </div>
      </div>
      <button type="button" className="ls-btn-prebid">
        Buy
      </button>
    </div>
  );
}
