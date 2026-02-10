import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const {
      session_id,
      page_url,
      device_type,
      user_agent,
      locale,
      purchase_likelihood,
      what_needed,
      what_needed_other,
      first_impression,
    } = await req.json()

    if (!session_id || !purchase_likelihood || !what_needed || what_needed.length === 0) {
      return NextResponse.json(
        { error: 'session_id, purchase_likelihood, and what_needed are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('survey_responses')
      .insert({
        session_id,
        page_url: page_url || null,
        device_type: device_type || null,
        user_agent: user_agent || null,
        locale: locale || 'nl',
        purchase_likelihood,
        what_needed: Array.isArray(what_needed) ? what_needed : [],
        what_needed_other: what_needed_other || null,
        first_impression: first_impression || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error saving survey response:', error)
      return NextResponse.json(
        { error: 'Failed to save survey response', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      id: data.id,
    })
  } catch (error: any) {
    console.error('Error in survey submit route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

