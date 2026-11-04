import { useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'

interface Props {
  value: number | null
  onChange: (value: number | null) => void
  size?: 'md' | 'lg'
}

const STAR = 'M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z'

/**
 * 0.5–5 star rating in half steps. Click the left half of a star for x.5.
 * Click the current value again to clear. Keyboard: arrows, Home/End, Backspace.
 */
export function StarRating({ value, onChange, size = 'lg' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value ?? 0
  const px = size === 'lg' ? 'h-9 w-9' : 'h-6 w-6'

  function valueAt(clientX: number) {
    const r = ref.current!.getBoundingClientRect()
    const x = Math.min(Math.max((clientX - r.left) / r.width, 0), 1)
    return Math.max(0.5, Math.ceil(x * 10) / 2)
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === 'mouse') setHover(valueAt(e.clientX))
  }

  function onClick(e: MouseEvent) {
    const v = valueAt(e.clientX)
    onChange(v === value ? null : v)
    setHover(null)
  }

  function onKeyDown(e: KeyboardEvent) {
    const cur = value ?? 0
    let next: number | null | undefined
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, cur + 0.5)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = cur <= 0.5 ? null : cur - 0.5
    else if (e.key === 'Home') next = 0.5
    else if (e.key === 'End') next = 5
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') next = null
    if (next === undefined) return
    e.preventDefault()
    onChange(next)
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Rating"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={value ?? 0}
      aria-valuetext={value ? `${value} out of 5 stars` : 'Not rated'}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHover(null)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="inline-flex cursor-pointer touch-manipulation select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.min(Math.max(shown - i, 0), 1)
        return (
          <span key={i} className={`relative ${px}`} aria-hidden="true">
            <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full text-slate-300 dark:text-slate-600">
              <path d={STAR} fill="currentColor" />
            </svg>
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 24 24" className={`${px} max-w-none ${hover != null ? 'text-amber-300' : 'text-amber-400'}`}>
                <path d={STAR} fill="currentColor" />
              </svg>
            </span>
          </span>
        )
      })}
    </div>
  )
}
