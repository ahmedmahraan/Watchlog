interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  label: string
  size?: 'sm' | 'md'
  className?: string
}

/** Pill-style single choice, glass track with a raised active pill. */
export function Segmented<T extends string>({ value, options, onChange, label, size = 'md', className = '' }: Props<T>) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  return (
    <div role="radiogroup" aria-label={label} className={`glass inline-flex max-w-full gap-0.5 overflow-x-auto rounded-xl p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`shrink-0 whitespace-nowrap rounded-lg font-medium transition-colors ${pad} ${
              active
                ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white'
                : 'text-slate-600 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-white/5'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
