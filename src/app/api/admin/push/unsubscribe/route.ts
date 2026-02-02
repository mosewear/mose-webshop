import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Delete subscription from database
    const { error } = await supabase
      .from('admin_push_subscriptions')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('[Push Unsubscribe] Error removing subscription:', error)
      return NextResponse.json(
        { error: 'Failed to remove subscription' },
        { status: 500 }
      )
    }

    console.log('[Push Unsubscribe] Subscription removed for user:', userId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Push Unsubscribe] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

