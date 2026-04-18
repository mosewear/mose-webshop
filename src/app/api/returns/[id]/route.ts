import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

// GET /api/returns/[id] - Haal specifieke retour op
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Haal retour op
    const { data: returnRecord, error } = await supabase
      .from('returns')
      .select(`
        *,
        orders!inner(
          id,
          email,
          total,
          status,
          created_at,
          delivered_at,
          shipping_address,
          order_items(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !returnRecord) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 })
    }

    const { authorized: isStaff } = await requireAdmin(['admin', 'manager', 'viewer'])
    const ownerByUserId = returnRecord.user_id === user.id
    const ownerByEmail =
      !!user.email &&
      (returnRecord as any).orders?.email?.toLowerCase() ===
        user.email.toLowerCase()

    if (!isStaff && !ownerByUserId && !ownerByEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Haal status history op
    const { data: statusHistory } = await supabase
      .from('return_status_history')
      .select('*')
      .eq('return_id', id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      return: returnRecord,
      status_history: statusHistory || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/returns/[id]:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}


