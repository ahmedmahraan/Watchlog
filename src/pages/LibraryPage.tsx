import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Poster } from '../components/Poster'
import { Spinner } from '../components/Spinner'
import { useTitles } from '../lib/titles'
import { STATUS_CHIP, STATUS_SHORT } from '../lib/status'
import type { TitleRow } from '../lib/database.types'

function matches(t: TitleRow, q: string) {
  if (!q) return true
  return (
    t.title.toLowerCase().includes(q) ||
    (t.notes ?? '').toLowerCase().includes(q) ||
    t.genres.some((g) => g.toLowerCase().includes(q))
  )
}

export default function LibraryPage() {
  const { data: titles, isPending, isError, error, refetch } = useTitles()
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const shown = useMemo(() => (titles ?? []).filter((t) => matches(t, q)), [titles, q])

  return (
    <>
      <PageHeader title="Library">
        {titles && titles.length > 0 && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {q ? `${shown.length} of ${titles.length}` : titles.length} {titles.length === 1 ? 'title' : 'titles'}
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
          <div className="glass mb-5 flex items-center gap-2 rounded-2xl px-4">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your log: title, notes, genre"
              aria-label="Search your library"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Nothing in your library matches “{search.trim()}”.</p>
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
