// TapLayer — invisible hit target over the video. Single-tap toggles
// distraction-free mode (handled upstream), double-tap fires a like at the
// tap coordinates. Ported 1:1 from the .like-catcher block of stream-view.jsx.
import { useRef, type PointerEvent } from 'react';

type Props = {
  onTogglePeel: () => void;
  onDoubleTapLike: (x: number, y: number) => void;
};

export function TapLayer({ onTogglePeel, onDoubleTapLike }: Props) {
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onTap(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // second tap → double-tap → like (cancel pending single-tap toggle).
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
      lastTap.current = 0;
      onDoubleTapLike(x, y);
    } else {
      lastTap.current = now;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        onTogglePeel();
      }, 300);
    }
  }

  return (
    <div
      className="ls-like-catcher"
      onPointerUp={onTap}
      title="Double-tap to like"
    />
  );
}
