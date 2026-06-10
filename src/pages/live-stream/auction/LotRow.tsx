// LotRow — the glass auction lot card body: thumb + title + shipping + price +
// CountdownTimer. Extracted from docs/design-system/live_stream/auction.jsx
// AuctionBlock's `<div className="auction-card">` block.
import { gradStyle, type AvatarGradient } from '../chat/usernameColor';
import { CountdownTimer } from './CountdownTimer';

const money = (cents: number): string =>
  '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');

type Props = {
  title: string;
  ship: string;
  priceCents: number;
  grad: AvatarGradient;
  endsAt: number | null;
  glass: boolean;
  isWinning: boolean;
  sold: boolean;
};

export function LotRow({ title, ship, priceCents, grad, endsAt, glass, isWinning, sold }: Props) {
  const cls = 'ls-auction-card' + (glass ? ' ls-glass' : '') + (isWinning ? ' ls-mine' : '');
  return (
    <div className={cls}>
      <div className="ls-ac-thumb" style={{ background: gradStyle(grad) }} />
      <div className="ls-ac-info">
        <div className="ls-ac-title">{title}</div>
        <div className="ls-ac-ship">{ship}</div>
      </div>
      <div className="ls-ac-right">
        <div className="ls-ac-price">{money(priceCents)}</div>
        <CountdownTimer endsAt={endsAt} sold={sold} />
      </div>
    </div>
  );
}
