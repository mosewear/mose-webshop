import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversation_id')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      )
    }

    const { authorized, supabase } = await requireAdmin()

    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ messages: data || [] })
  } catch (error: any) {
    console.error('Error in messages route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

