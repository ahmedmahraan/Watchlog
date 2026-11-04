# Watchlog

A personal movie and TV tracker. React + Vite + TypeScript + Tailwind, with Supabase for auth and data and TMDB for metadata. Deployed to GitHub Pages.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the two values
npm run dev                  # http://localhost:5173/watchlog/
```

## One-time setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. **Project Settings → API**: copy the Project URL and the `anon` public key into `.env.local`:
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
3. Apply the database migrations (tables + row-level security):
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push --remote   # CLI 3+: without --remote it targets a local database
   ```
   Or paste `supabase/migrations/*.sql` into the dashboard's SQL editor and run it.

### 2. Auth redirect URLs

**Authentication → URL Configuration**:

- **Site URL**: `https://ahmedmahraan.github.io/Watchlog/`
- **Redirect URLs**: add both
  - `https://ahmedmahraan.github.io/Watchlog/`
  - `http://localhost:5173/watchlog/`

Sign-in uses the PKCE flow, so a magic link must be opened in the same browser that requested it.

### 3. Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** (type: Web application).
2. **Authorized JavaScript origins**: `https://ahmedmahraan.github.io` and `http://localhost:5173`.
3. **Authorized redirect URIs**: `https://<project-ref>.supabase.co/auth/v1/callback`.
4. In Supabase, **Authentication → Sign In / Providers → Google**: enable it and paste the client ID and secret.

Email magic links work out of the box. Supabase's built-in mailer is rate-limited, so for regular use add your own SMTP under **Authentication → Emails**.

### 4. GitHub Pages

1. The repo is `ahmedmahraan/Watchlog`. The Pages path is case-sensitive; if the repo is renamed, change `REPO_NAME` in `vite.config.ts` and the URLs above.
2. **Settings → Secrets and variables → Actions**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **Settings → Pages → Source**: Deploy from a branch → `gh-pages` / `(root)`. The workflow creates that branch on its first run.

Every push to `main` builds and deploys.

## Data model

See `supabase/migrations/`. Two tables, `titles` and `episode_watches`. Row-level security means each user can only read and write their own rows, and an episode can only point at a title owned by the same user.
