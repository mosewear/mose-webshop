/**
 * Supabase Service Role Client
 * 
 * This client uses the SERVICE_ROLE_KEY which bypasses Row Level Security (RLS).
 * 
 * ⚠️ SECURITY WARNING:
 * - Only use this for trusted server-side operations
 * - Never expose this client to the browser/client-side
 * - Service role has full admin access to the database
 * 
 * Use cases:
 * - Email logging from webhooks/server functions
 * - System operations that need to bypass RLS
 * - Background jobs and cron tasks
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

/**
 * Create a Supabase client with service role privileges
 * Bypasses RLS policies - use with caution!
 */
export function createServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

