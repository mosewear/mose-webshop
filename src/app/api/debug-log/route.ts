import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { level, message, details } = body

    const supabase = await createClient()

    // Save log to database
    const { error } = await supabase
      .from('debug_logs')
      .insert([
        {
          level: level || 'info',
          message: message || 'No message',
          details: details || {},
          user_agent: req.headers.get('user-agent'),
          url: req.headers.get('referer'),
        },
      ])

    if (error) {
      console.error('Error saving debug log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Debug log API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

