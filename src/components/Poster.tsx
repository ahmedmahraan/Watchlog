import { useState } from 'react'
import { posterUrl, type PosterSize } from '../lib/tmdb'

interface Props {
  path: string | null | undefined
  title: string
  size?: PosterSize
  className?: string
}

/** A 2:3 poster with a lazy-loaded TMDB image and a text fallback when there's no art. */
export function Poster({ path, title, size = 'w342', className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const src = failed ? null : posterUrl(path, size)

  return (
    <div className={`relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-800 dark:to-slate-900 ${className}`}>
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-2 text-center text-xs font-medium text-slate-600 dark:text-slate-400">
          {title}
        </div>
      )}
    </div>
  )
}
