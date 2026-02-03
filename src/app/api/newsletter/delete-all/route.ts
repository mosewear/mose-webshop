import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 403 }
      )
    }

    // Get count first
    const { count } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })

    // Delete all subscribers
    const { error: deleteError } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

    if (deleteError) {
      console.error('Error deleting all subscribers:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Kan subscribers niet verwijderen' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${count || 0} subscribers verwijderd`,
      deleted: count || 0
    })
  } catch (error) {
    console.error('Delete all subscribers error:', error)
    return NextResponse.json(
      { success: false, error: 'Er ging iets mis' },
      { status: 500 }
    )
  }
}

