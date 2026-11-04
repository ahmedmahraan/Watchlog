// TMDB proxy. Keeps TMDB_API_KEY server-side and only forwards an allowlist of
// endpoints: search/multi, movie/{id}, tv/{id}, tv/{id}/season/{n}.
//
// Callers must be signed in. The gateway's verify_jwt is off (see config.toml) because
// it doesn't work with Supabase's new publishable keys; we check the session here instead.
//
// Deploy:  npx supabase functions deploy tmdb
// Secret:  npx supabase secrets set TMDB_API_KEY=<v3 key or v4 read access token>

import { resolveTmdbRequest } from './allowlist.ts'

const TMDB_BASE = 'https://api.themoviedb.org/3/'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', ...extra },
  })
}

// Small in-memory cache so we don't hit the auth server on every keystroke of a search.
const sessionCache = new Map<string, number>()
const SESSION_TTL_MS = 60_000

async function isSignedIn(req: Request): Promise<boolean> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  // A user session is a JWT. The publishable key (sb_publishable_…) is not, so it's rejected here.
  if (!token || token.split('.').length !== 3) return false

  const now = Date.now()
  const cached = sessionCache.get(token)
  if (cached && cached > now) return true

  const apikey = req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey },
  })
  if (!res.ok) return false
  const user = await res.json().catch(() => null)
  if (!user?.id) return false

  if (sessionCache.size > 1000) sessionCache.clear()
  sessionCache.set(token, now + SESSION_TTL_MS)
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const key = Deno.env.get('TMDB_API_KEY')
  if (!key) return json({ error: 'TMDB_API_KEY is not set on the server' }, 500)

  if (!(await isSignedIn(req))) return json({ error: 'Not signed in' }, 401)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Request body must be JSON' }, 400)
  }

  const resolved = resolveTmdbRequest(body)
  if ('error' in resolved) return json({ error: resolved.error }, 400)

  const url = new URL(resolved.path, TMDB_BASE)
  for (const [k, v] of Object.entries(resolved.params)) url.searchParams.set(k, v)

  // TMDB accepts either a v4 "API Read Access Token" (a JWT) or a v3 API key.
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (key.split('.').length === 3) headers.Authorization = `Bearer ${key}`
  else url.searchParams.set('api_key', key)

  let res: Response
  try {
    res = await fetch(url, { headers })
  } catch {
    return json({ error: 'Could not reach TMDB' }, 502)
  }

  if (res.status === 404) return json({ error: 'Not found on TMDB' }, 404)
  if (res.status === 429) return json({ error: 'TMDB rate limit hit, try again shortly' }, 429)
  if (res.status === 401) return json({ error: 'TMDB rejected the API key' }, 502)
  if (!res.ok) return json({ error: `TMDB error (${res.status})` }, 502)

  return new Response(await res.text(), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=300' },
  })
})
