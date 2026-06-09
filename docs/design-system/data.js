// RIPLINE data — packs, rarity tiers, just-pulled feed
// All fictional / original — no licensed characters.

window.RIPLINE_DATA = (function () {
  const PUBLISHERS = [
    { id: 'thunder', name: 'Thunder Comics', tag: 'Major', count: 84, gradient: ['#C2362F', '#5C1116'] },
    { id: 'meridian', name: 'Meridian Press', tag: 'Major', count: 67, gradient: ['#1F3A6E', '#0E1D3E'] },
    { id: 'pulpworks', name: 'Pulpworks', tag: 'Indie', count: 41, gradient: ['#1A1A1A', '#000000'] },
    { id: 'longshot', name: 'Longshot Studio', tag: 'Indie', count: 28, gradient: ['#3F6F4A', '#1B3024'] },
  ];

  // Rarity tiers with odds for a standard pack
  const RARITY = {
    common:   { name: 'Common',   color: '#8A7F73', odds: 60.00, ev: '$8–25'   },
    uncommon: { name: 'Uncommon', color: '#2E6F4F', odds: 25.00, ev: '$25–75'  },
    rare:     { name: 'Rare',     color: '#2A4D8A', odds: 10.00, ev: '$75–250' },
    epic:     { name: 'Epic',     color: '#6B3A8A', odds: 4.00,  ev: '$250–1k' },
    mythic:   { name: 'Mythic',   color: '#A1232C', odds: 0.95,  ev: '$1k–5k'  },
    grail:    { name: 'Grail',    color: '#B8893A', odds: 0.05,  ev: '$5k+'    },
  };

  const PACKS = [
    {
      id: 'p1',
      title: 'Variant Vault: Vol. 7',
      publisher: 'thunder',
      category: 'variant',
      price: 29,
      cards: 4,
      gradient: ['#C2362F', '#5C1116'],
      seal: 'TC',
      footLabel: 'Series VII · Sealed',
      cardCount: 1240,
      hot: true,
    },
    {
      id: 'p2',
      title: 'Crimson Wave #1s',
      publisher: 'thunder',
      category: 'firstissues',
      price: 89,
      cards: 3,
      gradient: ['#7A1A21', '#2E0A0D'],
      seal: '#1',
      footLabel: 'Debut Issues · Vol. III',
      cardCount: 412,
    },
    {
      id: 'p3',
      title: 'Indigo Files',
      publisher: 'meridian',
      category: 'variant',
      price: 45,
      cards: 4,
      gradient: ['#1F3A6E', '#0E1D3E'],
      seal: 'M',
      footLabel: 'Meridian Variants',
      cardCount: 880,
    },
    {
      id: 'p4',
      title: 'Slab Heat: Modern',
      publisher: 'thunder',
      category: 'graded',
      price: 249,
      cards: 2,
      gradient: ['#1A1A1A', '#000000'],
      seal: '10',
      footLabel: 'Graded · PSA / CGC',
      cardCount: 96,
      premium: true,
    },
    {
      id: 'p5',
      title: 'Pulpworks Drop 03',
      publisher: 'pulpworks',
      category: 'indie',
      price: 18,
      cards: 5,
      gradient: ['#1A1A1A', '#000000'],
      seal: 'P',
      footLabel: 'Small Press · 2024',
      cardCount: 540,
    },
    {
      id: 'p6',
      title: 'Longshot Sketch',
      publisher: 'longshot',
      category: 'indie',
      price: 12,
      cards: 6,
      gradient: ['#3F6F4A', '#1B3024'],
      seal: 'L',
      footLabel: 'Sketch Edition',
      cardCount: 320,
    },
    {
      id: 'p7',
      title: 'Holographic Heroes',
      publisher: 'meridian',
      category: 'variant',
      price: 65,
      cards: 4,
      gradient: ['#5B3DB8', '#2A1A5C'],
      seal: 'H',
      footLabel: 'Foil Variant Box',
      cardCount: 624,
    },
    {
      id: 'p8',
      title: 'Grail Hunter Pro',
      publisher: 'thunder',
      category: 'graded',
      price: 499,
      cards: 1,
      gradient: ['#B8893A', '#5C3F0F'],
      seal: 'AU',
      footLabel: 'Premium Slab · 1 Card',
      cardCount: 24,
      premium: true,
    },
  ];

  // Possible pull outcomes (for animations)
  const PULL_CARDS = [
    { title: 'Static Knight', issue: 'Issue #1', publisher: 'Thunder', grade: 10, value: 1240, rarity: 'mythic', gradient: ['#C2362F', '#5C1116'] },
    { title: 'Hollow Crown',  issue: 'Issue #4', publisher: 'Meridian', grade: 9, value: 280, rarity: 'rare', gradient: ['#1F3A6E', '#0E1D3E'] },
    { title: 'Brass Lantern', issue: 'Issue #2', publisher: 'Thunder', grade: 8, value: 65, rarity: 'uncommon', gradient: ['#B8893A', '#5C3F0F'] },
    { title: 'Salt & Storm',  issue: 'Vol. 2 #1', publisher: 'Pulpworks', grade: 9, value: 35, rarity: 'common', gradient: ['#1A1A1A', '#454545'] },
    { title: 'Wraithline',    issue: 'Issue #11', publisher: 'Meridian', grade: 10, value: 4200, rarity: 'epic', gradient: ['#5B3DB8', '#2A1A5C'] },
    { title: 'Pavement Saint', issue: 'Issue #3', publisher: 'Longshot', grade: 9, value: 24, rarity: 'common', gradient: ['#3F6F4A', '#1B3024'] },
    { title: 'Calliope',      issue: 'Issue #1', publisher: 'Meridian', grade: 10, value: 890, rarity: 'rare', gradient: ['#1F3A6E', '#0E1D3E'] },
    { title: 'Iron Tabula',   issue: 'Vol. 3 #2', publisher: 'Thunder', grade: 9, value: 145, rarity: 'rare', gradient: ['#C2362F', '#5C1116'] },
    { title: 'Lowrise Magus', issue: 'Issue #6', publisher: 'Pulpworks', grade: 8, value: 18, rarity: 'common', gradient: ['#1A1A1A', '#454545'] },
  ];

  // Big "Just Pulled" feature cards — recent high-grade items from the community vault
  const JUST_PULLED_BIG = [
    { id: 'jp1', title: 'Static Knight #1 — First Print Edition',  short: 'Static Knight #1',  grade: 'CGC 9.8',  price: 4800,  user: '@collector.miko', when: '14 min ago', gradient: ['#C2362F', '#5C1116'] },
    { id: 'jp2', title: 'Wraithline #11 — Inkwell Variant',         short: 'Wraithline #11',   grade: 'CGC 9.6',  price: 4200,  user: '@slabhound',       when: '32 min ago', gradient: ['#1F3A6E', '#0E1D3E'] },
    { id: 'jp3', title: 'Calliope #1 — Original Cover (signed)',    short: 'Calliope #1',      grade: 'CBCS 9.4', price: 2400,  user: '@foiledagain',     when: '1 hr ago',   gradient: ['#B8893A', '#5C3F0F'] },
    { id: 'jp4', title: 'Hollow Crown #4 — Foil Pulpworks Variant', short: 'Hollow Crown #4',  grade: 'CGC 9.8',  price: 1240,  user: '@panelfan',        when: '2 hr ago',   gradient: ['#1A1A1A', '#3A3A3A'] },
  ];

  // Live break / stream cards
  const LIVE_BREAKS = [
    { id: 'lb1', host: 'collector.miko', title: 'Grail Hunter Pro — $499 pack attempt',  viewers: 521, gradient: ['#1F3A6E', '#0E1D3E'], live: true,  packLabel: 'Grail Hunter Pro' },
    { id: 'lb2', host: 'panelfan',       title: 'Sunday Silver Age Showcase',            viewers: 312, gradient: ['#C2362F', '#5C1116'], live: true,  packLabel: 'Crimson Wave #1s' },
    { id: 'lb3', host: 'slabhound',      title: 'Modern Slab Marathon — 30 pack rip',    viewers: 201, gradient: ['#1A1A1A', '#3A3A3A'], live: true,  packLabel: 'Slab Heat: Modern' },
    { id: 'lb4', host: 'inkstain.tv',    title: 'Indie Press Hour ft. Longshot Studio',  viewers: 88,  gradient: ['#B8893A', '#5C3F0F'], live: true,  packLabel: 'Pulpworks Drop 03' },
  ];

  // Trending This Week — auction-style numbered list
  const TRENDING_WEEK = [
    { rank: 1, title: 'Static Knight #1 — First Print Edition (CGC 9.8)',    bids: 12, seller: '@collector.miko', price: 4800, sold: '2 hr ago',  gradient: ['#C2362F', '#5C1116'], short: 'Static Knight #1' },
    { rank: 2, title: 'Wraithline #11 — Inkwell Variant (CGC 9.6)',           bids: 11, seller: '@slabhound',       price: 4200, sold: '5 hr ago',  gradient: ['#1F3A6E', '#0E1D3E'], short: 'Wraithline #11' },
    { rank: 3, title: 'Calliope #1 — Original Cover signed (CBCS 9.4)',       bids: 11, seller: '@foiledagain',     price: 2400, sold: '8 hr ago',  gradient: ['#B8893A', '#5C3F0F'], short: 'Calliope #1' },
    { rank: 4, title: 'Hollow Crown #4 — Foil Pulpworks Variant (CGC 9.8)',   bids: 9,  seller: '@panelfan',        price: 1240, sold: '11 hr ago', gradient: ['#1A1A1A', '#3A3A3A'], short: 'Hollow Crown #4' },
    { rank: 5, title: 'Brass Lantern #2 — Sketch Edition (CGC 9.6)',          bids: 9,  seller: '@inkstain',        price: 620,  sold: '14 hr ago', gradient: ['#5B3DB8', '#2A1A5C'], short: 'Brass Lantern #2' },
    { rank: 6, title: 'Iron Tabula Vol. 3 #2 — Signed Print Run (CBCS 9.4)',  bids: 7,  seller: '@thunderboy.04',   price: 330,  sold: '1 day ago', gradient: ['#3F6F4A', '#1B3024'], short: 'Iron Tabula Vol. 3' },
  ];

  // Discover cards
  const DISCOVER = [
    { id: 'app',  title: 'Get the app',     sub: 'Rip packs and watch breaks from anywhere. iOS & Android.',         art: 'phone' },
    { id: 'vault',title: 'Vault, don\u2019t ship',sub: 'Store slabs directly from CGC, CBCS, and eBay. Trade without touching them.', art: 'vault' },
    { id: 'idea', title: 'Got an idea?',    sub: 'We build what collectors actually want. Tell us what to ship next.', art: 'idea' },
  ];

  const JUST_PULLED = [
    { who: 'collector.miko',  what: 'pulled WRAITHLINE #11',     val: 4200, when: '12s ago',  rarity: 'epic' },
    { who: 'slabhound',       what: 'pulled CALLIOPE #1',        val: 890,  when: '38s ago',  rarity: 'rare' },
    { who: 'thunderboy.04',   what: 'pulled IRON TABULA Vol.3',  val: 145,  when: '1m ago',   rarity: 'rare' },
    { who: 'foiledagain',     what: 'pulled HOLLOW CROWN #4',    val: 280,  when: '2m ago',   rarity: 'rare' },
    { who: 'inkstain',        what: 'pulled STATIC KNIGHT #1',   val: 1240, when: '4m ago',   rarity: 'mythic' },
    { who: 'panelfan',        what: 'pulled BRASS LANTERN #2',   val: 65,   when: '5m ago',   rarity: 'uncommon' },
    { who: 'pulpmaster',      what: 'pulled SALT & STORM #1',    val: 35,   when: '7m ago',   rarity: 'common' },
  ];

  const PROFILES = [
    { name: 'collector.miko', joined: '2023 · 412 pulls', avatar: 'M', cards: [
      { gradient: ['#C2362F', '#5C1116'] }, { gradient: ['#5B3DB8', '#2A1A5C'] }, { gradient: ['#B8893A', '#5C3F0F'] }, { gradient: ['#1F3A6E', '#0E1D3E'] }
    ]},
    { name: 'slabhound',  joined: '2022 · 1.2k pulls', avatar: 'S', cards: [
      { gradient: ['#1A1A1A', '#454545'] }, { gradient: ['#C2362F', '#5C1116'] }, { gradient: ['#3F6F4A', '#1B3024'] }, { gradient: ['#1F3A6E', '#0E1D3E'] }
    ]},
    { name: 'foiledagain', joined: '2024 · 87 pulls', avatar: 'F', cards: [
      { gradient: ['#B8893A', '#5C3F0F'] }, { gradient: ['#5B3DB8', '#2A1A5C'] }, { gradient: ['#1F3A6E', '#0E1D3E'] }, { gradient: ['#C2362F', '#5C1116'] }
    ]},
  ];

  return { PUBLISHERS, RARITY, PACKS, PULL_CARDS, JUST_PULLED, PROFILES, JUST_PULLED_BIG, LIVE_BREAKS, TRENDING_WEEK, DISCOVER };
})();
