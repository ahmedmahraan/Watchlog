// Run with: node --experimental-strip-types supabase/functions/tmdb/allowlist.test.ts
import assert from 'node:assert/strict'
import { resolveTmdbRequest as r } from './allowlist.ts'

const allowed = (input: unknown) => {
  const out = r(input)
  assert.ok(!('error' in out), `expected allowed: ${JSON.stringify(input)} -> ${JSON.stringify(out)}`)
  return out as { path: string; params: Record<string, string> }
}
const denied = (input: unknown) => assert.ok('error' in r(input), `expected denied: ${JSON.stringify(input)}`)

// search/multi
assert.deepEqual(allowed({ path: 'search/multi', params: { query: '  dune ' } }).params, {
  query: 'dune',
  page: '1',
  include_adult: 'false',
})
assert.equal(allowed({ path: 'search/multi', params: { query: 'x', page: 3 } }).params.page, '3')
assert.equal(allowed({ path: 'search/multi', params: { query: 'x', include_adult: 'true' } }).params.include_adult, 'false')
assert.equal(allowed({ path: 'search/multi', params: { query: 'x', language: 'en-US' } }).params.language, 'en-US')
assert.equal(allowed({ path: 'search/multi', params: { query: 'x', language: 'en&api_key=1' } }).params.language, undefined)
denied({ path: 'search/multi' })
denied({ path: 'search/multi', params: { query: '   ' } })
denied({ path: 'search/multi', params: { query: 'a'.repeat(201) } })
denied({ path: 'search/multi', params: { query: 'x', page: 0 } })
denied({ path: 'search/multi', params: { query: 'x', page: 1.5 } })
denied({ path: 'search/multi', params: { query: 'x', page: 501 } })

// detail + season
allowed({ path: 'movie/603' })
allowed({ path: 'tv/1396' })
allowed({ path: 'tv/1396/season/0' })
allowed({ path: 'tv/1396/season/5' })
assert.deepEqual(allowed({ path: 'movie/603', params: { append_to_response: 'credits' } }).params, {})

// everything else
for (const path of [
  'movie/0',
  'movie/abc',
  'movie/603/credits',
  'movie/603?api_key=x',
  'movie/603/../../account',
  '../movie/603',
  '/movie/603',
  'movie//603',
  'person/1',
  'search/movie',
  'tv/1396/season/1/episode/1',
  'tv/1396/season/-1',
  'https://evil.example/movie/1',
  'movie/603\n',
  'movie/12345678901',
]) denied({ path })
denied(null)
denied('movie/603')
denied({ path: 603 })

console.log('allowlist: all tests passed')
