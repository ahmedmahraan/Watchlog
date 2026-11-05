// Pure episode-progress logic (no Supabase/Vite imports) so it can be unit-tested with Node.
import type { TmdbShow } from './tmdb'

export interface Ep {
  season: number
  episode: number
}

export const epKey = (season: number, episode: number) => `${season}:${episode}`

// ---------------------------------------------------------------------------
// Which episodes have aired, worked out from the show summary (no extra requests)
// ---------------------------------------------------------------------------

/** How many episodes of this season have aired (episodes 1..n). */
export function airedInSeason(show: TmdbShow, season: number): number {
  const s = show.seasons.find((x) => x.season_number === season)
  if (!s) return 0
  if (season === 0) return s.episode_count // specials: TMDB doesn't say, so allow all
  const last = show.last_episode_to_air
  if (!last) return 0
  if (season < last.season_number) return s.episode_count
  if (season === last.season_number) return Math.min(s.episode_count, last.episode_number)
  return 0
}

/** Main seasons (not specials) in order. */
export const mainSeasons = (show: TmdbShow) =>
  show.seasons.filter((s) => s.season_number > 0).sort((a, b) => a.season_number - b.season_number)

export interface Progress {
  watched: number // aired main-season episodes watched
  aired: number // aired main-season episodes
  next: Ep | null // first unwatched aired episode
  caughtUp: boolean
  finished: boolean // caught up and no more episodes are coming
}

export function progressOf(show: TmdbShow, watched: Set<string>): Progress {
  let aired = 0
  let count = 0
  let next: Ep | null = null
  for (const s of mainSeasons(show)) {
    const n = airedInSeason(show, s.season_number)
    aired += n
    for (let e = 1; e <= n; e++) {
      if (watched.has(epKey(s.season_number, e))) count++
      else if (!next) next = { season: s.season_number, episode: e }
    }
  }
  const caughtUp = aired > 0 && count >= aired
  return { watched: count, aired, next, caughtUp, finished: caughtUp && !show.next_episode_to_air }
}
