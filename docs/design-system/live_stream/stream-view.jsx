// Live Stream page — view. Shop · Video · Chat, + Explore rail.
const { useState: sUseState, useEffect: sUseEffect, useRef: sUseRef } = React;

// ── stream-specific inline icons ──
const SIcon = {
  Star: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.6 6.3L21 9l-4.8 4.3L17.5 21 12 17.3 6.5 21l1.3-7.7L3 9l6.4-.7z" /></svg>,
  Verified: () => <svg viewBox="0 0 24 24" fill="none"><path d="M12 1.6l2.4 1.75 2.95-.02 .9 2.8 2.4 1.72-.93 2.8.93 2.8-2.4 1.72-.9 2.8-2.95-.02L12 22.4l-2.4-1.75-2.95.02-.9-2.8-2.4-1.72.93-2.8-.93-2.8 2.4-1.72.9-2.8 2.95.02z" fill="#2A85FF" /><path d="M8.5 12.2l2.3 2.3 4.7-4.7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Mute: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="m23 9-6 6" /><path d="m17 9 6 6" /></svg>,
  Pack: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M5 8h14" /><path d="M9 3v18" /></svg>,
  List: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>,
  Share: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" /></svg>,
  Buy: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
  Heart: ({ filled }) => <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" /></svg>,
  More: () => <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>,
  Close: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
  Gift: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /><path d="M12 8C12 8 11 3 8 3a2 2 0 0 0 0 4z" /><path d="M12 8s1-5 4-5a2 2 0 0 1 0 4z" /></svg>,
  Bookmark: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  ChevronUp: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6" /></svg>,
  Expand: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>,
  Minimize: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>,
  Back: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
};

// deterministic gradient per username
const AV_PALETTE = [
['#C2362F', '#5C1116'], ['#1F3A6E', '#0E1D3E'], ['#5B3DB8', '#2A1A5C'],
['#B8893A', '#5C3F0F'], ['#3F6F4A', '#1B3024'], ['#1A1A1A', '#454545']];

function avatarGrad(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) >>> 0;
  return AV_PALETTE[h % AV_PALETTE.length];
}
const grad = (g) => `linear-gradient(160deg, ${g[0]} 0%, ${g[1]} 100%)`;

// Twitch-style per-username chat colors (bright + legible on the dark stage).
const NAME_COLORS = ['#FF6B5E', '#54B2FF', '#5BD08A', '#FFC53D', '#C99BFF', '#FF8FBE', '#5FE3D0', '#FFA24B', '#9AE65C', '#7FA8FF', '#F2C0FF', '#7BE0A4'];
function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) >>> 0;
  return h;
}
const userColor = (name) => NAME_COLORS[hashName(name) % NAME_COLORS.length];
const openProfile = (name) => window.dispatchEvent(new CustomEvent('inkstash:open-profile', { detail: { user: name } }));
const chatParticipants = (chat) => [...new Set([window.STREAM_DATA.host.name, ...chat.map((m) => m.user)])];

// Clickable, colored username used across both chat surfaces.
function UserName({ name, className }) {
  return (
    <button
      type="button"
      className={'chat-username' + (className ? ' ' + className : '')}
      style={{ color: userColor(name) }}
      onClick={(e) => { e.stopPropagation(); openProfile(name); }}>
      {name}
    </button>);
}

// Mini profile card — opens from any username click. Maps to a viewer's
// public profile + the follow relationship (users / follows tables).
function ProfileCard() {
  const [user, setUser] = sUseState(null);
  const [following, setFollowing] = sUseState(false);
  sUseEffect(() => {
    const onOpen = (e) => { setUser(e.detail.user); setFollowing(false); };
    window.addEventListener('inkstash:open-profile', onOpen);
    return () => window.removeEventListener('inkstash:open-profile', onOpen);
  }, []);
  if (!user) return null;
  return (
    <div className="profile-scrim" onClick={() => setUser(null)}>
      <div className="uprofile-card" onClick={(e) => e.stopPropagation()}>
        <button className="profile-close" onClick={() => setUser(null)} aria-label="Close"><SIcon.Close /></button>
        <span className="profile-av" style={{ background: grad(avatarGrad(user)) }}>{user[0].toUpperCase()}</span>
        <div className="profile-name" style={{ color: userColor(user) }}>{user}</div>
        <div className="profile-actions">
          <button className={'profile-follow' + (following ? ' following' : '')} onClick={() => setFollowing((f) => !f)}>
            {following ? 'Following' : 'Follow'}
          </button>
          <button className="profile-view">View profile</button>
        </div>
      </div>
    </div>);
}

