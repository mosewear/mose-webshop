import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  sendInsiderWelcomeEmail,
  sendInsiderCommunityEmail,
  sendInsiderBehindScenesEmail,
  sendInsiderLaunchWeekEmail,
} from '@/lib/email'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { emailType, testEmail } = await req.json()

    if (!emailType || !['welcome', 'community', 'behind-scenes', 'launch-week'].includes(emailType)) {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    // Use service role client for database operations
    const serviceSupabase = createServiceRoleClient()

    // If testEmail is provided, send only to that email
    let subscribers: Array<{ id: string; email: string; locale: string }> = []
    
    if (testEmail) {
      // Test mode: send to single email (don't check if already sent)
      const { data: testSubscriber } = await serviceSupabase
        .from('newsletter_subscribers')
        .select('id, email, locale')
        .eq('email', testEmail)
        .eq('status', 'active')
        .single()

      if (testSubscriber) {
        subscribers = [testSubscriber]
      } else {
        // If subscriber doesn't exist, create a temporary entry for testing
        subscribers = [{ id: 'test', email: testEmail, locale: 'nl' }]
      }
    } else {
      // Production mode: fetch all active subscribers who haven't received this email yet
      const { data: fetchedSubscribers, error: fetchError } = await serviceSupabase
        .from('newsletter_subscribers')
        .select(`
          id,
          email,
          locale
        `)
        .eq('status', 'active')

      if (fetchError) {
        console.error('Error fetching subscribers:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
      }

      if (!fetchedSubscribers || fetchedSubscribers.length === 0) {
        return NextResponse.json({ error: 'No subscribers found', sent: 0 }, { status: 200 })
      }

      // Get list of subscribers who have already received this email type
      const { data: alreadySent, error: sentError } = await serviceSupabase
        .from('insider_email_sent')
        .select('subscriber_id')
        .eq('email_type', emailType)

      if (sentError) {
        console.error('Error fetching sent emails:', sentError)
        return NextResponse.json({ error: 'Failed to check sent emails' }, { status: 500 })
      }

      const sentSubscriberIds = new Set(alreadySent?.map(s => s.subscriber_id) || [])

      // Filter out subscribers who have already received this email
      subscribers = fetchedSubscribers.filter(sub => !sentSubscriberIds.has(sub.id))
    }

    // Calculate dynamic data
    // Get total count of all active subscribers for stats
    const { count: totalSubscriberCount } = await serviceSupabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    
    const subscriberCount = totalSubscriberCount || subscribers.length
    // Launch date: March 2, 2026 at 00:00 UTC
    const launchDate = new Date('2026-03-02T00:00:00Z')
    // Get today's date at midnight UTC to avoid timezone issues
    const today = new Date()
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    const launchUTC = new Date(Date.UTC(launchDate.getUTCFullYear(), launchDate.getUTCMonth(), launchDate.getUTCDate()))
    const daysUntilLaunch = Math.max(0, Math.ceil((launchUTC.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24)))

    // Story content for behind-scenes email (can be customized)
    const storyContent = `Het begon met een simpel idee: kleding zonder poespas. Gemaakt in Groningen, ontworpen voor mensen die weten wat ze willen.

Geen marketing bullshit. Geen massa-productie. Gewoon degelijke basics die lang meegaan.

Elke hoodie, elk shirt, elke cap is limited edition. Als het uitverkocht is, is het uitverkocht. Dat is de deal.`

    // Limited items for launch week email (can be customized)
    const limitedItems = [
      'Signature Hoodies - Zwart & Grijs',
      'Essential T-Shirts - Alle kleuren',
      'Classic Caps - Limited colorways'
    ]

    // Send emails
    let sentCount = 0
    const errors: string[] = []

    for (const subscriber of subscribers) {
      try {
        let result

        switch (emailType) {
          case 'welcome':
            result = await sendInsiderWelcomeEmail({
              email: subscriber.email,
              locale: subscriber.locale || 'nl'
            })
            break

          case 'community':
            result = await sendInsiderCommunityEmail({
              email: subscriber.email,
              subscriberCount,
              daysUntilLaunch,
              locale: subscriber.locale || 'nl'
            })
            break

          case 'behind-scenes':
            result = await sendInsiderBehindScenesEmail({
              email: subscriber.email,
              storyContent,
              daysUntilLaunch,
              locale: subscriber.locale || 'nl'
            })
            break

          case 'launch-week':
            result = await sendInsiderLaunchWeekEmail({
              email: subscriber.email,
              daysUntilLaunch,
              limitedItems,
              locale: subscriber.locale || 'nl'
            })
            break
        }

        if (result?.success) {
          sentCount++
          
          // Record that this email was sent to this subscriber (skip for test emails)
          if (!testEmail && subscriber.id !== 'test') {
            try {
              // Check if record already exists
              const { data: existing } = await serviceSupabase
                .from('insider_email_sent')
                .select('id')
                .eq('subscriber_id', subscriber.id)
                .eq('email_type', emailType)
                .single()

              // Only insert if it doesn't exist
              if (!existing) {
                await serviceSupabase
                  .from('insider_email_sent')
                  .insert({
                    subscriber_id: subscriber.id,
                    email_type: emailType,
                    sent_at: new Date().toISOString(),
                  })
              }
            } catch (recordError: any) {
              // Ignore duplicate key errors (23505 is PostgreSQL unique constraint violation)
              if (recordError?.code !== '23505') {
                console.error(`Error recording sent email for ${subscriber.email}:`, recordError)
              }
              // Don't fail the whole process if recording fails
            }
          }
        } else {
          errors.push(`${subscriber.email}: ${result?.error || 'Unknown error'}`)
        }
      } catch (error: any) {
        console.error(`Error sending to ${subscriber.email}:`, error)
        errors.push(`${subscriber.email}: ${error.message}`)
      }
    }

    console.log(`✅ Sent ${sentCount}/${subscribers.length} ${emailType} emails`)
    
    if (errors.length > 0) {
      console.error('Errors:', errors)
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: subscribers.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Error in send-insider-email route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

