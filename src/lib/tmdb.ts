import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { MediaType } from './database.types'

// ---------------------------------------------------------------------------
// TMDB response shapes (only the fields we use)
// ---------------------------------------------------------------------------

export interface TmdbGenre {
  id: number
  name: string
}

export interface TmdbSearchItem {
  id: number
  media_type: MediaType | 'person'
  title?: string // movies
  name?: string // shows
  release_date?: string
  first_air_date?: string
  poster_path: string | null
  overview?: string
  popularity?: number
}

export interface TmdbSearchResponse {
  page: number
  results: TmdbSearchItem[]
  total_pages: number
  total_results: number
}

export interface TmdbMovie {
  id: number
  title: string
  release_date: string
  poster_path: string | null
  genres: TmdbGenre[]
  runtime: number | null
  overview: string
}

export interface TmdbSeasonSummary {
  id: number
  season_number: number
  name: string
  episode_count: number
  air_date: string | null
  poster_path: string | null
}

export interface TmdbEpisodeRef {
  season_number: number
  episode_number: number
  air_date: string | null
  runtime: number | null
  name?: string
}

export interface TmdbShow {
  id: number
  name: string
  first_air_date: string
  poster_path: string | null
  genres: TmdbGenre[]
  episode_run_time: number[]
  /** e.g. "Returning Series", "Ended", "Canceled" */
  status?: string
  last_episode_to_air?: TmdbEpisodeRef | null
  next_episode_to_air?: TmdbEpisodeRef | null
  number_of_seasons: number
  number_of_episodes: number
  seasons: TmdbSeasonSummary[]
  overview: string
}

export interface TmdbEpisode {
  id: number
  episode_number: number
  season_number: number
  name: string
  air_date: string | null
  runtime: number | null
  overview: string
  still_path: string | null
}

export interface TmdbSeason {
  id: number
  season_number: number
  name: string
  episodes: TmdbEpisode[]
}

/** A movie or show search result, normalised. */
export interface SearchResult {
  tmdbId: number
  mediaType: MediaType
  title: string
  year: number | null
  posterPath: string | null
  overview: string
}

// ---------------------------------------------------------------------------
// Calls through the `tmdb` Edge Function
// ---------------------------------------------------------------------------

async function call<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke<T>('tmdb', { body: { path, params } })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null)
      throw new Error(body?.error ?? `TMDB request failed (${error.context.status})`)
    }
    throw new Error(error.message || 'Could not reach the TMDB proxy')
  }
  return data as T
}

export const yearOf = (date?: string | null) => {
  const y = date ? Number(date.slice(0, 4)) : NaN
  return Number.isFinite(y) && y > 0 ? y : null
}

export async function searchMulti(query: string, page = 1): Promise<SearchResult[]> {
  const res = await call<TmdbSearchResponse>('search/multi', { query, page })
  return res.results
    .filter((r): r is TmdbSearchItem & { media_type: MediaType } => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => ({
      tmdbId: r.id,
      mediaType: r.media_type,
      title: (r.media_type === 'movie' ? r.title : r.name) ?? 'Untitled',
      year: yearOf(r.media_type === 'movie' ? r.release_date : r.first_air_date),
      posterPath: r.poster_path,
      overview: r.overview ?? '',
    }))
}

export const getMovie = (id: number) => call<TmdbMovie>(`movie/${id}`)
export const getShow = (id: number) => call<TmdbShow>(`tv/${id}`)
export const getSeason = (id: number, season: number) => call<TmdbSeason>(`tv/${id}/season/${season}`)

// ---------------------------------------------------------------------------
// Images (served straight from TMDB's CDN; no key needed)
// ---------------------------------------------------------------------------

export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original'

export const posterUrl = (path: string | null | undefined, size: PosterSize = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null
