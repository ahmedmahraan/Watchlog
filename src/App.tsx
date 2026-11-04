import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import LibraryPage from './pages/LibraryPage'
import AddPage from './pages/AddPage'
import TitlePage from './pages/TitlePage'
import StatsPage from './pages/StatsPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

const guard = (el: ReactNode) => <RequireAuth>{el}</RequireAuth>

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="login" element={<LoginPage />} />
        <Route index element={guard(<LibraryPage />)} />
        <Route path="add" element={guard(<AddPage />)} />
        <Route path="title/:id" element={guard(<TitlePage />)} />
        <Route path="stats" element={guard(<StatsPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
