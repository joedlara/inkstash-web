// ShopProductCard — single row in the Shop rail. Originally ported 1:1 from
// docs/design-system/live_stream/stream-view.jsx's ShopPanel .product-row.
// Phase 3a: added thumbUrl (real listing photo) + status badge ("Pre-bid" for
// queued items). Gradient still renders as a fallback behind the image.
// Buy button still a no-op — see Phase 3a TODO in ShopRail re: checkout wiring.
import { useState } from 'react';
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
  thumbUrl?: string | null;
  status?: 'queued' | 'live' | 'sold' | 'passed' | 'removed';
  onBuy?: () => void;
};

export function ShopProductCard({
  name,
  priceDollars,
  bids,
  qty,
  gradient,
  thumbUrl,
  status,
  onBuy,
}: Props) {
  // If the image 404s, fall back to the gradient by clearing local state.
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = thumbUrl && !imgFailed;

  return (
    <div className="ls-product-row">
      <div className="ls-product-main">
        <div className="ls-product-thumb" style={{ background: gradStyle(gradient) }}>
          {showImg && (
            <img
              src={thumbUrl}
              alt=""
              className="ls-product-thumb-img"
              onError={() => setImgFailed(true)}
            />
          )}
          {status === 'queued' && <span className="ls-product-badge">Pre-bid</span>}
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
      <button type="button" className="ls-btn-prebid" onClick={onBuy}>
        Buy
      </button>
    </div>
  );
}
