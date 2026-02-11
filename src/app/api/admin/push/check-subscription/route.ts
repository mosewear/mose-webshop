import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Check if subscription exists in database
    const { data, error } = await supabase
      .from('admin_push_subscriptions')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[Push Check] Error checking subscription:', error)
      return NextResponse.json(
        { error: 'Failed to check subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      exists: !!data,
      userId: userId
    })
  } catch (error) {
    console.error('[Push Check] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


