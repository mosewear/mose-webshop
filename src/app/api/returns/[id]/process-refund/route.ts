import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { processReturnRefund } from '@/lib/process-return-refund'

// POST /api/returns/[id]/process-refund
//
// Manuele fallback: vrijwel altijd worden refunds al automatisch
// uitgevoerd in `confirm-received`, `approve` of bij in-store manual return
// creation. Deze endpoint blijft beschikbaar voor admins zodat ze het kunnen
// herproberen als de auto-refund eerder mislukte (bv. tijdelijk Stripe-issue).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { authorized } = await requireAdmin()

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { admin_notes, force } = body || {}

    const supabase = await createClient()

    const { data: returnRecord, error: fetchError } = await supabase
      .from('returns')
      .select('id, status, stripe_refund_id')
      .eq('id', id)
      .single()

    if (fetchError || !returnRecord) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 })
    }

    const allowedSourceStatuses = [
      'return_received',
      'return_approved',
      // Sta retry toe vanuit refund_processing (bv. eerdere poging hangt).
      'refund_processing',
    ]

    if (
      !allowedSourceStatuses.includes(returnRecord.status) &&
      !force
    ) {
      return NextResponse.json(
        {
          error: `Cannot process refund. Return status moet één van ${allowedSourceStatuses.join(', ')} zijn (huidig: ${returnRecord.status}). Gebruik force=true om te overschrijven.`,
        },
        { status: 400 }
      )
    }

    if (returnRecord.stripe_refund_id && !force) {
      return NextResponse.json(
        { error: 'Refund already processed' },
        { status: 400 }
      )
    }

    const outcome = await processReturnRefund(id, {
      adminNotes: admin_notes,
      force: !!force,
    })

    if (!outcome.ok) {
      return NextResponse.json(
        { error: outcome.reason, details: outcome.details },
        { status: 500 }
      )
    }

    const { data: finalReturn } = await supabase
      .from('returns')
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json({
      success: true,
      refund_id: outcome.refundId,
      refund_status: outcome.status,
      return: finalReturn,
    })
  } catch (error: any) {
    console.error('Error in POST /api/returns/[id]/process-refund:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
