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

    const body = await req.json()
    const { subscriberId } = body

    if (!subscriberId) {
      return NextResponse.json(
        { success: false, error: 'Subscriber ID is verplicht' },
        { status: 400 }
      )
    }

    // Delete subscriber
    const { error: deleteError } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('id', subscriberId)

    if (deleteError) {
      console.error('Error deleting subscriber:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Kan subscriber niet verwijderen' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Subscriber verwijderd'
    })
  } catch (error) {
    console.error('Delete subscriber error:', error)
    return NextResponse.json(
      { success: false, error: 'Er ging iets mis' },
      { status: 500 }
    )
  }
}

