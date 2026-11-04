import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { TitleRow, WatchStatus } from './database.types'
import { getMovie, getShow, yearOf, type SearchResult } from './tmdb'

export const titlesKey = ['titles'] as const

function db() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

/** All titles in the signed-in user's log, newest first. */
export function useTitles() {
  return useQuery({
    queryKey: titlesKey,
    queryFn: async (): Promise<TitleRow[]> => {
      const { data, error } = await db().from('titles').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Look up full TMDB details for a search result and save it to the log. */
export function useAddTitle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ result, status }: { result: SearchResult; status: WatchStatus }): Promise<TitleRow> => {
      let genres: string[] = []
      let runtime: number | null = null
      let title = result.title
      let year = result.year
      let posterPath = result.posterPath

      if (result.mediaType === 'movie') {
        const m = await getMovie(result.tmdbId)
        genres = m.genres.map((g) => g.name)
        runtime = m.runtime || null
        title = m.title || title
        year = yearOf(m.release_date) ?? year
        posterPath = m.poster_path ?? posterPath
      } else {
        const s = await getShow(result.tmdbId)
        genres = s.genres.map((g) => g.name)
        runtime = s.episode_run_time[0] || s.last_episode_to_air?.runtime || null
        title = s.name || title
        year = yearOf(s.first_air_date) ?? year
        posterPath = s.poster_path ?? posterPath
      }

      const watched = status === 'watched'
      const { data, error } = await db()
        .from('titles')
        .insert({
          tmdb_id: result.tmdbId,
          media_type: result.mediaType,
          title,
          year,
          poster_path: posterPath,
          genres,
          runtime,
          status,
          watched_on: watched ? today() : null,
          times_watched: watched ? 1 : 0,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') throw new Error('Already in your library')
        throw error
      }
      return data
    },
    onSuccess: (row) => {
      qc.setQueryData<TitleRow[]>(titlesKey, (old) => (old ? [row, ...old] : [row]))
    },
  })
}
