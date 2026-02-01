import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is verplicht' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if email exists
    const { data: existing, error: checkError } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Dit email adres is niet gevonden in onze lijst' },
        { status: 404 }
      )
    }

    if (existing.status === 'unsubscribed') {
      return NextResponse.json(
        { success: true, message: 'Je was al uitgeschreven' },
      )
    }

    // Unsubscribe: update status
    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('Error unsubscribing user:', updateError)
      return NextResponse.json(
        { success: false, error: 'Er ging iets mis. Probeer het opnieuw.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Je bent uitgeschreven. We vinden het jammer dat je gaat!',
    })
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    return NextResponse.json(
      { success: false, error: 'Er ging iets mis. Probeer het opnieuw.' },
      { status: 500 }
    )
  }
}




