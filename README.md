# CineVault
Legal movie/series discovery: React + Vite + TS + Tailwind, Supabase, GitHub Pages.

## Setup
1. `npm install`, copy `.env.example` to `.env`, fill values. Never commit `.env`.
2. Supabase: SQL editor, run `supabase/migrations/001_init.sql`.
3. Google OAuth: Google Cloud Console, create OAuth Client (Web). Authorized redirect URI = `https://<project>.supabase.co/auth/v1/callback`. Paste Client ID/Secret in Supabase, Auth, Providers, Google. Add your GitHub Pages URL in Auth, URL Configuration.
4. First admin: sign in once, then in SQL editor: `insert into admin_roles select id from auth.users where email='you@gmail.com';`
5. TMDB: free API key at themoviedb.org. A key in a static bundle is visible to visitors; use a free key and rotate if abused.
6. GitHub: repo, Settings, Pages, Source = GitHub Actions. Add secrets VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_TMDB_API_KEY. Push to `main`.
7. Tests: `npm test`.

## Terms
- TMDB attribution is shown on detail pages; review TMDB API terms (free tier is non-commercial).
- YouTube: play only through the official embed; follow YouTube API Services ToS.
- Internet Archive: add only items you verified as public domain or licensed.
- Watchmode is optional and needs its own key/plan (not wired up yet).
