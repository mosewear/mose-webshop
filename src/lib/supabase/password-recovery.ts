import { createClient } from '@supabase/supabase-js'
import { createAuthTimeoutFetch } from './auth-fetch'

export function createPasswordRecoveryClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: createAuthTimeoutFetch(url) },
  })
}
