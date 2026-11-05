import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { epKey, type Ep } from './episodeProgress'

export * from './episodeProgress'
export const episodesKey = (titleId: string) => ['episodes', titleId] as const

function db() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

/** Every episode of this show the user has marked watched. */
export function useEpisodeWatches(titleId: string) {
  return useQuery({
    queryKey: episodesKey(titleId),
    queryFn: async (): Promise<Ep[]> => {
      const { data, error } = await db()
        .from('episode_watches')
        .select('season, episode')
        .eq('title_id', titleId)
        .order('season')
        .order('episode')
      if (error) throw error
      return data
    },
  })
}

/** Mark and unmark episodes, with the checkboxes updating instantly. */
export function useEpisodeMutations(titleId: string) {
  const qc = useQueryClient()
  const key = episodesKey(titleId)

  async function optimistic(change: (old: Ep[]) => Ep[]) {
    await qc.cancelQueries({ queryKey: key })
    const previous = qc.getQueryData<Ep[]>(key)
    qc.setQueryData<Ep[]>(key, (old) => change(old ?? []))
    return { previous }
  }
  const rollback = (_e: unknown, _v: unknown, ctx?: { previous?: Ep[] }) => {
    if (ctx?.previous) qc.setQueryData(key, ctx.previous)
  }
  const refresh = () => qc.invalidateQueries({ queryKey: key })

  const mark = useMutation({
    mutationFn: async (eps: Ep[]) => {
      if (eps.length === 0) return
      const rows = eps.map((e) => ({ title_id: titleId, season: e.season, episode: e.episode }))
      const { error } = await db()
        .from('episode_watches')
        .upsert(rows, { onConflict: 'user_id,title_id,season,episode', ignoreDuplicates: true })
      if (error) throw error
    },
    onMutate: (eps) =>
      optimistic((old) => {
        const have = new Set(old.map((e) => epKey(e.season, e.episode)))
        return [...old, ...eps.filter((e) => !have.has(epKey(e.season, e.episode)))]
      }),
    onError: rollback,
    onSettled: refresh,
  })

  const unmark = useMutation({
    /** Without `episodes`, clears the whole season. */
    mutationFn: async ({ season, episodes }: { season: number; episodes?: number[] }) => {
      let q = db().from('episode_watches').delete().eq('title_id', titleId).eq('season', season)
      if (episodes) q = q.in('episode', episodes)
      const { error } = await q
      if (error) throw error
    },
    onMutate: ({ season, episodes }) =>
      optimistic((old) => old.filter((e) => e.season !== season || (episodes ? !episodes.includes(e.episode) : false))),
    onError: rollback,
    onSettled: refresh,
  })

  return { mark, unmark }
}
