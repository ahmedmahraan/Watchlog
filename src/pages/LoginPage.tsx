import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import { Spinner } from '../components/Spinner'

type Phase =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string }

function errMsg(err: unknown, fallback: string) {
  if (!(err instanceof Error) || !err.message) return fallback
  if (/failed to fetch|networkerror|load failed/i.test(err.message)) {
    return "Couldn't reach the sign-in server. Check your connection and try again."
  }
  return err.message
}

export default function LoginPage() {
  const { user, loading, redirectError, sendMagicLink, signInWithGoogle } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [googleBusy, setGoogleBusy] = useState(false)

  if (loading) return <Spinner label="Checking sign-in" />
  if (user) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const addr = email.trim()
    if (!addr) return
    setPhase({ kind: 'sending' })
    try {
      await sendMagicLink(addr)
      setPhase({ kind: 'sent', email: addr })
    } catch (err) {
      setPhase({ kind: 'error', message: errMsg(err, 'Something went wrong. Try again.') })
    }
  }

  async function onGoogle() {
    setGoogleBusy(true)
    try {
      await signInWithGoogle() // the browser navigates away on success
    } catch (err) {
      setGoogleBusy(false)
      setPhase({ kind: 'error', message: errMsg(err, 'Google sign-in failed.') })
    }
  }

  const error = phase.kind === 'error' ? phase.message : redirectError

  return (
    <div className="mx-auto mt-6 max-w-sm sm:mt-14">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to Watchlog</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Keep track of everything you watch.</p>

        {!isSupabaseConfigured ? (
          <div className="mt-6 rounded-xl border border-amber-400/40 bg-amber-100/60 p-4 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
            <p className="font-medium">Supabase isn&apos;t configured yet.</p>
            <p className="mt-1">
              Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code>, fill in{' '}
              <code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>, then
              restart <code className="font-mono">npm run dev</code>.
            </p>
          </div>
        ) : phase.kind === 'sent' ? (
          <div className="mt-6 text-sm" role="status">
            <p className="font-medium">Check your email</p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              We sent a sign-in link to{' '}
              <span className="font-medium text-slate-900 dark:text-slate-100">{phase.email}</span>. Open it in this browser to finish
              signing in.
            </p>
            <button
              type="button"
              onClick={() => setPhase({ kind: 'idle' })}
              className="mt-4 font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            {error && (
              <p
                role="alert"
                className="mt-5 rounded-lg border border-red-400/40 bg-red-100/60 px-3 py-2 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={onGoogle}
              disabled={googleBusy}
              className="glass mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/80 disabled:opacity-60 dark:hover:bg-white/10"
            >
              <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
              </svg>
              {googleBusy ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <span className="h-px flex-1 bg-slate-300/70 dark:bg-white/10" />
              or
              <span className="h-px flex-1 bg-slate-300/70 dark:bg-white/10" />
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300/70 bg-white/70 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-white/5"
              />
              <button
                type="submit"
                disabled={phase.kind === 'sending'}
                className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 disabled:opacity-60"
              >
                {phase.kind === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
