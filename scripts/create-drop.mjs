// scripts/create-drop.mjs
//
// Create a scheduled-release drop from CLI args. Wraps a single INSERT
// into the drops table. Use this until vendor self-service drop authoring
// ships (v1.x).
//
// Usage:
//   node scripts/create-drop.mjs \
//     --kind listing \
//     --linked-id 11111111-... \
//     --price 49.99 \
//     --quantity 500 \
//     --go-live-at 2026-06-15T17:00:00Z \
//     --hero-image-url https://... \
//     [--vendor-id 22222222-...] \
//     [--featured]
//
// Required: --kind (listing|pack), --linked-id, --price, --quantity, --go-live-at
// For kind=standalone: provide --title --description --cover-url instead of --linked-id
//
// On success, prints the new drop_id and a summary.

import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

// Parse --foo bar style flags into a {foo: bar} object. Boolean flags
// with no value (--featured) become {featured: true}.
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

const kind = args.kind;
if (!['listing', 'pack', 'standalone'].includes(kind)) {
  fail('--kind must be one of: listing, pack, standalone');
}

const price = parseFloat(args.price);
if (!isFinite(price) || price < 1) fail('--price must be a number >= 1');

const quantity = parseInt(args.quantity, 10);
if (!isFinite(quantity) || quantity < 1) fail('--quantity must be an integer >= 1');

const goLiveAt = args['go-live-at'];
if (!goLiveAt) fail('--go-live-at is required (ISO 8601, e.g. 2026-06-15T17:00:00Z)');
if (isNaN(Date.parse(goLiveAt))) fail('--go-live-at must be a valid ISO 8601 timestamp');

const row = {
  kind,
  price,
  quantity_total: quantity,
  go_live_at: goLiveAt,
  hero_image_url: args['hero-image-url'] ?? null,
  vendor_id: args['vendor-id'] ?? null,
  is_featured: !!args.featured,
};

if (kind === 'listing' || kind === 'pack') {
  const id = args['linked-id'];
  if (!id) fail(`--linked-id is required for kind=${kind}`);
  if (kind === 'listing') row.listing_id = id;
  if (kind === 'pack') row.pack_id = id;
} else if (kind === 'standalone') {
  const title = args.title;
  if (!title) fail('--title is required for kind=standalone');
  row.title = title;
  row.description = args.description ?? null;
  row.cover_url = args['cover-url'] ?? null;
}

const res = await fetch(`${SUPABASE_URL}/rest/v1/drops`, {
  method: 'POST',
  headers: {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify(row),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`error: insert failed (HTTP ${res.status})`);
  console.error(body);
  process.exit(1);
}

const [drop] = await res.json();
console.log('Drop created:');
console.log(`  id:             ${drop.id}`);
console.log(`  kind:           ${drop.kind}`);
console.log(`  price:          $${drop.price}`);
console.log(`  quantity:       ${drop.quantity_total} total (${drop.quantity_sold} sold)`);
console.log(`  go_live_at:     ${drop.go_live_at}`);
if (drop.listing_id) console.log(`  listing_id:     ${drop.listing_id}`);
if (drop.pack_id) console.log(`  pack_id:        ${drop.pack_id}`);
if (drop.title) console.log(`  title:          ${drop.title}`);
console.log(`  hero_image_url: ${drop.hero_image_url ?? '(none)'}`);
console.log(`  vendor_id:      ${drop.vendor_id ?? '(none)'}`);
console.log(`  featured:       ${drop.is_featured}`);
console.log('');
console.log(`URL when live:    https://inkstash.com/drop/${drop.id}`);
