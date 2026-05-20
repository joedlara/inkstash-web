/**
 * Seed script: creates 4 seller users, 20 listings, and 20 livestreams
 * Run: node scripts/seed-data.mjs
 */

import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function rpc(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} failed ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function insert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`insert ${table} failed ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function query(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { ...headers, Prefer: 'return=representation' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`query ${table} failed ${res.status}: ${text}`);
  return JSON.parse(text);
}

// ─── Seed data ──────────────────────────────────────────────────────────────

const EXISTING_USER_ID = '0394da16-2258-4b8e-a228-80b11e5d2335';

const sellerProfiles = [
  {
    username: 'marvelVault',
    full_name: 'Marcus Reed',
    bio: 'Graded comics specialist. CGC collector since 2008. ✨ Mostly Silver Age and Bronze Age keys.',
    avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=marvelVault',
    level: 12,
    xp: 11400,
    xp_to_next: 13000,
    seller_verified: true,
    onboarding_completed: true,
  },
  {
    username: 'cardKingdom88',
    full_name: 'Priya Nair',
    bio: 'Pokemon & MTG cards | PSA/BGS graded | Fast shipping | 2,400+ sales',
    avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=cardKingdom88',
    level: 18,
    xp: 17200,
    xp_to_next: 19000,
    seller_verified: true,
    onboarding_completed: true,
  },
  {
    username: 'animeCollect',
    full_name: 'Kenji Watanabe',
    bio: 'Anime figures | Dragon Ball | One Piece | Demon Slayer. Ships worldwide.',
    avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=animeCollect',
    level: 7,
    xp: 6500,
    xp_to_next: 8000,
    seller_verified: true,
    onboarding_completed: true,
  },
  {
    username: 'funkoPop_Hub',
    full_name: 'Destiny Williams',
    bio: 'Chase variants & exclusives. SDCC, NYCC, Hot Topic HTF. DM for bundles.',
    avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=funkoPop_Hub',
    level: 9,
    xp: 8800,
    xp_to_next: 10000,
    seller_verified: true,
    onboarding_completed: true,
  },
];

// Card / comic images from placehold.co and picsum (no external copyright issues in seed data)
const placeholderImages = [
  'https://images.unsplash.com/photo-1606503153255-59d5e417b778?w=600&q=80',
  'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=600&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80',
  'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=600&q=80',
  'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=600&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
];

function img(i) {
  return placeholderImages[i % placeholderImages.length];
}

const listingSeeds = [
  // Marvel Comics
  { title: 'Amazing Spider-Man #300 CGC 9.8 — 1st Venom', description: 'White pages. No marks. McFarlane cover. Slabbed 2019.', condition: 'Graded 9.8', category: 'Comics', buy_now_price: 1850.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 0, photoIdx: 0 },
  { title: 'X-Men #94 CGC 7.5 — 1st New X-Men Team', description: 'Wolverine, Storm, Nightcrawler, Colossus first full app. OW pages.', condition: 'Graded 7.5', category: 'Comics', buy_now_price: 620.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 0, photoIdx: 1 },
  { title: 'Incredible Hulk #181 VF 8.0 — 1st Full Wolverine', description: 'Raw book. Presents beautifully. Key bronze age issue.', condition: 'VF 8.0', category: 'Comics', buy_now_price: 2400.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 0, photoIdx: 2 },
  { title: 'Batman #232 CGC 9.4 — 1st Ra\'s al Ghul', description: 'Adams cover. Off-white pages. Tight spine. Premier bronze age key.', condition: 'Graded 9.4', category: 'Comics', buy_now_price: 980.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 0, photoIdx: 3 },

  // Pokemon / MTG Cards
  { title: 'Charizard Base Set Holo PSA 9 — Unlimited', description: 'Clean centering, minimal edgewear. PSA 9 MINT. No scratches on holo.', condition: 'PSA 9 Mint', category: 'Trading Cards', buy_now_price: 1200.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 1, photoIdx: 4 },
  { title: 'Black Lotus Alpha BGS 7 NM — MTG Power 9', description: 'Blue label. Off-center but iconic. Rare opportunity for a graded Alpha Lotus.', condition: 'BGS 7 NM', category: 'Trading Cards', buy_now_price: 28000.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 1, photoIdx: 5 },
  { title: 'Pikachu Illustrator PSA 8 NM-MT — World\'s Rarest Promo', description: '1998 CoroCoro promo. Only ~39 graded PSA 8s. Authentic Pikachu Illustrator.', condition: 'PSA 8 NM-MT', category: 'Trading Cards', buy_now_price: 75000.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 1, photoIdx: 6 },
  { title: 'Pokemon 1st Edition Base Set Booster Pack — Factory Sealed', description: 'Weighs heavy. WOTC era. Stored in magnetic case since 2002. No damage.', condition: 'Sealed', category: 'Trading Cards', buy_now_price: 9500.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 1, photoIdx: 7 },
  { title: 'Mew 1st Edition Jungle Holo BGS 9.5 GEM MINT', description: 'Quad 9.5 subs. Centering, corners, edges, surface all 9.5. Grail card.', condition: 'BGS 9.5 Gem Mint', category: 'Trading Cards', buy_now_price: 3200.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 1, photoIdx: 0 },

  // Anime Figures
  { title: 'Dragon Ball Z Son Goku Ultra Instinct — S.H. Figuarts Exclusive', description: 'SDCC 2019 exclusive. MIB. Silver hair aura effect parts included.', condition: 'Mint in Box', category: 'Figures', buy_now_price: 320.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 2, photoIdx: 1 },
  { title: 'One Piece Monkey D. Luffy Gear 5 — Bandai S.H. Figuarts', description: 'Newest Gear 5 release. Open box display only. All accessories included.', condition: 'Near Mint', category: 'Figures', buy_now_price: 89.99, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 2, photoIdx: 2 },
  { title: 'Demon Slayer Tanjiro Kamado — Kotobukiya ArtFX J Statue', description: 'Water breathing pose. 1/8 scale. Original box. No paint chips.', condition: 'Mint in Box', category: 'Figures', buy_now_price: 145.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 2, photoIdx: 3 },
  { title: 'Neon Genesis Evangelion Unit-01 — Metal Build Premium', description: 'Die-cast metal. Heavy. Display stand included. Minor shelf wear on box only.', condition: 'Excellent', category: 'Figures', buy_now_price: 280.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 2, photoIdx: 4 },

  // Funko Pops
  { title: 'Freddy Funko Metallic #12 — San Diego Comic Con 2013 Exclusive', description: '480 pcs worldwide. Grail piece for Funko collectors. Box has minor crease.', condition: 'Near Mint Box', category: 'Funko Pop', buy_now_price: 1800.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 3, photoIdx: 5 },
  { title: 'Spider-Man 2099 Chrome #958 — Hot Topic Exclusive Chase', description: 'Chase variant pulled from HT. 1:6 chase ratio. Protective case included.', condition: 'Mint in Box', category: 'Funko Pop', buy_now_price: 65.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 3, photoIdx: 6 },
  { title: 'Thanos GITD Infinity Gauntlet #289 — Special Edition', description: 'Glow-in-the-dark chase. Very bright glow. Box 9/10.', condition: 'Mint in Box', category: 'Funko Pop', buy_now_price: 48.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 3, photoIdx: 7 },
  { title: 'Mando & Grogu 2-Pack #405 — Target Exclusive Moment', description: 'Target Circle exclusive. MISB. Foil box. Very limited production run.', condition: 'Sealed', category: 'Funko Pop', buy_now_price: 55.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 3, photoIdx: 0 },
  { title: 'Iron Man Mark 85 #497 — Endgame Holographic Box Chase', description: 'Gold chrome holographic box. Pulled personally. Protective protector on.', condition: 'Mint in Box', category: 'Funko Pop', buy_now_price: 42.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 3, photoIdx: 1 },
  { title: 'BBTS Exclusive Invincible Atom Eve Glow Variant Pop', description: 'BBTS exclusive. Glow variant. Protective protector. Ships in original mailer.', condition: 'Mint in Box', category: 'Funko Pop', buy_now_price: 38.00, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 3, photoIdx: 2 },
  { title: 'Venom #363 Scream Metallic — Walgreens Exclusive Chase', description: 'Metallic chase. Walgreens pull. Slight box ding on lower corner.', condition: 'Very Good Box', category: 'Funko Pop', buy_now_price: 29.99, is_buy_now: true, delivery_method: 'shipping', sellerIdx: 3, photoIdx: 3 },
];

const now = new Date();
const in1h = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
const in30m = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
const plus3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
const plus1d = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
const minus1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

const livestreamSeeds = [
  // Live now
  { title: 'LIVE: Sunday Silver Age Comics Auction 🔥', description: 'Going through 200+ Silver Age keys tonight. Starting bids from $50. CGC-only lots.', category: 'Comics', status: 'live', is_live: true, current_viewers: 312, peak_viewers: 418, total_views: 1240, scheduled_start_time: minus1h, actual_start_time: minus1h, thumbnail_url: img(0), sellerIdx: 0 },
  { title: 'LIVE: Pokémon Pack Opening — 1st Ed Jungle & Fossil 🎴', description: 'Opening 3 boxes tonight. Chasing 1st Ed Holos. Chat calls the pulls!', category: 'Trading Cards', status: 'live', is_live: true, current_viewers: 521, peak_viewers: 680, total_views: 2100, scheduled_start_time: minus1h, actual_start_time: minus1h, thumbnail_url: img(1), sellerIdx: 1 },
  { title: 'LIVE: Anime Figure Flash Sale — Kotobukiya & Banpresto 🗡', description: 'Clearing display shelf. 30+ figures hitting the block. BIN prices are LOW tonight.', category: 'Figures', status: 'live', is_live: true, current_viewers: 88, peak_viewers: 140, total_views: 390, scheduled_start_time: minus1h, actual_start_time: minus1h, thumbnail_url: img(2), sellerIdx: 2 },
  { title: 'LIVE: Funko Haul Breakdown — SDCC & NYCC Exclusives 🟠', description: 'Just got back from Con season. Showing everything off and listing as we go.', category: 'Funko Pop', status: 'live', is_live: true, current_viewers: 201, peak_viewers: 255, total_views: 740, scheduled_start_time: minus1h, actual_start_time: minus1h, thumbnail_url: img(3), sellerIdx: 3 },

  // Starting soon (scheduled)
  { title: 'Starting in 30min: MTG Reserved List Cards Auction ⚡', description: 'Duals, Power 9 adjacents, and iconic reserve list staples. No reserve prices.', category: 'Trading Cards', status: 'scheduled', is_live: false, current_viewers: 0, peak_viewers: 0, total_views: 45, scheduled_start_time: in30m, thumbnail_url: img(4), sellerIdx: 1 },
  { title: 'Starting in 1hr: Bronze Age Marvel Keys Night 📚', description: 'Hulk 181, GSX1, FF 48, 52, ASM 129. All CGC slabbed. BIN or auction.', category: 'Comics', status: 'scheduled', is_live: false, current_viewers: 0, peak_viewers: 0, total_views: 120, scheduled_start_time: in1h, thumbnail_url: img(5), sellerIdx: 0 },
  { title: 'Dragon Ball Super Card Game Box Break — Fusion World 🐉', description: 'Opening 2 cases of FW05. Ripping full sets live. All hits up for sale instantly.', category: 'Trading Cards', status: 'scheduled', is_live: false, current_viewers: 0, peak_viewers: 0, total_views: 78, scheduled_start_time: in1h, thumbnail_url: img(6), sellerIdx: 1 },
  { title: 'Funko Pop Chase Hunt — New Target & Amazon Exclusives 🏆', description: 'Live reveal of 40+ new acquisitions. Selling what doesn\'t fit in the vault.', category: 'Funko Pop', status: 'scheduled', is_live: false, current_viewers: 0, peak_viewers: 0, total_views: 93, scheduled_start_time: in2h, thumbnail_url: img(7), sellerIdx: 3 },
  { title: 'One Piece Card Game OP-09 Case Break — Live Tonight 🏴‍☠️', description: 'Embargo lifted! Opening 6 cases of Emperors in the New World. Ripping live.', category: 'Trading Cards', status: 'scheduled', is_live: false, current_viewers: 0, peak_viewers: 0, total_views: 210, scheduled_start_time: in2h, thumbnail_url: img(0), sellerIdx: 1 },

  // Upcoming (next day / 3 days out)
  { title: 'Weekend CGC Comics Deep Dive — ALL 9.8s', description: 'Curated grail vault. Every book is a 9.8. Starting bids at $200+. No junk.', category: 'Comics', status: 'scheduled', is_live: false, current_viewers: 0, peak_viewers: 0, total_views: 0, scheduled_start_time: plus1d, thumbnail_url: img(1), sellerIdx: 0 },
  { title: 'Mega Anime Figure Auction — High-End Statues & Scale Models', description: '1/4 and 1/7 scale. Kotobukiya, Good Smile, Alter. All MIB. Starting under retail.', category: 'Figures', status: 'scheduled', is_live: false, current_viewers: 0, peak_viewers: 0, total_views: 0, scheduled_start_time: plus1d, thumbnail_url: img(2), sellerIdx: 2 },
  { title: 'PSA/BGS Graded Pokemon Auction — Vintage & Modern', description: '60+ graded cards. Vintage Base, Jungle, Fossil + Modern SV and Scarlet hits.', category: 'Trading Cards', status: 'scheduled', is_live: false, current_viewers: 0, peak_viewers: 0, total_views: 0, scheduled_start_time: plus1d, thumbnail_url: img(3), sellerIdx: 1 },
  { title: 'DC/Image Bronze Age + Modern Age Comics Night', description: 'Batman keys, Walking Dead 1st prints, spawn early issues. All raw, high grade.', category: 'Comics', status: 'scheduled', is_live: false, current_viewers: 0, peak_viewers: 0, total_views: 0, scheduled_start_time: plus3d, thumbnail_url: img(4), sellerIdx: 0 },
  { title: 'Funko Grail Vault — Rare Convention Exclusives Under Spotlight', description: 'ECCC, NYCC, London, SDCC. Convention exclusives, chase variants, gold editions.', category: 'Funko Pop', status: 'scheduled', is_live: false, current_viewers: 0, peak_viewers: 0, total_views: 0, scheduled_start_time: plus3d, thumbnail_url: img(5), sellerIdx: 3 },
  { title: 'Naruto & Bleach Merchandise Haul — Figures, Cards, Art', description: 'Heavy haul from Japan. Ichiban Kuji, Jump Victory, arcade prized figures.', category: 'Figures', status: 'scheduled', is_live: false, current_viewers: 0, peak_viewers: 0, total_views: 0, scheduled_start_time: plus3d, thumbnail_url: img(6), sellerIdx: 2 },

  // Ended (recent)
  { title: 'Sunday Spider-Man Spectacular — All ASM Key Issues', description: 'Ended. Watch the replay! 22 lots sold. Average hammer price $380.', category: 'Comics', status: 'ended', is_live: false, current_viewers: 0, peak_viewers: 520, total_views: 3100, scheduled_start_time: minus1h, actual_start_time: minus1h, end_time: now.toISOString(), thumbnail_url: img(7), sellerIdx: 0 },
  { title: 'Vintage Pokemon Wax Unboxing — Base Through Neo', description: 'Ended. Replay available. 8 packs opened, Charizard pulled!', category: 'Trading Cards', status: 'ended', is_live: false, current_viewers: 0, peak_viewers: 1820, total_views: 7400, scheduled_start_time: minus1h, actual_start_time: minus1h, end_time: now.toISOString(), thumbnail_url: img(0), sellerIdx: 1 },
  { title: 'Dragon Ball Z Figure Clearance — Under $50 All Lots', description: 'Ended. All 18 figures sold in under 40 minutes.', category: 'Figures', status: 'ended', is_live: false, current_viewers: 0, peak_viewers: 175, total_views: 890, scheduled_start_time: minus1h, actual_start_time: minus1h, end_time: now.toISOString(), thumbnail_url: img(1), sellerIdx: 2 },
  { title: 'Funko Pop Mega Lot — 50 Pops One Show Night', description: 'Ended. 50 pops, 50 lots, 50 buyers. Thanks everyone! Next show Thursday.', category: 'Funko Pop', status: 'ended', is_live: false, current_viewers: 0, peak_viewers: 430, total_views: 2200, scheduled_start_time: minus1h, actual_start_time: minus1h, end_time: now.toISOString(), thumbnail_url: img(2), sellerIdx: 3 },
  { title: 'MTG Legacy Staples Fire Sale — Immediate Shipping', description: 'Ended. Force of Wills, Duals, Workshops. All graded BGS 9+. Shipped same day.', category: 'Trading Cards', status: 'ended', is_live: false, current_viewers: 0, peak_viewers: 290, total_views: 1560, scheduled_start_time: minus1h, actual_start_time: minus1h, end_time: now.toISOString(), thumbnail_url: img(3), sellerIdx: 1 },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Creating seed seller users in auth.users + public.users...');

  // Create auth users, get their IDs
  const sellerIds = [];
  for (const profile of sellerProfiles) {
    const email = `${profile.username.toLowerCase()}@inkstash-seed.dev`;
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        password: 'Inkstash2025!',
        email_confirm: true,
        user_metadata: { username: profile.username, full_name: profile.full_name },
      }),
    });
    const authText = await authRes.text();
    const authUser = JSON.parse(authText);
    if (!authRes.ok) {
      // User might already exist — try to look up by email
      const existing = await query('users', `email=eq.${encodeURIComponent(email)}&select=id`);
      if (existing.length > 0) {
        console.log(`  ${profile.username} already exists, reusing id ${existing[0].id}`);
        sellerIds.push(existing[0].id);
        continue;
      }
      throw new Error(`auth create failed for ${profile.username}: ${authText}`);
    }
    const userId = authUser.id;
    sellerIds.push(userId);
    console.log(`  Created auth user ${profile.username} → ${userId}`);

    // Upsert public.users row
    await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        id: userId,
        email,
        username: profile.username,
        full_name: profile.full_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        level: profile.level,
        xp: profile.xp,
        xp_to_next: profile.xp_to_next,
        seller_verified: profile.seller_verified,
        onboarding_completed: profile.onboarding_completed,
        onboarding_completed_at: profile.onboarding_completed ? new Date().toISOString() : null,
      }),
    });
  }

  console.log(`\nInserting 20 listings...`);
  const listings = listingSeeds.map((l) => ({
    user_id: sellerIds[l.sellerIdx],
    title: l.title,
    description: l.description,
    condition: l.condition,
    category: l.category,
    photos: JSON.stringify([{ url: l.photoIdx !== undefined ? img(l.photoIdx) : img(0), isPrimary: true }]),
    is_auction: l.is_auction || false,
    is_buy_now: l.is_buy_now || false,
    buy_now_price: l.buy_now_price || null,
    starting_bid: l.starting_bid || null,
    quantity: 1,
    delivery_method: l.delivery_method || 'shipping',
    status: 'active',
  }));

  const insertedListings = await insert('listings', listings);
  console.log(`  Inserted ${insertedListings.length} listings.`);

  console.log(`\nInserting 20 livestreams...`);
  const streams = livestreamSeeds.map((s) => ({
    seller_id: sellerIds[s.sellerIdx],
    title: s.title,
    description: s.description,
    thumbnail_url: s.thumbnail_url,
    status: s.status,
    is_live: s.is_live,
    category: s.category,
    current_viewers: s.current_viewers,
    peak_viewers: s.peak_viewers,
    total_views: s.total_views,
    scheduled_start_time: s.scheduled_start_time || null,
    actual_start_time: s.actual_start_time || null,
    end_time: s.end_time || null,
    chat_enabled: true,
    donations_enabled: true,
    subscriber_only: false,
  }));

  const insertedStreams = await insert('livestreams', streams);
  console.log(`  Inserted ${insertedStreams.length} livestreams.`);

  console.log('\n✅ Seed complete!');
  console.log(`   Users: ${sellerIds.length} sellers + existing user`);
  console.log(`   Listings: ${insertedListings.length}`);
  console.log(`   Livestreams: ${insertedStreams.length}`);
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
