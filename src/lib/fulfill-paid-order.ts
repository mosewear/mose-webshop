/**
 * Idempotent paid-order fulfillment shared by Mollie webhook + return-URL
 * confirmation. Mirrors the former Stripe payment_intent.succeeded order branch.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { sendOrderNotificationToAdmins } from '@/lib/push-notifications'
import { getPublicSiteUrl } from '@/lib/site-url'
import { applyInventoryDecrementForPaidOrder } from '@/lib/order-stock'
import { processGiftCardsForPaidOrder } from '@/lib/gift-card-processing'
import { sendServerPurchaseEvent } from '@/lib/meta/capi'

export type FulfillPaidOrderResult =
  | { ok: true; alreadyPaid: boolean; orderId: string }
  | { ok: false; reason: string; orderId?: string }

interface FulfillPaidOrderOptions {
  supabase: SupabaseClient
  /** Lookup by Mollie payment id (preferred) or Stripe PI (legacy). */
  molliePaymentId?: string | null
  stripePaymentIntentId?: string | null
  orderId?: string | null
  paymentMethod?: string | null
  paymentMetadata?: Record<string, unknown>
  /** When true, skip push / CAPI / loyalty / email (rare; prefer full path). */
  minimal?: boolean
}

export async function fulfillPaidOrder(
  options: FulfillPaidOrderOptions
): Promise<FulfillPaidOrderResult> {
  const { supabase } = options

  let order: any = null
  let findError: any = null

  if (options.orderId) {
    const result = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', options.orderId)
      .maybeSingle()
    order = result.data
    findError = result.error
  } else if (options.molliePaymentId) {
    const result = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('mollie_payment_id', options.molliePaymentId)
      .maybeSingle()
    order = result.data
    findError = result.error

    // Legacy fallback: payment id may still live in stripe_payment_intent_id
    // during migration dual-write, or historic Stripe IDs.
    if (!order) {
      const legacy = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('stripe_payment_intent_id', options.molliePaymentId)
        .maybeSingle()
      order = legacy.data
      findError = legacy.error
    }
  } else if (options.stripePaymentIntentId) {
    const result = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('stripe_payment_intent_id', options.stripePaymentIntentId)
      .maybeSingle()
    order = result.data
    findError = result.error
  }

  if (findError || !order) {
    return { ok: false, reason: 'Order not found' }
  }

  // Idempotency: already paid — still ensure stock + gift cards
  if (order.payment_status === 'paid') {
    await applyInventoryDecrementForPaidOrder(supabase, order.id)
    try {
      await processGiftCardsForPaidOrder(
        supabase,
        order.id,
        (order as any).locale || 'nl'
      )
    } catch (gcErr) {
      console.error('[fulfillPaidOrder] gift-card (idempotent) failed:', gcErr)
    }
    // Email rescue if webhook marked paid but never stamped email
    if (!order.last_email_sent_at && !options.minimal) {
      await sendConfirmationEmail(supabase, order)
    }
    return { ok: true, alreadyPaid: true, orderId: order.id }
  }

  const metadata = {
    ...(options.paymentMetadata || {}),
    provider: options.molliePaymentId ? 'mollie' : 'stripe',
    mollie_payment_id: options.molliePaymentId || undefined,
    payment_intent_id: options.stripePaymentIntentId || undefined,
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: options.paymentMethod || order.payment_method || 'unknown',
      payment_metadata: metadata,
      status: 'processing',
      ...(options.molliePaymentId
        ? { mollie_payment_id: options.molliePaymentId }
        : {}),
    })
    .eq('id', order.id)
    .select('*, order_items(*)')
    .single()

  if (updateError || !updatedOrder) {
    console.error('[fulfillPaidOrder] Failed to mark paid:', updateError)
    return {
      ok: false,
      reason: 'Failed to update order to paid',
      orderId: order.id,
    }
  }

  if (options.minimal) {
    await applyInventoryDecrementForPaidOrder(supabase, order.id)
    try {
      await processGiftCardsForPaidOrder(
        supabase,
        order.id,
        (updatedOrder as any).locale || 'nl'
      )
    } catch {
      /* ignore */
    }
    return { ok: true, alreadyPaid: false, orderId: order.id }
  }

  // Admin push (KaChing)
  try {
    const shippingAddress = updatedOrder.shipping_address as any
    await sendOrderNotificationToAdmins({
      orderId: updatedOrder.id,
      orderTotal: updatedOrder.total,
      customerName: shippingAddress?.name || 'Klant',
      itemCount: updatedOrder.order_items?.length || 0,
    })
  } catch (pushError) {
    console.error('[fulfillPaidOrder] push notification failed:', pushError)
  }

  // Meta CAPI Purchase
  try {
    type ShippingAddressShape = {
      name?: string
      phone?: string
      city?: string
      postalCode?: string
      country?: string
      [key: string]: unknown
    }
    type OrderItemShape = {
      product_id?: string | null
      variant_id?: string | null
      sku?: string | null
      quantity?: number | string | null
      price_at_purchase?: number | string | null
    }

    const shippingAddress = (updatedOrder.shipping_address ||
      {}) as ShippingAddressShape
    const fullName: string = shippingAddress.name || ''
    const [firstName, ...rest] = fullName.trim().split(/\s+/)
    const lastName = rest.length ? rest.join(' ') : undefined

    const orderItems = (updatedOrder.order_items || []) as OrderItemShape[]
    const purchaseContents = orderItems
      .map((item) => ({
        id: (item.product_id || item.variant_id || item.sku) ?? undefined,
        quantity: Number(item.quantity) || 0,
        item_price: Number(item.price_at_purchase) || 0,
      }))
      .filter(
        (c): c is { id: string; quantity: number; item_price: number } =>
          typeof c.id === 'string' && c.id.length > 0
      )

    const numItems = orderItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    )

    await sendServerPurchaseEvent({
      orderId: updatedOrder.id,
      value: Number(updatedOrder.total) || 0,
      currency: 'EUR',
      email: updatedOrder.email,
      phone: shippingAddress.phone || null,
      firstName: firstName || null,
      lastName: lastName || null,
      city: shippingAddress.city || null,
      zip: shippingAddress.postalCode || null,
      country: shippingAddress.country || 'NL',
      userId: updatedOrder.user_id || null,
      clientIpAddress: updatedOrder.ip_address || null,
      clientUserAgent: updatedOrder.user_agent || null,
      contents: purchaseContents,
      contentIds: purchaseContents.map((c) => c.id),
      numItems,
    })
  } catch (capiError) {
    console.error('[fulfillPaidOrder] Meta CAPI failed:', capiError)
  }

  // Customer stats
  try {
    await supabase.rpc('update_customer_stats', {
      p_email: order.email,
      p_order_total: updatedOrder.total,
      p_order_date: updatedOrder.created_at,
    })
  } catch (statsError) {
    console.error('[fulfillPaidOrder] customer stats failed:', statsError)
  }

  // Loyalty points (idempotent on order_id)
  try {
    const { calculatePointsForOrder, calculateTier } = await import(
      '@/lib/loyalty'
    )
    const pointsToAward = calculatePointsForOrder(updatedOrder.total)

    const { data: existingTx } = await supabase
      .from('loyalty_transactions')
      .select('id')
      .eq('order_id', order.id)
      .eq('type', 'earned')
      .maybeSingle()

    if (!existingTx && pointsToAward > 0) {
      const { data: existingRecord } = await supabase
        .from('loyalty_points')
        .select('id, points_balance, lifetime_points, tier')
        .eq('email', order.email)
        .maybeSingle()

      let oldTier: 'bronze' | 'silver' | 'gold' = 'bronze'
      let newTier: 'bronze' | 'silver' | 'gold' = 'bronze'
      let newBalance = 0
      let newLifetime = 0

      if (existingRecord) {
        oldTier = (existingRecord.tier as any) || 'bronze'
        newBalance = (existingRecord.points_balance || 0) + pointsToAward
        newLifetime = (existingRecord.lifetime_points || 0) + pointsToAward
        newTier = calculateTier(newLifetime) as any

        await supabase
          .from('loyalty_points')
          .update({
            points_balance: newBalance,
            lifetime_points: newLifetime,
            tier: newTier,
            user_id: order.user_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRecord.id)
      } else {
        newBalance = pointsToAward
        newLifetime = pointsToAward
        newTier = calculateTier(pointsToAward) as any
        await supabase.from('loyalty_points').insert({
          email: order.email,
          user_id: order.user_id || null,
          points_balance: pointsToAward,
          lifetime_points: pointsToAward,
          tier: newTier,
        })
      }

      await supabase.from('loyalty_transactions').insert({
        email: order.email,
        user_id: order.user_id || null,
        type: 'earned',
        points: pointsToAward,
        description: `${pointsToAward} punten verdiend bij bestelling`,
        order_id: order.id,
      })

      const tierRank: Record<string, number> = { bronze: 0, silver: 1, gold: 2 }
      if (tierRank[newTier] > tierRank[oldTier]) {
        try {
          const { sendLoyaltyStatusUpdateEmail } = await import('@/lib/email')
          const name =
            (order.shipping_address as any)?.name || order.email.split('@')[0]

          await sendLoyaltyStatusUpdateEmail({
            customerEmail: order.email,
            customerName: name,
            tier: newTier,
            pointsBalance: newBalance,
            lifetimePoints: newLifetime,
            previousTier: oldTier,
            variant: 'tier_up',
            locale: 'nl',
          })

          await supabase
            .from('loyalty_points')
            .update({
              status_mail_sent_at: new Date().toISOString(),
              last_tier_mailed: newTier,
            })
            .eq('email', order.email)
        } catch (tierMailError) {
          console.error('[fulfillPaidOrder] tier-up mail failed:', tierMailError)
        }
      }
    }
  } catch (loyaltyError) {
    console.error('[fulfillPaidOrder] loyalty failed:', loyaltyError)
  }

  // Stock (idempotent via stock_decremented_at)
  try {
    const inv = await applyInventoryDecrementForPaidOrder(supabase, order.id)
    if (!inv.ok) {
      console.error('[fulfillPaidOrder] Inventory decrement failed:', inv.reason)
    }
  } catch (stockError) {
    console.error('[fulfillPaidOrder] stock error:', stockError)
  }

  // Gift cards
  try {
    await processGiftCardsForPaidOrder(
      supabase,
      order.id,
      (updatedOrder as any)?.locale || (order as any).locale || 'nl'
    )
  } catch (gcError) {
    console.error('[fulfillPaidOrder] gift-card processing failed:', gcError)
  }

  // Confirmation email
  if (!updatedOrder.last_email_sent_at) {
    await sendConfirmationEmail(supabase, updatedOrder)
  }

  return { ok: true, alreadyPaid: false, orderId: order.id }
}

