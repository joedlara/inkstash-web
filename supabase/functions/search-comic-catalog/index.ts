// supabase/functions/search-comic-catalog/index.ts
//
// Authenticated. Comic search backed by Postgres tsvector cache + ComicVine API.
//
// Flow:
//   1. Validate auth + query
//   2. Search comic_catalog_cache via plainto_tsquery
//   3. If fewer than 3 hits, call ComicVine /issues/?filter=name:<query>
//   4. Upsert ComicVine results into the cache
//   5. Return unified result list (cache + new) deduped by id
//
// Request body:
//   { query: string }
//
// Response:
//   { results: Array<{ id, name, issue_number, cover_url, publisher, writer, artist }> }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  query?: string
}

interface ComicVineIssue {
  id: number
  name: string | null
  issue_number: string | null
  image?: { thumb_url?: string; small_url?: string; medium_url?: string }
  cover_date?: string | null
  volume?: { name?: string; publisher?: { name?: string } }
  person_credits?: Array<{ name: string; role: string }>
}

interface CatalogResult {
  id: number
  name: string
  issue_number: string | null
  cover_url: string | null
  publisher: string | null
  writer: string | null
  artist: string | null
}

const COMIC_VINE_BASE = 'https://comicvine.gamespot.com/api'
const MIN_RESULTS_BEFORE_API = 3

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // @ts-expect-error Deno env
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    // @ts-expect-error Deno env
    const comicVineKey = Deno.env.get('COMIC_VINE_KEY') ?? ''

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body: RequestBody = await req.json()
    const query = (body.query ?? '').trim()
    if (query.length < 2) return json({ results: [] }, 200)

    // Step 1: query the cache via tsvector
    const { data: cacheHits, error: cacheError } = await serviceClient
      .from('comic_catalog_cache')
      .select('id, name, issue_number, cover_url, publisher, writer, artist')
      .textSearch(
        'comic_catalog_search_idx',
        query.split(/\s+/).join(' & '),
        { type: 'plain' },
      )
      .limit(20)

    if (cacheError) {
      // textSearch index name may not be addressable from PostgREST in all setups.
      // Fall back to a plain ILIKE search if the gin index lookup errors.
      console.warn('[search-comic-catalog] cache tsvector failed, falling back to ILIKE:', cacheError)
    }

    let results: CatalogResult[] = []
    if (cacheHits) {
      results = cacheHits as CatalogResult[]
    } else {
      // ILIKE fallback
      const { data: ilikeHits } = await serviceClient
        .from('comic_catalog_cache')
        .select('id, name, issue_number, cover_url, publisher, writer, artist')
        .or(`name.ilike.%${query}%,issue_number.ilike.%${query}%`)
        .limit(20)
      results = (ilikeHits ?? []) as CatalogResult[]
    }

    // Step 2: if not enough cache hits, hit ComicVine
    if (results.length < MIN_RESULTS_BEFORE_API && comicVineKey) {
      try {
        const cvResults = await fetchComicVine(query, comicVineKey)

        // Upsert into cache
        if (cvResults.length > 0) {
          const cacheRows = cvResults.map((r) => ({
            id: r.id,
            name: r.name,
            issue_number: r.issue_number,
            cover_url: r.cover_url,
            publisher: r.publisher,
            writer: r.writer,
            artist: r.artist,
            cover_date: null,
            raw_response: null,
            cached_at: new Date().toISOString(),
          }))

          const { error: upsertError } = await serviceClient
            .from('comic_catalog_cache')
            .upsert(cacheRows, { onConflict: 'id' })

          if (upsertError) {
            console.error('[search-comic-catalog] cache upsert failed:', upsertError)
          }
        }

        // Merge cache hits with API results, dedupe by id
        const seen = new Set(results.map((r) => r.id))
        for (const r of cvResults) {
          if (!seen.has(r.id)) {
            results.push(r)
            seen.add(r.id)
          }
        }
      } catch (err) {
        console.error('[search-comic-catalog] ComicVine call failed (returning cache only):', err)
      }
    }

    return json({ results: results.slice(0, 20) }, 200)
  } catch (err) {
    console.error('[search-comic-catalog] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

async function fetchComicVine(query: string, apiKey: string): Promise<CatalogResult[]> {
  // ComicVine requires User-Agent + api_key. Format response as JSON.
  // Fields requested narrow the payload size considerably.
  const params = new URLSearchParams({
    api_key: apiKey,
    format: 'json',
    filter: `name:${query}`,
    field_list: 'id,name,issue_number,image,cover_date,volume,person_credits',
    limit: '15',
  })
  const url = `${COMIC_VINE_BASE}/issues/?${params.toString()}`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'InkStash/1.0 (marketplace catalog)',
    },
  })

  if (!res.ok) {
    throw new Error(`ComicVine ${res.status}: ${await res.text()}`)
  }

  const body = await res.json() as { results?: ComicVineIssue[] }
  const issues = body.results ?? []

  return issues.map((issue): CatalogResult => {
    const writer = (issue.person_credits ?? [])
      .find((p) => /writer/i.test(p.role))?.name ?? null
    const artist = (issue.person_credits ?? [])
      .find((p) => /(artist|penciller|inker)/i.test(p.role))?.name ?? null

    return {
      id: issue.id,
      name: issue.name ?? issue.volume?.name ?? 'Untitled',
      issue_number: issue.issue_number,
      cover_url: issue.image?.medium_url ?? issue.image?.thumb_url ?? null,
      publisher: issue.volume?.publisher?.name ?? null,
      writer,
      artist,
    }
  })
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
