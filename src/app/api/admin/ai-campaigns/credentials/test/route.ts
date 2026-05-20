/**
 * Smoke-test a stored Meta credentials row by calling the ad account
 * endpoint. Returns the masked account name/id so the admin can
 * confirm the token works before flipping the kill switch.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { MetaMarketingClient, getMetaCredentials } from '@/lib/meta/marketing-api'

export async function POST(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })

  const url = new URL(req.url)
  const label = url.searchParams.get('label') || 'mose_primary'

  try {
    const credentials = await getMetaCredentials({ label, envFallback: true })
    const client = new MetaMarketingClient(credentials)
    const account = await client.getAdAccount()
    return NextResponse.json({
      ok: true,
      account: {
        id: account.id,
        account_id: account.account_id,
        name: account.name,
        currency: account.currency,
        timezone_name: account.timezone_name,
        amount_spent: account.amount_spent,
        balance: account.balance,
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 })
  }
}
