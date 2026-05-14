-- ── packs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.packs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  partner       text NOT NULL DEFAULT 'InkStash House',
  price         numeric(10,2) NOT NULL CHECK (price >= 0),
  item_count    int NOT NULL DEFAULT 5 CHECK (item_count > 0),
  rarity_tiers  jsonb NOT NULL DEFAULT '{"common":0.70,"rare":0.25,"legendary":0.05}',
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold_out','upcoming','archived')),
  cover_image   text,
  badge         text CHECK (badge IN ('COLLAB','HOT','NEW','SOLD OUT') OR badge IS NULL),
  drop_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── pack_items ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pack_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id         uuid NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  comic_title     text NOT NULL,
  issue_number    text,
  grade           text,
  condition       text,
  rarity          text NOT NULL CHECK (rarity IN ('common','rare','legendary')),
  estimated_value numeric(10,2),
  image_url       text,
  quantity        int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  remaining       int NOT NULL CHECK (remaining >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT remaining_lte_quantity CHECK (remaining <= quantity)
);

-- ── pack_purchases ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pack_purchases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id          uuid NOT NULL REFERENCES public.packs(id),
  items_received   jsonb NOT NULL DEFAULT '[]',
  stripe_payment_intent_id text,
  revealed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_packs_status ON public.packs(status);
CREATE INDEX IF NOT EXISTS idx_pack_items_pack_id ON public.pack_items(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_items_rarity ON public.pack_items(rarity);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_user_id ON public.pack_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_pack_id ON public.pack_purchases(pack_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_purchases ENABLE ROW LEVEL SECURITY;

-- packs: anyone can read active/upcoming packs
CREATE POLICY "packs_read_public" ON public.packs
  FOR SELECT USING (status IN ('active','upcoming','sold_out'));

-- pack_items: anyone can read items (odds display)
CREATE POLICY "pack_items_read_public" ON public.pack_items
  FOR SELECT USING (true);

-- pack_purchases: users can only read their own purchases
CREATE POLICY "pack_purchases_read_own" ON public.pack_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- ── Seed data (for dev/preview) ───────────────────────────────────────────────
INSERT INTO public.packs (id, name, partner, price, item_count, rarity_tiers, status, cover_image, badge)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'DC Legends Pack',        'DC × InkStash',    14.99, 5, '{"common":0.80,"rare":0.18,"legendary":0.02}', 'active',   'https://picsum.photos/seed/dc1/400/520',     'COLLAB'),
  ('11111111-0000-0000-0000-000000000002', 'Spider-Verse Keys',      'InkStash House',   24.99, 3, '{"common":0.70,"rare":0.25,"legendary":0.05}', 'active',   'https://picsum.photos/seed/spider1/400/520', 'HOT'),
  ('11111111-0000-0000-0000-000000000003', 'Image Horror Bundle',    'Image × InkStash', 19.99, 4, '{"common":0.85,"rare":0.14,"legendary":0.01}', 'active',   'https://picsum.photos/seed/horror1/400/520', 'NEW'),
  ('11111111-0000-0000-0000-000000000004', 'Conan Keys Pack',        'BOOM! × InkStash', 14.99, 5, '{"common":0.75,"rare":0.22,"legendary":0.03}', 'sold_out', 'https://picsum.photos/seed/conan1/400/520',  'SOLD OUT'),
  ('11111111-0000-0000-0000-000000000005', 'Marvel Silver Age',      'InkStash House',   34.99, 6, '{"common":0.62,"rare":0.30,"legendary":0.08}', 'active',   'https://picsum.photos/seed/marvel1/400/520', 'HOT'),
  ('11111111-0000-0000-0000-000000000006', 'Golden Age Mystery Box', 'InkStash House',   49.99, 4, '{"common":0.55,"rare":0.35,"legendary":0.10}', 'active',   'https://picsum.photos/seed/golden1/400/520', 'NEW')
ON CONFLICT (id) DO NOTHING;

-- Seed pack_items for the DC Legends Pack (pack 1)
INSERT INTO public.pack_items (pack_id, comic_title, issue_number, grade, rarity, estimated_value, quantity, remaining)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'Action Comics', '#1 Facsimile', 'Raw NM', 'legendary', 29.99, 50, 50),
  ('11111111-0000-0000-0000-000000000001', 'Batman', '#232 (1st Ra''s al Ghul)', 'Raw VF', 'rare', 89.99, 100, 100),
  ('11111111-0000-0000-0000-000000000001', 'Superman', '#75 (Death of Superman)', 'Raw NM', 'rare', 14.99, 200, 200),
  ('11111111-0000-0000-0000-000000000001', 'Detective Comics', '#359 (1st Batgirl)', 'Raw FN', 'rare', 49.99, 75, 75),
  ('11111111-0000-0000-0000-000000000001', 'Green Lantern', '#76 (Adams Run)', 'Raw VG', 'common', 8.99, 500, 500),
  ('11111111-0000-0000-0000-000000000001', 'The Flash', '#123 (Flash of Two Worlds)', 'Raw GD', 'common', 5.99, 500, 500),
  ('11111111-0000-0000-0000-000000000001', 'Justice League', '#1 (New 52)', 'Raw NM', 'common', 3.99, 1000, 1000),
  ('11111111-0000-0000-0000-000000000001', 'Wonder Woman', '#1 (2016)', 'Raw NM', 'common', 2.99, 1000, 1000);
