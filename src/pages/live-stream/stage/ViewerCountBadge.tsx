// ViewerCountBadge — top-right red pill with the live dot + viewer count.
// Ported 1:1 from the .vf-viewers block of stream-view.jsx.

type Props = {
  count: number;
};

export function ViewerCountBadge({ count }: Props) {
  return (
    <div className="ls-vf-viewers">
      <span className="ls-live-dot" />
      {count}
    </div>
  );
}
