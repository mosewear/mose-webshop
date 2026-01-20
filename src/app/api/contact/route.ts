import { NextRequest, NextResponse } from 'next/server'
import { sendContactFormEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json()

    console.log('📧 Contact form submission:', { name, email, subject })

    // Validation
    if (!name || !email || !subject || !message) {
      console.error('❌ Validation error: Missing fields')
      return NextResponse.json(
        { error: 'Vul alle velden in' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.error('❌ Validation error: Invalid email')
      return NextResponse.json(
        { error: 'Ongeldig email adres' },
        { status: 400 }
      )
    }

    // Check RESEND_API_KEY
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ FATAL: RESEND_API_KEY is not set!')
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support.' },
        { status: 500 }
      )
    }

    console.log('✅ RESEND_API_KEY is set')

    // Send email
    const emailResult = await sendContactFormEmail({
      name,
      email,
      subject,
      message,
    })

    console.log('📧 Email result:', emailResult)

    if (!emailResult.success) {
      console.error('❌ Error sending contact email:', emailResult.error)
      return NextResponse.json(
        { error: 'Kon email niet versturen. Probeer het later opnieuw.' },
        { status: 500 }
      )
    }

    console.log('✅ Contact form email sent successfully!')

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
    console.error('💥 Error in contact form:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


