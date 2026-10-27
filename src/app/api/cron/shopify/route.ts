import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { workerAuthorized } from '@/lib/shopify/http'
import { reconcileOrders } from '@/lib/shopify/reconcile'
import { runOrderWorker } from '@/lib/shopify/worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Scheduled by Vercel; default-off deployment performs no database or provider work. */
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }
  if (process.env.SHOPIFY_SYNC_ENABLED !== 'true') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'SYNC_DISABLED' }, { headers })
  }
  if (!workerAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  const deadline = Date.now() + 90_000
  const options = { deadline, signal: AbortSignal.timeout(90_000) }
  try {
    const db = createServiceClient()
    let reconciliation: Awaited<ReturnType<typeof reconcileOrders>> | null = null
    let worker: Awaited<ReturnType<typeof runOrderWorker>> | null = null
    // Reconcile one fenced page, then drain a bounded worker batch. No self-HTTP calls.
    try { reconciliation = await reconcileOrders(db, undefined, options) } catch { /* Still drain previously queued events if budget permits. */ }
    if (!options.signal.aborted && Date.now() + 16_000 < deadline) {
      try { worker = await runOrderWorker(db, undefined, options) } catch { /* Leases remain recoverable; report failure without provider details. */ }
    }
    const ok = reconciliation !== null && worker !== null && worker.failed === 0 && worker.leaseLost === 0
    return NextResponse.json({ ok, skipped: false, reconciliation, worker, ...(ok ? {} : { error: 'SHOPIFY_SYNC_INCOMPLETE' }) }, { status: ok ? 200 : 503, headers })
  } catch {
    return NextResponse.json({ ok: false, error: 'SHOPIFY_SYNC_UNAVAILABLE' }, { status: 503, headers })
  }
}
