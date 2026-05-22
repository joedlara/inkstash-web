// Ruby bundle catalog — Deno copy.
// IMPORTANT: keep in sync with src/config/rubyBundles.ts (frontend copy).

export interface RubyBundle {
  id: string
  label: string
  usdCents: number
  baseRubies: number
  bonusRubies: number
  totalRubies: number
  bonusPct: number
}

export const RUBY_BUNDLES: RubyBundle[] = [
  { id: 'starter',    label: 'Starter',    usdCents:   499, baseRubies:   499, bonusRubies:    0, totalRubies:    499, bonusPct:  0 },
  { id: 'popular',    label: 'Popular',    usdCents:   999, baseRubies:   999, bonusRubies:  201, totalRubies:  1200, bonusPct: 20 },
  { id: 'best_value', label: 'Best Value', usdCents:  2499, baseRubies:  2499, bonusRubies: 1001, totalRubies:  3500, bonusPct: 40 },
  { id: 'mega',       label: 'Mega',       usdCents:  9999, baseRubies:  9999, bonusRubies: 5001, totalRubies: 15000, bonusPct: 50 },
]

export function findBundle(id: string): RubyBundle | undefined {
  return RUBY_BUNDLES.find((b) => b.id === id)
}
