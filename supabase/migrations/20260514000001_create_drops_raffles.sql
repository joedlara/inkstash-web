-- ── drops ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.drops (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  partner      text NOT NULL DEFAULT 'InkStash House',
  description  text,
  drop_at      timestamptz NOT NULL,
  price        numeric(10,2) NOT NULL CHECK (price >= 0),
  quantity     int NOT NULL CHECK (quantity > 0),
  remaining    int NOT NULL CHECK (remaining >= 0),
  status       text NOT NULL DEFAULT 'upcoming'
                 CHECK (status IN ('upcoming','live','ended')),
  image_url    text,
  tags         text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drops_remaining_lte_quantity CHECK (remaining <= quantity)
);

-- ── raffles ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.raffles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_title      text NOT NULL,
  item_image_url  text,
  estimated_value numeric(10,2),
  ticket_price    numeric(10,2) NOT NULL CHECK (ticket_price > 0),
  max_spots       int NOT NULL CHECK (max_spots > 0),
  spots_filled    int NOT NULL DEFAULT 0 CHECK (spots_filled >= 0),
  status          text NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming','live','ended')),
  ends_at         timestamptz NOT NULL,
  livestream_id   uuid REFERENCES public.livestreams(id) ON DELETE SET NULL,
  winner_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT raffles_spots_filled_lte_max CHECK (spots_filled <= max_spots)
);

-- ── raffle_tickets ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.raffle_tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id   uuid NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity    int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_drops_status   ON public.drops(status);
CREATE INDEX IF NOT EXISTS idx_drops_drop_at  ON public.drops(drop_at);
CREATE INDEX IF NOT EXISTS idx_raffles_status ON public.raffles(status);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_raffle_id ON public.raffle_tickets(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_user_id   ON public.raffle_tickets(user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.drops          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_tickets ENABLE ROW LEVEL SECURITY;

-- drops: anyone can read
CREATE POLICY "drops_read_public" ON public.drops
  FOR SELECT USING (true);

-- raffles: anyone can read
CREATE POLICY "raffles_read_public" ON public.raffles
  FOR SELECT USING (true);

-- raffle_tickets: users can read their own tickets
CREATE POLICY "raffle_tickets_read_own" ON public.raffle_tickets
  FOR SELECT USING (auth.uid() = user_id);

-- raffle_tickets: users can insert their own tickets
CREATE POLICY "raffle_tickets_insert_own" ON public.raffle_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Seed data ─────────────────────────────────────────────────────────────────
INSERT INTO public.drops (id, name, partner, description, drop_at, price, quantity, remaining, status, image_url, tags)
VALUES
  (
    '22222222-0000-0000-0000-000000000001',
    'Spawn Origins Pack',
    'Image Comics × InkStash',
    'First 300 issues distilled into a 6-card blind bag. Legendary pulls include graded #1 slabs.',
    now() + interval '2 hours 34 minutes',
    29.99, 500, 347, 'upcoming',
    'https://picsum.photos/seed/spawn1/800/420',
    ARRAY['Comics', 'Keys', 'Graded']
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    'Marvel Keys Collab',
    'Marvel × InkStash',
    'Exclusive Marvel key issues — first appearances, death issues, and variant covers.',
    now() + interval '1 day 3 hours',
    39.99, 300, 300, 'upcoming',
    'https://picsum.photos/seed/marvel2/800/420',
    ARRAY['Comics', 'Keys', 'Marvel']
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    'DC Rebirth Variants',
    'DC × InkStash',
    'Rare variant covers from the DC Rebirth era. Limited to 200 packs.',
    now() + interval '3 days',
    24.99, 200, 200, 'upcoming',
    'https://picsum.photos/seed/dc2/800/420',
    ARRAY['Comics', 'Variants', 'DC']
  )
ON CONFLICT (id) DO NOTHING;
