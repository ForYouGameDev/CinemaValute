import { createClient } from '@supabase/supabase-js'
// Only the public anon key lives in the frontend. Never use the service-role key here.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
export const signInGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } })
