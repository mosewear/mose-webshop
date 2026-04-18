import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Public order tracking: match email + order number prefix without client-side PostgREST id::text filters.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; orderNumber?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = (body.email || '').trim()
  const orderNumber = (body.orderNumber || '').trim()
  if (!email || !orderNumber) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: found, error } = await service.rpc('lookup_order_for_tracking', {
    p_email: email,
    p_order_ref: orderNumber,
  })

  if (error) {
    console.error('lookup_order_for_tracking', error)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }

  const order = (found as unknown[] | null)?.[0] as Record<string, unknown> | undefined
  if (!order?.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { data: order_items, error: itemsError } = await service
    .from('order_items')
    .select('product_name, quantity, size, color')
    .eq('order_id', order.id as string)

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({
    order: {
      ...order,
      order_items: order_items ?? [],
    },
  })
}
