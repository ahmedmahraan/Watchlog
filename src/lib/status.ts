import type { WatchStatus } from './database.types'

export const STATUSES: WatchStatus[] = ['want', 'watching', 'watched', 'dropped']

export const STATUS_LABEL: Record<WatchStatus, string> = {
  want: 'Want to watch',
  watching: 'Watching',
  watched: 'Watched',
  dropped: 'Dropped',
}

export const STATUS_SHORT: Record<WatchStatus, string> = {
  want: 'Want',
  watching: 'Watching',
  watched: 'Watched',
  dropped: 'Dropped',
}

/** Tailwind classes for a small status chip. */
export const STATUS_CHIP: Record<WatchStatus, string> = {
  want: 'bg-sky-500/85 text-white',
  watching: 'bg-amber-500/90 text-white',
  watched: 'bg-emerald-600/90 text-white',
  dropped: 'bg-slate-500/90 text-white',
}
