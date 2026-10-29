import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/** Independent maintenance gate; never implies Shopify checkout is ready. */
export async function legacyCutoverFreezeResponse(): Promise<NextResponse | null> {
  if (process.env.LEGACY_CUTOVER_GUARD_ENABLED !== 'true') return null
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await db.from('legacy_cutover_control')
      .select('checkout_frozen').eq('singleton', true).single()
    if (!error && data?.checkout_frozen === false) return null
  } catch {
    // An unknown maintenance state must not create another remote payment.
  }
  return NextResponse.json({
    error: 'Afrekenen is tijdelijk gepauzeerd. Je winkelmand blijft bewaard. Probeer het later opnieuw.',
    code: 'CHECKOUT_TEMPORARILY_PAUSED',
  }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' } })
}
