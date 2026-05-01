/**
 * POST /api/admin/settings/revalidate
 *
 * Cache-bust voor site-wide settings na een admin-save. Lost twee
 * lagen tegelijk op:
 *
 *   1. In-memory module-cache van `getSiteSettings()` — 60s TTL.
 *      Wordt direct hier in dezelfde Lambda gebust. In multi-
 *      instance deploys (Vercel) is dit best-effort: andere warm
 *      Lambdas snappen pas op hun eigen TTL-expiry. De ISR-laag
 *      hieronder is daar de globale safety-net.
 *
 *   2. Next.js ISR-cache van pagina's die settings server-side in
 *      hun render meenemen — momenteel:
 *        - PDP (`/[locale]/product/[slug]`): brand-pill design,
 *          sticky-picker toggle, brand-widget toggle.
 *        - Homepage (`/[locale]`): vrije verzending threshold,
 *          maintenance-mode, etc.
 *      Beide hadden `export const revalidate = 3600` waardoor admin-
 *      changes tot 1 uur stale konden hangen op pagina's die al door
 *      een bezoeker getriggerd waren.
 *
 * Auth: admin of manager. Faal-modus is silent-success voor de UX
 * (de DB-save zelf is al gelukt op het moment dat dit wordt
 * aangeroepen) maar we loggen breakage zodat we het in productie
 * zien.
 */

import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { clearSettingsCache } from '@/lib/settings'

export async function POST() {
  try {
    const { authorized } = await requireAdmin(['admin', 'manager'])
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Bust de in-memory settings-cache van DEZE Lambda. Andere
    // instances vallen terug op hun 60s TTL.
    clearSettingsCache()

    // Bust ISR voor alle locale-PDP's (één call dekt alle slugs en
    // beide locales — het dynamische pad-pattern matcht wildcards).
    revalidatePath('/[locale]/product/[slug]', 'page')

    // Homepage gebruikt site_settings ook in z'n SSR-render
    // (free_shipping_threshold, maintenance_mode etc.), dus ook
    // even meenemen.
    revalidatePath('/[locale]', 'page')

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
    })
  } catch (err) {
    console.error('[settings revalidate] Error:', err)
    return NextResponse.json(
      { revalidated: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}
