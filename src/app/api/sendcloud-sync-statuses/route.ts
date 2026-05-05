import { NextRequest, NextResponse } from 'next/server'
import { syncStuckOrders } from '@/lib/sync-order-statuses'

/**
 * Sendcloud status-sync cron.
 *
 * Wordt elke 30 minuten door Vercel Cron aangeroepen (zie vercel.json)
 * en haalt voor alle "stuck" orders (status = shipped|processing met
 * een tracking_code, paid_at < 60 dagen geleden) de actuele parcel-
 * status bij Sendcloud op. Dit fungeert als safety-net voor het geval
 * de webhook silent faalt — de oorspronkelijke aanleiding voor deze
 * route was dat orders na een webhook-secret-mismatch eindeloos op
 * `shipped` bleven hangen waardoor ook delivered-mails uitbleven.
 *
 * Auth: Vercel Cron stuurt automatisch `Authorization: Bearer <CRON_SECRET>`
 * mee — wij dwingen dat af. We accepteren ook `?secret=` als query-param
 * zodat externe schedulers (EasyCron etc.) hetzelfde endpoint kunnen
 * gebruiken indien nodig.
 *
 * Geeft een JSON-summary terug zodat je in de Vercel Cron-logs in één
 * oogopslag ziet hoeveel orders er bijgewerkt en gemaild zijn.
 */
export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}

async function handle(req: NextRequest) {
  try {
    const cronSecret =
      req.nextUrl.searchParams.get('secret') ||
      req.headers.get('authorization')?.replace('Bearer ', '')

    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Tunables komen via query-string zodat een handmatige rerun (bv.
    // tijdens incident-recovery) een breder scope kan trekken zonder
    // dat we de cron-config hoeven aan te raken.
    const paidWithinDays = clampInt(
      req.nextUrl.searchParams.get('paidWithinDays'),
      { min: 1, max: 180, fallback: 60 }
    )
    const maxOrders = clampInt(req.nextUrl.searchParams.get('maxOrders'), {
      min: 1,
      max: 500,
      fallback: 100,
    })

    const result = await syncStuckOrders({ paidWithinDays, maxOrders })

    return NextResponse.json({
      success: true,
      paidWithinDays,
      maxOrders,
      ...result,
    })
  } catch (error: any) {
    console.error('[Sendcloud Sync Cron] Unhandled error:', error?.message || error)
    return NextResponse.json(
      { error: error?.message || 'Internal error' },
      { status: 500 }
    )
  }
}

function clampInt(
  raw: string | null,
  opts: { min: number; max: number; fallback: number }
): number {
  if (!raw) return opts.fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return opts.fallback
  return Math.max(opts.min, Math.min(opts.max, Math.floor(n)))
}
