import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { imageId, thumbnailUrl } = await request.json()

    if (!imageId || !thumbnailUrl) {
      return NextResponse.json(
        { error: 'Missing imageId or thumbnailUrl' },
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

    // Update the product_image with the new thumbnail URL
    const { error } = await supabase
      .from('product_images')
      .update({ video_thumbnail_url: thumbnailUrl })
      .eq('id', imageId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating video thumbnail:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}