// Chat composer with @-mention autocomplete. Lets viewers @ anyone who's
// talked in chat (or the host) to reply / get their attention. On send the
// first valid @name becomes a highlighted mention.
function ChatComposer({ participants, onSend, variant }) {
  const [val, setVal] = sUseState('');
  const [sug, setSug] = sUseState(null); // { items, active, start, len }
  const inputRef = sUseRef(null);

  const matchable = (q) => participants.filter((p) => p !== 'you' && p.toLowerCase().startsWith(q)).slice(0, 6);

  function suggestAt(text, caret) {
    const upto = text.slice(0, caret);
    const m = upto.match(/@([\w.]*)$/);
    if (!m) return null;
    const items = matchable(m[1].toLowerCase());
    if (!items.length) return null;
    return { items, active: 0, start: caret - m[0].length, len: m[0].length };
  }
  function onChange(e) {
    const text = e.target.value;
    setVal(text);
    setSug(suggestAt(text, e.target.selectionStart != null ? e.target.selectionStart : text.length));
  }
  function pick(name) {
    if (!sug) return;
    const next = val.slice(0, sug.start) + '@' + name + ' ' + val.slice(sug.start + sug.len);
    setVal(next); setSug(null);
    requestAnimationFrame(() => { if (inputRef.current) inputRef.current.focus(); });
  }
  function insertAt() {}
  function send() {
    const text = val.trim();
    if (!text) return;
    const mm = text.match(/@([\w.]+)/);
    const mention = mm && participants.includes(mm[1]) ? '@' + mm[1] : null;
    onSend({ user: 'you', text, mention });
    setVal(''); setSug(null);
  }
  function onKeyDown(e) {
    if (sug) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSug((s) => ({ ...s, active: (s.active + 1) % s.items.length })); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSug((s) => ({ ...s, active: (s.active - 1 + s.items.length) % s.items.length })); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(sug.items[sug.active]); return; }
      if (e.key === 'Escape') { setSug(null); return; }
    }
    if (e.key === 'Enter') { e.preventDefault(); send(); }
  }
  return (
    <div className={'chat-composer ' + (variant === 'immersive' ? 'cc-immersive' : 'cc-panel')}>
      {sug && (
        <div className="cc-suggest">
          {sug.items.map((p, i) =>
            <button type="button" key={p} className={'cc-sug' + (i === sug.active ? ' active' : '')}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}>
              <span className="cc-sug-av" style={{ background: grad(avatarGrad(p)) }}>{p[0].toUpperCase()}</span>
              <span className="cc-sug-name" style={{ color: userColor(p) }}>{p}</span>
            </button>
          )}
        </div>
      )}
      <div className="cc-row">
        <input ref={inputRef} className="cc-input" value={val} placeholder="Say something…"
          onChange={onChange} onKeyDown={onKeyDown} />
        <button type="button" className="cc-send" onClick={send} aria-label="Send" disabled={!val.trim()}>Send</button>
      </div>
    </div>);
}

// shared chat-text renderer (handles @mention pills)
function renderChatText(m) {
  if (m.mention) {
    const parts = m.text.split(m.mention);
    return <>{parts[0]}<span className="mention">{m.mention}</span>{parts.slice(1).join(m.mention)}</>;
  }
  return m.text;
}

// ── SHOP COLUMN ──
function ShopPanel() {
  const { products, upcoming } = window.STREAM_DATA;
  const [chip, setChip] = sUseState('all');
  const chips = [['all', 'Filter'], ['sort', 'Sort'], ['auction', 'Auction'], ['giveaway', 'Giveaway'], ['sold', 'Sold']];
  return (
    <aside className="shop-col stream-card">
      <h3 className="shop-title">Shop</h3>
      <div className="shop-search"><SIcon.Search /> <span>Search this show…</span></div>
      <div className="shop-filters">
        {chips.map(([id, label]) =>
        <button key={id} className={"shop-chip" + (chip === id ? ' active' : '')} onClick={() => setChip(id)}>{label}</button>
        )}
      </div>

      <div className="shop-section-label">Products ({products.length})</div>
      {products.map((p) =>
      <div className="product-row" key={p.id}>
          <div className="product-main">
            <div className="product-thumb" style={{ background: grad(p.gradient) }}>
              <span className="product-bookmark"><SIcon.Bookmark /></span>
            </div>
            <div className="product-info">
              <div className="product-name">{p.name}</div>
              <div className="product-meta"><span className="price">${p.price}</span><span className="dot">·</span>{p.bids} bids</div>
              <div className="product-qty">Qty. {p.qty}</div>
            </div>
          </div>
          <button className="btn-prebid">Buy</button>
        </div>
      )}

      <div className="shop-divider"></div>

      <div className="shop-section-label">Upcoming Giveaways ({upcoming.length})</div>
      {upcoming.map((u) =>
      <div className="upcoming-row" key={u.id}>
          <div className="product-thumb" style={{ background: grad(u.gradient) }}>
            <span className="product-bookmark"><SIcon.Gift /></span>
          </div>
          <div>
            <div className="upcoming-name">{u.name}</div>
            <div className="upcoming-qty">Qty. {u.qty}</div>
          </div>
        </div>
      )}
    </aside>);

}

