// SlideToBid — drag-the-pill-right-to-confirm. Thumb ≈ 3/4 of the track; the
// remaining strip is the commit gap; threshold is halfway through it. Ported
// 1:1 from docs/design-system/live_stream/auction.jsx — including the math
// for thumbW / restX / maxX / gapW and the 220ms cubic-bezier spring-back.
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

const THUMB_RATIO = 0.74;

const Chevrons = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="20"
    height="20"
  >
    <path className="ls-chv ls-chv-a" d="m6 17 5-5-5-5" />
    <path className="ls-chv ls-chv-b" d="m13 17 5-5-5-5" />
  </svg>
);

const Chk = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

type Props = {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  busy?: boolean;
};

export function SlideToBid({ label, onConfirm, disabled = false, busy = false }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [draggingX, setDraggingX] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [trackW, setTrackW] = useState(0);

  useEffect(() => {
    if (!trackRef.current) return;
    const el = trackRef.current;
    const update = () => setTrackW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!busy) setConfirmed(false);
  }, [busy]);
  useEffect(() => {
    if (!busy) setDraggingX(null);
  }, [label, busy]);

  const thumbW = Math.max(150, Math.floor(trackW * THUMB_RATIO));
  const restX = 3;
  const maxX = Math.max(restX, trackW - thumbW - 3);
  const gapW = maxX - restX;

  const onDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled || busy) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDraggingX(restX);
    },
    [disabled, busy, restX],
  );

  const onMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (draggingX === null) return;
      const r = trackRef.current && trackRef.current.getBoundingClientRect();
      if (!r) return;
      const off = e.clientX - r.left - thumbW;
      setDraggingX(Math.max(restX, Math.min(maxX, restX + off)));
    },
    [draggingX, thumbW, restX, maxX],
  );

  const onUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (draggingX === null) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (draggingX >= restX + gapW * 0.5) {
        setConfirmed(true);
        setDraggingX(maxX);
        onConfirm();
      } else {
        setDraggingX(null);
      }
    },
    [draggingX, onConfirm, restX, gapW, maxX],
  );

  const thumbX = confirmed ? maxX : draggingX !== null ? draggingX : restX;
  const progress = gapW > 0 ? Math.max(0, Math.min(1, (thumbX - restX) / gapW)) : 0;
  const live = draggingX !== null && !confirmed;

  return (
    <div
      ref={trackRef}
      className={'ls-slide-bid' + (disabled ? ' ls-is-disabled' : '')}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div
        className="ls-slide-bid-fill"
        style={{
          left: thumbX + thumbW - 14,
          width: Math.max(0, maxX - thumbX + 14),
          opacity: progress * 0.7,
          transition: !live ? 'opacity .2s ease-out' : 'none',
        }}
      />
      <div
        className="ls-slide-bid-thumb"
        style={{
          left: thumbX,
          width: thumbW,
          transition: !live ? 'left .22s cubic-bezier(.34,1.4,.64,1)' : 'none',
        }}
      >
        {confirmed ? (
          <>
            <Chk /> <span>Bid placed</span>
          </>
        ) : (
          <>
            <span>{label}</span> <Chevrons />
          </>
        )}
      </div>
    </div>
  );
}
