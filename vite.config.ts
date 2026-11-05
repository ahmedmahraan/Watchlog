import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves the site from https://<user>.github.io/<repo-name>/ and the
// path is case-sensitive, so the production base must match the repo name exactly.
const REPO_NAME = 'Watchlog'

// Local dev stays at http://localhost:5173/watchlog/ (the URL registered in
// Supabase and Google as an allowed redirect).
const DEV_BASE = '/watchlog/'

export default defineConfig(({ command, isPreview }) => ({
  // `vite preview` serves the production build, so it uses the production base too.
  base: command === 'build' || isPreview ? `/${REPO_NAME}/` : DEV_BASE,
  plugins: [react(), tailwindcss()],
}))
