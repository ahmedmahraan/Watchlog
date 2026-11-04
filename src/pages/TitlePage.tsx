import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Poster } from '../components/Poster'
import { Segmented } from '../components/Segmented'
import { Spinner } from '../components/Spinner'
import { StarRating } from '../components/StarRating'
import { useDeleteTitle, useTitles, useUpdateTitle, type TitlePatch } from '../lib/titles'
import { getMovie, getShow, type TmdbMovie, type TmdbShow } from '../lib/tmdb'
import { STATUSES, STATUS_LABEL } from '../lib/status'
import { formatRuntime, todayISO } from '../lib/format'
import type { TitleRow, WatchStatus } from '../lib/database.types'

export default function TitlePage() {
  const { id } = useParams()
  const { data: titles, isPending, isError, error } = useTitles()
  const title = titles?.find((t) => t.id === id)

  if (isPending) return <Spinner label="Loading title" />
  if (isError) {
    return (
      <p role="alert" className="glass rounded-2xl p-8 text-center text-sm text-red-700 dark:text-red-300">
        Couldn't load this title: {(error as Error).message}
      </p>
    )
  }
  if (!title) {
    return (
      <div className="glass mx-auto mt-8 max-w-md rounded-2xl px-6 py-12 text-center">
        <p className="font-medium">This title isn't in your library.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          Back to your library
        </Link>
      </div>
    )
  }
  return <TitleDetail key={title.id} title={title} />
}

function TitleDetail({ title: t }: { title: TitleRow }) {
  const update = useUpdateTitle()
  const save = (patch: TitlePatch) => update.mutate({ id: t.id, patch })

  const details = useQuery<TmdbMovie | TmdbShow>({
    queryKey: ['tmdb', t.media_type, t.tmdb_id],
    queryFn: () => (t.media_type === 'movie' ? getMovie(t.tmdb_id) : getShow(t.tmdb_id)),
    staleTime: 24 * 60 * 60_000,
  })
  const overview = details.data?.overview
  const seasons = details.data && 'number_of_seasons' in details.data ? details.data.number_of_seasons : null

  function setStatus(status: WatchStatus) {
    const patch: TitlePatch = { status }
    if (status === 'watched') {
      if (!t.watched_on) patch.watched_on = todayISO()
      if (t.times_watched < 1) patch.times_watched = 1
    }
    save(patch)
  }

  const runtime = formatRuntime(t.runtime)
  const meta = [
    t.year,
    t.media_type === 'movie' ? 'Movie' : 'TV show',
    seasons ? `${seasons} season${seasons === 1 ? '' : 's'}` : null,
    runtime ? (t.media_type === 'tv' ? `${runtime} episodes` : runtime) : null,
  ].filter(Boolean)

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Library
      </Link>

      {update.isError && (
        <p role="alert" className="mb-4 rounded-xl border border-red-400/40 bg-red-100/60 px-4 py-2.5 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300">
          Couldn't save that change: {(update.error as Error).message}
        </p>
      )}

      {/* Hero */}
      <section className="grid grid-cols-[104px_1fr] gap-4 sm:grid-cols-[180px_1fr] sm:gap-6 md:grid-cols-[220px_1fr]">
        <Poster path={t.poster_path} title={t.title} size="w500" className="rounded-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <h1 className="min-w-0 flex-1 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{t.title}</h1>
            <FavoriteButton on={t.favorite} onToggle={() => save({ favorite: !t.favorite })} />
          </div>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{meta.join(' · ')}</p>
          {t.genres.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {t.genres.map((g) => (
                <li key={g} className="glass rounded-full px-2.5 py-0.5 text-xs text-slate-700 dark:text-slate-300">{g}</li>
              ))}
            </ul>
          )}
          {overview && <Overview text={overview} className="mt-4 hidden sm:block" />}
        </div>
      </section>
      {overview && <Overview text={overview} className="mt-4 sm:hidden" />}

      {/* Status */}
      <div className="mt-6">
        <Segmented
          label="Status"
          value={t.status}
          onChange={setStatus}
          options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          className="w-full sm:w-auto"
        />
      </div>

      {/* Controls */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card label="Your rating">
          <div className="flex flex-wrap items-center gap-3">
            <StarRating value={t.rating} onChange={(rating) => save({ rating })} />
            <span className="min-w-[3ch] text-lg font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {t.rating != null ? Number(t.rating).toFixed(1) : <span className="text-sm font-normal text-slate-400">Not rated</span>}
            </span>
          </div>
        </Card>

        <Card label="Watched">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only">Watched on</span>
              <input
                type="date"
                value={t.watched_on ?? ''}
                max={todayISO()}
                onChange={(e) => save({ watched_on: e.target.value || null })}
                className="rounded-lg border border-slate-300/70 bg-white/70 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-white/5"
              />
            </label>
            <Stepper value={t.times_watched} onChange={(times_watched) => save({ times_watched })} />
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <NotesEditor id={t.id} initial={t.notes ?? ''} />
      </div>

      <RemoveButton id={t.id} title={t.title} />
    </div>
  )
}

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</h2>
      {children}
    </section>
  )
}

