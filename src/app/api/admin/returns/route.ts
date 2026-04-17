import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { getSiteSettings } from '@/lib/settings'
import { updateOrderStatusForReturn } from '@/lib/update-order-status'
import {
  calculateReturnRefundWithDiscount,
  type QuantityDiscountTier,
} from '@/lib/quantity-discount'
import { createReturnLabelSimple } from '@/lib/sendcloud-return-simple'
import {
  sendReturnCreatedByAdminEmail,
  sendReturnLabelGeneratedEmail,
} from '@/lib/email'
import { processReturnRefund } from '@/lib/process-return-refund'

/**
 * POST /api/admin/returns
 *
 * Admin creates a return manually on behalf of a customer.
 * Supports 4 label modes:
 *   - admin_generated: Sendcloud label is created immediately.
 *   - customer_paid:   Stripe PaymentIntent created; customer pays via portal.
 *   - customer_free:   No payment needed; customer hits "Create label" in portal.
 *   - in_store:        Customer drops parcel off at the store. Sub-state sets
 *                      either return_approved (waiting) or return_received.
 */

type LabelMode =
  | 'admin_generated'
  | 'customer_paid'
  | 'customer_free'
  | 'in_store'

type InStoreState = 'approved' | 'received'

interface ReturnItemInput {
  order_item_id: string
  quantity: number
  reason: string
}

interface AdminCreateReturnBody {
  order_id: string
  return_items: ReturnItemInput[]
  return_reason: string
  admin_notes?: string
  refund_amount_override?: number
  label_mode: LabelMode
  in_store_state?: InStoreState
  send_email?: boolean
  force?: boolean
}

const VALID_LABEL_MODES: LabelMode[] = [
  'admin_generated',
  'customer_paid',
  'customer_free',
  'in_store',
]

