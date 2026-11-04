import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Poster } from '../components/Poster'
import { Segmented } from '../components/Segmented'
import { Spinner } from '../components/Spinner'
import { useTitles } from '../lib/titles'
import { STATUSES, STATUS_CHIP, STATUS_SHORT } from '../lib/status'
import type { MediaType, TitleRow, WatchStatus } from '../lib/database.types'

type TypeFilter = 'all' | MediaType
type StatusFilter = 'all' | WatchStatus
type SortKey = 'watched' | 'added' | 'rating' | 'title' | 'year'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'watched', label: 'Recently watched' },
  { value: 'added', label: 'Recently added' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'year', label: 'Newest release' },
]

function matches(t: TitleRow, q: string) {
  if (!q) return true
  return (
    t.title.toLowerCase().includes(q) ||
    (t.notes ?? '').toLowerCase().includes(q) ||
    t.genres.some((g) => g.toLowerCase().includes(q))
  )
}

/** Descending, with nulls always last. */
const desc = <T extends string | number>(a: T | null, b: T | null) => (a === b ? 0 : a == null ? 1 : b == null ? -1 : a < b ? 1 : -1)

const COMPARE: Record<SortKey, (a: TitleRow, b: TitleRow) => number> = {
  watched: (a, b) => desc(a.watched_on, b.watched_on) || desc(a.updated_at, b.updated_at),
  added: (a, b) => desc(a.created_at, b.created_at),
  rating: (a, b) => desc(a.rating == null ? null : Number(a.rating), b.rating == null ? null : Number(b.rating)) || a.title.localeCompare(b.title),
  title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true }),
  year: (a, b) => desc(a.year, b.year) || a.title.localeCompare(b.title),
}

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export default function LibraryPage() {
  const { data: titles, isPending, isError, error, refetch } = useTitles()
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()

  // Filters live in the URL (#/?type=movie&status=want&sort=rating) so they survive back/forward and reloads.
  const [params, setParams] = useSearchParams()
  const type = pick<TypeFilter>(params.get('type'), ['all', 'movie', 'tv'], 'all')
  const status = pick<StatusFilter>(params.get('status'), ['all', ...STATUSES], 'all')
  const sort = pick<SortKey>(params.get('sort'), SORTS.map((s) => s.value), 'watched')

  function setParam(key: string, value: string, fallback: string) {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: 0, want: 0, watching: 0, watched: 0, dropped: 0 }
    for (const t of titles ?? []) {
      if (type !== 'all' && t.media_type !== type) continue
      c.all++
      c[t.status]++
    }
    return c
  }, [titles, type])

  const shown = useMemo(
    () =>
      (titles ?? [])
        .filter((t) => (type === 'all' || t.media_type === type) && (status === 'all' || t.status === status) && matches(t, q))
        .sort(COMPARE[sort]),
    [titles, type, status, sort, q],
  )
  const filtered = q !== '' || type !== 'all' || status !== 'all'

  return (
    <>
      <PageHeader title="Library">
        {titles && titles.length > 0 && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filtered ? `${shown.length} of ${titles.length}` : titles.length} {titles.length === 1 ? 'title' : 'titles'}
          </span>
        )}
      </PageHeader>

      {isPending ? (
        <Spinner label="Loading your library" />
      ) : isError ? (
        <div role="alert" className="glass rounded-2xl p-8 text-center text-sm">
          <p className="text-red-700 dark:text-red-300">Couldn't load your library: {(error as Error).message}</p>
          <button type="button" onClick={() => refetch()} className="mt-3 font-medium text-brand-600 hover:underline dark:text-brand-400">
            Try again
          </button>
        </div>
      ) : titles.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-14 text-center">
          <p className="text-lg font-medium">Your library is empty</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Add a movie or show you've watched or want to watch.</p>
          <Link
            to="/add"
            className="mt-5 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700"
          >
            + Add your first title
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-5 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="glass flex flex-1 items-center gap-2 rounded-xl px-3.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, notes, genre"
                  aria-label="Search your library"
                  className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <Segmented
                  label="Type"
                  value={type}
                  onChange={(v) => setParam('type', v, 'all')}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'movie', label: 'Movies' },
                    { value: 'tv', label: 'Shows' },
                  ]}
                />
                <label className="glass relative flex flex-1 items-center rounded-xl sm:flex-none">
                  <span className="sr-only">Sort by</span>
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <select
                    value={sort}
                    onChange={(e) => setParam('sort', e.target.value, 'watched')}
                    className="h-10 w-full cursor-pointer appearance-none bg-transparent pl-9 pr-8 text-sm font-medium outline-none"
                  >
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </label>
              </div>
            </div>

            <div role="radiogroup" aria-label="Status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {(['all', ...STATUSES] as StatusFilter[]).map((s) => {
                const active = status === s
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setParam('status', s, 'all')}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                        : 'glass text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {s === 'all' ? 'All' : STATUS_SHORT[s]}
                    <span className={`text-xs tabular-nums ${active ? 'opacity-70' : 'text-slate-400'}`}>{counts[s]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              <p>{q ? `Nothing matches “${search.trim()}” with these filters.` : 'Nothing here with these filters.'}</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setParams(sort === 'watched' ? {} : { sort }, { replace: true })
                }}
                className="mt-2 font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {shown.map((t) => (
                <li key={t.id}>
                  <PosterCard title={t} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}

function PosterCard({ title: t }: { title: TitleRow }) {
  return (
    <Link to={`/title/${t.id}`} className="group block focus:outline-none">
      <div className="relative overflow-hidden rounded-xl shadow-md ring-1 ring-black/5 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-brand-500 dark:ring-white/10">
        <Poster path={t.poster_path} title={t.title} />
        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium shadow backdrop-blur ${STATUS_CHIP[t.status]}`}>
          {STATUS_SHORT[t.status]}
        </span>
        {t.favorite && (
          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/40 text-brand-400 backdrop-blur" aria-label="Favorite">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" />
            </svg>
          </span>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <p className="truncate text-sm font-medium leading-tight" title={t.title}>{t.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span>{t.year ?? '—'}</span>
          <span aria-hidden="true">·</span>
          <span>{t.media_type === 'movie' ? 'Movie' : 'TV'}</span>
          {t.rating != null && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-500" aria-label={`Rated ${t.rating} out of 5`}>★ {Number(t.rating).toFixed(1)}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  )
}
