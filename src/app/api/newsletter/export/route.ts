import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch all subscribers
    const { data: subscribers, error } = await supabase
      .from('newsletter_subscribers')
      .select('email, status, source, subscribed_at, unsubscribed_at')
      .order('subscribed_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscribers for export:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subscribers' },
        { status: 500 }
      )
    }

    // Generate CSV
    const csvRows = [
      // Header
      ['email', 'status', 'source', 'subscribed_at', 'unsubscribed_at'].join(','),
      // Data rows
      ...subscribers.map(sub => [
        sub.email,
        sub.status,
        sub.source,
        sub.subscribed_at,
        sub.unsubscribed_at || '',
      ].join(','))
    ]

    const csvContent = csvRows.join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Newsletter export error:', error)
    return NextResponse.json(
      { success: false, error: 'Export failed' },
      { status: 500 }
    )
  }
}




