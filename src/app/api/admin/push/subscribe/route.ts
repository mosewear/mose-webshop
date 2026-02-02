import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  console.log('[Push Subscribe] ========== NEW REQUEST ==========')
  try {
    const body = await req.json()
    console.log('[Push Subscribe] Request body:', { 
      hasSubscription: !!body.subscription, 
      hasUserId: !!body.userId,
      userId: body.userId,
      endpoint: body.subscription?.endpoint
    })
    
    const { subscription, userId } = body
    
    if (!subscription || !userId) {
      console.error('[Push Subscribe] Missing data:', { subscription: !!subscription, userId: !!userId })
      return NextResponse.json(
        { error: 'Missing subscription or userId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    console.log('[Push Subscribe] Supabase client created')
    
    // Verify user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()
    
    console.log('[Push Subscribe] Profile check:', { 
      profile, 
      profileError,
      isAdmin: profile?.is_admin 
    })
    
    if (!profile?.is_admin) {
      console.error('[Push Subscribe] User is not admin or not found')
      return NextResponse.json(
        { error: 'Unauthorized - admin only' },
        { status: 403 }
      )
    }

    console.log('[Push Subscribe] Attempting to save subscription to database...')
    
    // Save subscription to database
    const { data: insertData, error } = await supabase
      .from('admin_push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscription,
        endpoint: subscription.endpoint,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()

    if (error) {
      console.error('[Push Subscribe] ❌ DATABASE ERROR:', error)
      console.error('[Push Subscribe] Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: 'Failed to save subscription', details: error.message },
        { status: 500 }
      )
    }

    console.log('[Push Subscribe] ✅ SUCCESS! Subscription saved:', insertData)
    console.log('[Push Subscribe] User ID:', userId)
    
    return NextResponse.json({ success: true, data: insertData })
  } catch (error) {
    console.error('[Push Subscribe] ❌ UNEXPECTED ERROR:', error)
    console.error('[Push Subscribe] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}


