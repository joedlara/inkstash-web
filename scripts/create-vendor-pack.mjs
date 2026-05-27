// scripts/create-vendor-pack.mjs
//
// Create a vendor pack from a JSON spec file. The spec defines the pack,
// its items, and which vendor owns it. The script:
//   1. Inserts the packs row (status='upcoming', origin='vendor', value_lock=true)
//   2. Inserts pack_items rows
//   3. Inserts pack_revenue_splits row (snapshots vendor.commission_rate)
//   4. Runs validate_vendor_pack — if fails, prints error and exits 1
//   5. Updates pack status to 'active'
//
// Usage:
//   node scripts/create-vendor-pack.mjs path/to/pack-spec.json
//
// Example spec file:
// {
//   "vendor_handle": "bigtimecomics",
//   "name": "Transformers #25 — Artist Variants",
//   "price": 150.00,
//   "item_count": 3,
//   "curator_note": "I commissioned these covers because the anniversary...",
//   "cover_image": "https://...",
//   "items": [
//     { "comic_title": "Transformers #25 (Artist A cardstock)",
//       "rarity": "common", "cover_treatment": "cardstock",
//       "declared_value": 50.00, "quantity": 50, "remaining": 50,
//       "image_url": "https://...", "is_chase": false },
//     ...
//     { "comic_title": "Transformers #25 (Artist A signed)",
//       "rarity": "rare", "cover_treatment": "signed",
//       "declared_value": 200.00, "quantity": 5, "remaining": 5,
//       "image_url": "https://...", "is_chase": true }
//   ]
// }

import 'dotenv/config';
import { readFileSync } from 'node:fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const specPath = process.argv[2];
if (!specPath) {
  console.error('Usage: node scripts/create-vendor-pack.mjs <spec.json>');
  process.exit(1);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));

const headers = {
  apikey: SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function main() {
  // 1. Look up vendor
  const vendors = await rest(
    `/vendors?handle=eq.${encodeURIComponent(spec.vendor_handle)}&select=id,commission_rate,status`,
  );
  if (vendors.length === 0) throw new Error(`Vendor handle not found: ${spec.vendor_handle}`);
  const vendor = vendors[0];
  if (vendor.status !== 'active') {
    throw new Error(`Vendor status is ${vendor.status} (need active)`);
  }
  console.log(`Vendor ${spec.vendor_handle} → ${vendor.id} (commission ${vendor.commission_rate})`);

  // 2. Insert pack
  const packs = await rest('/packs', {
    method: 'POST',
    body: JSON.stringify({
      name: spec.name,
      partner: spec.vendor_handle, // backward-compat with existing partner display
      price: spec.price,
      item_count: spec.item_count,
      rarity_tiers: { common: 1.0, rare: 0.0, legendary: 0.0 }, // unused for vendor packs, satisfies NOT NULL
      status: 'upcoming',
      origin: 'vendor',
      vendor_id: vendor.id,
      value_lock: true,
      curator_note: spec.curator_note ?? null,
      cover_image: spec.cover_image ?? null,
      is_sealed_collectible: spec.is_sealed_collectible ?? false,
    }),
  });
  const pack = packs[0];
  console.log(`Inserted pack ${pack.id} (status=upcoming)`);

  // 3. Insert pack_items
  const itemRows = spec.items.map((it) => ({
    pack_id: pack.id,
    comic_title: it.comic_title,
    issue_number: it.issue_number ?? null,
    grade: it.grade ?? null,
    condition: it.condition ?? null,
    rarity: it.rarity, // common | rare | legendary — required by existing schema
    cover_treatment: it.cover_treatment,
    declared_value: it.declared_value,
    estimated_value: it.declared_value, // mirror for compatibility with existing reads
    image_url: it.image_url ?? null,
    quantity: it.quantity,
    remaining: it.remaining,
    is_chase: Boolean(it.is_chase),
  }));
  await rest('/pack_items', { method: 'POST', body: JSON.stringify(itemRows) });
  console.log(`Inserted ${itemRows.length} pack_items`);

  // 4. Insert pack_revenue_splits
  await rest('/pack_revenue_splits', {
    method: 'POST',
    body: JSON.stringify({
      pack_id: pack.id,
      vendor_id: vendor.id,
      vendor_cut: 1 - vendor.commission_rate,
      inkstash_cut: vendor.commission_rate,
    }),
  });
  console.log(`Inserted pack_revenue_splits (vendor ${(1 - vendor.commission_rate) * 100}% / inkstash ${vendor.commission_rate * 100}%)`);

  // 5. Validate
  const valRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_vendor_pack`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_pack_id: pack.id }),
  });
  if (!valRes.ok) throw new Error(`Validator RPC failed: ${valRes.status} ${await valRes.text()}`);
  const validationError = await valRes.json();
  if (validationError !== null) {
    console.error(`✗ Validation failed: ${validationError}`);
    console.error('Pack left in status=upcoming. Fix the spec and update the pack manually, or delete it.');
    process.exit(1);
  }
  console.log(`✓ Validation passed`);

  // 6. Activate
  await rest(`/packs?id=eq.${pack.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'active' }),
  });
  console.log(`✓ Pack activated: ${pack.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
