// live_stream/auction.jsx
// ─────────────────────────────────────────────────────────────────────────────
// LIVE AUCTION — bidding flow for the Inkstash live-stream surface.
//
// This is the prototype mirror of the production pieces in inkstash-web:
//   • SlideToBid            → src/components/livestreams/SlideToBid.tsx
//   • Glass auction card    → src/components/livestreams/CurrentItemBar.tsx
//                             + MobileAuctionCard.tsx
//   • Winner banner         → mirrors GiveawayBanner's winner moment
//   • LiveAuctionAPI (below) → src/api/livestreams.ts  livestreamsAPI.*
//
// The data model + payment flow it simulates is the real one:
//   livestream_items { current_price_cents, bid_count, bidding_ends_at,
//                      current_winner_id, status }   ← Supabase realtime row
//   place-bid          edge fn  → single $1 bump, 402 'no_card_on_file'
//   start-bidding      edge fn  → sets bidding_ends_at (10s soft-close)
//   resolve_livestream_bid RPC  → flips item sold / passed
//   charge-auction-win edge fn  → charges winner's saved card (Stripe Connect)
// ─────────────────────────────────────────────────────────────────────────────

const { useState: aUseState, useEffect: aUseEffect, useRef: aUseRef, useCallback: aUseCallback, useMemo: aUseMemo } = React;

const BID_INCREMENT_CENTS = 100; // place-bid is a flat $1 bump
const SOFT_CLOSE_MS = 9000; // start-bidding's soft-close window
const ANTI_SNIPE_MS = 6000; // a late bid resets the clock to at least this

const money = (cents) => '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');
const grad = (g) => `linear-gradient(160deg, ${g[0]} 0%, ${g[1]} 100%)`;

// ── The lots the host runs this show (mirrors livestream_items joined to
//    listings: title, condition, buy_now_price, photos). `botCeiling` is
//    purely a sim knob — how far the room will chase each lot. ──
const AUCTION_QUEUE = [
{ title: '$2 START / COMICS #19', condition: 'Near Mint', ship: '$4.75 Shipping + Taxes', startCents: 200, ceilingCents: 1400, grad: ['#C2362F', '#5C1116'] },
{ title: 'GRADED GRAIL / SLAB', condition: 'CGC 9.6', ship: '$6.09 Shipping + Taxes', startCents: 500, ceilingCents: 4200, grad: ['#1F3A6E', '#0E1D3E'] },
{ title: 'VAULT BOX / MED #68', condition: 'Sealed', ship: '$5.25 Shipping + Taxes', startCents: 100, ceilingCents: 2600, grad: ['#3F6F4A', '#1B3024'] },
{ title: 'CRIMSON WAVE VARIANT', condition: 'VF/NM', ship: '$4.75 Shipping + Taxes', startCents: 300, ceilingCents: 1900, grad: ['#5B3DB8', '#2A1A5C'] }];


