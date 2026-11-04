import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

// PKCE puts the auth code in ?code=… (query string) instead of #access_token=…,
// which would collide with HashRouter's #/route URLs.
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, anonKey!, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'watchlog-auth',
      },
    })
  : null

/** Where Supabase should send people back to after a magic link or Google sign-in. */
export const authRedirectUrl = () => new URL(import.meta.env.BASE_URL, window.location.origin).href
