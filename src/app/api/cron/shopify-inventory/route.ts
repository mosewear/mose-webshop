import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { workerAuthorized } from '@/lib/shopify/http'
import { reconcileInventory } from '@/lib/shopify/inventory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Four bounded batches cover 27 owned + 125 supplier variants across their
 * separate locations every five minutes. Supplier presentation updates never
 * populate physical inventory. Orders cannot starve this independent budget. */
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }
  if (process.env.SHOPIFY_SYNC_ENABLED !== 'true' || process.env.SHOPIFY_INVENTORY_SYNC_ENABLED !== 'true') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'INVENTORY_SYNC_DISABLED' }, { headers })
  }
  if (!workerAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  const options = { deadline: Date.now() + 90_000, signal: AbortSignal.timeout(90_000) }
  try {
    const db = createServiceClient(), batches = []
    for (let batch = 0; batch < 4 && Date.now() + 18_000 < options.deadline; batch++) {
      const result = await reconcileInventory(db, undefined, options)
      batches.push(result)
      if (result.processed === 0 && result.leaseLost === 0) break
    }
    const ok = batches.length > 0 && batches.every(b => b.failed === 0 && b.unknown === 0 && b.leaseLost === 0)
    return NextResponse.json({ ok, skipped: false, batches, ...(ok ? {} : { error: 'INVENTORY_NOT_READY' }) }, { status: ok ? 200 : 503, headers })
  } catch {
    return NextResponse.json({ ok: false, error: 'INVENTORY_SYNC_UNAVAILABLE' }, { status: 503, headers })
  }
}
