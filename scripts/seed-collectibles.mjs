/**
 * Seed script: adds 20 buyable collectibles to the auctions table (8 featured)
 * Run: node scripts/seed-collectibles.mjs
 */

const SUPABASE_URL = 'https://uhstjindafnvlrjkpggx.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoc3RqaW5kYWZudmxyamtwZ2d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI1NzgyMywiZXhwIjoyMDkzODMzODIzfQ.AVXYoWbOdaTmXZx--UYQjY7Y1uqSOBdsT1BhHR1VIKw';

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function query(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`query ${table} failed ${res.status}: ${text}`);
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

// ─── Images ──────────────────────────────────────────────────────────────────

const images = {
  comics: [
    'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800&q=85',
    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&q=85',
    'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=800&q=85',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85',
  ],
  cards: [
    'https://images.unsplash.com/photo-1606503153255-59d5e417b778?w=800&q=85',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=85',
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=85',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=85',
  ],
  figures: [
    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&q=85',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=85',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85',
    'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=800&q=85',
  ],
  funko: [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=85',
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=85',
    'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800&q=85',
    'https://images.unsplash.com/photo-1606503153255-59d5e417b778?w=800&q=85',
  ],
};

// ─── Collectibles data ────────────────────────────────────────────────────────

const now = new Date();
const endIn3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
const endIn5d = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
const endIn7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
const endIn10d = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
const endIn14d = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