async function sendConfirmationEmail(supabase: SupabaseClient, order: any) {
  try {
    const shippingAddress = order.shipping_address as any
    const siteUrl = getPublicSiteUrl()

    const emailResult = await sendOrderConfirmationEmail({
      customerName: shippingAddress?.name || 'Klant',
      customerEmail: order.email,
      orderId: order.id,
      orderTotal: order.total,
      subtotal: order.subtotal,
      shippingCost: order.shipping_cost,
      orderItems: (order.order_items || []).map((item: any) => ({
        name: item.product_name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: item.price_at_purchase,
        imageUrl: item.image_url
          ? item.image_url.startsWith('http')
            ? item.image_url
            : `${siteUrl}${item.image_url}`
          : '',
        isPresale: item.is_presale || false,
        presaleExpectedDate: item.presale_expected_date || undefined,
      })),
      shippingAddress: {
        name: shippingAddress?.name || '',
        address: shippingAddress?.address || '',
        city: shippingAddress?.city || '',
        postalCode: shippingAddress?.postalCode || '',
      },
      promoCode: order.promo_code || undefined,
      discountAmount: order.discount_amount || 0,
      locale: order.locale || 'nl',
    })

    if (emailResult.success) {
      await supabase
        .from('orders')
        .update({
          last_email_sent_at: new Date().toISOString(),
          last_email_type: 'order_confirmation',
        })
        .eq('id', order.id)
    } else {
      console.error('[fulfillPaidOrder] email failed:', emailResult.error)
    }
  } catch (emailError) {
    console.error('[fulfillPaidOrder] email exception:', emailError)
  }
}
