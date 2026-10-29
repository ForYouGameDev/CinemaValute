const KEY = import.meta.env.VITE_TMDB_API_KEY as string
const cache = new Map<string, any>()
export const img = (p?: string | null, s = 'w342') => (p ? `https://image.tmdb.org/t/p/${s}${p}` : '')
export async function tmdb(path: string, params: Record<string, string> = {}) {
  const q = new URLSearchParams({ api_key: KEY, ...params }).toString()
  const k = path + q
  if (cache.has(k)) return cache.get(k)
  const r = await fetch(`https://api.themoviedb.org/3${path}?${q}`)
  if (!r.ok) throw new Error(`TMDB ${r.status}`)
  const j = await r.json(); cache.set(k, j); return j
}
