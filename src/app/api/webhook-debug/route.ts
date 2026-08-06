import { NextResponse } from 'next/server'
import { getPublicSiteUrl } from '@/lib/site-url'

export async function GET() {
  const mollieKey = process.env.MOLLIE_API_KEY ? 'SET' : 'NOT SET'
  const siteUrl = getPublicSiteUrl()

  return NextResponse.json({
    provider: 'mollie',
    env: {
      MOLLIE_API_KEY: mollieKey,
      NEXT_PUBLIC_SITE_URL: siteUrl,
    },
    webhookUrl: `${siteUrl.replace(/\/$/, '')}/api/mollie-webhook`,
    notes: [
      'Configure this webhook URL in the Mollie dashboard (or per-payment webhookUrl).',
      'Classic Mollie webhooks send application/x-www-form-urlencoded id=tr_…',
      'Always fetch payment status from the Mollie API — never trust the client redirect alone.',
      'Legacy /api/stripe-webhook returns 410 Gone.',
    ],
  })
}
