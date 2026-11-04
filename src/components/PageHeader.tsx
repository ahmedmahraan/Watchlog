import type { ReactNode } from 'react'

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </div>
  )
}

export function Placeholder({ phase, children }: { phase: number; children: ReactNode }) {
  return (
    <div className="glass rounded-2xl p-10 text-center text-sm text-slate-600 dark:text-slate-400">
      <p>{children}</p>
      <p className="mt-1 text-xs uppercase tracking-wide">Coming in phase {phase}</p>
    </div>
  )
}
