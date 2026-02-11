import { NextResponse } from 'next/server'
import webpush from 'web-push'

// Initialize web-push with VAPID keys
// Generate keys with: npx web-push generate-vapid-keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY!
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!
const vapidSubject = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    `mailto:info@mosewear.com`,
    vapidPublicKey,
    vapidPrivateKey
  )
}

export async function GET() {
  if (!vapidPublicKey) {
    return NextResponse.json(
      { error: 'VAPID keys not configured' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    publicKey: vapidPublicKey
  })
}





