import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { render } from '@react-email/components'
import { getEmailT } from '@/lib/email-i18n'
import { getSiteSettings } from '@/lib/settings'

// Import email templates
import InsiderWelcomeEmail from '@/emails/InsiderWelcome'
import InsiderCommunityEmail from '@/emails/InsiderCommunity'
import InsiderBehindScenesEmail from '@/emails/InsiderBehindScenes'
import InsiderLaunchWeekEmail from '@/emails/InsiderLaunchWeek'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // Check if user is admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 403 }
      )
    }

    // Get query params
    const { searchParams } = new URL(req.url)
    const emailType = searchParams.get('type') // 'welcome', 'community', 'behind-scenes', 'launch-week'
    const locale = searchParams.get('locale') || 'nl'

    if (!emailType) {
      return NextResponse.json(
        { success: false, error: 'Email type is verplicht' },
        { status: 400 }
      )
    }

    // Get translations and settings
    const t = await getEmailT(locale)
    const settings = await getSiteSettings()

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
    const contactEmail = settings.contact_email
    const contactPhone = settings.contact_phone
    const contactAddress = settings.contact_address

    // Generate sample promo code for preview
    const samplePromoCode = 'WELCOME10-PREVIEW'
    const samplePromoExpiry = new Date()
    samplePromoExpiry.setDate(samplePromoExpiry.getDate() + 90)

    // Render the email based on type
    let html = ''

    switch (emailType) {
      case 'welcome':
        html = await render(
          InsiderWelcomeEmail({
            email: 'preview@mosewear.com',
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            promoCode: samplePromoCode,
            promoExpiry: samplePromoExpiry,
          })
        )
        break

      case 'community':
        html = await render(
          InsiderCommunityEmail({
            email: 'preview@mosewear.com',
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            subscriberCount: 500,
            daysUntilLaunch: 10,
          })
        )
        break

      case 'behind-scenes':
        html = await render(
          InsiderBehindScenesEmail({
            email: 'preview@mosewear.com',
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            storyContent: 'Sample behind-the-scenes story content for preview',
          })
        )
        break

      case 'launch-week':
        html = await render(
          InsiderLaunchWeekEmail({
            email: 'preview@mosewear.com',
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            launchDate: 'Feb 27',
          })
        )
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Ongeldig email type' },
          { status: 400 }
        )
    }

    // Return HTML
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error: any) {
    console.error('Error generating email preview:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

