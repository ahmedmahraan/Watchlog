import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/PageHeader'
import { Poster } from '../components/Poster'
import { TmdbBadge } from '../components/TmdbCredit'
import { searchMulti, type SearchResult } from '../lib/tmdb'
import { useAddTitle, useTitles } from '../lib/titles'
import { useDebounced } from '../lib/useDebounced'
import { STATUSES, STATUS_CHIP, STATUS_LABEL, STATUS_SHORT } from '../lib/status'
import type { TitleRow, WatchStatus } from '../lib/database.types'

const keyOf = (mediaType: string, tmdbId: number) => `${mediaType}:${tmdbId}`

export default function AddPage() {
  const [input, setInput] = useState('')
  const query = useDebounced(input.trim(), 350)
  const enabled = query.length >= 2

  const search = useQuery({
    queryKey: ['tmdb-search', query],
    queryFn: () => searchMulti(query),
    enabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })

  const { data: titles } = useTitles()
  const inLibrary = useMemo(() => {
    const map = new Map<string, TitleRow>()
    titles?.forEach((t) => map.set(keyOf(t.media_type, t.tmdb_id), t))
    return map
  }, [titles])

  const results = enabled ? (search.data ?? []) : []
  const typing = input.trim() !== query

  return (
    <>
      <PageHeader title="Add a title">
        <TmdbBadge label="Search powered by" />
      </PageHeader>

      <div className="glass flex items-center gap-2 rounded-2xl px-4">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search movies and shows…"
          aria-label="Search TMDB"
          className="h-12 w-full bg-transparent text-base outline-none placeholder:text-slate-400"
        />
        {enabled && (search.isFetching || typing) && (
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 dark:border-slate-600" aria-label="Searching" />
        )}
      </div>

      <div className="mt-5">
        {!enabled ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Type at least two letters to search TMDB.</p>
        ) : search.isError ? (
          <p role="alert" className="glass rounded-2xl p-6 text-center text-sm text-red-700 dark:text-red-300">
            {(search.error as Error).message}
          </p>
        ) : search.isPending ? null : results.length === 0 ? (
          !typing && <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No movies or shows match “{query}”.</p>
        ) : (
          <ul className="space-y-3">
            {results.map((r) => (
              <ResultRow key={keyOf(r.mediaType, r.tmdbId)} result={r} existing={inLibrary.get(keyOf(r.mediaType, r.tmdbId))} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function ResultRow({ result, existing }: { result: SearchResult; existing?: TitleRow }) {
  const [choosing, setChoosing] = useState(false)
  const add = useAddTitle()

  function choose(status: WatchStatus) {
    add.mutate({ result, status }, { onSuccess: () => setChoosing(false) })
  }

  return (
    <li className="glass flex gap-3 rounded-2xl p-3 sm:gap-4">
      <Poster path={result.posterPath} title={result.title} size="w154" className="w-16 shrink-0 rounded-lg sm:w-20" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h2 className="font-semibold leading-snug">{result.title}</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {result.year ?? '—'} · {result.mediaType === 'movie' ? 'Movie' : 'TV show'}
          </span>
        </div>
        {result.overview && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{result.overview}</p>
        )}

        <div className="mt-3">
          {existing ? (
            <Link
              to={`/title/${existing.id}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:underline dark:text-slate-200"
            >
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CHIP[existing.status]}`}>{STATUS_SHORT[existing.status]}</span>
              In your library
            </Link>
          ) : choosing ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label={`Add ${result.title} as`}>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={add.isPending}
                  onClick={() => choose(s)}
                  className="rounded-lg border border-slate-300/70 bg-white/60 px-3 py-1.5 text-sm font-medium hover:border-brand-500 hover:text-brand-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:text-brand-400"
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setChoosing(false)}
                disabled={add.isPending}
                className="px-2 py-1.5 text-sm text-slate-500 hover:underline"
              >
                Cancel
              </button>
              {add.isPending && <span className="self-center text-sm text-slate-500">Adding…</span>}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                add.reset()
                setChoosing(true)
              }}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-brand-600/20 hover:bg-brand-700"
            >
              + Add
            </button>
          )}
          {add.isError && (
            <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
              {(add.error as Error).message}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}