// ── VIDEO COLUMN ──
const LIKES_KEY = 'inkstash.stream.likes.thundervault';
const fmtLikes = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n);

function VideoStage({ glass, hasCard, setHasCard, botSpeed, chat, onSend, winFx }) {
  const { host, current, giveaway } = window.STREAM_DATA;
  const immersiveChat = chat;
  const participants = chatParticipants(chat);
  // The immersive chat caps to ~5 messages (max-height + top fade) and stays
  // scrollable so viewers can scroll up/down through history. New sends pin it
  // to the newest message.
  const vfChatRef = sUseRef(null);
  const chatLenRef = sUseRef(chat.length);
  sUseEffect(() => {
    if (chat.length > chatLenRef.current) { const el = vfChatRef.current; if (el) el.scrollTop = el.scrollHeight; }
    chatLenRef.current = chat.length;
  }, [chat.length]);
  const viewerId = 'you';
  const gradOf = (name) => grad(avatarGrad(name));
  const { item, banner, charge, api } = useLiveAuction({ viewerId, hasCard, botSpeed });
  const [walletOpen, setWalletOpen] = sUseState(false);

  // ── Likes — double-tap the stream to like. The running total is what
  //    feeds a stream's featured ranking (mirrors livestreamsAPI.listSections,
  //    which today ranks by viewer_peak / total_unique_viewers). Persisted so
  //    the count keeps accumulating across reloads. ──
  const [likes, setLikes] = sUseState(() => {
    const saved = Number(localStorage.getItem(LIKES_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : 1240;
  });
  const [liked, setLiked] = sUseState(false);
  const [hearts, setHearts] = sUseState([]);
  const feedRef = sUseRef(null);
  const heartId = sUseRef(0);
  const lastTap = sUseRef(0);
  const tapTimer = sUseRef(null);
  // Distraction-free mode (tablet/mobile): single-tap centre fades chat + bidding.
  const [clean, setClean] = sUseState(false);
  sUseEffect(() => {localStorage.setItem(LIKES_KEY, String(likes));}, [likes]);

  function addLike(x, y) {
    setLikes((l) => l + 1);
    setLiked(true);
    const id = ++heartId.current;
    setHearts((hs) => [...hs, { id, x, y, rot: (Math.random() * 2 - 1) * 26, dx: (Math.random() * 2 - 1) * 36 }]);
    setTimeout(() => setHearts((hs) => hs.filter((h) => h.id !== id)), 1050);
  }
  function onFeedTap(e) {
    const r = feedRef.current && feedRef.current.getBoundingClientRect();
    if (!r) return;
    const x = e.clientX - r.left,y = e.clientY - r.top;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Second tap = double-tap → like (cancel the pending single-tap toggle).
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
      lastTap.current = 0;
      addLike(x, y);
    } else {
      lastTap.current = now;
      // Wait to see if a second tap lands; if not, treat as a single tap and
      // toggle distraction-free mode (tablet/mobile + fullscreen only).
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        const immersive = window.matchMedia('(max-width: 1024px)').matches
          || document.querySelector('.app.stream-fullscreen');
        if (immersive) setClean((c) => !c);
      }, 300);
    }
  }
  function likeFromButton() {
    const r = feedRef.current && feedRef.current.getBoundingClientRect();
    addLike(r ? r.width - 52 : 0, r ? r.height * 0.62 : 0);
  }

  return (
    <div className="video-col stream-card">
      <div className="video-stage">
        <div className={'video-feed' + (clean ? ' vf-clean' : '')} ref={feedRef}>
          <div className="video-motif">
            <div className="seal">TV</div>
            <div className="cap">Live feed</div>
          </div>

          <div className="like-catcher" onPointerUp={onFeedTap} title="Double-tap to like"></div>
          <div className="heart-layer">
            {hearts.map((h) =>
            <span key={h.id} className="heart-pop" style={{ left: h.x, top: h.y, '--rot': h.rot + 'deg', '--dx': h.dx + 'px' }}>
                <SIcon.Heart filled={true} />
              </span>
            )}
          </div>

          <AuctionWinnerBanner banner={banner} charge={charge} />
          {winFx === 'Confetti' && <Confetti fire={!!banner} />}
          {winFx === 'Comic' && <ComicWin fire={!!banner} />}
          {winFx === 'Speed Lines' && <SpeedLines fire={!!banner} />}
          {winFx === 'Panel Snap' && <PanelSnap fire={!!banner} />}
          <WalletSheet open={walletOpen} onClose={() => setWalletOpen(false)} onAdded={() => {setHasCard(true);setWalletOpen(false);}} />

          <div className="vf-top">
            <div className="vf-host" style={{ opacity: "1" }}>
              <span className="vf-host-avatar" style={{ background: grad(host.gradient) }}>{host.name[0].toUpperCase()}</span>
              <div>
                <div className="vf-host-name">
                  @{host.name}
                  {host.verified && <span className="vf-verified" title="Certified vendor"><SIcon.Verified /></span>}
                </div>
              </div>
              <button className="vf-follow">Follow</button>
            </div>
            <div className="vf-top-right">
              <div className="vf-viewers"><span className="live-dot"></span>{host.viewers}</div>
              <div className="vf-giveaway">
                <span className="gift"><SIcon.Gift /></span>
                <div>
                  <b>Giveaway</b>
                  <span>{giveaway.entries} entries</span>
                </div>
              </div>
            </div>
          </div>

          <div className="vf-actions">
            <button className="vf-action" aria-label="More"><SIcon.More /></button>
            <button className="vf-action" aria-label="Share"><SIcon.Share /></button>
            <button className="vf-action" aria-label="Items"><SIcon.List /><span className="dot"></span></button>
            <button className="vf-action" aria-label="Buy"><SIcon.Buy /></button>
            <div className="vf-like">
              <button className={'vf-action' + (liked ? ' liked' : '')} aria-label="Like" onClick={likeFromButton}><SIcon.Heart filled={liked} /></button>
              <span className="vf-like-count">{fmtLikes(likes)}</span>
            </div>
          </div>

          <div className="vf-overlay-bottom">
            <div className="vf-chat" ref={vfChatRef}>
              {immersiveChat.map((m, i) =>
              <div className="vf-chat-msg" key={i}>
                  <span className="vf-chat-av" style={{ background: grad(avatarGrad(m.user)) }}>{m.user[0].toUpperCase()}</span>
                  <div className="vf-chat-body">
                    <UserName name={m.user} className="vf-chat-user" />{' '}
                    <span className={"vf-chat-text" + (m.q ? ' q' : '')}>{renderChatText(m)}</span>
                  </div>
                </div>
              )}
            </div>

            <ChatComposer variant="immersive" participants={participants} onSend={onSend} />

            <AuctionBlock
              item={item}
              api={api}
              viewerId={viewerId}
              hasCard={hasCard}
              onNeedCard={() => setWalletOpen(true)}
              glass={glass}
              gradOf={gradOf} />
            
          </div>
        </div>
      </div>
    </div>);

}

