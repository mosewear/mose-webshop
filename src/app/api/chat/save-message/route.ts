import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API route to save chat messages to database
 * Called after each message (user or assistant) is sent
 */
export async function POST(req: NextRequest) {
  try {
    const { conversationId, sessionId, role, content, metadata, pageUrl, deviceType, userAgent, locale } = await req.json()

    if (!role || !content) {
      return NextResponse.json(
        { error: 'role and content are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    let conversation_id = conversationId

    // If no conversation ID, create new conversation
    if (!conversation_id && sessionId) {
      const { data: newConversation, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          session_id: sessionId,
          page_url: pageUrl || null,
          device_type: deviceType || null,
          user_agent: userAgent || null,
          locale: locale || 'nl',
        })
        .select('id')
        .single()

      if (convError) {
        console.error('Error creating conversation:', convError)
        return NextResponse.json(
          { error: 'Failed to create conversation', details: convError },
          { status: 500 }
        )
      }

      conversation_id = newConversation.id
    }

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id or session_id required' },
        { status: 400 }
      )
    }

    // Save message
    const { data: message, error: msgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversation_id,
        role: role,
        content: content,
        metadata: metadata || {},
      })
      .select('id')
      .single()

    if (msgError) {
      console.error('Error saving message:', msgError)
      return NextResponse.json(
        { error: 'Failed to save message', details: msgError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      conversation_id: conversation_id,
      message_id: message.id,
    })
  } catch (error: any) {
    console.error('Error in save-message route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


