import { NextResponse } from 'next/server'
import { workerAuthorized } from '@/lib/shopify/http'
import { runLegacyStockWorker } from '@/lib/shopify/legacy-stock-worker'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }
  if (process.env.SHOPIFY_SYNC_ENABLED !== 'true' || process.env.SHOPIFY_LEGACY_STOCK_SYNC_ENABLED !== 'true' ||
    process.env.LEGACY_INVENTORY_ATOMIC_ENABLED !== 'true') return NextResponse.json({ ok: true, skipped: true, reason: 'LEGACY_STOCK_SYNC_DISABLED' }, { headers })
  if (!workerAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  try {
    const result = await runLegacyStockWorker(undefined, undefined, { deadline: Date.now() + 90_000, signal: AbortSignal.timeout(90_000) })
    const ok = result.failed === 0 && result.leaseLost === 0
    return NextResponse.json({ ok, ...result }, { status: ok ? 200 : 503, headers })
  } catch { return NextResponse.json({ ok: false, error: 'LEGACY_STOCK_SYNC_UNAVAILABLE' }, { status: 503, headers }) }
}
