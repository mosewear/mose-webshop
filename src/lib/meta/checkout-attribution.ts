import type { NextRequest } from 'next/server'
import type { createServiceClient } from '@/lib/supabase/service'
import { verifyMetaTestTicket } from './test-session'
/** This runs only after a checkout was durably issued to its verified owner. */
export async function saveCheckoutAttribution(db: ReturnType<typeof createServiceClient>, request: NextRequest, attemptId: string): Promise<void> {
  if (request.cookies.get('mose_meta_consent')?.value !== 'all') return
  const testCookie = request.cookies.get('mose_meta_test')?.value
  const test = verifyMetaTestTicket(testCookie)
  if (testCookie && !test) return
  const fbc = request.cookies.get('_fbc')?.value
  const fbp = request.cookies.get('_fbp')?.value
  const record = {
    attempt_id: attemptId,
    fbc: fbc && /^fb\.\d\.\d{13}\.[A-Za-z0-9_.-]{6,500}$/.test(fbc) ? fbc : null,
    fbp: fbp && /^fb\.\d\.\d{13}\.\d+$/.test(fbp) ? fbp : null,
    client_ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    client_user_agent: request.headers.get('user-agent')?.slice(0,1000) || null,
    source_url: 'https://www.mosewear.com/' + (request.headers.get('referer')?.includes('/en/') ? 'en' : 'nl') + '/checkout',
    test_event_code: test?.code ?? null,
  }
  const saved = await db.from('meta_checkout_attribution').upsert(record, { onConflict: 'attempt_id' })
  if (saved.error) console.error('[Meta CAPI] Checkout attribution was not saved', { code: saved.error.code })
}
