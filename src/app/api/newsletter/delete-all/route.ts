import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
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

    if (profile?.role !== 'admin') {
      console.log('[Delete All] User is not admin, role:', profile?.role)
      return NextResponse.json(
        { success: false, error: `Niet geautoriseerd (role: ${profile?.role})` },
        { status: 403 }
      )
    }

    console.log('[Delete All] Admin verified, deleting all subscribers...')

    // Get count first
    const { count } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })

    console.log('[Delete All] Count:', count)

    // Delete all subscribers
    const { error: deleteError } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

    if (deleteError) {
      console.error('[Delete All] Delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Kan subscribers niet verwijderen' },
        { status: 500 }
      )
    }

    console.log('[Delete All] Success! Deleted:', count)

    return NextResponse.json({
      success: true,
      message: `${count || 0} subscribers verwijderd`,
      deleted: count || 0
    })
  } catch (error) {
    console.error('[Delete All] Catch error:', error)
    return NextResponse.json(
      { success: false, error: 'Er ging iets mis' },
      { status: 500 }
    )
  }
}

