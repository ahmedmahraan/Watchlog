import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Account'
  const avatar = user.user_metadata?.avatar_url as string | undefined
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  async function onSignOut() {
    setBusy(true)
    try {
      await signOut()
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-white/60 bg-gradient-to-br from-brand-400 to-indigo-500 text-sm font-semibold text-white shadow-sm dark:border-white/10"
      >
        {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : initial}
      </button>
      {open && (
        <div role="menu" className="glass absolute right-0 mt-2 w-60 rounded-xl p-1.5 text-sm">
          <div className="px-3 py-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">Signed in as</p>
            <p className="truncate font-medium">{user.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={onSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-white/60 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
