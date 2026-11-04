import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="glass mx-auto mt-8 max-w-md rounded-2xl px-6 py-12 text-center">
      <p className="text-5xl font-semibold text-slate-400/80 dark:text-slate-600">404</p>
      <p className="mt-3 text-slate-600 dark:text-slate-400">That page doesn't exist.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">Go to your library</Link>
    </div>
  )
}
