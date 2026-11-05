import tmdbLogo from '../assets/tmdb-logo.svg'
import tmdbLogoFull from '../assets/tmdb-logo-full.svg'

const TMDB_URL = 'https://www.themoviedb.org/'

/** Small "Powered by [TMDB]" badge, for places that show TMDB data. */
export function TmdbBadge({ label = 'Powered by', className = '' }: { label?: string; className?: string }) {
  return (
    <a
      href={TMDB_URL}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1.5 text-[11px] text-slate-500 opacity-80 transition-opacity hover:opacity-100 dark:text-slate-400 ${className}`}
    >
      {label}
      <img src={tmdbLogo} alt="TMDB" className="h-2.5 w-auto" />
    </a>
  )
}

/** Logo plus the notice TMDB's terms require. `full` uses the stacked square logo. */
export function TmdbNotice({ stacked = false, full = false, className = '' }: { stacked?: boolean; full?: boolean; className?: string }) {
  const layout = stacked ? 'flex-col gap-2 text-center' : 'items-center gap-3'
  return (
    <div className={`flex ${layout} text-[11px] leading-snug text-slate-500 dark:text-slate-400 ${className}`}>
      <a href={TMDB_URL} target="_blank" rel="noreferrer" className="shrink-0">
        <img src={full ? tmdbLogoFull : tmdbLogo} alt="TMDB" className={full ? 'h-10 w-auto' : 'h-3 w-auto'} />
      </a>
      <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </div>
  )
}
