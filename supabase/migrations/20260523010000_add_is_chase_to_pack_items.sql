-- Phase 3.5b economy fix: distinguish "fair share" comics from chase variants.
-- Most pulls (commons + rares) have estimated_value bounded by their share of
-- the pack price, so the 90% buyback never exceeds the pack price (the house
-- always keeps the 10% edge). Chase variants (1:50, 1:100 ratio covers,
-- signed comics) are flagged is_chase=true and may exceed that bound — they're
-- the legendary upside that justifies pulling more packs.

ALTER TABLE public.pack_items
  ADD COLUMN IF NOT EXISTS is_chase boolean NOT NULL DEFAULT false;

-- Flag any existing legendary items as chase by default so they retain
-- their high estimated_value through the upcoming re-seed step.
UPDATE public.pack_items
   SET is_chase = true
 WHERE rarity = 'legendary';

CREATE INDEX IF NOT EXISTS idx_pack_items_is_chase
  ON public.pack_items(pack_id, is_chase);