export async function POST(req: NextRequest) {
  try {
    const { authorized, adminUser } = await requireAdmin()
    if (!authorized || !adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as AdminCreateReturnBody
    const {
      order_id,
      return_items,
      return_reason,
      admin_notes,
      refund_amount_override,
      label_mode,
      in_store_state,
      send_email = true,
      force = false,
    } = body

    if (!order_id || !return_reason) {
      return NextResponse.json(
        { error: 'order_id en return_reason zijn verplicht' },
        { status: 400 }
      )
    }

    if (
      !return_items ||
      !Array.isArray(return_items) ||
      return_items.length === 0
    ) {
      return NextResponse.json(
        { error: 'Minimaal één retour-item is verplicht' },
        { status: 400 }
      )
    }

    if (!VALID_LABEL_MODES.includes(label_mode)) {
      return NextResponse.json(
        { error: `Ongeldige label_mode: ${label_mode}` },
        { status: 400 }
      )
    }

    if (label_mode === 'in_store') {
      if (!in_store_state || !['approved', 'received'].includes(in_store_state)) {
        return NextResponse.json(
          {
            error:
              'Voor label_mode=in_store moet in_store_state "approved" of "received" zijn',
          },
          { status: 400 }
        )
      }
    }

    // We gebruiken de service client om RLS te omzeilen: de admin-check is al gedaan.
    const supabase = createServiceClient()

    // Order ophalen
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order niet gevonden' }, { status: 404 })
    }

    // Delivered-check, tenzij force=true
    if (!force && order.status !== 'delivered') {
      return NextResponse.json(
        {
          error:
            'Order moet status "delivered" hebben. Gebruik force=true om dit te omzeilen.',
        },
        { status: 400 }
      )
    }

    // Return-deadline check, tenzij force=true
    const settings = await getSiteSettings()
    const returnDays = settings.return_days || 14
    const returnLabelCostExclBtw = settings.return_label_cost_excl_btw || 6.5
    const returnLabelCostInclBtw = settings.return_label_cost_incl_btw || 7.87

    if (!force && order.delivered_at) {
      const deliveredDate = new Date(order.delivered_at)
      const deadline = new Date(deliveredDate)
      deadline.setDate(deadline.getDate() + returnDays)
      if (new Date() > deadline) {
        return NextResponse.json(
          {
            error: `Retourtermijn van ${returnDays} dagen is verstreken. Gebruik force=true om dit te omzeilen.`,
          },
          { status: 400 }
        )
      }
    }

    // Valideer return_items
    const orderItemIds = order.order_items.map((item: any) => item.id)
    for (const returnItem of return_items) {
      if (!orderItemIds.includes(returnItem.order_item_id)) {
        return NextResponse.json(
          { error: `Order item ${returnItem.order_item_id} niet gevonden in order` },
          { status: 400 }
        )
      }
      if (returnItem.quantity < 1) {
        return NextResponse.json(
          { error: 'Quantity moet minimaal 1 zijn' },
          { status: 400 }
        )
      }
      const orderItem = order.order_items.find(
        (item: any) => item.id === returnItem.order_item_id
      )
      if (returnItem.quantity > orderItem.quantity) {
        return NextResponse.json(
          {
            error: `Quantity ${returnItem.quantity} is meer dan besteld (${orderItem.quantity})`,
          },
          { status: 400 }
        )
      }
    }

    // Refund berekenen (zelfde logica als klantflow in /api/returns)
    const productIdsInReturn = [
      ...new Set(
        return_items
          .map((ri) => {
            const oi = order.order_items.find(
              (item: any) => item.id === ri.order_item_id
            )
            return oi?.product_id as string | undefined
          })
          .filter(Boolean)
      ),
    ] as string[]

    const { data: returnTiers } = await supabase
      .from('product_quantity_discounts')
      .select('*')
      .in('product_id', productIdsInReturn)
      .eq('is_active', true)

    const { data: previousReturns } = await supabase
      .from('returns')
      .select('return_items, refund_amount')
      .eq('order_id', order_id)
      .in('status', [
        'return_approved',
        'return_label_payment_pending',
        'return_label_payment_completed',
        'return_label_generated',
        'return_in_transit',
        'return_received',
        'refund_processing',
        'refunded',
      ])

    const tiersByProduct: Record<string, QuantityDiscountTier[]> = {}
    returnTiers?.forEach((t: any) => {
      if (!tiersByProduct[t.product_id]) tiersByProduct[t.product_id] = []
      tiersByProduct[t.product_id].push(t as QuantityDiscountTier)
    })

    const returnByProduct: Record<string, number> = {}
    for (const ri of return_items) {
      const oi = order.order_items.find(
        (item: any) => item.id === ri.order_item_id
      )
      if (!oi) continue
      returnByProduct[oi.product_id] =
        (returnByProduct[oi.product_id] || 0) + ri.quantity
    }

    const previouslyReturnedByProduct: Record<string, number> = {}
    if (previousReturns) {
      for (const prev of previousReturns) {
        if (!prev.return_items || !Array.isArray(prev.return_items)) continue
        for (const pri of prev.return_items as any[]) {
          const oi = order.order_items.find(
            (item: any) => item.id === pri.order_item_id
          )
          if (!oi) continue
          previouslyReturnedByProduct[oi.product_id] =
            (previouslyReturnedByProduct[oi.product_id] || 0) + (pri.quantity || 0)
        }
      }
    }

    let totalRefundAmount = 0
    for (const [productId, returningQty] of Object.entries(returnByProduct)) {
      const productItems = order.order_items.filter(
        (oi: any) => oi.product_id === productId
      )
      const tiers = tiersByProduct[productId] || []
      const originalTotalQty = productItems.reduce(
        (sum: number, oi: any) => sum + oi.quantity,
        0
      )
      const alreadyReturnedQty =
        previouslyReturnedByProduct[productId] || 0
      const totalPaid = productItems.reduce(
        (sum: number, oi: any) => sum + oi.price_at_purchase * oi.quantity,
        0
      )
      const originalPrice =
        productItems[0]?.original_price || productItems[0]?.price_at_purchase || 0

      if (tiers.length > 0 && originalPrice > 0) {
        const result = calculateReturnRefundWithDiscount({
          productId,
          originalPrice,
          originalTotalQty,
          alreadyReturnedQty,
          returningNowQty: returningQty,
          totalPaidForProduct: totalPaid,
          alreadyRefundedForProduct: 0,
          tiers,
        })
        totalRefundAmount += result.refundAmount
      } else {
        for (const ri of return_items) {
          const oi = order.order_items.find(
            (item: any) =>
              item.id === ri.order_item_id && item.product_id === productId
          )
          if (oi) {
            totalRefundAmount += oi.price_at_purchase * ri.quantity
          }
        }
      }
    }

    totalRefundAmount = Math.round(totalRefundAmount * 100) / 100

    // Override toegestaan
    const finalRefundAmount =
      typeof refund_amount_override === 'number' && refund_amount_override >= 0
        ? Math.round(refund_amount_override * 100) / 100
        : totalRefundAmount

    // Actieve retour blokkeren (tenzij force)
    if (!force) {
      const { data: existingReturns } = await supabase
        .from('returns')
        .select('id, status')
        .eq('order_id', order_id)
        .in('status', [
          'return_requested',
          'return_approved',
          'return_label_payment_pending',
          'return_label_payment_completed',
          'return_label_generated',
          'return_in_transit',
          'return_received',
          'refund_processing',
        ])
      if (existingReturns && existingReturns.length > 0) {
        return NextResponse.json(
          {
            error:
              'Er is al een actieve retour voor deze order. Gebruik force=true om deze check te omzeilen.',
          },
          { status: 400 }
        )
      }
    }

    // Status bepalen per label_mode
    let startStatus: string
    switch (label_mode) {
      case 'admin_generated':
        startStatus = 'return_label_payment_completed'
        break
      case 'customer_paid':
        startStatus = 'return_label_payment_pending'
        break
      case 'customer_free':
        startStatus = 'return_label_payment_completed'
        break
      case 'in_store':
        startStatus =
          in_store_state === 'received' ? 'return_received' : 'return_approved'
        break
    }

    // Linken aan bestaand user-account wanneer mogelijk.
    // BELANGRIJK: returns.user_id heeft een FK naar auth.users(id). Als we een
    // profile-id of een stale order.user_id gebruiken die niet (meer) in
    // auth.users voorkomt, faalt de insert met 23503. Daarom verifiëren we
    // iedere kandidaat eerst tegen auth.users via de admin API en vallen
    // anders terug op NULL (guest-style link, GET endpoints matchen alsnog
    // op e-mail voor het klantportaal).
    const verifyAuthUser = async (candidate: string | null | undefined) => {
      if (!candidate) return null
      try {
        const { data, error } = await supabase.auth.admin.getUserById(candidate)
        if (error || !data?.user) return null
        return data.user.id
      } catch {
        return null
      }
    }

    let linkedUserId: string | null = await verifyAuthUser(order.user_id)

    if (!linkedUserId && order.email) {
      // Probeer via profiles -> auth.users
      const { data: matchingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', order.email)
        .maybeSingle()
      linkedUserId = await verifyAuthUser(matchingProfile?.id)

      // Laatste poging: lookup direct in auth.users via admin API (e-mail match).
      if (!linkedUserId) {
        try {
          const { data: authList } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 200,
          })
          const match = authList?.users?.find(
            (u: any) => u.email?.toLowerCase() === order.email.toLowerCase()
          )
          if (match?.id) linkedUserId = match.id
        } catch (err) {
          console.warn('auth.admin.listUsers lookup failed:', err)
        }
      }
    }

    const nowIso = new Date().toISOString()

    const insertPayload: Record<string, any> = {
      order_id,
      user_id: linkedUserId,
      status: startStatus,
      return_reason,
      customer_notes: null,
      admin_notes: admin_notes || null,
      return_items: return_items.map((ri) => ({
        order_item_id: ri.order_item_id,
        quantity: ri.quantity,
        reason: ri.reason || return_reason,
      })),
      refund_amount: finalRefundAmount,
      return_label_cost_excl_btw: returnLabelCostExclBtw,
      return_label_cost_incl_btw: returnLabelCostInclBtw,
      total_refund: finalRefundAmount,
      label_mode,
      created_by_admin_id: adminUser.id,
      admin_created_at: nowIso,
    }

    if (label_mode === 'in_store' && in_store_state === 'received') {
      insertPayload.received_at = nowIso
    }
    if (label_mode === 'in_store' && in_store_state === 'approved') {
      insertPayload.approved_at = nowIso
    }

    // Insert
    const { data: returnRecord, error: insertError } = await supabase
      .from('returns')
      .insert(insertPayload)
      .select()
      .single()

    if (insertError || !returnRecord) {
      console.error('Error inserting manual return:', insertError)
      return NextResponse.json(
        { error: 'Kon retour niet aanmaken', details: insertError?.message },
        { status: 500 }
      )
    }

    // Order flag + status bijwerken
    await supabase.from('orders').update({ has_returns: true }).eq('id', order_id)
    try {
      await updateOrderStatusForReturn(order_id, startStatus)
    } catch (err) {
      console.error('Error updating order status:', err)
    }

    // Ontvanger voor e-mails
    const shippingAddress = (order.shipping_address as any) || {}
    const customerName =
      shippingAddress.name ||
      `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() ||
      'Klant'
    const customerEmail = order.email

    // Label mode-specifieke acties
    let labelUrl: string | null = null
    let trackingCode: string | null = null
    let trackingUrl: string | null = null
    let paymentIntentClientSecret: string | null = null

    if (label_mode === 'admin_generated') {
      try {
        const labelData = await createReturnLabelSimple(
          returnRecord.id,
          order,
          returnRecord.return_items as any[]
        )

        const { data: updatedReturn } = await supabase
          .from('returns')
          .update({
            status: 'return_label_generated',
            sendcloud_return_id: labelData.parcel_id,
            return_tracking_code: labelData.tracking_number,
            return_tracking_url: labelData.tracking_url,
            return_label_url: labelData.label_url,
            label_generated_at: new Date().toISOString(),
          })
          .eq('id', returnRecord.id)
          .select()
          .single()

        labelUrl = labelData.label_url
        trackingCode = labelData.tracking_number
        trackingUrl = labelData.tracking_url

        if (send_email) {
          await sendReturnLabelGeneratedEmail({
            customerEmail,
            customerName,
            returnId: returnRecord.id,
            orderId: order_id,
            trackingCode: labelData.tracking_number,
            trackingUrl: labelData.tracking_url,
            labelUrl: labelData.label_url,
          })
        }

        if (updatedReturn) {
          try {
            await updateOrderStatusForReturn(order_id, 'return_label_generated')
          } catch (err) {
            console.error('Error updating order status after label:', err)
          }
        }
      } catch (labelErr: any) {
        console.error('Error creating Sendcloud label:', labelErr)
        // Soft fail: retour blijft op return_label_payment_completed, admin kan later
        // alsnog via de detailpagina op "Genereer Label" klikken.
      }
    } else if (label_mode === 'customer_paid') {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())
        const amount = Math.round(returnLabelCostInclBtw * 100)
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: 'eur',
          payment_method_types: ['ideal', 'card'],
          metadata: {
            return_id: returnRecord.id,
            order_id,
            type: 'return_label_payment',
            created_by_admin: '1',
          },
          description: `Retourlabel kosten - Return ${returnRecord.id
            .slice(0, 8)
            .toUpperCase()}`,
          receipt_email: order.email,
        })

        paymentIntentClientSecret = paymentIntent.client_secret

        await supabase
          .from('returns')
          .update({
            return_label_payment_intent_id: paymentIntent.id,
            return_label_payment_status: 'pending',
            label_payment_pending_at: new Date().toISOString(),
          })
          .eq('id', returnRecord.id)
      } catch (piErr: any) {
        console.error('Error creating payment intent:', piErr)
      }
    }

    // In-store drop-off met direct ontvangen status → automatisch refund
    // starten zodat de klant het geld zonder verdere admin-actie terugkrijgt.
    let autoRefundOutcome: any = null
    if (label_mode === 'in_store' && in_store_state === 'received') {
      try {
        autoRefundOutcome = await processReturnRefund(returnRecord.id, {
          supabase,
          sendEmail: send_email,
        })
      } catch (refundErr) {
        console.error(
          'Auto-refund after in-store manual return failed:',
          refundErr
        )
      }
    }

    // E-mail naar klant (voor customer_paid / customer_free / in_store)
    if (send_email && label_mode !== 'admin_generated') {
      try {
        await sendReturnCreatedByAdminEmail({
          customerEmail,
          customerName,
          returnId: returnRecord.id,
          orderId: order_id,
          labelMode: label_mode,
          inStoreState: in_store_state,
          returnItems: (returnRecord.return_items as any[]).map((ri) => {
            const oi = order.order_items.find(
              (o: any) => o.id === ri.order_item_id
            )
            return {
              product_name: oi?.product_name || 'Product',
              size: oi?.size || '',
              color: oi?.color || '',
              quantity: ri.quantity,
            }
          }),
          refundAmount: finalRefundAmount,
          labelCost: returnLabelCostInclBtw,
        })
      } catch (emailErr: any) {
        console.error('Error sending return-created-by-admin email:', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      return_id: returnRecord.id,
      status: startStatus,
      label_mode,
      label_url: labelUrl,
      tracking_code: trackingCode,
      tracking_url: trackingUrl,
      payment_intent_client_secret: paymentIntentClientSecret,
      refund: autoRefundOutcome,
    })
  } catch (error: any) {
    console.error('Error in POST /api/admin/returns:', error)
    return NextResponse.json(
      {
        error: 'Er is een onverwachte fout opgetreden',
        details: error?.message,
      },
      { status: 500 }
    )
  }
}
