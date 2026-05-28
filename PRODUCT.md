# InkStash — Product Context

## Product Purpose

InkStash is a mobile-first comic book collectibles platform combining blind bag pack opening, live streaming with integrated raffles and drops, and a standard comic marketplace (fixed price + auctions). Think Whatnot meets CS:GO cases, built specifically for comic collectors.

Revenue model: marketplace cut on all transactions + house margin on InkStash-operated packs + optional seller subscriptions post-launch.

## Register

product

## Users

**Primary (buyers/collectors):** Comic collectors aged 18–35. Phone-first. Impulse buyers who enjoy the thrill of the pull. Familiar with Whatnot, TCGPlayer, eBay. Motivated by chasing key issues, graded slabs, rare variants. They buy packs for the gamble and watch live breaks for entertainment.

**Secondary (sellers/streamers):** Independent comic dealers and collectors who want to liquidate inventory via live streaming, raffles, and drops. Familiar with Whatnot seller flows. Care about reach, conversion, and payout speed.

## Brand Tone

Collector culture — not streetwear, not SaaS. Raw enthusiasm for the hobby. Direct, punchy, no filler words. Numbers and odds are stated plainly (not "up to X%" hedging). The excitement is in the pull, not the polish.

Anti-references:
- No Funko Pop bright plastic aesthetic
- No generic SaaS dashboard calm blues
- No crypto/NFT neon-on-black energy
- No TCGPlayer utilitarian plainness

Closest reference points: Whatnot (mobile-first live commerce), COMC (collector database seriousness), with the visual energy of a graded slab pop against a dark velvet case.

## Design Principles

1. **Mobile first, always.** Stream cards are portrait (9:16). Pack cards fill the column. Touch targets are generous. Nothing requires a hover to be understood.
2. **Dark is intentional.** Collectors browse at night, in dim rooms, on phones. The dark background is the velvet in a display case — it makes the art pop.
3. **Rarity communicates value.** Gold = legendary, blue = rare, gray = common. These are invariant signals. Never repurpose these colors for decoration.
4. **Live state is the highest priority signal.** LIVE badges and red indicators outrank everything else in visual hierarchy. If something is happening now, the user must see it first.
5. **Odds are honest.** Rarity percentages are always shown. No dark patterns around pull rates.
6. **Speed over ceremony.** The path from "I want to open a pack" to opened pack is as short as possible. Same for entering a raffle or joining a live break.

## Color Strategy

Restrained with committed accents. The base is near-black (not pure black — slightly blue-shifted). One primary accent (#0078FF blue) for interactive elements and rare tier. Red (#ef4444) is reserved exclusively for LIVE state and urgency. Gold (#d97706) for legendary tier and drop countdowns. Green (#10b981) for confirmed/success states.

## Typography

- Headings: Outfit (weight 900/800). Tight tracking (-0.03em). Large scale.
- Monospace data: DM Mono. Prices, odds, countdown timers, usernames. This distinguishes data from editorial copy.
- Body: Outfit at normal weight. Never Inter.
- No serif anywhere in the product.

## Anti-patterns to Avoid

- Gradient text on headers
- Side-stripe colored borders on cards (use full border or background tint)
- Glassmorphism used decoratively (only on image overlays where content lives on top of media)
- Tiny unreadable labels (minimum 0.7rem for anything a user needs to read)
- Identical card grids (pack cards, live cards, raffle cards, and drop cards each have distinct shapes appropriate to their content)
- Modal-first flows (auth is inline on the splash page, not a modal overlay)