function Overview({ text, className = '' }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 220
  return (
    <div className={`text-sm leading-relaxed text-slate-700 dark:text-slate-300 ${className}`}>
      <p className={open || !long ? '' : 'line-clamp-4'}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}

function FavoriteButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? 'Remove from favorites' : 'Add to favorites'}
      title={on ? 'Favorite' : 'Mark as favorite'}
      className={`glass grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform active:scale-90 ${
        on ? 'text-brand-500' : 'text-slate-400 hover:text-brand-500'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const btn =
    'grid h-8 w-8 place-items-center rounded-lg text-lg leading-none text-slate-600 hover:bg-white/70 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10'
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center rounded-xl border border-slate-300/70 bg-white/50 p-0.5 dark:border-white/10 dark:bg-white/5">
        <button type="button" className={btn} disabled={value <= 0} onClick={() => onChange(value - 1)} aria-label="Watched one time fewer">−</button>
        <span className="min-w-[2ch] text-center font-semibold tabular-nums" aria-live="polite">{value}</span>
        <button type="button" className={btn} disabled={value >= 999} onClick={() => onChange(value + 1)} aria-label="Watched one more time">+</button>
      </div>
      <span className="text-slate-600 dark:text-slate-400">{value === 1 ? 'time' : 'times'}</span>
    </div>
  )
}

type SaveState = 'idle' | 'typing' | 'saving' | 'saved' | 'error'

/** Notes save themselves 800 ms after you stop typing, on blur, and when you leave the page. */
function NotesEditor({ id, initial }: { id: string; initial: string }) {
  const update = useUpdateTitle()
  const [text, setText] = useState(initial)
  const [state, setState] = useState<SaveState>('idle')
  const saved = useRef(initial)
  const latest = useRef(initial)
  latest.current = text

  async function flush(value: string) {
    if (value === saved.current) return
    setState('saving')
    try {
      await update.mutateAsync({ id, patch: { notes: value.trim() ? value : null } })
      saved.current = value
      setState(latest.current === value ? 'saved' : 'typing')
    } catch {
      setState('error')
    }
  }

  useEffect(() => {
    if (text === saved.current) return
    setState('typing')
    const timer = setTimeout(() => flush(text), 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  // Save anything still pending when leaving the page.
  useEffect(
    () => () => {
      if (latest.current !== saved.current) update.mutate({ id, patch: { notes: latest.current.trim() ? latest.current : null } })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const status: Record<SaveState, string> = {
    idle: '',
    typing: 'Unsaved changes',
    saving: 'Saving…',
    saved: 'Saved',
    error: "Couldn't save. Will retry when you keep typing.",
  }

  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor="notes" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Notes</label>
        <span
          aria-live="polite"
          className={`text-xs ${state === 'error' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          {state === 'saved' && <span className="mr-1 text-emerald-500">✓</span>}
          {status[state]}
        </span>
      </div>
      <textarea
        id="notes"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => flush(text)}
        rows={5}
        maxLength={20000}
        placeholder="What did you think? Favourite scenes, who you watched it with…"
        className="block w-full resize-y rounded-xl border border-slate-300/70 bg-white/60 px-3 py-2.5 text-sm leading-relaxed outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-white/5"
      />
    </section>
  )
}

function RemoveButton({ id, title }: { id: string; title: string }) {
  const remove = useDeleteTitle()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-300/50 pt-5 text-sm dark:border-white/10">
      {confirming ? (
        <>
          <span className="text-slate-700 dark:text-slate-300">Remove “{title}” and its history?</span>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate(id, { onSuccess: () => navigate('/', { replace: true }) })}
            className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {remove.isPending ? 'Removing…' : 'Remove'}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="px-2 py-1.5 text-slate-500 hover:underline">Cancel</button>
        </>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400">
          Remove from library
        </button>
      )}
      {remove.isError && <span role="alert" className="text-red-600 dark:text-red-400">{(remove.error as Error).message}</span>}
    </div>
  )
}
