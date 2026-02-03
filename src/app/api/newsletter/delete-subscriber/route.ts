import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('[Delete Subscriber] Auth check:', { user: user?.id, authError })
    
    if (authError || !user) {
      console.log('[Delete Subscriber] No user found or auth error')
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

    console.log('[Delete Subscriber] Profile check:', { profile, profileError })

    if (profileError) {
      console.log('[Delete Subscriber] Profile error:', profileError)
      return NextResponse.json(
        { success: false, error: 'Profiel niet gevonden' },
        { status: 403 }
      )
    }

    if (!profile?.is_admin) {
      console.log('[Delete Subscriber] User is not admin, is_admin:', profile?.is_admin)
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd (geen admin rechten)' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { subscriberId } = body

    if (!subscriberId) {
      return NextResponse.json(
        { success: false, error: 'Subscriber ID is verplicht' },
        { status: 400 }
      )
    }

    console.log('[Delete Subscriber] Admin verified, deleting:', subscriberId)

    // Delete subscriber
    const { error: deleteError } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('id', subscriberId)

    if (deleteError) {
      console.error('[Delete Subscriber] Delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Kan subscriber niet verwijderen' },
        { status: 500 }
      )
    }

    console.log('[Delete Subscriber] Success!')

    return NextResponse.json({
      success: true,
      message: 'Subscriber verwijderd'
    })
  } catch (error) {
    console.error('[Delete Subscriber] Catch error:', error)
    return NextResponse.json(
      { success: false, error: 'Er ging iets mis' },
      { status: 500 }
    )
  }
}

