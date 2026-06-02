// supabase/functions/generate-listing-description/index.ts
//
// Authenticated. Uses Claude Haiku 4.5 vision to write a product description
// from uploaded comic photos.
//
// Body: { photo_urls: string[]; title?: string }
//   - photo_urls: public Supabase Storage URLs (caps at 5)
//   - title: optional seller-entered title for additional context
//
// Response: { description: string }
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY +
// ANTHROPIC_API_KEY in the function secrets.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_PHOTOS = 5
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 400

const SYSTEM_PROMPT = `You are writing a product description for a comic book marketplace listing on InkStash. Look at the uploaded photos and write a 100-200 word product description in a friendly, knowledgeable tone.

Cover:
- What the comic is (title, issue number, publisher if visible)
- Visible condition notes (creases, color, spine, corners, etc.)
- Anything noteworthy from the cover (variant, signed, sealed, key issue if you can confirm from the cover/indicia)

Do not:
- Speculate about value or pricing
- Make claims you cannot verify from the photos (no "first appearance of X" unless the cover/indicia confirms it)
- Use exclamation points or salesy language
- Use markdown, bullet points, or headings

Plain prose only.`

interface RequestBody {
  photo_urls?: string[]
  title?: string
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'url'; url: string } }
  >
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>
  usage?: { input_tokens?: number; output_tokens?: number }
  error?: { message?: string; type?: string }
}

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
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!anthropicKey) {
      console.error('[generate-listing-description] ANTHROPIC_API_KEY not set')
      return json({ error: 'AI description is not configured yet.' }, 503)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body: RequestBody = await req.json()
    const photoUrls = (body.photo_urls ?? []).filter((u) => typeof u === 'string' && u.length > 0)

    if (photoUrls.length === 0) {
      return json({ error: 'photo_urls is required (at least one)' }, 400)
    }
    if (photoUrls.length > MAX_PHOTOS) {
      return json({ error: `Maximum ${MAX_PHOTOS} photos per request` }, 400)
    }

    const titleText = body.title?.trim()
      ? `Title (as the seller entered it): "${body.title.trim()}"`
      : 'Title: (not yet entered — infer from the cover if possible)'

    const userMessage: AnthropicMessage = {
      role: 'user',
      content: [
        ...photoUrls.map((url) => ({
          type: 'image' as const,
          source: { type: 'url' as const, url },
        })),
        { type: 'text' as const, text: titleText },
      ],
    }

    const anthropicReq = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [userMessage],
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30_000)
    let anthropicRes: Response
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(anthropicReq),
        signal: ctrl.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    if (!anthropicRes.ok) {
      const text = await anthropicRes.text()
      console.error('[generate-listing-description] anthropic error', anthropicRes.status, text)
      return json({ error: `Anthropic ${anthropicRes.status}: ${text}` }, 502)
    }

    const data = await anthropicRes.json() as AnthropicResponse

    if (data.error) {
      return json({ error: data.error.message ?? 'Anthropic error' }, 502)
    }

    const description = data.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('')
      .trim()

    if (!description) {
      return json({ error: 'Empty response from Claude' }, 502)
    }

    // Best-effort usage log; failure here must not block the response.
    serviceClient
      .from('anthropic_usage')
      .insert({
        user_id: user.id,
        feature: 'listing_description',
        model: MODEL,
        input_tokens: data.usage?.input_tokens ?? null,
        output_tokens: data.usage?.output_tokens ?? null,
      })
      .then((res) => {
        if (res.error) console.warn('[generate-listing-description] usage log failed', res.error)
      })

    return json({ description }, 200)
  } catch (err) {
    console.error('[generate-listing-description] error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
