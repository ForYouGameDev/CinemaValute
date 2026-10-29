export type SourceType = 'youtube' | 'public_domain' | 'licensed_player' | 'provider_link'
const YT = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtu.be']
const IA = ['archive.org', 'www.archive.org']
export function validateSource(type: SourceType, raw: string): { ok: boolean; error?: string } {
  let u: URL
  try { u = new URL(raw) } catch { return { ok: false, error: 'Invalid URL' } }
  if (u.protocol !== 'https:') return { ok: false, error: 'Only https URLs allowed' }
  if (type === 'youtube' && !YT.includes(u.hostname)) return { ok: false, error: 'Must be a YouTube URL' }
  if (type === 'public_domain' && !IA.includes(u.hostname)) return { ok: false, error: 'Must be an archive.org URL' }
  return { ok: true }
}
export function embedUrl(type: SourceType, raw: string): string | null {
  if (!validateSource(type, raw).ok) return null
  const u = new URL(raw)
  if (type === 'youtube') { const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || u.pathname.split('/').pop(); return id ? `https://www.youtube-nocookie.com/embed/${id}` : null }
  if (type === 'public_domain') return raw.replace('/details/', '/embed/')
  return type === 'licensed_player' ? raw : null // provider_link is never embedded
}
