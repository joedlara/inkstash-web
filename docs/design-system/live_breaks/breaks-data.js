// Live Breaks — page data. Original/fictional, matches RIPLINE_DATA conventions.
// Gradients & hosts reuse the home-page palette so the theme stays continuous.
window.BREAKS_DATA = (function () {

  // ── LIVE NOW — phone-vertical stream cards (same shape as home break-card) ──
  const LIVE_NOW = [
    { id: 'ln1', host: 'collector.miko', title: 'Grail Hunter Pro — $499 pack attempt',   viewers: 521, gradient: ['#1F3A6E', '#0E1D3E'], packLabel: 'Grail Hunter Pro',  cat: 'bigmoney' },
    { id: 'ln2', host: 'panelfan',       title: 'Sunday Silver Age Showcase',             viewers: 312, gradient: ['#C2362F', '#5C1116'], packLabel: 'Crimson Wave #1s',  cat: 'vintage'  },
    { id: 'ln3', host: 'slabhound',      title: 'Modern Slab Marathon — 30 pack rip',     viewers: 201, gradient: ['#1A1A1A', '#3A3A3A'], packLabel: 'Slab Heat: Modern', cat: 'bigmoney' },
    { id: 'ln4', host: 'inkstain.tv',    title: 'Indie Press Hour ft. Longshot Studio',   viewers: 88,  gradient: ['#B8893A', '#5C3F0F'], packLabel: 'Pulpworks Drop 03', cat: 'indie'    },
    { id: 'ln5', host: 'foiledagain',    title: 'Foil Friday — chasing the rainbow shard',viewers: 264, gradient: ['#5B3DB8', '#2A1A5C'], packLabel: 'Prism Variants',    cat: 'bigmoney' },
    { id: 'ln6', host: 'thunderboy.04',  title: 'Thunder Comics vault — full box break',  viewers: 147, gradient: ['#3F6F4A', '#1B3024'], packLabel: 'Iron Tabula Vol.3', cat: 'vintage'  },
    { id: 'ln7', host: 'pulpmaster',     title: 'Small Press Spotlight — Salt & Storm',   viewers: 54,  gradient: ['#1A1A1A', '#454545'], packLabel: 'Salt & Storm #1',   cat: 'indie'    },
    { id: 'ln8', host: 'gradedgoddess',  title: 'CGC 9.8 or bust — premium only',         viewers: 389, gradient: ['#7A1A21', '#2E0A0D'], packLabel: 'Static Knight #1',  cat: 'bigmoney' },
  ];

  // ── COMING UP — scheduled streams. offsetMin = minutes from page load. ──
  const SCHEDULED = [
    { id: 'sc1', host: 'collector.miko', title: 'Midnight Mythic Madness — 50 pack rip',    packLabel: 'Grail Hunter Pro',  gradient: ['#1F3A6E', '#0E1D3E'], offsetMin: 95,   expect: '500+ expected' },
    { id: 'sc2', host: 'panelfan',       title: 'Bronze Age Bonanza — reader picks',        packLabel: 'Crimson Wave #1s',  gradient: ['#C2362F', '#5C1116'], offsetMin: 220,  expect: '300+ expected' },
    { id: 'sc3', host: 'slabhound',      title: 'Slab Sunday — graded grails only',         packLabel: 'Slab Heat: Modern', gradient: ['#1A1A1A', '#3A3A3A'], offsetMin: 1290, expect: '200+ expected' },
    { id: 'sc4', host: 'inkstain.tv',    title: 'Indie Launch Party — Longshot Studio',     packLabel: 'Pulpworks Drop 03', gradient: ['#B8893A', '#5C3F0F'], offsetMin: 1620, expect: '120+ expected' },
    { id: 'sc5', host: 'gradedgoddess',  title: 'Premium Power Hour — $250 packs only',     packLabel: 'Static Knight #1',  gradient: ['#7A1A21', '#2E0A0D'], offsetMin: 2880, expect: '450+ expected' },
    { id: 'sc6', host: 'foiledagain',    title: 'Foil Chase Finale — season closer',        packLabel: 'Prism Variants',    gradient: ['#5B3DB8', '#2A1A5C'], offsetMin: 4320, expect: '380+ expected' },
  ];

  // ── FEATURED — hand-picked spotlight shows (dark "momentum" rail) ──
  const FEATURED = [
    { id: 'ft1', host: 'collector.miko', title: 'The $10K Grail Hunt — 48 pack case break', viewers: 1284, gradient: ['#1F3A6E', '#0E1D3E'], packLabel: 'Grail Hunter Pro',  cat: 'Big money' },
    { id: 'ft2', host: 'gradedgoddess',  title: 'Slab Givys + $1 Starts | Character Breaks', viewers: 642,  gradient: ['#7A1A21', '#2E0A0D'], packLabel: 'Static Knight #1',  cat: 'Graded slabs' },
    { id: 'ft3', host: 'foiledagain',    title: 'Foil Friday — chasing the rainbow shard',  viewers: 264,  gradient: ['#5B3DB8', '#2A1A5C'], packLabel: 'Prism Variants',    cat: 'Variant covers' },
    { id: 'ft4', host: 'panelfan',       title: 'Silver Age Showcase — reader picks live',  viewers: 312,  gradient: ['#C2362F', '#5C1116'], packLabel: 'Crimson Wave #1s',  cat: 'Vintage' },
    { id: 'ft5', host: 'slabhound',      title: 'Modern Slab Marathon — 30 pack rip',       viewers: 201,  gradient: ['#1A1A1A', '#3A3A3A'], packLabel: 'Slab Heat: Modern', cat: 'Modern' },
    { id: 'ft6', host: 'thunderboy.04',  title: 'Thunder Comics vault — full box break',    viewers: 147,  gradient: ['#3F6F4A', '#1B3024'], packLabel: 'Iron Tabula Vol.3', cat: 'Indie press' },
    { id: 'ft7', host: 'inkstain.tv',    title: 'Indie Press Hour ft. Longshot Studio',     viewers: 88,   gradient: ['#B8893A', '#5C3F0F'], packLabel: 'Pulpworks Drop 03', cat: 'Small press' },
  ];

  return { LIVE_NOW, SCHEDULED, FEATURED };
})();