// ── CHAT COLUMN ──
function ChatPanel({ chat, onSend }) {
  const { giveaway } = window.STREAM_DATA;
  const [tab, setTab] = sUseState('chat');
  const listRef = sUseRef(null);
  const participants = chatParticipants(chat);
  const chatLenRef = sUseRef(chat.length);
  sUseEffect(() => {
    if (chat.length > chatLenRef.current) { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }
    chatLenRef.current = chat.length;
  }, [chat.length]);

  const renderText = (m) => {
    if (m.mention) {
      const parts = m.text.split(m.mention);
      return <>{parts[0]}<span className="mention">{m.mention}</span>{parts.slice(1).join(m.mention)}</>;
    }
    return m.text;
  };

  return (
    <div className="chat-col">
      <div className="giveaway-banner stream-card">
        <div className="giveaway-top">
          <span className="gift"><SIcon.Gift /></span>
          <span className="label">Giveaway with {giveaway.entries} entries</span>
          <SIcon.ChevronUp />
        </div>
        <div className="giveaway-item">{giveaway.item}</div>
        <button className="btn-enter">Enter giveaway</button>
        <div className="giveaway-terms"><a>Terms &amp; Conditions</a></div>
      </div>

      <section className="chat-card stream-card">
        <div className="chat-tabs">
          <button className={"chat-tab" + (tab === 'chat' ? ' active' : '')} onClick={() => setTab('chat')}>Chat</button>
          <button className={"chat-tab" + (tab === 'watching' ? ' active' : '')} onClick={() => setTab('watching')}>Watching</button>
        </div>

        <div className="chat-list" ref={listRef}>
          {chat.map((m, i) =>
          <div className="chat-msg" key={i}>
              <span className="chat-av" style={{ background: grad(avatarGrad(m.user)) }}>{m.user[0].toUpperCase()}</span>
              <div className="chat-body">
                <UserName name={m.user} className="chat-user" />
                <div className={"chat-text" + (m.q ? ' q' : '')}>{renderText(m)}</div>
              </div>
            </div>
          )}
        </div>

        <ChatComposer variant="panel" participants={participants} onSend={onSend} />
      </section>
    </div>);

}

