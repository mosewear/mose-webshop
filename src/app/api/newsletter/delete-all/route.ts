import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('[Delete All] Auth check:', { user: user?.id, authError })
    
    if (authError || !user) {
      console.log('[Delete All] No user found or auth error')
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    // Check if user is admin via is_admin column
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    console.log('[Delete All] Profile check:', { profile, profileError })

    if (profileError) {
      console.log('[Delete All] Profile error:', profileError)
      return NextResponse.json(
        { success: false, error: 'Profiel niet gevonden' },
        { status: 403 }
      )
    }

    if (!profile?.is_admin) {
      console.log('[Delete All] User is not admin, is_admin:', profile?.is_admin)
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd (geen admin rechten)' },
        { status: 403 }
      )
    }

    console.log('[Delete All] Admin verified, deleting all subscribers...')

    // Get all subscriber IDs first
    const { data: allSubscribers, error: fetchError } = await supabase
      .from('newsletter_subscribers')
      .select('id')

    if (fetchError) {
      console.error('[Delete All] Fetch error:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Kan subscribers niet ophalen' },
        { status: 500 }
      )
    }

    const count = allSubscribers?.length || 0
    console.log('[Delete All] Found subscribers:', count)

    if (count === 0) {
      return NextResponse.json({
        success: true,
        message: '0 subscribers verwijderd',
        deleted: 0
      })
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )

    // Delete all subscribers using service role
    const { error: deleteError, count: deletedCount } = await supabaseAdmin
      .from('newsletter_subscribers')
      .delete({ count: 'exact' })
      .not('id', 'is', null)

    if (deleteError) {
      console.error('[Delete All] Delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Kan subscribers niet verwijderen' },
        { status: 500 }
      )
    }

    console.log('[Delete All] Success! Deleted:', deletedCount)

    return NextResponse.json({
      success: true,
      message: `${deletedCount || count} subscribers verwijderd`,
      deleted: deletedCount || count
    })
  } catch (error) {
    console.error('[Delete All] Catch error:', error)
    return NextResponse.json(
      { success: false, error: 'Er ging iets mis' },
      { status: 500 }
    )
  }
}

