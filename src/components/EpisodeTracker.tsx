import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  airedInSeason,
  epKey,
  mainSeasons,
  progressOf,
  useEpisodeMutations,
  useEpisodeWatches,
  type Ep,
} from '../lib/episodes'
import { useUpdateTitle, type TitlePatch } from '../lib/titles'
import { getSeason, type TmdbSeasonSummary, type TmdbShow } from '../lib/tmdb'
import { formatRuntime, todayISO } from '../lib/format'
import type { TitleRow } from '../lib/database.types'

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const label = (e: Ep) => `S${e.season} · E${e.episode}`

export function EpisodeTracker({ title, show }: { title: TitleRow; show: TmdbShow }) {
  const watches = useEpisodeWatches(title.id)
  const { mark, unmark } = useEpisodeMutations(title.id)
  const update = useUpdateTitle()

  const watched = useMemo(() => new Set((watches.data ?? []).map((e) => epKey(e.season, e.episode))), [watches.data])
  const progress = useMemo(() => progressOf(show, watched), [show, watched])

  // After the user ticks something: Want → Watching on the first episode,
  // and → Watched once every episode is done and nothing more is coming.
  const userChanged = useRef(false)
  useEffect(() => {
    if (!userChanged.current || !watches.data) return
    userChanged.current = false
    const patch: TitlePatch = {}
    if (progress.finished && title.status !== 'watched') {
      patch.status = 'watched'
      if (!title.watched_on) patch.watched_on = todayISO()
      if (title.times_watched < 1) patch.times_watched = 1
    } else if (progress.watched > 0 && title.status === 'want') {
      patch.status = 'watching'
    }
    if (Object.keys(patch).length) update.mutate({ id: title.id, patch })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress])

  const actions = {
    mark: (eps: Ep[]) => {
      userChanged.current = true
      mark.mutate(eps)
    },
    unmark: (season: number, episodes?: number[]) => {
      userChanged.current = true
      unmark.mutate({ season, episodes })
    },
  }

  const seasons = [...mainSeasons(show), ...show.seasons.filter((s) => s.season_number === 0)]
  const pct = progress.aired ? Math.round((progress.watched / progress.aired) * 100) : 0
  const error = mark.error ?? unmark.error

  return (
    <section className="mt-8" aria-labelledby="episodes-heading">
      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h2 id="episodes-heading" className="text-lg font-semibold tracking-tight">Episodes</h2>
          {watches.data && (
            <p className="text-sm text-slate-600 tabular-nums dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{progress.watched}</span> of {progress.aired} watched
              <span className="ml-2 text-slate-400">{pct}%</span>
            </p>
          )}
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Episodes watched">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!watches.data ? null : progress.next ? (
            <button
              type="button"
              onClick={() => actions.mark([progress.next!])}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Mark {label(progress.next)} watched
            </button>
          ) : progress.finished ? (
            <p className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" /></svg>
              You've watched every episode
            </p>
          ) : progress.caughtUp ? (
            <p className="inline-flex items-center gap-2 rounded-xl bg-sky-500/15 px-3 py-2 text-sm font-medium text-sky-700 dark:text-sky-300">
              You're caught up
              {show.next_episode_to_air?.air_date && (
                <span className="font-normal opacity-80">· next episode {fmtDate(show.next_episode_to_air.air_date)}</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No episodes have aired yet.</p>
          )}
        </div>

        {error instanceof Error && (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
            Couldn't save: {error.message}
          </p>
        )}
      </div>

      {watches.isError ? (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          Couldn't load your watched episodes: {(watches.error as Error).message}
        </p>
      ) : watches.data ? (
        <ul className="mt-3 space-y-2">
          {seasons.map((s) => (
            <SeasonRow
              key={s.season_number}
              show={show}
              season={s}
              watched={watched}
              defaultOpen={progress.next?.season === s.season_number}
              onMark={actions.mark}
              onUnmark={actions.unmark}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-3 space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="glass h-14 animate-pulse rounded-2xl" />)}
        </div>
      )}
    </section>
  )
}

interface SeasonRowProps {
  show: TmdbShow
  season: TmdbSeasonSummary
  watched: Set<string>
  defaultOpen: boolean
  onMark: (eps: Ep[]) => void
  onUnmark: (season: number, episodes?: number[]) => void
}

function SeasonRow({ show, season, watched, defaultOpen, onMark, onUnmark }: SeasonRowProps) {
  const [open, setOpen] = useState(defaultOpen)
  const n = season.season_number
  const aired = airedInSeason(show, n)
  const done = Array.from({ length: aired }, (_, i) => i + 1).filter((e) => watched.has(epKey(n, e))).length
  const anyWatched = [...watched].some((k) => k.startsWith(`${n}:`))
  const complete = aired > 0 && done >= aired
  const pct = aired ? (done / aired) * 100 : 0

  const detail = useQuery({
    queryKey: ['tmdb-season', show.id, n],
    queryFn: () => getSeason(show.id, n),
    enabled: open,
    staleTime: 24 * 60 * 60_000,
  })

  const name = n === 0 ? 'Specials' : season.name && !/^Season \d+$/.test(season.name) ? `Season ${n} · ${season.name}` : `Season ${n}`

  return (
    <li className="glass overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/30 dark:hover:bg-white/5"
      >
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
            complete ? 'bg-emerald-500 text-white' : 'bg-slate-200/80 text-slate-600 dark:bg-white/10 dark:text-slate-300'
          }`}
          aria-hidden="true"
        >
          {complete ? '✓' : n === 0 ? '★' : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="mt-1 flex items-center gap-2">
            <span className="h-1 w-24 overflow-hidden rounded-full bg-slate-200/80 sm:w-32 dark:bg-white/10">
              <span className="block h-full rounded-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {done}/{season.episode_count}
              {aired < season.episode_count && n !== 0 && <span className="ml-1 opacity-70">({season.episode_count - aired} upcoming)</span>}
            </span>
          </span>
        </span>
        <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-300/40 dark:border-white/10">
          <div className="flex flex-wrap gap-2 px-4 py-2.5">
            <button
              type="button"
              disabled={complete || aired === 0}
              onClick={() => onMark(Array.from({ length: aired }, (_, i) => ({ season: n, episode: i + 1 })))}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-40 disabled:hover:bg-transparent dark:text-emerald-300"
            >
              Mark season watched
            </button>
            <button
              type="button"
              disabled={!anyWatched}
              onClick={() => onUnmark(n)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-500/10 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-300"
            >
              Clear season
            </button>
          </div>

          {detail.isPending ? (
            <ul aria-hidden="true" className="space-y-1 px-2 pb-3">
              {Array.from({ length: Math.min(season.episode_count || 3, 6) }, (_, i) => (
                <li key={i} className="h-12 animate-pulse rounded-xl bg-slate-200/40 dark:bg-white/5" />
              ))}
            </ul>
          ) : detail.isError ? (
            <div className="px-4 pb-4 text-sm">
              <p className="text-red-700 dark:text-red-300">Couldn't load episodes: {(detail.error as Error).message}</p>
              <button type="button" onClick={() => detail.refetch()} className="mt-1 font-medium text-brand-600 hover:underline dark:text-brand-400">Try again</button>
            </div>
          ) : (
            <ul className="px-2 pb-2">
              {detail.data.episodes.map((ep) => {
                const isWatched = watched.has(epKey(n, ep.episode_number))
                const hasAired = n === 0 || ep.episode_number <= aired
                const runtime = formatRuntime(ep.runtime)
                return (
                  <li key={ep.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isWatched}
                      disabled={!hasAired && !isWatched}
                      onClick={() =>
                        isWatched ? onUnmark(n, [ep.episode_number]) : onMark([{ season: n, episode: ep.episode_number }])
                      }
                      className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/40 disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-white/5"
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                          isWatched
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 text-transparent group-hover:border-emerald-400 group-disabled:border-dashed dark:border-slate-600'
                        }`}
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${isWatched ? 'text-slate-500 dark:text-slate-400' : 'font-medium'} ${!hasAired ? 'opacity-60' : ''}`}>
                          <span className="mr-1.5 tabular-nums text-slate-400">{ep.episode_number}.</span>
                          {ep.name || `Episode ${ep.episode_number}`}
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          {hasAired
                            ? [fmtDate(ep.air_date), runtime].filter(Boolean).join(' · ')
                            : ep.air_date
                              ? `Airs ${fmtDate(ep.air_date)}`
                              : 'Not aired yet'}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}
