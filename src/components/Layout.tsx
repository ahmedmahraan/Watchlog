import { Link, NavLink, Outlet } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { useAuth } from '../lib/auth'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'glass text-slate-900 dark:text-white'
      : 'border border-transparent text-slate-600 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-white/10'
  }`

export function Layout() {
  const { user } = useAuth()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="glass sticky top-0 z-20 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <Link to="/" className="mr-auto flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-white" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M7 4.5v15l12.5-7.5z" /></svg>
            </span>
            <span className="hidden sm:inline">Watchlog</span>
          </Link>
          {user && (
            <nav className="flex items-center gap-1">
              <NavLink to="/" end className={navClass}>Library</NavLink>
              <NavLink to="/stats" className={navClass}>Stats</NavLink>
              <NavLink
                to="/add"
                className="ml-1 rounded-lg border border-white/20 bg-brand-600/90 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-brand-600/25 backdrop-blur hover:bg-brand-600"
              >
                + Add
              </NavLink>
            </nav>
          )}
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6">
        <Outlet />
      </main>

    </div>
  )
}
