import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
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
    // Use regular server client for auth check (respects cookies/session)
    const authClient = await createClient()
    
    // Check if user is admin
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd - geen sessie' },
        { status: 401 }
      )
    }

    // Use Service Role client for admin check (bypasses RLS)
    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd - geen admin' },
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
        // Calculate days until launch (same as send-insider-email route)
        const launchDate = new Date('2026-03-02T00:00:00Z')
        const today = new Date()
        const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
        const launchUTC = new Date(Date.UTC(launchDate.getUTCFullYear(), launchDate.getUTCMonth(), launchDate.getUTCDate()))
        const daysUntilLaunch = Math.max(0, Math.ceil((launchUTC.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24)))
        
        html = await render(
          InsiderCommunityEmail({
            email: 'preview@mosewear.com',
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            subscriberCount: 500,
            daysUntilLaunch,
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
            daysUntilLaunch: 3,
            limitedItems: ['Hoodie Classic Black', 'T-Shirt Essential White', 'Cap MOSE Logo'],
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

