// Decides which TMDB requests the proxy will forward. Pure function, no Deno APIs,
// so it can be unit-tested with Node (see allowlist.test.ts).

export type Resolved = { path: string; params: Record<string, string> } | { error: string }

const LANGUAGE = /^[a-z]{2}(-[A-Z]{2})?$/
const ID = '([1-9][0-9]{0,9})'
const DETAIL = new RegExp(`^(movie|tv)/${ID}$`)
const SEASON = new RegExp(`^tv/${ID}/season/([0-9]{1,3})$`)

export function resolveTmdbRequest(input: unknown): Resolved {
  if (!input || typeof input !== 'object') return { error: 'Request body must be a JSON object' }
  const { path, params } = input as { path?: unknown; params?: unknown }
  if (typeof path !== 'string') return { error: '"path" is required' }

  const p = params && typeof params === 'object' ? (params as Record<string, unknown>) : {}
  const out: Record<string, string> = {}
  if (typeof p.language === 'string' && LANGUAGE.test(p.language)) out.language = p.language

  if (path === 'search/multi') {
    const query = typeof p.query === 'string' ? p.query.trim() : ''
    if (!query) return { error: '"query" is required' }
    if (query.length > 200) return { error: '"query" is too long' }
    const page = p.page === undefined ? 1 : Number(p.page)
    if (!Number.isInteger(page) || page < 1 || page > 500) return { error: '"page" must be 1–500' }
    out.query = query
    out.page = String(page)
    out.include_adult = 'false'
    return { path, params: out }
  }

  // Paths below are only accepted when they match these anchored patterns exactly,
  // so nothing else (../, query strings, other endpoints) can reach TMDB.
  if (DETAIL.test(path) || SEASON.test(path)) return { path, params: out }

  return { error: 'Path not allowed' }
}
