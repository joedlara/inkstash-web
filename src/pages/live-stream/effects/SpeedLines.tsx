// SpeedLines — manga/comic radial focus lines converging on the win.
// Ported 1:1 from docs/design-system/live_stream/auction.jsx. The CSS layer
// .ls-speedlines-layer carries the two repeating-conic gradients (white + crimson)
// and honors prefers-reduced-motion: reduce via `display: none`.

type Props = {
  active: boolean;
};

export function SpeedLines({ active }: Props) {
  if (!active) return null;
  return <div className="ls-speedlines-layer" aria-hidden="true" />;
}
