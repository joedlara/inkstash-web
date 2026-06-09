// RIPLINE — shared components (PackVisual, PackCard variants, badges, icons)

const Icon = {
  Home: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12 12 3l9 9" /><path d="M5 10v10h14V10" /></svg>,
  Pack: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M5 8h14" /><path d="M9 3v18" /></svg>,
  Store: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9 5 4h14l2 5" /><path d="M3 9v11h18V9" /><path d="M3 9h18" /></svg>,
  Trade: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3z" /><circle cx="6" cy="4.5" r="1.6" fill="#DC2626" stroke="none" /></svg>,
  Vault: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M12 9V7" /><path d="M15 12h2" /></svg>,
  Raffle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8a2 2 0 0 0 2-2V5h12v1a2 2 0 0 0 2 2v3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2v1H6v-1a2 2 0 0 0-2-2v-3a2 2 0 0 0-2-2V8a2 2 0 0 0 2 0z"/><path d="M11 9v6" strokeDasharray="2 2"/></svg>,
  Trophy: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4h8v6a4 4 0 0 1-8 0V4z"/><path d="M8 6H5v2a3 3 0 0 0 3 3"/><path d="M16 6h3v2a3 3 0 0 1-3 3"/><path d="M10 14h4v3h-4z"/><path d="M9 21h6"/></svg>,
  User: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  Cart: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2 12h12l2-8H6" /></svg>,
  Bell: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>,
  Chevron: ({ dir = 'right' }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dir === 'down' ? 'rotate(90deg)' : dir === 'left' ? 'rotate(180deg)' : 'none' }}><path d="m9 6 6 6-6 6" /></svg>,
  Close: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6 18 18" /><path d="M18 6 6 18" /></svg>,
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>,
  Minus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /></svg>,
  Spark: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 14 10l8 2-8 2-2 8-2-8-8-2 8-2z" /></svg>,
  Filter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M6 12h12" /><path d="M10 18h4" /></svg>,
  Menu: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>,
  SidebarToggle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d="M14 9l-2 3 2 3" /></svg>
};

// Pack visual — CSS pack envelope, takes gradient & seal
function PackVisual({ pack, big = false }) {
  const fontSize = big ? '36px' : pack.cardSize === 'small' ? '18px' : '24px';
  const titleLines = pack.title.split(':');
  const mainTitle = titleLines[titleLines.length - 1].trim();
  const pubName = (window.RIPLINE_DATA.PUBLISHERS.find((p) => p.id === pack.publisher) || {}).name || '';
  return (
    <div className="pack-visual" style={{
      '--pv-bg-a': pack.gradient[0],
      '--pv-bg-b': pack.gradient[1],
      width: '100%', height: '100%'
    }}>
      <div className="pv-pub">{pubName}</div>
      <div className="pv-title" style={{ fontSize }}>{mainTitle}</div>
      <div className="pv-seal">{pack.seal}</div>
      <div className="pv-foot">{pack.footLabel}</div>
    </div>);

}

// PACK CARD — three variants
function PackCard({ pack, variant = 'modern', onClick }) {
  const pub = window.RIPLINE_DATA.PUBLISHERS.find((p) => p.id === pack.publisher);
  const rarityDots = pack.premium ? 6 : pack.price >= 60 ? 5 : pack.price >= 30 ? 4 : 3;

  if (variant === 'editorial') {
    return (
      <div className="pack-card editorial" onClick={onClick}>
        <div className="thumb">
          <div className="pack-visual">
            <PackVisual pack={pack} />
          </div>
        </div>
        <div className="meta">
          <div className="row">
            <span className="pub">{pub.name} · {pack.cards} cards</span>
            <RarityDots filled={rarityDots} />
          </div>
          <div className="title">{pack.title}</div>
          <div className="row" style={{ marginTop: 6 }}>
            <div className="price"><span className="from">FROM</span>${pack.price}</div>
            <button className="btn btn-primary btn-sm">Rip</button>
          </div>
        </div>
      </div>);

  }

  if (variant === 'pulp') {
    return (
      <div className="pack-card pulp" onClick={onClick}>
        {pack.hot && <div className="stripe">Hot</div>}
        <div className="thumb">
          <div className="pack-visual">
            <PackVisual pack={pack} />
          </div>
        </div>
        <div className="meta">
          <div className="row">
            <span className="pub">{pub.name}</span>
            <RarityDots filled={rarityDots} dark />
          </div>
          <div className="title">{pack.title}</div>
          <div className="row" style={{ marginTop: 6 }}>
            <div className="price"><span className="from">FROM</span>${pack.price}</div>
            <button className="btn btn-primary btn-sm">Rip</button>
          </div>
        </div>
      </div>);

  }

  // modern default
  return (
    <div className="pack-card" onClick={onClick}>
      <div className="thumb">
        <div className="pack-visual">
          <PackVisual pack={pack} />
        </div>
      </div>
      <div className="meta">
        <div className="row">
          <span className="pub">{pub.name}</span>
          <RarityDots filled={rarityDots} />
        </div>
        <div className="title">{pack.title}</div>
        <div className="row" style={{ marginTop: 4 }}>
          <div className="price"><span className="from">FROM</span>${pack.price}</div>
          <span className="pub" style={{ fontSize: 11 }}>{pack.cards} cards · {pack.cardCount} left</span>
        </div>
      </div>
    </div>);

}

function RarityDots({ filled = 4, dark = false }) {
  return (
    <div className="rarity-dots">
      {Array.from({ length: 6 }, (_, i) =>
      <span key={i} className={"d " + (i < filled ? 'on' : '')} style={dark && i >= filled ? { background: 'rgba(255,255,255,0.18)' } : null} />
      )}
    </div>);

}

// Inkstash logo — circle with two stacked diamonds in brand color
function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" fill="#16110E" style={{ fill: "rgb(0, 0, 0)" }} />
      <path d="M20 10L25 15L20 20L15 15L20 10Z" fill="var(--brand)" />
      <path d="M20 20L25 25L20 30L15 25L20 20Z" fill="var(--brand)" opacity="0.65" style={{ opacity: "100" }} />
    </svg>);

}

Object.assign(window, { Icon, PackVisual, PackCard, RarityDots, Logo });