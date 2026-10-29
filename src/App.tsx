import { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase, signInGoogle } from './lib/supabase'
import { tmdb, img } from './lib/tmdb'
import { embedUrl, validateSource, SourceType } from './lib/validate'

function useSession() {
  const [s, setS] = useState<Session | null>(null)
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setS(data.session)); const { data } = supabase.auth.onAuthStateChange((_e, x) => setS(x)); return () => data.subscription.unsubscribe() }, [])
  return s
}
function useAdmin(s: Session | null) {
  const [a, setA] = useState<boolean | null>(null)
  useEffect(() => { if (!s) { setA(false); return } supabase.rpc('is_admin').then(({ data }) => setA(!!data)) }, [s])
  return a
}
const Skeleton = () => <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="sk aspect-[2/3] rounded-md" />)}</div>

function Grid({ items, type }: { items: any[]; type?: string }) {
  if (!items.length) return <p className="text-slate-400">Nothing found. Try a different search.</p>
  return <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">{items.map(m => {
    const t = type || m.media_type || 'movie'
    return <Link key={m.id} to={`/t/${t}/${m.id}`} className="group">
      <img loading="lazy" alt={m.title || m.name} src={img(m.poster_path)} className="aspect-[2/3] w-full object-cover rounded-md bg-panel group-hover:ring-2 ring-amber" />
      <p className="mt-1 text-sm truncate">{m.title || m.name}</p></Link>
  })}</div>
}
function Row({ title, path, type }: { title: string; path: string; type?: string }) {
  const [d, setD] = useState<any[] | null>(null); const [err, setErr] = useState('')
  useEffect(() => { tmdb(path).then(j => setD(j.results.slice(0, 12))).catch(e => setErr(e.message)) }, [path])
  return <section className="mb-8"><h2 className="font-display text-xl mb-3">{title}</h2>{err ? <p className="text-red-400">Couldn't load this row ({err}).</p> : d ? <Grid items={d} type={type} /> : <Skeleton />}</section>
}
const Home = () => <><Row title="Trending this week" path="/trending/all/week" /><Row title="Popular movies" path="/movie/popular" type="movie" /><Row title="Popular series" path="/tv/popular" type="tv" /><Row title="Now playing" path="/movie/now_playing" type="movie" /></>

function Search() {
  const { q } = useParams(); const [d, setD] = useState<any[] | null>(null)
  useEffect(() => { setD(null); tmdb('/search/multi', { query: q || '' }).then(j => setD(j.results.filter((x: any) => x.media_type !== 'person'))).catch(() => setD([])) }, [q])
  return <><h2 className="font-display text-xl mb-3">Results for “{q}”</h2>{d ? <Grid items={d} /> : <Skeleton />}</>
}

function Detail({ session }: { session: Session | null }) {
  const { type, id } = useParams(); const [m, setM] = useState<any>(null); const [src, setSrc] = useState<any[]>([]); const [fav, setFav] = useState(false); const [wl, setWl] = useState(false)
  const uid = session?.user.id
  useEffect(() => {
    tmdb(`/${type}/${id}`, { append_to_response: 'credits,videos' }).then(setM).catch(() => setM(false))
    supabase.from('playback_sources').select('*, titles!inner(tmdb_id,media_type,published)').eq('titles.tmdb_id', id).eq('titles.media_type', type).eq('enabled', true).then(({ data }) => setSrc(data || []))
    if (uid) { supabase.from('favorites').select('tmdb_id').eq('tmdb_id', id).eq('media_type', type).then(({ data }) => setFav(!!data?.length)); supabase.from('watchlist').select('tmdb_id').eq('tmdb_id', id).eq('media_type', type).then(({ data }) => setWl(!!data?.length)) }
  }, [type, id, uid])
  const toggle = async (table: 'favorites' | 'watchlist', on: boolean, set: (b: boolean) => void) => {
    if (!uid) return signInGoogle()
    const row = { user_id: uid, tmdb_id: Number(id), media_type: type }
    if (on) await supabase.from(table).delete().match({ user_id: uid, tmdb_id: Number(id), media_type: type }); else await supabase.from(table).insert({ ...row, title: m.title || m.name, poster_path: m.poster_path })
    set(!on)
  }
  if (m === null) return <div className="sk h-96 rounded-lg" />
  if (m === false) return <p>Couldn't load this title. Check your connection and try again.</p>
  const play = src.find(s => s.source_type !== 'provider_link' && embedUrl(s.source_type, s.url))
  const links = src.filter(s => s.source_type === 'provider_link' && validateSource('provider_link', s.url).ok)
  const click = (s: any) => supabase.from('link_clicks').insert({ source_id: s.id, user_id: uid ?? null })
  return <div>
    <div className="rounded-lg overflow-hidden relative"><img alt="" src={img(m.backdrop_path, 'w1280')} className="w-full h-56 sm:h-80 object-cover opacity-50" /></div>
    <div className="-mt-20 px-3 flex gap-4"><img alt="" src={img(m.poster_path)} className="w-28 sm:w-44 rounded-md self-start" />
      <div className="pt-20"><h1 className="font-display text-3xl">{m.title || m.name}</h1><p className="text-slate-400 text-sm">{(m.release_date || m.first_air_date || '').slice(0, 4)} · {m.genres?.map((g: any) => g.name).join(', ')} · ★ {m.vote_average?.toFixed(1)}</p></div></div>
    <p className="mt-4 max-w-prose text-slate-300">{m.overview || 'No synopsis available.'}</p>
    <div className="flex flex-wrap gap-2 my-4">
      {play && <a href="#player" className="bg-amber text-black font-semibold px-5 py-2 rounded-md">Watch now ({play.source_type === 'youtube' ? 'Free · YouTube' : 'Free'})</a>}
      <button onClick={() => toggle('favorites', fav, setFav)} className="border border-line px-4 py-2 rounded-md">{fav ? 'Remove favorite' : 'Add favorite'}</button>
      <button onClick={() => toggle('watchlist', wl, setWl)} className="border border-line px-4 py-2 rounded-md">{wl ? 'Remove from watchlist' : 'Add to watchlist'}</button></div>
    {play ? <iframe id="player" title="Player" className="w-full aspect-video rounded-lg" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" src={embedUrl(play.source_type, play.url)!} /> : <p className="text-slate-400">No authorized free source is available for this title yet.</p>}
    {!!links.length && <div className="mt-4"><h3 className="font-display mb-2">Where to watch</h3>{links.map(s => <a key={s.id} onClick={() => click(s)} target="_blank" rel="noopener noreferrer" href={s.url} className="inline-block mr-2 border border-line px-3 py-1 rounded-md">{s.label || 'Provider'} <span className="text-xs text-slate-400">({s.access})</span></a>)}</div>}
    <p className="mt-8 text-xs text-slate-500">This product uses the TMDB API but is not endorsed or certified by TMDB.</p></div>
}

function Saved({ table, session }: { table: 'favorites' | 'watchlist'; session: Session | null }) {
  const [d, setD] = useState<any[] | null>(null)
  useEffect(() => { if (session) supabase.from(table).select('*').order('created_at', { ascending: false }).then(({ data }) => setD(data || [])) }, [session, table])
  if (!session) return <p>Sign in with Google to see your {table}. <button onClick={signInGoogle} className="underline text-amber">Sign in</button></p>
  return <><h2 className="font-display text-xl mb-3 capitalize">{table}</h2>{d ? <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">{d.map(x => <Link key={x.id} to={`/t/${x.media_type}/${x.tmdb_id}`}><img alt={x.title} src={img(x.poster_path)} className="rounded-md" /></Link>)}</div> : <Skeleton />}{d?.length === 0 && <p className="text-slate-400">Empty for now. Add titles from any detail page.</p>}</>
}

function Admin({ session }: { session: Session | null }) {
  const isAdmin = useAdmin(session); const [f, setF] = useState({ tmdb_id: '', media_type: 'movie', title: '', source_type: 'youtube', url: '' }); const [msg, setMsg] = useState(''); const [stats, setStats] = useState<any>(null)
  useEffect(() => { if (isAdmin) supabase.rpc('admin_stats').then(({ data }) => setStats(data)) }, [isAdmin])
  if (isAdmin === null) return <p>Checking access…</p>
  if (!isAdmin) return <Navigate to="/" />
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); const v = validateSource(f.source_type as SourceType, f.url); if (!v.ok) return setMsg(v.error!)
    const { data: t, error } = await supabase.from('titles').upsert({ tmdb_id: +f.tmdb_id, media_type: f.media_type, title: f.title, published: true }, { onConflict: 'tmdb_id,media_type' }).select().single()
    if (error) return setMsg(error.message)
    const r = await supabase.from('playback_sources').insert({ title_id: t.id, source_type: f.source_type, url: f.url, access: 'free', enabled: true })
    setMsg(r.error ? r.error.message : 'Source added')
  }
  const inp = 'bg-panel border border-line rounded-md px-3 py-2'
  return <div><h2 className="font-display text-xl mb-3">Admin</h2>
    {stats && <p className="mb-4 text-slate-300">Users: {stats.users} · Titles: {stats.titles} · Favorites: {stats.favorites} · Link clicks: {stats.clicks}</p>}
    <form onSubmit={add} className="grid gap-2 max-w-md"><input required className={inp} placeholder="TMDB id" value={f.tmdb_id} onChange={e => setF({ ...f, tmdb_id: e.target.value })} />
      <select className={inp} value={f.media_type} onChange={e => setF({ ...f, media_type: e.target.value })}><option value="movie">Movie</option><option value="tv">Series</option></select>
      <input required className={inp} placeholder="Title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      <select className={inp} value={f.source_type} onChange={e => setF({ ...f, source_type: e.target.value })}><option value="youtube">Official YouTube</option><option value="public_domain">Public domain (archive.org)</option><option value="licensed_player">Licensed player</option><option value="provider_link">Legal provider link</option></select>
      <input required className={inp} placeholder="https://…" value={f.url} onChange={e => setF({ ...f, url: e.target.value })} />
      <button className="bg-amber text-black font-semibold py-2 rounded-md">Save source</button><p role="status">{msg}</p></form></div>
}

export default function App() {
  const session = useSession(); const nav = useNavigate(); const [q, setQ] = useState('')
  return <div className="max-w-6xl mx-auto p-4">
    <header className="flex flex-wrap items-center gap-3 mb-6"><Link to="/" className="font-display text-2xl text-amber">CineVault</Link>
      <form onSubmit={e => { e.preventDefault(); q && nav(`/search/${encodeURIComponent(q)}`) }} className="flex-1 min-w-40"><input aria-label="Search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search movies and series" className="w-full bg-panel border border-line rounded-md px-3 py-2" /></form>
      <Link to="/favorites">Favorites</Link><Link to="/watchlist">Watchlist</Link>
      {session ? <button onClick={() => supabase.auth.signOut()} className="border border-line px-3 py-1 rounded-md">Sign out</button> : <button onClick={signInGoogle} className="bg-amber text-black px-3 py-1 rounded-md font-semibold">Sign in with Google</button>}</header>
    <Routes><Route path="/" element={<Home />} /><Route path="/search/:q" element={<Search />} /><Route path="/t/:type/:id" element={<Detail session={session} />} />
      <Route path="/favorites" element={<Saved table="favorites" session={session} />} /><Route path="/watchlist" element={<Saved table="watchlist" session={session} />} /><Route path="/admin" element={<Admin session={session} />} /></Routes></div>
}
