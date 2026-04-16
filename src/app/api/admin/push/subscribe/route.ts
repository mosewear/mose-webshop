import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subscription } = body
    
    if (!subscription) {
      return NextResponse.json(
        { error: 'Missing subscription' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Use authenticated session user instead of client-supplied userId
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - admin only' },
        { status: 403 }
      )
    }

    const { data: insertData, error } = await supabase
      .from('admin_push_subscriptions')
      .upsert({
        user_id: user.id,
        subscription: subscription,
        endpoint: subscription.endpoint,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()

    if (error) {
      console.error('[Push Subscribe] Database error:', error.message)
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: insertData })
  } catch (error) {
    console.error('[Push Subscribe] Error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


