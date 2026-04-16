import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const filter = req.nextUrl.searchParams.get('filter') || 'all'
  const supabase = createServiceRoleClient()

  let query = supabase
    .from('product_reviews')
    .select('*, products(name, slug)')
    .order('created_at', { ascending: false })

  if (filter === 'pending') {
    query = query.eq('is_approved', false)
  } else if (filter === 'approved') {
    query = query.eq('is_approved', true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reviews: data || [] })
}

export async function PATCH(req: NextRequest) {
  const { authorized } = await requireAdmin(['admin', 'manager'])
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { reviewId, action } = await req.json()

  if (!reviewId || !action) {
    return NextResponse.json({ error: 'Missing reviewId or action' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  if (action === 'approve') {
    const { error } = await supabase
      .from('product_reviews')
      .update({ is_approved: true })
      .eq('id', reviewId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', reviewId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
