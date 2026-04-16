import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'

export const createAdminClient = async () => {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.warn('Could not set cookie from server component:', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            console.warn('Could not remove cookie from server component:', error);
          }
        },
      },
    }
  )

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { supabase, user: null, adminUser: null, isAdmin: false }
  }

  // Check if user is an admin via profiles table
  // First try with admin_role column, fallback without it if column doesn't exist yet
  let profile: { id: string; is_admin: boolean; admin_role?: string | null; created_at: string; updated_at: string } | null = null

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_admin, admin_role, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (profileError && profileError.message?.includes('admin_role')) {
    // admin_role column doesn't exist yet — query without it
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('profiles')
      .select('id, is_admin, created_at, updated_at')
      .eq('id', user.id)
      .single()

    if (fallbackError || !fallbackData) {
      return { supabase, user, adminUser: null, isAdmin: false }
    }
    profile = { ...(fallbackData as any), admin_role: null }
  } else if (profileError || !profileData) {
    return { supabase, user, adminUser: null, isAdmin: false }
  } else {
    profile = profileData as any
  }

  if (!profile || !profile.is_admin) {
    return { supabase, user, adminUser: null, isAdmin: false }
  }

  const adminUser = {
    id: profile.id,
    role: (profile.admin_role || 'admin') as AdminRole,
    created_at: profile.created_at,
    updated_at: profile.updated_at
  }
  const isAdmin = true

  return {
    supabase,
    user,
    adminUser,
    isAdmin
  }
}

export type AdminRole = 'admin' | 'manager' | 'viewer'

export async function requireAdmin(allowedRoles: AdminRole[] = ['admin', 'manager']) {
  const { user, adminUser, isAdmin, supabase } = await createAdminClient()

  if (!user || !adminUser) {
    return { authorized: false, user: null, adminUser: null, supabase: null }
  }

  if (!allowedRoles.includes(adminUser.role as AdminRole)) {
    return { authorized: false, user, adminUser, supabase }
  }

  return { authorized: true, user, adminUser, supabase }
}

