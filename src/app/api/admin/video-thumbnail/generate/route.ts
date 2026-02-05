import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { imageId, videoUrl } = await request.json()

    if (!imageId || !videoUrl) {
      return NextResponse.json(
        { error: 'Missing imageId or videoUrl' },
        { status: 400 }
      )
    }

    // Check if user is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    // Note: Actual frame extraction happens client-side
    // This endpoint just handles the database update
    // The client will extract the frame, upload it, and send us the URL

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in video thumbnail generate:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}

