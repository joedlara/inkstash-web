// scripts/create-vendor.mjs
//
// Create a vendor row + Stripe Connect Express account + onboarding link.
//
// Usage:
//   node scripts/create-vendor.mjs \
//     --user-email vendor@example.com \
//     --display-name "BigTime Comics" \
//     --handle bigtimecomics \
//     --commission-rate 0.10 \
//     --is-publisher
//
// Env required:
//   VITE_SUPABASE_URL
//   SUPABASE_SECRET_KEY     (service role key)
//   STRIPE_SECRET_KEY
//
// Prints the Stripe Connect onboarding link to stdout. Email it to the
// vendor. The webhook flips vendors.status to 'active' once they complete
// onboarding.

import 'dotenv/config';
import Stripe from 'stripe';

const args = parseArgs(process.argv.slice(2));

if (!args['user-email'] || !args['display-name'] || !args['handle']) {
  console.error('Missing required args. See file header for usage.');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !STRIPE_SECRET_KEY) {
  console.error('Missing VITE_SUPABASE_URL, SUPABASE_SECRET_KEY, or STRIPE_SECRET_KEY in .env');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const restHeaders = {
  apikey: SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...restHeaders, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function main() {
  // 1. Find the auth user by email
  const usersRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(args['user-email'])}`,
    { headers: { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}` } },
  );
  if (!usersRes.ok) {
    throw new Error(`auth admin lookup failed: ${usersRes.status} ${await usersRes.text()}`);
  }
  const usersJson = await usersRes.json();
  const authUser = (usersJson.users ?? []).find((u) => u.email === args['user-email']);
  if (!authUser) {
    console.error(`No auth.users row for ${args['user-email']}. Have them sign up first.`);
    process.exit(1);
  }
  console.log(`Found auth user ${authUser.id}`);

  // 2. Create Stripe Connect Express account
  const account = await stripe.accounts.create({
    type: 'express',
    email: args['user-email'],
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    metadata: {
      vendor_handle: args['handle'],
      inkstash_user_id: authUser.id,
    },
  });
  console.log(`Created Stripe Connect account ${account.id}`);

  // 3. Insert vendors row
  const commissionRate = args['commission-rate']
    ? Number(args['commission-rate'])
    : 0.300;
  if (!(commissionRate >= 0 && commissionRate <= 1)) {
    throw new Error(`commission-rate must be 0..1, got ${args['commission-rate']}`);
  }

  const vendor = await rest('/vendors', {
    method: 'POST',
    body: JSON.stringify({
      user_id: authUser.id,
      display_name: args['display-name'],
      handle: args['handle'],
      is_publisher: Boolean(args['is-publisher']),
      commission_rate: commissionRate,
      stripe_connect_account_id: account.id,
      status: 'pending',
    }),
  });
  console.log(`Inserted vendors row ${vendor[0].id}`);

  // 4. Create the onboarding link
  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: 'https://inkstash.app/seller-onboarding/refresh',
    return_url: 'https://inkstash.app/seller-onboarding/complete',
    type: 'account_onboarding',
  });

  console.log('');
  console.log('==================================================');
  console.log(`Onboarding link for ${args['display-name']}:`);
  console.log(link.url);
  console.log('==================================================');
  console.log('Email this link to the vendor. It expires after ~1 hour.');
  console.log('Once they complete onboarding, the webhook flips status to active.');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
