import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireNewsletterAdmin } from '@/lib/newsletter-admin-auth'

function escapeCsvField(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET() {
  try {
    const auth = await requireNewsletterAdmin()
    if (!auth.ok) return auth.response

    const supabase = await createClient()

    const { data: subscribers, error } = await supabase
      .from('newsletter_subscribers')
      .select('email, status, source, locale, subscribed_at, unsubscribed_at')
      .order('subscribed_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscribers for export:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subscribers' },
        { status: 500 }
      )
    }

    const headers = [
      'email',
      'status',
      'source',
      'locale',
      'subscribed_at',
      'unsubscribed_at',
    ]
    const csvRows = [
      headers.join(','),
      ...(subscribers || []).map((sub) =>
        [
          escapeCsvField(sub.email),
          escapeCsvField(sub.status),
          escapeCsvField(sub.source),
          escapeCsvField((sub as { locale?: string }).locale ?? ''),
          escapeCsvField(sub.subscribed_at),
          escapeCsvField(sub.unsubscribed_at || ''),
        ].join(',')
      ),
    ]

    const csvContent = csvRows.join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
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
