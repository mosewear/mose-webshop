import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'

const MAX_BATCH = 50

export async function POST(req: NextRequest) {
  try {
    const { authorized } = await requireAdmin(['admin', 'manager'])
    if (!authorized) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const body = await req.json()
    const orderIds: unknown = body?.orderIds

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Geen order-ID(s) opgegeven' }, { status: 400 })
    }

    const ids = orderIds
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .slice(0, MAX_BATCH)

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Ongeldige order-ID(s)' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { error: loyaltyErr } = await supabase
      .from('loyalty_transactions')
      .delete()
      .in('order_id', ids)

    if (loyaltyErr) {
      console.error('[admin/orders/delete] loyalty_transactions:', loyaltyErr)
      return NextResponse.json(
        { error: 'Kon loyalty-regels niet opschonen: ' + loyaltyErr.message },
        { status: 500 }
      )
    }

    const { error: delErr } = await supabase.from('orders').delete().in('id', ids)

    if (delErr) {
      console.error('[admin/orders/delete] orders:', delErr)
      return NextResponse.json(
        { error: 'Kon orders niet verwijderen: ' + delErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ deleted: ids.length, orderIds: ids })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[admin/orders/delete]', msg)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}
