import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  return NextResponse.json({
    status: 'Debug info',
    received_auth_header: authHeader,
    expected_format: `Bearer ${cronSecret}`,
    cron_secret_is_set: !!cronSecret,
    cron_secret_length: cronSecret?.length || 0,
    headers_received: Object.fromEntries(req.headers.entries()),
    match: authHeader === `Bearer ${cronSecret}`,
  })
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  
  return NextResponse.json({
    status: 'Debug info (GET)',
    cron_secret_is_set: !!cronSecret,
    cron_secret_length: cronSecret?.length || 0,
    cron_secret_first_10: cronSecret?.substring(0, 10) || 'not set',
    expected_header: `Authorization: Bearer ${cronSecret}`,
  })
}

