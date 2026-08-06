import { NextResponse } from 'next/server'

/**
 * Stripe webhooks are retired. Configure Mollie webhook URL to:
 *   {NEXT_PUBLIC_SITE_URL}/api/mollie-webhook
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Stripe webhooks disabled. Use /api/mollie-webhook',
    },
    { status: 410 }
  )
}