// ── EXPLORE MORE SHOWS ──
function ExploreRail() {
  const shows = window.BREAKS_DATA && window.BREAKS_DATA.FEATURED || [];
  return (
    <div className="explore">
      <h2>Explore more shows</h2>
      <div className="explore-scroller">
        {shows.map((f) => {
          const seal = f.packLabel.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <a className="ecard" key={f.id} href="Live Stream.html">
              <div className="ecard-host">
                <span className="ecard-av" style={{ background: grad(avatarGrad(f.host)) }}>{f.host[0].toUpperCase()}</span>
                <span className="ecard-name">{f.host}</span>
              </div>
              <div className="ecard-thumb" style={{ background: grad(f.gradient) }}>
                <span className="ecard-live"><span className="live-dot"></span>Live · {f.viewers.toLocaleString()}</span>
                <span className="ecard-seal">{seal}</span>
              </div>
              <div className="ecard-title">{f.title}</div>
              <div className="ecard-tags"><span className="cat">{f.packLabel}</span> · {f.cat}</div>
            </a>);

        })}
      </div>
    </div>);

}

function StreamSideBtn({ icon, label, active, href, right }) {
  return (
    <a className={"side-item " + (active ? 'active' : '')} href={href || undefined} style={{ textDecoration: 'none' }}>
      {icon}
      <span className="label">{label}</span>
      {right ? <span className="right">{right}</span> : null}
      <span className="tip">{label}</span>
    </a>);

}

const STREAM_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "glassmorphism": false,
  "cardOnFile": true,
  "botSpeed": 3,
  "winFx": "Speed Lines"
} /*EDITMODE-END*/;

