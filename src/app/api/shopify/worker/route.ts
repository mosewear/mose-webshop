import { NextResponse } from 'next/server'
import { workerAuthorized } from '@/lib/shopify/http'
import { runOrderWorker } from '@/lib/shopify/worker'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function GET(request: Request) {
  if (!workerAuthorized(request)) return new NextResponse('Unauthorized', { status: 401 })
  if (process.env.SHOPIFY_SYNC_ENABLED !== 'true') return new NextResponse('Not enabled', { status: 503 })
  try { return NextResponse.json(await runOrderWorker(), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ error: 'SYNC_FAILED' }, { status: 503 }) }
}
