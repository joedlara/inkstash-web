// scripts/validate-vendor-pack.mjs
//
// Run the validate_vendor_pack SQL function for a pack id, print result.
//
// Usage:
//   node scripts/validate-vendor-pack.mjs <pack_id>
//
// Exit code 0 on pass, 1 on fail.

import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const packId = process.argv[2];
if (!packId) {
  console.error('Usage: node scripts/validate-vendor-pack.mjs <pack_id>');
  process.exit(1);
}

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_vendor_pack`, {
  method: 'POST',
  headers: {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ p_pack_id: packId }),
});

if (!res.ok) {
  console.error(`RPC failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const result = await res.json(); // null on pass, string on fail

if (result === null) {
  console.log(`✓ Pack ${packId} passes validation`);
  process.exit(0);
} else {
  console.log(`✗ Pack ${packId} FAILED: ${result}`);
  process.exit(1);
}
