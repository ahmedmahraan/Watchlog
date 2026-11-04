import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { authRedirectUrl, supabase } from './supabase'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  /** Error from the redirect back (e.g. an expired magic link). */
  redirectError: string | null
  sendMagicLink: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/** Read an error Supabase put in the URL, then strip auth params so they don't linger or get bookmarked. */
function takeRedirectError(): string | null {
  const url = new URL(window.location.href)
  const desc = url.searchParams.get('error_description') ?? url.searchParams.get('error')
  const authParams = ['code', 'error', 'error_code', 'error_description']
  if (authParams.some((p) => url.searchParams.has(p))) {
    authParams.forEach((p) => url.searchParams.delete(p))
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }
  return desc ? desc.replace(/\+/g, ' ') : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [redirectError, setRedirectError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true

    // getSession waits for supabase-js to finish exchanging any ?code= from the redirect.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      const urlError = takeRedirectError()
      setRedirectError(urlError ?? (error ? error.message : null))
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const sendMagicLink = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: authRedirectUrl(), shouldCreateUser: true },
    })
    if (error) throw error
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl() },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo<AuthState>(
    () => ({ session, user: session?.user ?? null, loading, redirectError, sendMagicLink, signInWithGoogle, signOut }),
    [session, loading, redirectError, sendMagicLink, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
