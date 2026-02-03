import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNewsletterWelcomeEmail, sendInsiderWelcomeEmail } from '@/lib/email'

// Rate limiting map (in-memory, resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(req: NextRequest): string {
  // Use IP address or fallback to a header
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown'
  return ip
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(key)

  if (!limit || now > limit.resetTime) {
    // Reset or create new limit: 3 requests per 10 minutes
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + 10 * 60 * 1000, // 10 minutes
    })
    return true
  }

  if (limit.count >= 3) {
    return false // Rate limit exceeded
  }

  limit.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, source = 'homepage', locale = 'nl' } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is verplicht' },
        { status: 400 }
      )
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Ongeldig email adres' },
        { status: 400 }
      )
    }

    // Rate limiting
    const rateLimitKey = getRateLimitKey(req)
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { success: false, error: 'Te veel aanvragen. Probeer het over 10 minuten opnieuw.' },
        { status: 429 }
      )
    }

    const supabase = await createClient()

    // Check if email already exists
    const { data: existing, error: checkError } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = not found (which is fine)
      console.error('Error checking existing subscriber:', checkError)
      return NextResponse.json(
        { success: false, error: 'Er ging iets mis. Probeer het opnieuw.' },
        { status: 500 }
      )
    }

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json(
          { success: false, error: 'Dit email adres is al ingeschreven' },
          { status: 409 }
        )
      } else if (existing.status === 'unsubscribed') {
        // Resubscribe: update status back to active
        const { error: updateError } = await supabase
          .from('newsletter_subscribers')
          .update({
            status: 'active',
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null,
            source,
            locale, // Update locale preference
          })
          .eq('id', existing.id)

        if (updateError) {
          console.error('Error resubscribing user:', updateError)
          return NextResponse.json(
            { success: false, error: 'Er ging iets mis. Probeer het opnieuw.' },
            { status: 500 }
          )
        }

        // Send welcome email
        try {
          // Send insider email for early_access signups
          if (source === 'early_access' || source === 'early_access_landing') {
            await sendInsiderWelcomeEmail({ 
              email: email.toLowerCase(), 
              locale
            })
          } else {
            await sendNewsletterWelcomeEmail({ 
              email: email.toLowerCase(), 
              source,
              locale
            })
          }
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError)
          // Don't fail the subscription if email fails
        }

        return NextResponse.json({
          success: true,
          message: 'Je bent weer ingeschreven! Check je inbox.',
        })
      }
    }

    // Insert new subscriber
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase(),
        status: 'active',
        source,
        locale, // Store language preference
        subscribed_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Error inserting subscriber:', insertError)
      return NextResponse.json(
        { success: false, error: 'Er ging iets mis. Probeer het opnieuw.' },
        { status: 500 }
      )
    }

    // Send welcome email (async, don't wait)
    try {
      // Send insider email for early_access signups
      if (source === 'early_access' || source === 'early_access_landing') {
        await sendInsiderWelcomeEmail({ 
          email: email.toLowerCase(), 
          locale
        })
      } else {
        await sendNewsletterWelcomeEmail({ 
          email: email.toLowerCase(), 
          source,
          locale
        })
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      // Don't fail the subscription if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Je bent ingeschreven! Check je inbox voor een welkomstmail.',
    })
  } catch (error) {
    console.error('Newsletter subscribe error:', error)
    return NextResponse.json(
      { success: false, error: 'Er ging iets mis. Probeer het opnieuw.' },
      { status: 500 }
    )
  }
}


