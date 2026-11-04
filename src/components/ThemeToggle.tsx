import { useTheme, type ThemePref } from '../lib/theme'

const ORDER: ThemePref[] = ['system', 'light', 'dark']
const LABEL: Record<ThemePref, string> = { system: 'System theme', light: 'Light theme', dark: 'Dark theme' }

export function ThemeToggle() {
  const { pref, setPref } = useTheme()
  const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length]

  return (
    <button
      type="button"
      onClick={() => setPref(next)}
      title={`${LABEL[pref]} (click for ${LABEL[next].toLowerCase()})`}
      aria-label={`${LABEL[pref]}. Switch to ${LABEL[next].toLowerCase()}`}
      className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-white/10"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {pref === 'light' && (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        )}
        {pref === 'dark' && <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />}
        {pref === 'system' && (
          <>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 16v4" />
          </>
        )}
      </svg>
    </button>
  )
}
