// StatusLine — "X is winning!" / "X won!" / "On the block" line above the
// auction lot card. Extracted from docs/design-system/live_stream/auction.jsx
// AuctionBlock's `<div className="ac-status">` block.
import { avatarGrad, gradStyle } from '../chat/usernameColor';

type Props = {
  currentWinner: string | null;
  sold: boolean;
};

export function StatusLine({ currentWinner, sold }: Props) {
  const avatarSeed = currentWinner || 'block';
  const initial = (currentWinner || '•')[0].toUpperCase();
  return (
    <div className="ls-ac-status">
      <span
        className="ls-ac-status-av"
        style={{ background: gradStyle(avatarGrad(avatarSeed)) }}
      >
        {initial}
      </span>
      {sold ? (
        <>
          <b>{currentWinner}</b>
          <span className="ls-ac-won">won!</span>
        </>
      ) : currentWinner ? (
        <>
          <b>{currentWinner}</b>
          <span className="ls-ac-winning">is winning!</span>
        </>
      ) : (
        <>
          <b>On the block</b>
          <span className="ls-ac-winning">no bids yet</span>
        </>
      )}
    </div>
  );
}