function StreamView() {
  const [t, setTweak] = useTweaks(STREAM_TWEAK_DEFAULTS);
  const [mobilePanel, setMobilePanel] = sUseState('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = sUseState(false);
  const [mobileNavOpen, setMobileNavOpen] = sUseState(false);
  const [fullscreen, setFullscreen] = sUseState(false);
  const [chat, setChat] = sUseState(() => window.STREAM_DATA.chat.slice());
  const addMessage = (msg) => setChat((c) => [...c, msg]);
  const { PACKS, PUBLISHERS } = window.RIPLINE_DATA;
  const appClass = "app" + (sidebarCollapsed ? ' sidebar-collapsed' : '') + (fullscreen ? ' stream-fullscreen' : '');

  sUseEffect(() => {
    const onKey = (e) => {if (e.key === 'Escape') setFullscreen(false);};
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = fullscreen ? 'hidden' : '';
    return () => {window.removeEventListener('keydown', onKey);document.body.style.overflow = '';};
  }, [fullscreen]);

  return (
    <div className={appClass}>
      <aside className={"sidebar " + (mobileNavOpen ? 'mobile-open' : '')}>
        <div className="logo-cell">
          <a className="brand-mark" href="Ripline.html" style={{ cursor: 'pointer', textDecoration: 'none' }}>
            <Logo size={30} />
            <span className="word">inkstash<span className="period">.</span></span>
          </a>
        </div>

        <button className="collapse-btn-mini" onClick={() => setSidebarCollapsed(false)}>
          <Icon.Chevron />
        </button>

        <nav className="sidebar-inner">
          <StreamSideBtn icon={<Icon.Home />} label="Home" href="Ripline.html" />
          <StreamSideBtn icon={<Icon.Pack />} label="Packs" href="Ripline.html" right={PACKS.length} />
          <StreamSideBtn icon={<Icon.Store />} label="Marketplace" href="Ripline.html" />
          <StreamSideBtn icon={<Icon.Trade />} label="Live Breaks" href="Live Breaks.html" active />
          <StreamSideBtn icon={<Icon.Raffle />} label="Raffles" href="Ripline.html" />
          <StreamSideBtn icon={<Icon.Vault />} label="My Vault" href="Ripline.html" />

          <div className="side-heading">EVENTS</div>
          {PUBLISHERS.map((p) =>
          <button key={p.id} className="side-item">
              <span className="pubswatch" style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, background: `linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1]})` }}></span>
              <span className="label">{p.name}</span>
              <span className="right">{p.count}</span>
              <span className="tip">{p.name}</span>
            </button>
          )}

          <div className="side-promo">
            <div className="halo"></div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', lineHeight: 1, marginBottom: 6 }}>Host a<br />break</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Go live and rip for your audience.</div>
            <button className="btn btn-dark btn-sm" style={{ width: '100%' }}>Apply to host</button>
          </div>
        </nav>

        <div className="sidebar-foot">
          <div style={{ width: 32, height: 32, borderRadius: 999, background: 'linear-gradient(135deg, var(--brand), var(--brand-deep))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>YO</div>
          <div className="uinfo">
            <div className="uname">@you</div>
            <div className="urole">Free tier</div>
          </div>
          <button className="collapse-btn" onClick={() => setSidebarCollapsed(true)} title="Collapse sidebar">
            <Icon.SidebarToggle />
          </button>
        </div>
      </aside>

      {mobileNavOpen && <div className="sidebar-scrim show" onClick={() => setMobileNavOpen(false)}></div>}

      <div className="topnav">
        <button className="hamburger" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
          <Icon.Menu />
        </button>
        <div className="search">
          <span className="ic"><Icon.Search /></span>
          <input placeholder="Search shows, hosts…" />
          <kbd>⌘K</kbd>
        </div>
        <div className="nav-spacer"></div>
        <button className="nav-pill nav-bell"><Icon.Bell /> <span className="badge">3</span></button>
        <button className="nav-pill"><Icon.Cart /> <span className="cart-label">Cart</span></button>
        <button className="btn btn-ghost">Log in</button>
        <button className="btn btn-primary">Sign up</button>
      </div>

      <main className="main">
        <div className="stream-grid" data-mobile={mobilePanel}>
          <ShopPanel />
          <VideoStage
            glass={t.glassmorphism}
            hasCard={t.cardOnFile}
            setHasCard={(v) => setTweak('cardOnFile', v)}
            botSpeed={t.botSpeed}
            winFx={t.winFx}
            chat={chat}
            onSend={addMessage} />
          
          <div className="mobile-tabs">
            <button className={mobilePanel === 'chat' ? 'active' : ''} onClick={() => setMobilePanel('chat')}>Chat</button>
            <button className={mobilePanel === 'shop' ? 'active' : ''} onClick={() => setMobilePanel('shop')}>Shop</button>
          </div>
          <ChatPanel chat={chat} onSend={addMessage} />
        </div>

        <ExploreRail />

        <footer className="footer">
          <div>Inkstash. © 2026 · Independent comic blind packs · All cards are fictional originals</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a>About</a><a>Odds</a><a>Trust</a><a>Help</a>
          </div>
        </footer>
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Bidding look" />
        <TweakToggle label="Glassmorphism card" value={t.glassmorphism} onChange={(v) => setTweak('glassmorphism', v)} />
        <TweakSection label="Auction demo" />
        <TweakToggle label="Card on file" value={t.cardOnFile} onChange={(v) => setTweak('cardOnFile', v)} />
        <TweakSlider label="Bidding pace" value={t.botSpeed} min={1} max={5} step={1} onChange={(v) => setTweak('botSpeed', v)} />
        <TweakSelect label="Win effect" value={t.winFx} options={['Comic', 'Confetti', 'Speed Lines', 'Panel Snap']} onChange={(v) => setTweak('winFx', v)} />
      </TweaksPanel>
      <ProfileCard />
    </div>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<StreamView />);