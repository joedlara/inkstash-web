/**
 * Recalculate pack_items.estimated_value so each pack's expected pulled value
 * equals the pack price. Plugs the infinite-Rubies exploit by ensuring that
 * 90% buyback on a typical pull always returns less than what the user spent.
 *
 * Math model:
 *   - Each pack has a price (USD) and rarity_tiers weights {common, rare, legendary}
 *   - We compute target_value_per_draw = pack.price / pack.item_count
 *   - Within a rarity tier, items get values scaled relative to a baseline so
 *     the *expected weighted value of one draw* equals target_value_per_draw
 *   - is_chase items are skipped — their value can exceed the pack budget
 *     (they're the gambling upside)
 *
 * Tier multipliers (against target_value_per_draw):
 *   - common  -> 0.6  (you typically lose money on commons-only pulls)
 *   - rare    -> 1.8  (a rare nudges you near break-even)
 *   - legendary (non-chase) -> 4.5  (legendary is a real win)
 *
 * Expected value per draw with default tier weights (0.80 / 0.18 / 0.02):
 *   0.80 * 0.6 + 0.18 * 1.8 + 0.02 * 4.5 = 0.48 + 0.324 + 0.09 = 0.894
 *   That's ~89% of target_value_per_draw, leaving a comfortable house edge
 *   even before the 90% buyback rate compounds it.
 *
 * Chase items (is_chase=true) are left untouched — their value should reflect
 * their actual market value (signed/remarked covers, 1:50 ratio variants, etc.)
 *
 * Run: node scripts/recalc-pack-item-values.mjs
 *      node scripts/recalc-pack-item-values.mjs --dry-run
 */

import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

// Per-pack expected value ratio. < 1 leaves the house an edge before buyback
// rate is even applied. With this set to 0.97 and the 90% buyback rate,
// users on average return ~87% of what they spent on a typical pull. The 13%
// gap is the structural house edge, regardless of how rarity tiers are weighted.
const EXPECTED_VALUE_RATIO = 0.97;

// Relative multipliers within a pack — commons are below their fair-share
// value, rares are 3x that, legendaries are 8x. We then scale all three so
// the weighted expectation matches EXPECTED_VALUE_RATIO. Solving keeps the
// gap structurally enforced no matter how the pack's rarity weights are tuned.
const RELATIVE = { common: 1, rare: 3, legendary: 8 };

function solveTierMultipliers(tiers) {
  // Weighted relative = Σ tier_weight × tier_relative
  const weightedRelative =
    (tiers.common ?? 0) * RELATIVE.common +
    (tiers.rare ?? 0) * RELATIVE.rare +
    (tiers.legendary ?? 0) * RELATIVE.legendary;
  if (weightedRelative === 0) {
    return { common: 1, rare: 1, legendary: 1 };
  }
  // Scale so the weighted average lands at EXPECTED_VALUE_RATIO
  const scale = EXPECTED_VALUE_RATIO / weightedRelative;
  return {
    common: RELATIVE.common * scale,
    rare: RELATIVE.rare * scale,
    legendary: RELATIVE.legendary * scale,
  };
}

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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function fmtUsd(n) {
  return `$${n.toFixed(2)}`;
}

function expectedPulledValue(targetPerDraw, tiers, multipliers) {
  return targetPerDraw * (
    (tiers.common ?? 0) * multipliers.common +
    (tiers.rare ?? 0) * multipliers.rare +
    (tiers.legendary ?? 0) * multipliers.legendary
  );
}

async function main() {
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Recalculating pack_items.estimated_value...\n`);

  const packs = await rest('/packs?select=id,name,price,item_count,rarity_tiers&order=name.asc');
  console.log(`Found ${packs.length} packs.\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const pack of packs) {
    const price = Number(pack.price);
    const itemCount = pack.item_count;
    const tiers = pack.rarity_tiers ?? { common: 0.8, rare: 0.18, legendary: 0.02 };

    if (!price || !itemCount) {
      console.log(`  skipping ${pack.name} (missing price or item_count)`);
      continue;
    }

    const targetPerDraw = price / itemCount;
    const multipliers = solveTierMultipliers(tiers);
    const expectedValueOnFullPull = expectedPulledValue(targetPerDraw, tiers, multipliers) * itemCount;
    const expectedBuyback = expectedValueOnFullPull * 0.9;
    const houseEdge = price - expectedBuyback;

    console.log(`────────────────────────────────────────────────────────────`);
    console.log(`${pack.name}`);
    console.log(`  price: ${fmtUsd(price)} · ${itemCount} items · target/draw: ${fmtUsd(targetPerDraw)}`);
    console.log(`  expected pulled value: ${fmtUsd(expectedValueOnFullPull)}`);
    console.log(`  expected buyback (90%): ${fmtUsd(expectedBuyback)}`);
    console.log(`  house edge: ${fmtUsd(houseEdge)} (${((houseEdge / price) * 100).toFixed(1)}%)`);

    const items = await rest(
      `/pack_items?pack_id=eq.${pack.id}&select=id,comic_title,rarity,estimated_value,is_chase`,
    );

    for (const item of items) {
      if (item.is_chase) {
        totalSkipped++;
        continue;
      }
      const multiplier = multipliers[item.rarity] ?? 1.0;
      const newValue = Math.round(targetPerDraw * multiplier * 100) / 100; // round to cents

      if (Number(item.estimated_value) === newValue) continue;

      console.log(
        `    ${item.rarity.padEnd(9)} ${item.comic_title.padEnd(32).slice(0, 32)} ` +
        `${fmtUsd(Number(item.estimated_value || 0)).padStart(8)} -> ${fmtUsd(newValue).padStart(8)}`,
      );

      if (!DRY_RUN) {
        await rest(`/pack_items?id=eq.${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ estimated_value: newValue }),
        });
      }
      totalUpdated++;
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] Would update' : 'Updated'} ${totalUpdated} pack_items. Skipped ${totalSkipped} chase items.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
