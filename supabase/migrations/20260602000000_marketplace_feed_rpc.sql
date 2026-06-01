-- query_marketplace_feed: unified server-side query for /marketplace.
--
-- Returns listings (status='active' AND is_buy_now=true) UNIONed with
-- auctions (status IN ('active','live')), projected into a common row shape.
-- The function applies filters (publisher, query, source), sorts, and
-- paginates server-side so the client just consumes a page.
--
-- Filters JSON shape (all optional):
--   { "publisher": text, "query": text, "source": "all" | "listing" | "auction" }
--
-- Sort values: "recent" (default) | "price_asc" | "price_desc" | "ending_soon"
--
-- The function is SECURITY DEFINER so it can read across listings + auctions
-- without RLS friction. The query is constrained by status filters so
-- delisted / sold / archived rows never appear in the feed.

CREATE OR REPLACE FUNCTION public.query_marketplace_feed(
  p_filters    jsonb DEFAULT '{}'::jsonb,
  p_sort       text  DEFAULT 'recent',
  p_page       int   DEFAULT 1,
  p_page_size  int   DEFAULT 24
)
RETURNS TABLE (
  id                    uuid,
  source                text,
  title                 text,
  cover_url             text,
  price                 numeric,
  display_price_label   text,
  seller_id             uuid,
  comic_publisher       text,
  comic_writer          text,
  comic_artist          text,
  comic_issue_number    text,
  is_vault_item         boolean,
  ends_at               timestamptz,
  created_at            timestamptz,
  total_count           bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_publisher text := p_filters->>'publisher';
  v_query     text := p_filters->>'query';
  v_source    text := coalesce(p_filters->>'source', 'all');
  v_offset    int  := greatest(0, (p_page - 1) * p_page_size);
BEGIN
  RETURN QUERY
  WITH unified AS (
    -- Listings
    SELECT
      l.id,
      'listing'::text AS source,
      l.title::text,
      (l.photos->0->>'url') AS cover_url,
      l.buy_now_price AS price,
      'Buy now'::text AS display_price_label,
      l.user_id AS seller_id,
      l.comic_publisher::text,
      l.comic_writer::text,
      l.comic_artist::text,
      l.comic_issue_number::text,
      (l.source_inventory_id IS NOT NULL) AS is_vault_item,
      NULL::timestamptz AS ends_at,
      l.created_at
    FROM public.listings l
    WHERE l.status = 'active'
      AND coalesce(l.is_buy_now, false) = true
      AND (v_source = 'all' OR v_source = 'listing')
      AND (v_publisher IS NULL OR l.comic_publisher = v_publisher)
      AND (
        v_query IS NULL
        OR l.title ILIKE '%' || v_query || '%'
        OR coalesce(l.comic_issue_number, '') ILIKE '%' || v_query || '%'
      )

    UNION ALL

    -- Auctions (read-only in v1 — buy flow lives in Phase 6)
    SELECT
      a.id,
      'auction'::text AS source,
      a.title,
      a.image_url AS cover_url,
      coalesce(a.current_bid, a.starting_bid) AS price,
      'Current bid'::text AS display_price_label,
      a.seller_id,
      NULL::text AS comic_publisher,
      NULL::text AS comic_writer,
      NULL::text AS comic_artist,
      NULL::text AS comic_issue_number,
      false AS is_vault_item,
      a.end_time AS ends_at,
      a.created_at
    FROM public.auctions a
    WHERE a.status IN ('active', 'live')
      AND (v_source = 'all' OR v_source = 'auction')
      AND (
        v_query IS NULL
        OR a.title ILIKE '%' || v_query || '%'
      )
  ),
  counted AS (
    SELECT u.*, count(*) OVER () AS total_count
    FROM unified u
  )
  SELECT
    c.id,
    c.source,
    c.title,
    c.cover_url,
    c.price,
    c.display_price_label,
    c.seller_id,
    c.comic_publisher,
    c.comic_writer,
    c.comic_artist,
    c.comic_issue_number,
    c.is_vault_item,
    c.ends_at,
    c.created_at,
    c.total_count
  FROM counted c
  ORDER BY
    CASE WHEN p_sort = 'price_asc'   THEN c.price END ASC NULLS LAST,
    CASE WHEN p_sort = 'price_desc'  THEN c.price END DESC NULLS LAST,
    CASE WHEN p_sort = 'ending_soon' THEN c.ends_at END ASC NULLS LAST,
    CASE WHEN p_sort NOT IN ('price_asc', 'price_desc', 'ending_soon')
         THEN c.created_at END DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.query_marketplace_feed(jsonb, text, int, int)
  TO anon, authenticated, service_role;
