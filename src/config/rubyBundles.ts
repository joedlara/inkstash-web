// Ruby bundle catalog — Fortnite-inspired tiers with bonus % escalation.
// IMPORTANT: keep in sync with supabase/functions/_shared/rubyBundles.ts
// (server-side has its own copy because Edge Functions can't import from src/).

export interface RubyBundle {
  id: string;
  label: string;
  usdCents: number;
  baseRubies: number;
  bonusRubies: number;
  totalRubies: number;
  bonusPct: number;
  highlight?: 'popular' | 'best_value';
}

export const RUBY_BUNDLES: RubyBundle[] = [
  {
    id: 'starter',
    label: 'Starter',
    usdCents: 499,
    baseRubies: 499,
    bonusRubies: 0,
    totalRubies: 499,
    bonusPct: 0,
  },
  {
    id: 'popular',
    label: 'Popular',
    usdCents: 999,
    baseRubies: 999,
    bonusRubies: 201,
    totalRubies: 1200,
    bonusPct: 20,
    highlight: 'popular',
  },
  {
    id: 'best_value',
    label: 'Best Value',
    usdCents: 2499,
    baseRubies: 2499,
    bonusRubies: 1001,
    totalRubies: 3500,
    bonusPct: 40,
    highlight: 'best_value',
  },
  {
    id: 'mega',
    label: 'Mega',
    usdCents: 9999,
    baseRubies: 9999,
    bonusRubies: 5001,
    totalRubies: 15000,
    bonusPct: 50,
  },
];

export function findBundle(id: string): RubyBundle | undefined {
  return RUBY_BUNDLES.find((b) => b.id === id);
}

/**
 * Smallest bundle whose totalRubies >= rubyCost. Used to pre-select a tile
 * when the user clicks Open Pack with insufficient balance.
 */
export function smallestBundleFor(rubyCost: number, currentBalance: number): RubyBundle {
  const needed = Math.max(0, rubyCost - currentBalance);
  return RUBY_BUNDLES.find((b) => b.totalRubies >= needed) ?? RUBY_BUNDLES[RUBY_BUNDLES.length - 1];
}

export const RUBIES_PER_USD = 100;

/** Convert a pack USD price into a Ruby price. */
export function packPriceToRubies(usdPrice: number): number {
  return Math.round(usdPrice * RUBIES_PER_USD);
}