const BOT_BIDDERS = ['alec0203', 'jhirooo', 'fakerice', 'slabhound', 'panelfan', 'gradedgoddess', 'pulpmaster', 'nixatnight'];
const pickBot = (exclude) => {
  const pool = BOT_BIDDERS.filter((b) => b !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
};

// ─────────────────────────────────────────────────────────────────────────────
// LiveAuctionAPI — prototype stand-in for livestreamsAPI. Same method names,
// same return shapes, same error codes the UI branches on. Swap this object for
// the real import and the components keep working unchanged.
// ─────────────────────────────────────────────────────────────────────────────
function makeLiveAuctionAPI(getState, setState, hasCardRef) {
  return {
    // start-bidding: host flips a lot live + arms the soft-close timer.
    startBidding(lot) {
      const endsAt = Date.now() + SOFT_CLOSE_MS;
      setState({
        title: lot.title, condition: lot.condition, ship: lot.ship,
        grad: lot.grad, ceilingCents: lot.ceilingCents,
        priceCents: lot.startCents, bidCount: 0,
        biddingEndsAt: endsAt, currentWinner: null, status: 'bidding'
      });
      return { start_price_cents: lot.startCents, bidding_ends_at: new Date(endsAt).toISOString() };
    },

    // place-bid: viewer-side single $1 bump. Rejects with 402 'no_card_on_file'
    // when the bidder has no saved payment method (real fn pre-gates on this).
    placeBid(bidderId) {
      if (!hasCardRef.current) {
        const e = new Error('no_card_on_file');e.name = 'no_card_on_file';throw e;
      }
      const s = getState();
      if (!s || s.status !== 'bidding') {const e = new Error('not_bidding');e.name = 'not_bidding';throw e;}
      if (Date.now() > s.biddingEndsAt) {const e = new Error('bidding_closed');e.name = 'bidding_closed';throw e;}
      const next = s.priceCents + BID_INCREMENT_CENTS;
      const endsAt = Math.max(s.biddingEndsAt, Date.now() + ANTI_SNIPE_MS);
      setState({ ...s, priceCents: next, bidCount: s.bidCount + 1, currentWinner: bidderId, biddingEndsAt: endsAt });
      return { current_price_cents: next, current_winner_id: bidderId, bid_count: s.bidCount + 1, bidding_ends_at: new Date(endsAt).toISOString() };
    },

    // place-bid with an explicit jump (the "Custom" pill — sets a specific
    // higher amount in one motion instead of a single $1 bump).
    placeCustomBid(bidderId, amountCents) {
      if (!hasCardRef.current) {const e = new Error('no_card_on_file');e.name = 'no_card_on_file';throw e;}
      const s = getState();
      if (!s || s.status !== 'bidding' || Date.now() > s.biddingEndsAt) {const e = new Error('bidding_closed');e.name = 'bidding_closed';throw e;}
      if (amountCents <= s.priceCents) {const e = new Error('bid_too_low');e.name = 'bid_too_low';throw e;}
      const endsAt = Math.max(s.biddingEndsAt, Date.now() + ANTI_SNIPE_MS);
      setState({ ...s, priceCents: amountCents, bidCount: s.bidCount + 1, currentWinner: bidderId, biddingEndsAt: endsAt });
      return { current_price_cents: amountCents, current_winner_id: bidderId, bid_count: s.bidCount + 1 };
    },

    // resolve_livestream_bid RPC: timer expiry flips the lot sold / passed.
    resolveBidding() {
      const s = getState();
      if (!s) return 'no_item';
      const status = s.currentWinner ? 'sold' : 'passed';
      setState({ ...s, status });
      return status;
    },

    // charge-auction-win edge fn: charges the winner's saved card via the
    // seller's Stripe Connect account. Returns the same status union.
    async chargeWin(amountCents) {
      await new Promise((r) => setTimeout(r, 1700)); // network + Stripe round-trip
      return { status: 'charged', payment_intent_id: 'pi_' + Math.random().toString(36).slice(2, 12), amount_cents: amountCents };
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useLiveAuction — drives the on-block lot: countdown, bot bids, resolve, charge.
// ─────────────────────────────────────────────────────────────────────────────
function useLiveAuction({ viewerId, hasCard, botSpeed }) {
  const [item, setItem] = aUseState(null);
  const [banner, setBanner] = aUseState(null); // { winner, amountCents, isYou }
  const [charge, setCharge] = aUseState(null); // null | 'charging' | 'paid'
  const [tickN, setTickN] = aUseState(0); // re-render for the countdown

  const itemRef = aUseRef(null);itemRef.current = item;
  const hasCardRef = aUseRef(hasCard);hasCardRef.current = hasCard;
  const idxRef = aUseRef(0);
  const apiRef = aUseRef(null);
  if (!apiRef.current) apiRef.current = makeLiveAuctionAPI(() => itemRef.current, setItem, hasCardRef);

  // Start the first lot on mount.
  aUseEffect(() => {apiRef.current.startBidding(AUCTION_QUEUE[0]);}, []);

  // Countdown ticker (re-render only; the soft-close timestamp is the source of truth).
  aUseEffect(() => {
    const id = setInterval(() => setTickN((n) => n + 1), 200);
    return () => clearInterval(id);
  }, []);

  // Resolve once when the soft-close timer runs out (resolve_livestream_bid +
  // charge-auction-win). Runs on each tick but no-ops once status != 'bidding'.
  aUseEffect(() => {
    const it = itemRef.current;
    if (!it || it.status !== 'bidding') return;
    if (it.biddingEndsAt - Date.now() > 0) return;
    const status = apiRef.current.resolveBidding();
    if (status === 'sold') {
      const isYou = it.currentWinner === viewerId;
      setBanner({ winner: it.currentWinner, amountCents: it.priceCents, isYou });
      if (isYou) {
        setCharge('charging');
        apiRef.current.chargeWin(it.priceCents).then((res) => {
          if (res.status === 'charged') setCharge('paid');
        });
      }
    }
  }, [tickN, viewerId]);

  // After a lot resolves, hold the winner moment, then advance to the next lot.
  aUseEffect(() => {
    if (!item || item.status !== 'sold' && item.status !== 'passed') return;
    const t = setTimeout(() => {
      setBanner(null);setCharge(null);
      idxRef.current = (idxRef.current + 1) % AUCTION_QUEUE.length;
      apiRef.current.startBidding(AUCTION_QUEUE[idxRef.current]);
    }, 4600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item && item.status]);

  // Bot bidders chase each lot up to its ceiling, resetting the clock (anti-snipe).
  aUseEffect(() => {
    const it = item;
    if (!it || it.status !== 'bidding') return;
    if (it.priceCents + BID_INCREMENT_CENTS > it.ceilingCents) return; // room tapped out → let it close
    const base = 2600 - botSpeed * 320; // higher speed → shorter gap
    const delay = base + Math.random() * 1400 + (it.currentWinner === viewerId ? 900 : 0); // give the human a beat
    const id = setTimeout(() => {
      const cur = itemRef.current;
      if (!cur || cur.status !== 'bidding' || Date.now() > cur.biddingEndsAt) return;
      const next = cur.priceCents + BID_INCREMENT_CENTS;
      const endsAt = Math.max(cur.biddingEndsAt, Date.now() + ANTI_SNIPE_MS);
      setItem({ ...cur, priceCents: next, bidCount: cur.bidCount + 1, currentWinner: pickBot(cur.currentWinner), biddingEndsAt: endsAt });
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item && item.priceCents, item && item.currentWinner, item && item.status, botSpeed, viewerId]);

  return { item, banner, charge, api: apiRef.current };
}

// ─────────────────────────────────────────────────────────────────────────────
// SlideToBid — drag-the-pill-right-to-confirm. Thumb ≈ 3/4 of the track; the
// remaining strip is the commit gap; threshold is halfway through it. Ported
// 1:1 from the production component's behaviour.
// ─────────────────────────────────────────────────────────────────────────────
const THUMB_RATIO = 0.74;

function SlideToBid({ label, onConfirm, disabled = false, busy = false }) {
  const trackRef = aUseRef(null);
  const [draggingX, setDraggingX] = aUseState(null);
  const [confirmed, setConfirmed] = aUseState(false);
  const [trackW, setTrackW] = aUseState(0);

  aUseEffect(() => {
    if (!trackRef.current) return;
    const el = trackRef.current;
    const update = () => setTrackW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);ro.observe(el);
    return () => ro.disconnect();
  }, []);
  aUseEffect(() => {if (!busy) setConfirmed(false);}, [busy]);
  aUseEffect(() => {if (!busy) setDraggingX(null);}, [label, busy]);

  const thumbW = Math.max(150, Math.floor(trackW * THUMB_RATIO));
  const restX = 3;
  const maxX = Math.max(restX, trackW - thumbW - 3);
  const gapW = maxX - restX;

  const onDown = aUseCallback((e) => {
    if (disabled || busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingX(restX);
  }, [disabled, busy, restX]);

  const onMove = aUseCallback((e) => {
    if (draggingX === null) return;
    const r = trackRef.current && trackRef.current.getBoundingClientRect();
    if (!r) return;
    const off = e.clientX - r.left - thumbW;
    setDraggingX(Math.max(restX, Math.min(maxX, restX + off)));
  }, [draggingX, thumbW, restX, maxX]);

  const onUp = aUseCallback((e) => {
    if (draggingX === null) return;
    try {e.currentTarget.releasePointerCapture(e.pointerId);} catch (_) {}
    if (draggingX >= restX + gapW * 0.5) {
      setConfirmed(true);setDraggingX(maxX);onConfirm();
    } else {setDraggingX(null);}
  }, [draggingX, onConfirm, restX, gapW, maxX]);

  const thumbX = confirmed ? maxX : draggingX !== null ? draggingX : restX;
  const progress = gapW > 0 ? Math.max(0, Math.min(1, (thumbX - restX) / gapW)) : 0;
  const live = draggingX !== null && !confirmed;

  return (
    <div ref={trackRef}
    className={'slide-bid' + (disabled ? ' is-disabled' : '')}
    onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="slide-bid-fill" style={{
        left: thumbX + thumbW - 14, width: Math.max(0, maxX - thumbX + 14),
        opacity: progress * 0.7,
        transition: !live ? 'opacity .2s ease-out' : 'none'
      }} />
      <div className="slide-bid-thumb" style={{
        left: thumbX, width: thumbW,
        transition: !live ? 'left .22s cubic-bezier(.34,1.4,.64,1)' : 'none'
      }}>
        {confirmed ?
        <><Chk /> <span>Bid placed</span></> :
        <><span>{label}</span> <Chevrons /></>}
      </div>
    </div>);

}

const Chevrons = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path className="chv chv-a" d="m6 17 5-5-5-5" /><path className="chv chv-b" d="m13 17 5-5-5-5" /></svg>;

const Chk = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M20 6 9 17l-5-5" /></svg>;

const CardIcon = () =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>;


// ─────────────────────────────────────────────────────────────────────────────
// AuctionWinnerBanner — mirrors the giveaway-winner moment, but for the lot.
// ─────────────────────────────────────────────────────────────────────────────
function AuctionWinnerBanner({ banner, charge }) {
  if (!banner) return null;
  const { winner, amountCents, isYou } = banner;
  return (
    <div className="auction-winner" role="status">
      <div className="aw-title">Winner&nbsp;🎉</div>
      <div className="aw-pill">
        <span className="aw-name">{winner}</span>
        <span className="aw-won"> won for {money(amountCents)}!</span>
      </div>
      {isYou &&
      <div className={'aw-charge' + (charge === 'paid' ? ' is-paid' : '')}>
          {charge === 'paid' ?
        <><Chk /> Card on file charged · {money(amountCents)}</> :
        <><span className="aw-spin" /> Charging your card on file…</>}
        </div>
      }
    </div>);

}

// ─────────────────────────────────────────────────────────────────────────────
// AuctionBlock — glass lot card (winner line · title · shipping · price · timer)
// + the Custom pill and SlideToBid row. Sits in the video's bottom overlay.
// ─────────────────────────────────────────────────────────────────────────────
function AuctionBlock({ item, api, viewerId, hasCard, onNeedCard, glass = true, gradOf }) {
  const [bidding, setBidding] = aUseState(false);
  const [toast, setToast] = aUseState(null);
  const [customOpen, setCustomOpen] = aUseState(false);
  const pendingRef = aUseRef(false);

  // Auto-retry the bid once a card is added (mirrors inkstash:wallet-card-ready).
  aUseEffect(() => {
    const onReady = () => {if (pendingRef.current) {pendingRef.current = false;doBid();}};
    window.addEventListener('inkstash:wallet-card-ready', onReady);
    return () => window.removeEventListener('inkstash:wallet-card-ready', onReady);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  if (!item) return null;

  const now = Date.now();
  const bidActive = item.status === 'bidding' && item.biddingEndsAt > now;
  const secs = item.biddingEndsAt ? Math.max(0, Math.ceil((item.biddingEndsAt - now) / 1000)) : 0;
  const isWinning = bidActive && item.currentWinner === viewerId;
  const sold = item.status === 'sold';
  const nextLabel = 'Bid ' + money(item.priceCents + BID_INCREMENT_CENTS);

  const timerLabel = sold ? 'SOLD' : `00:${String(secs).padStart(2, '0')}`;
  const urgent = bidActive && secs <= 3;

  function flash(msg) {setToast(msg);setTimeout(() => setToast(null), 2600);}

  function doBid() {
    if (bidding) return;
    setBidding(true);
    try {
      api.placeBid(viewerId);
    } catch (err) {
      if (err.name === 'no_card_on_file') {pendingRef.current = true;onNeedCard();} else
      if (err.name === 'bidding_closed') flash('Too late — bidding just closed.');else
      flash("Couldn't place your bid — try again.");
    } finally {
      setTimeout(() => setBidding(false), 360);
    }
  }

  function doCustom(amountCents) {
    setCustomOpen(false);
    if (!hasCard) {pendingRef.current = true;onNeedCard();return;}
    try {api.placeCustomBid(viewerId, amountCents);}
    catch (err) {flash(err.name === 'bid_too_low' ? 'Enter more than the current bid.' : 'Bidding just closed.');}
  }

  const customOpts = [500, 1000, 2500].map((c) => item.priceCents + c);

  return (
    <div className="auction-block">
      {/* Winner / winning line — like the reference "X is winning!" */}
      <div className="ac-status">
        <span className="ac-status-av" style={{ background: gradOf(item.currentWinner || 'block') }}>
          {(item.currentWinner || '•')[0].toUpperCase()}
        </span>
        {sold ?
        <><b>{item.currentWinner}</b><span className="ac-won">won!</span></> :
        item.currentWinner ?
        <><b>{item.currentWinner}</b><span className="ac-winning">is winning!</span></> :
        <><b>On the block</b><span className="ac-winning">no bids yet</span></>}
      </div>

      <div className={'auction-card' + (glass ? ' glass' : '') + (isWinning ? ' mine' : '')}>
        <div className="ac-thumb" style={{ background: grad(item.grad) }} />
        <div className="ac-info">
          <div className="ac-title">{item.title}</div>
          <div className="ac-ship">{item.ship}</div>
        </div>
        <div className="ac-right">
          <div className="ac-price">{money(item.priceCents)}</div>
          <div className={'ac-timer' + (urgent ? ' urgent' : '') + (sold ? ' sold' : '')}>{timerLabel}</div>
        </div>
      </div>

      {/* Bid row: Custom pill + slide-to-bid */}
      {bidActive &&
      <div className="bid-row">
          <div className="custom-wrap">
            <button className="btn-custom" onClick={() => setCustomOpen((v) => !v)} aria-expanded={customOpen} style={{ borderWidth: "2px" }}>Custom</button>
            {customOpen &&
          <div className="custom-pop">
                {customOpts.map((c) =>
            <button key={c} className="custom-opt" onClick={() => doCustom(c)}>{money(c)}</button>
            )}
              </div>
          }
          </div>

          {isWinning ?
        <div className="bid-lock"><Chk /> You're the highest bidder</div> :
        <SlideToBid label={nextLabel} onConfirm={doBid} busy={bidding} disabled={!bidActive} />}
        </div>
      }

      {toast && <div className="bid-toast">{toast}</div>}
    </div>);

}

// ── Wallet sheet — the no_card_on_file → add-card path (Stripe SetupIntent). ──
function WalletSheet({ open, onClose, onAdded }) {
  const [adding, setAdding] = aUseState(false);
  if (!open) return null;
  function add() {
    setAdding(true);
    setTimeout(() => {// createSetupIntent + confirmCardSetup round-trip
      setAdding(false);
      onAdded();
      window.dispatchEvent(new CustomEvent('inkstash:wallet-card-ready'));
    }, 1100);
  }
  return (
    <div className="wallet-scrim" onClick={onClose}>
      <div className="wallet-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-grip" />
        <div className="wallet-icon"><CardIcon /></div>
        <div className="wallet-title">Add a card to bid</div>
        <div className="wallet-sub">Live bids charge instantly when you win — we save your card so a slide is all it takes.</div>
        <div className="wallet-field"><span>Card number</span><b>4242 4242 4242 4242</b></div>
        <div className="wallet-field-row">
          <div className="wallet-field"><span>Exp</span><b>12 / 28</b></div>
          <div className="wallet-field"><span>CVC</span><b>•••</b></div>
        </div>
        <button className="wallet-add" onClick={add} disabled={adding}>
          {adding ? 'Saving…' : 'Save card & continue'}
        </button>
        <div className="wallet-secure"><span className="wallet-lock" />Secured by Stripe · Connect</div>
      </div>
    </div>);

}

// ── Confetti — our own celebratory drop. Crimson + gold Inkstash palette
//    with a few bright accents. Pieces fall through the stream and clear. ──
const CONFETTI_COLORS = ['#A1232C', '#C9434C', '#B8893A', '#FFC53D', '#5BD08A', '#2A85FF', '#FAF7F2'];

function Confetti({ fire }) {
  const pieces = aUseMemo(() => {
    if (!fire) return [];
    return Array.from({ length: 90 }, (_, i) => {
      const round = Math.random() < 0.32;
      const w = 6 + Math.random() * 7;
      return {
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        dur: 2.4 + Math.random() * 1.7,
        w, h: round ? w : w * (0.4 + Math.random() * 0.5),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        drift: (Math.random() * 2 - 1) * 90,
        spin: (Math.random() * 2 - 1) * 720,
        round
      };
    });
  }, [fire]);
  if (!fire) return null;
  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((p) =>
      <span key={p.id} className="confetti-piece" style={{
        left: p.left + '%', width: p.w, height: p.h, background: p.color,
        borderRadius: p.round ? '50%' : '1.5px',
        '--dur': p.dur + 's', '--delay': p.delay + 's',
        '--drift': p.drift + 'px', '--spin': p.spin + 'deg'
      }} />
      )}
    </div>);

}

// ── ComicWin — Inkstash's own win celebration: a halftone action-burst slams
//    in behind the banner while comic onomatopoeia pops outward and floats up.
//    Replaces the (very Whatnot) confetti. ──
const ONO_WORDS = ['POW!', 'BAM!', 'SOLD!', 'BOOM!', 'KAPOW!', 'ZAP!', 'BANG!', 'WHAM!', 'ZOK!', 'YOINK!'];
const ONO_COLORS = ['#A1232C', '#C9434C', '#B8893A', '#FFC53D', '#2A85FF', '#5BD08A'];

function ComicWin({ fire }) {
  const items = aUseMemo(() => {
    if (!fire) return [];
    return Array.from({ length: 13 }, (_, i) => ({
      id: i,
      word: ONO_WORDS[Math.floor(Math.random() * ONO_WORDS.length)],
      left: 6 + Math.random() * 86,
      top: 26 + Math.random() * 52,
      delay: Math.random() * 0.5,
      dur: 1.3 + Math.random() * 0.9,
      rot: (Math.random() * 2 - 1) * 22,
      scale: 0.72 + Math.random() * 0.85,
      drift: (Math.random() * 2 - 1) * 46,
      color: ONO_COLORS[Math.floor(Math.random() * ONO_COLORS.length)],
    }));
  }, [fire]);
  if (!fire) return null;
  return (
    <div className="comicwin-layer" aria-hidden="true">
      <div className="comicwin-burst" />
      {items.map((it) => (
        <span key={it.id} className="comicwin-word" style={{
          left: it.left + '%', top: it.top + '%', color: it.color,
          '--rot': it.rot + 'deg', '--dur': it.dur + 's', '--delay': it.delay + 's',
          '--scale': it.scale, '--drift': it.drift + 'px',
        }}>{it.word}</span>
      ))}
    </div>
  );
}

// ── SpeedLines — manga/comic radial focus lines converging on the win. ──
function SpeedLines({ fire }) {
  if (!fire) return null;
  return <div className="speedlines-layer" aria-hidden="true" />;
}

// ── PanelSnap — a jagged comic-panel ink frame slams over the stream. ──
function PanelSnap({ fire }) {
  if (!fire) return null;
  return (
    <div className="panelsnap-layer" aria-hidden="true">
      <div className="panelsnap-frame" />
      <div className="panelsnap-tag">SOLD!</div>
    </div>);
}

Object.assign(window, { useLiveAuction, SlideToBid, AuctionWinnerBanner, AuctionBlock, WalletSheet, Confetti, ComicWin, SpeedLines, PanelSnap });