import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { subscription, userId } = await req.json()
    
    if (!subscription || !userId) {
      return NextResponse.json(
        { error: 'Missing subscription or userId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()
    
    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - admin only' },
        { status: 403 }
      )
    }

    // Save subscription to database
    const { error } = await supabase
      .from('admin_push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscription,
        endpoint: subscription.endpoint,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('[Push Subscribe] Error saving subscription:', error)
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      )
    }

    console.log('[Push Subscribe] Subscription saved for user:', userId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Push Subscribe] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

