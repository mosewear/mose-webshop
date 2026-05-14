import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type NewsletterAdminAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse }

/**
 * Session must belong to a user with profiles.is_admin = true.
 * Used by newsletter export/import and similar admin-only routes.
 */
export async function requireNewsletterAdmin(): Promise<NewsletterAdminAuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 401 }
      ),
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Geen admin rechten' },
        { status: 403 }
      ),
    }
  }

  return { ok: true as const }
}
