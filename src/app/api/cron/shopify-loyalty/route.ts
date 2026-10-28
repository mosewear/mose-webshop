import { NextResponse } from 'next/server'
import { workerAuthorized } from '@/lib/shopify/http'
import { runLoyaltyWorker } from '@/lib/shopify/loyalty-worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }
  if (process.env.SHOPIFY_LOYALTY_SYNC_ENABLED !== 'true') return NextResponse.json({ ok: true, skipped: true, reason: 'LOYALTY_SYNC_DISABLED' }, { headers })
  if (!workerAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  if (process.env.LOYALTY_ATOMIC_ENABLED !== 'true') return NextResponse.json({ ok: false, error: 'LOYALTY_ATOMIC_WRITERS_REQUIRED' }, { status: 503, headers })
  try {
    const worker = await runLoyaltyWorker(undefined, undefined, { deadline: Date.now() + 90_000, signal: AbortSignal.timeout(90_000) })
    const ok = worker.failed === 0 && worker.leaseLost === 0
    return NextResponse.json({ ok, skipped: false, worker }, { status: ok ? 200 : 503, headers })
  } catch {
    return NextResponse.json({ ok: false, error: 'LOYALTY_SYNC_UNAVAILABLE' }, { status: 503, headers })
  }
}