// sellerIdx maps to: 0=marvelVault, 1=cardKingdom88, 2=animeCollect, 3=funkoPop_Hub
const collectibles = [
  // ── FEATURED (8) ────────────────────────────────────────────────────────────
  {
    title: 'Amazing Fantasy #15 CGC 5.5 — 1st Spider-Man',
    description: 'Cornerstone of the Marvel universe. CGC 5.5 with cream/off-white pages. Slight spine stress lines visible through the slab. One of the most important first appearances in comics history. Accompanied by CGC cert.',
    category: 'Comics',
    condition: 'Graded 5.5',
    image_url: images.comics[0],
    additional_images: [images.comics[1], images.comics[2]],
    starting_bid: 8500.00,
    current_bid: 11200.00,
    buy_now_price: 18500.00,
    reserve_price: 10000.00,
    bid_count: 14,
    is_featured: true,
    buy_now: true,
    make_offer: false,
    status: 'active',
    end_time: endIn3d,
    sellerIdx: 0,
  },
  {
    title: 'Charizard 1st Edition Base Set Holo PSA 10 GEM MINT',
    description: 'The holy grail of Pokemon card collecting. PSA 10 Gem Mint. Perfect centering, four sharp corners, no print lines, no scratches on the holo surface. One of the most sought-after cards on earth. Certificate of authenticity from PSA included.',
    category: 'Trading Cards',
    condition: 'PSA 10 Gem Mint',
    image_url: images.cards[0],
    additional_images: [images.cards[1], images.cards[2]],
    starting_bid: 95000.00,
    current_bid: 118000.00,
    buy_now_price: null,
    reserve_price: 100000.00,
    bid_count: 7,
    is_featured: true,
    buy_now: false,
    make_offer: true,
    status: 'active',
    end_time: endIn5d,
    sellerIdx: 1,
  },
  {
    title: 'Son Goku Ultra Instinct Mastered — Premium Masterline 1/4 Scale',
    description: 'Prime 1 Studio Premium Masterline statue. 1/4 scale. 28" tall. Hand-painted resin. LED illuminated base. Silver aura effect pieces. Complete with bonus head sculpt and display base. MIB, never displayed.',
    category: 'Figures',
    condition: 'Mint in Box',
    image_url: images.figures[0],
    additional_images: [images.figures[1], images.figures[2]],
    starting_bid: 1200.00,
    current_bid: 1450.00,
    buy_now_price: 2200.00,
    reserve_price: null,
    bid_count: 6,
    is_featured: true,
    buy_now: true,
    make_offer: false,
    status: 'active',
    end_time: endIn7d,
    sellerIdx: 2,
  },
  {
    title: 'Freddy Funko Pop! Gold Chrome — SDCC 2015 Exclusive (12 pcs)',
    description: 'Extremely limited production run of 12 pieces worldwide. Authenticated by Funko. Gold chrome finish. Original SDCC exclusive box. This is a career grail piece for serious Funko collectors. Stored in UV-protected case since acquisition.',
    category: 'Funko Pop',
    condition: 'Mint in Box',
    image_url: images.funko[0],
    additional_images: [images.funko[1]],
    starting_bid: 4500.00,
    current_bid: 6200.00,
    buy_now_price: 9800.00,
    reserve_price: 5000.00,
    bid_count: 9,
    is_featured: true,
    buy_now: true,
    make_offer: true,
    status: 'active',
    end_time: endIn3d,
    sellerIdx: 3,
  },
  {
    title: 'Wolverine #1 CGC 9.8 — 1982 Limited Series (White Pages)',
    description: 'Frank Miller classic. CGC 9.8 with bright white pages — the highest population holder for this issue. First solo Wolverine series. Arguably the most important Wolverine comic ever printed. Provenance documentation included.',
    category: 'Comics',
    condition: 'Graded 9.8',
    image_url: images.comics[1],
    additional_images: [images.comics[2], images.comics[3]],
    starting_bid: 3500.00,
    current_bid: 4800.00,
    buy_now_price: 7500.00,
    reserve_price: null,
    bid_count: 11,
    is_featured: true,
    buy_now: true,
    make_offer: false,
    status: 'active',
    end_time: endIn5d,
    sellerIdx: 0,
  },
  {
    title: 'Black Lotus Beta BGS 8 NM-MT — MTG Power 9',
    description: 'Beta Black Lotus graded BGS 8 NM-MT. Blue label. Slightly better centering than Alpha. The most iconic card in trading card game history. Played in exactly zero games. Stored in bank vault since 2009.',
    category: 'Trading Cards',
    condition: 'BGS 8 NM-MT',
    image_url: images.cards[1],
    additional_images: [images.cards[2]],
    starting_bid: 22000.00,
    current_bid: 29500.00,
    buy_now_price: 45000.00,
    reserve_price: 25000.00,
    bid_count: 5,
    is_featured: true,
    buy_now: true,
    make_offer: true,
    status: 'active',
    end_time: endIn7d,
    sellerIdx: 1,
  },
  {
    title: 'Roronoa Zoro — Bandai S.H. Figuarts & Ichiban Kuji Complete Set',
    description: 'Rare complete set: S.H. Figuarts 1000 Slashes Zoro + Ichiban Kuji A Prize + B Prize. All three MIB. Only sold together. Combined retail $380. Collector\'s dream bundle for any One Piece fan.',
    category: 'Figures',
    condition: 'Mint in Box',
    image_url: images.figures[1],
    additional_images: [images.figures[2], images.figures[3]],
    starting_bid: 280.00,
    current_bid: 320.00,
    buy_now_price: 480.00,
    reserve_price: null,
    bid_count: 8,
    is_featured: true,
    buy_now: true,
    make_offer: false,
    status: 'active',
    end_time: endIn3d,
    sellerIdx: 2,
  },
  {
    title: 'Alien Xenomorph Glow-In-The-Dark Chase Pop — SDCC 2019 (240 pcs)',
    description: 'Ultra-rare SDCC 2019 exclusive. Officially authenticated, numbered 089/240. Intense glow-in-the-dark effect on all translucent parts. Sealed protector pop protector. Box is 10/10. One of the rarest Alien Funko ever produced.',
    category: 'Funko Pop',
    condition: 'Mint in Box',
    image_url: images.funko[1],
    additional_images: [images.funko[2], images.funko[3]],
    starting_bid: 950.00,
    current_bid: 1380.00,
    buy_now_price: 2200.00,
    reserve_price: 1000.00,
    bid_count: 12,
    is_featured: true,
    buy_now: true,
    make_offer: true,
    status: 'active',
    end_time: endIn5d,
    sellerIdx: 3,
  },

  // ── STANDARD (12) ───────────────────────────────────────────────────────────
  {
    title: 'Giant-Size X-Men #1 CGC 8.0 — 1st New X-Men Team',
    description: '1975 key. CGC 8.0 with cream pages. Origin and first appearance of Storm, Colossus, Nightcrawler, Thunderbird alongside Wolverine. Sharp copy for the grade.',
    category: 'Comics',
    condition: 'Graded 8.0',
    image_url: images.comics[2],
    additional_images: [images.comics[3]],
    starting_bid: 900.00,
    current_bid: 1050.00,
    buy_now_price: 1800.00,
    reserve_price: null,
    bid_count: 4,
    is_featured: false,
    buy_now: true,
    make_offer: false,
    status: 'active',
    end_time: endIn7d,
    sellerIdx: 0,
  },
  {
    title: 'Mew 1st Edition Promo #8 — Holo CGC 9 MINT',
    description: 'Pokemon Mew 1st Edition CGC 9 Mint. Rare Black Star Promo card. Tight centering. Clean holo with minimal scratching. One of the most loved Pokemon cards from the original era.',
    category: 'Trading Cards',
    condition: 'CGC 9 Mint',
    image_url: images.cards[2],
    additional_images: [images.cards[3]],
    starting_bid: 220.00,
    current_bid: 290.00,
    buy_now_price: 420.00,
    reserve_price: null,
    bid_count: 7,
    is_featured: false,
    buy_now: true,
    make_offer: true,
    status: 'active',
    end_time: endIn10d,
    sellerIdx: 1,
  },
  {
    title: 'Tanjiro Kamado Water Breathing — Aniplex Exclusive 1/7 Scale',
    description: 'Aniplex exclusive. 1/7 scale painted PVC. Dynamic water effect base. All accessories included. Box has minor shelf scuff on one side panel only. Figure itself is flawless.',
    category: 'Figures',
    condition: 'Near Mint',
    image_url: images.figures[2],
    additional_images: [images.figures[3]],
    starting_bid: 120.00,
    current_bid: 155.00,
    buy_now_price: 220.00,
    reserve_price: null,
    bid_count: 5,
    is_featured: false,
    buy_now: true,
    make_offer: false,
    status: 'active',
    end_time: endIn7d,
    sellerIdx: 2,
  },
  {
    title: 'Pennywise Dancing GITD Chase — IT Chapter 2 Hot Topic Exclusive',
    description: 'Glow-in-the-dark chase variant from Hot Topic. Personal pull. 1:6 ratio. Full glow on balloon. Pop protector applied. Box is 9.5/10.',
    category: 'Funko Pop',
    condition: 'Mint in Box',
    image_url: images.funko[2],
    additional_images: [],
    starting_bid: 55.00,
    current_bid: 68.00,
    buy_now_price: 95.00,
    reserve_price: null,
    bid_count: 3,
    is_featured: false,
    buy_now: true,
    make_offer: false,
    status: 'active',
    end_time: endIn10d,
    sellerIdx: 3,
  },
  {
    title: 'New Mutants #87 CGC 9.6 — 1st Cable',
    description: 'Rob Liefeld cover. CGC 9.6 White pages. First appearance of Cable. Bronze/copper age key that has held value consistently for 30 years.',
    category: 'Comics',
    condition: 'Graded 9.6',
    image_url: images.comics[3],
    additional_images: [images.comics[0]],
    starting_bid: 185.00,
    current_bid: 210.00,
    buy_now_price: 340.00,
    reserve_price: null,
    bid_count: 5,
    is_featured: false,
    buy_now: true,
    make_offer: true,
    status: 'active',
    end_time: endIn14d,
    sellerIdx: 0,
  },
  {
    title: 'Lugia 1st Edition Neo Genesis Holo BGS 8.5 NM-MT+',
    description: 'Lugia 1st Edition from Neo Genesis, BGS 8.5. The fan-favorite gen 2 legend. Excellent centering, subs: 9/9/8.5/8. One of the most beautiful cards in the original run.',
    category: 'Trading Cards',
    condition: 'BGS 8.5 NM-MT+',
    image_url: images.cards[3],
    additional_images: [images.cards[0]],
    starting_bid: 750.00,
    current_bid: 910.00,
    buy_now_price: 1400.00,
    reserve_price: null,
    bid_count: 9,
    is_featured: false,
    buy_now: true,
    make_offer: false,
    status: 'active',
    end_time: endIn5d,
    sellerIdx: 1,
  },
  {
    title: 'Naruto Uzumaki Sage Mode — Megahouse G.E.M. Series 1/8',
    description: 'Megahouse G.E.M. series. 1/8 scale PVC. Sage Mode orange aura effect. All accessories present. MIB with certificate card. Excellent display piece.',
    category: 'Figures',
    condition: 'Mint in Box',
    image_url: images.figures[3],
    additional_images: [images.figures[0]],
    starting_bid: 95.00,
    current_bid: 110.00,
    buy_now_price: 165.00,
    reserve_price: null,
    bid_count: 4,
    is_featured: false,
    buy_now: true,
    make_offer: false,
    status: 'active',
    end_time: endIn7d,
    sellerIdx: 2,
  },
  {
    title: 'Darth Vader Concept Series #07 — SDCC 2007 Exclusive Metallic',
    description: 'SDCC 2007 Concept Series. Metallic finish Vader from the Ralph McQuarrie concept art line. One of the earliest Funko exclusives. Minor box wear, figure itself is 10/10.',
    category: 'Funko Pop',
    condition: 'Good Box',
    image_url: images.funko[3],
    additional_images: [images.funko[0]],
    starting_bid: 420.00,
    current_bid: 530.00,
    buy_now_price: 850.00,
    reserve_price: 450.00,
    bid_count: 6,
    is_featured: false,
    buy_now: true,
    make_offer: true,
    status: 'active',
    end_time: endIn10d,
    sellerIdx: 3,
  },
  {
    title: 'House of X #1 CGC 9.8 — Peach Momoko Virgin Variant',
    description: 'Peach Momoko exclusive virgin cover. CGC 9.8 white pages. Modern key. Beautiful art. Low print run variant. High demand in the modern comic collecting community.',
    category: 'Comics',
    condition: 'Graded 9.8',
    image_url: images.comics[0],
    additional_images: [images.comics[1]],
    starting_bid: 95.00,
    current_bid: 120.00,
    buy_now_price: 195.00,
    reserve_price: null,
    bid_count: 8,
    is_featured: false,
    buy_now: true,
    make_offer: false,
    status: 'active',
    end_time: endIn14d,
    sellerIdx: 0,
  },
  {
    title: 'Umbreon Gold Star Holo PSA 8 NM-MT — Ex Unseen Forces',
    description: 'Gold Star Umbreon from EX Unseen Forces. PSA 8 NM-MT. One of the most sought-after fan-favorite Pokemon cards. Dark type lover\'s dream. Clean scan, minimal edgewear.',
    category: 'Trading Cards',
    condition: 'PSA 8 NM-MT',
    image_url: images.cards[0],
    additional_images: [images.cards[1]],
    starting_bid: 1800.00,
    current_bid: 2400.00,
    buy_now_price: 3800.00,
    reserve_price: 2000.00,
    bid_count: 11,
    is_featured: false,
    buy_now: true,
    make_offer: true,
    status: 'active',
    end_time: endIn5d,
    sellerIdx: 1,
  },
  {
    title: 'Mikasa Ackerman — Attack on Titan Survey Corps 1/6 Scale',
    description: 'Good Smile Company 1/6 scale. Full Survey Corps uniform with ODM gear. Intricate sculpt, hair blowing in wind pose. MIB, all small accessory parts sealed in bags.',
    category: 'Figures',
    condition: 'Mint in Box',
    image_url: images.figures[1],
    additional_images: [images.figures[2]],
    starting_bid: 175.00,
    current_bid: 210.00,
    buy_now_price: 320.00,
    reserve_price: null,
    bid_count: 6,
    is_featured: false,
    buy_now: true,
    make_offer: false,
    status: 'active',
    end_time: endIn10d,
    sellerIdx: 2,
  },
  {
    title: 'The Mandalorian Holographic #345 — Target Exclusive',
    description: 'Target Circle exclusive holographic Mando. Translucent figure with blue holographic effect. Personal Target pull. MIB with hard protector on.',
    category: 'Funko Pop',
    condition: 'Mint in Box',
    image_url: images.funko[2],
    additional_images: [],
    starting_bid: 32.00,
    current_bid: 42.00,
    buy_now_price: 65.00,
    reserve_price: null,
    bid_count: 4,
    is_featured: false,
    buy_now: true,
    make_offer: false,
    status: 'active',
    end_time: endIn14d,
    sellerIdx: 3,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  // Load the 4 seed seller user IDs by username
  const usernames = ['marvelVault', 'cardKingdom88', 'animeCollect', 'funkoPop_Hub'];
  console.log('Loading seller user IDs...');
  const sellers = await query(
    'users',
    `username=in.(${usernames.map(u => `"${u}"`).join(',')})&select=id,username`
  );

  const idByUsername = Object.fromEntries(sellers.map(s => [s.username, s.id]));
  const sellerIds = usernames.map(u => {
    const id = idByUsername[u];
    if (!id) throw new Error(`Seller not found: ${u} — run seed-data.mjs first`);
    return id;
  });

  console.log(`  Found: ${sellers.map(s => s.username).join(', ')}`);

  console.log('\nInserting 20 collectibles into auctions table...');

  const startTime = new Date().toISOString();
  const rows = collectibles.map(c => ({
    seller_id: sellerIds[c.sellerIdx],
    title: c.title,
    description: c.description,
    category: c.category,
    condition: c.condition,
    image_url: c.image_url,
    additional_images: c.additional_images,
    starting_bid: c.starting_bid,
    current_bid: c.current_bid,
    buy_now_price: c.buy_now_price,
    reserve_price: c.reserve_price,
    bid_count: c.bid_count,
    is_featured: c.is_featured,
    is_live: false,
    buy_now: c.buy_now,
    make_offer: c.make_offer,
    status: c.status,
    start_time: startTime,
    end_time: c.end_time,
  }));

  const inserted = await insert('auctions', rows);
  const featured = inserted.filter(r => r.is_featured);
  const standard = inserted.filter(r => !r.is_featured);

  console.log(`\n✅ Done!`);
  console.log(`   Total inserted: ${inserted.length}`);
  console.log(`   Featured: ${featured.length}`);
  console.log(`   Standard: ${standard.length}`);
  console.log('\nFeatured items:');
  featured.forEach(f => console.log(`   • ${f.title.substring(0, 60)}...`));
}

run().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
