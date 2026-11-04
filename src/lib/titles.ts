import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { TitleRow, WatchStatus } from './database.types'
import { getMovie, getShow, yearOf, type SearchResult } from './tmdb'
import { todayISO } from './format'

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

const today = todayISO

/** Fields the detail page can change. */
export type TitlePatch = Partial<
  Pick<TitleRow, 'status' | 'rating' | 'notes' | 'watched_on' | 'times_watched' | 'favorite'>
>

/**
 * Save changes to one title. The cache is updated straight away (optimistic);
 * if the save fails, only the fields in this patch are rolled back, so another
 * change made in the meantime isn't lost.
 */
export function useUpdateTitle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TitlePatch }) => {
      const { data, error } = await db().from('titles').update(patch).eq('id', id).select('id, updated_at').single()
      if (error) throw error
      return data
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: titlesKey })
      const row = qc.getQueryData<TitleRow[]>(titlesKey)?.find((t) => t.id === id)
      const previous: TitlePatch = {}
      if (row) for (const k of Object.keys(patch) as (keyof TitlePatch)[]) Object.assign(previous, { [k]: row[k] })
      qc.setQueryData<TitleRow[]>(titlesKey, (old) => old?.map((t) => (t.id === id ? { ...t, ...patch } : t)))
      return { previous }
    },
    onError: (_err, { id }, ctx) => {
      if (!ctx) return
      qc.setQueryData<TitleRow[]>(titlesKey, (old) => old?.map((t) => (t.id === id ? { ...t, ...ctx.previous } : t)))
    },
    onSuccess: ({ id, updated_at }) => {
      qc.setQueryData<TitleRow[]>(titlesKey, (old) => old?.map((t) => (t.id === id ? { ...t, updated_at } : t)))
    },
  })
}

export function useDeleteTitle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('titles').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.setQueryData<TitleRow[]>(titlesKey, (old) => old?.filter((t) => t.id !== id))
    },
  })
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
