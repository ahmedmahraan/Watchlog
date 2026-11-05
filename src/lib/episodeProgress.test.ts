// Run with: node --experimental-strip-types src/lib/episodeProgress.test.ts
import assert from 'node:assert/strict'
import { airedInSeason, epKey, progressOf } from './episodeProgress.ts'
import type { TmdbShow } from './tmdb.ts'

const season = (n: number, count: number) => ({ id: n, season_number: n, name: `Season ${n}`, episode_count: count, air_date: null, poster_path: null })
const show = (over: Partial<TmdbShow>): TmdbShow =>
  ({
    id: 1, name: 'x', first_air_date: '2020-01-01', poster_path: null, genres: [], episode_run_time: [],
    number_of_seasons: 2, number_of_episodes: 13, overview: '',
    seasons: [season(0, 2), season(1, 10), season(2, 3)],
    last_episode_to_air: { season_number: 2, episode_number: 3, air_date: null, runtime: null },
    next_episode_to_air: null,
    ...over,
  }) as TmdbShow
const all = (s: TmdbShow, upToSeason = 99) => {
  const set = new Set<string>()
  for (const x of s.seasons) if (x.season_number > 0 && x.season_number <= upToSeason) for (let e = 1; e <= x.episode_count; e++) set.add(epKey(x.season_number, e))
  return set
}

// Ended show: specials are not counted, every main episode is aired.
const ended = show({})
assert.equal(progressOf(ended, new Set()).aired, 13)
assert.deepEqual(progressOf(ended, new Set()).next, { season: 1, episode: 1 })
assert.deepEqual(progressOf(ended, new Set([epKey(1, 1), epKey(1, 2)])).next, { season: 1, episode: 3 })
assert.deepEqual(progressOf(ended, all(ended, 1)).next, { season: 2, episode: 1 })
const done = progressOf(ended, all(ended))
assert.equal(done.watched, 13)
assert.equal(done.next, null)
assert.equal(done.caughtUp, true)
assert.equal(done.finished, true)
// Watching specials alone doesn't count toward progress.
assert.equal(progressOf(ended, new Set([epKey(0, 1)])).watched, 0)

// Airing show: S2 has 3 of 8 episodes out and more coming.
const airing = show({
  seasons: [season(1, 10), season(2, 8)],
  next_episode_to_air: { season_number: 2, episode_number: 4, air_date: '2027-01-01', runtime: null },
})
assert.equal(airedInSeason(airing, 1), 10)
assert.equal(airedInSeason(airing, 2), 3)
assert.equal(progressOf(airing, new Set()).aired, 13)
const caught = progressOf(airing, all(airing))
assert.equal(caught.caughtUp, true)
assert.equal(caught.finished, false, 'caught up on an airing show is not "finished"')

// Announced but nothing aired yet.
const upcoming = show({ last_episode_to_air: null, seasons: [season(1, 6)] })
assert.equal(progressOf(upcoming, new Set()).aired, 0)
assert.equal(progressOf(upcoming, new Set()).caughtUp, false)
assert.equal(progressOf(upcoming, new Set()).next, null)

console.log('episodeProgress: all tests passed')
