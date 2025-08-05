import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // after an OAuth redirect, read the session from the URL
    detectSessionInUrl: true,
    // auto-refresh the JWT and persist it in localStorage
    autoRefreshToken: true,
    persistSession: true,
  },
})
