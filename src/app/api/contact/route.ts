import { NextRequest, NextResponse } from 'next/server'
import { sendContactFormEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json()

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Vul alle velden in' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ongeldig email adres' },
        { status: 400 }
      )
    }

    // Send email
    const emailResult = await sendContactFormEmail({
      name,
      email,
      subject,
      message,
    })

    if (!emailResult.success) {
      console.error('Error sending contact email:', emailResult.error)
      return NextResponse.json(
        { error: 'Kon email niet versturen. Probeer het later opnieuw.' },
        { status: 500 }
      )
    }

    // Optionally save to database (for admin overview)
    // You can uncomment this if you want to store contact submissions
    /*
    const supabase = await createClient()
    await supabase.from('contact_submissions').insert({
      name,
      email,
      subject,
      message,
    })
    */

    return NextResponse.json({
      success: true,
      message: 'Bedankt! We hebben je bericht ontvangen en nemen zo snel mogelijk contact op.',
    })
  } catch (error: any) {
    console.error('Error in contact form:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

