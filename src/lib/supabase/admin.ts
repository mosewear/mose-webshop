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

  // Check if user is an admin
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (adminError || !adminUser) {
    return { supabase, user, adminUser: null, isAdmin: false }
  }

  const isAdmin = adminUser.role === 'admin' || adminUser.role === 'manager'

  return {
    supabase,
    user,
    adminUser,
    isAdmin
  }
}

export type AdminRole = 'admin' | 'manager' | 'viewer'

export async function requireAdmin(allowedRoles: AdminRole[] = ['admin', 'manager']) {
  const { user, adminUser, isAdmin } = await createAdminClient()

  if (!user || !adminUser) {
    return { authorized: false, user: null, adminUser: null }
  }

  if (!allowedRoles.includes(adminUser.role as AdminRole)) {
    return { authorized: false, user, adminUser }
  }

  return { authorized: true, user, adminUser }
}

