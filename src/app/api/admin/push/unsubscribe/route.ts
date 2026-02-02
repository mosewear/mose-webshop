import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  console.log('[Push Unsubscribe] ========== NEW REQUEST ==========')
  try {
    const body = await req.json()
    console.log('[Push Unsubscribe] Request body:', body)
    
    const { userId } = body
    
    if (!userId) {
      console.error('[Push Unsubscribe] Missing userId')
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    console.log('[Push Unsubscribe] Creating Supabase client...')
    const supabase = await createClient()

    console.log('[Push Unsubscribe] Deleting subscription for user:', userId)
    // Delete subscription from database
    const { data, error } = await supabase
      .from('admin_push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('[Push Unsubscribe] ❌ DATABASE ERROR:', error)
      console.error('[Push Unsubscribe] Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: 'Failed to remove subscription', details: error.message },
        { status: 500 }
      )
    }

    console.log('[Push Unsubscribe] ✅ SUCCESS! Deleted:', data)
    console.log('[Push Unsubscribe] User ID:', userId)
    
    return NextResponse.json({ success: true, deleted: data })
  } catch (error) {
    console.error('[Push Unsubscribe] ❌ UNEXPECTED ERROR:', error)
    console.error('[Push Unsubscribe] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}


