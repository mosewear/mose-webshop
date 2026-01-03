import { createClient } from '@/lib/supabase/server'

/**
 * Track promo code usage
 * Call this after a successful order with a promo code
 */
export async function trackPromoCodeUsage(
  promoCode: string,
  orderId: string,
  discountAmount: number,
  orderTotal: number,
  userId?: string
) {
  try {
    const supabase = await createClient()

    // Get the promo code
    const { data: code, error: codeError } = await supabase
      .from('promo_codes')
      .select('id, usage_count')
      .eq('code', promoCode.toUpperCase())
      .single()

    if (codeError || !code) {
      console.error('Promo code not found for tracking:', promoCode)
      return
    }

    // Increment usage count
    const { error: updateError } = await supabase
      .from('promo_codes')
      .update({ usage_count: code.usage_count + 1 })
      .eq('id', code.id)

    if (updateError) {
      console.error('Error updating promo code usage count:', updateError)
    }

    // Insert usage record
    const { error: usageError } = await supabase.from('promo_code_usage').insert({
      promo_code_id: code.id,
      order_id: orderId,
      discount_amount: discountAmount,
      order_total: orderTotal,
      user_id: userId || null,
    })

    if (usageError) {
      console.error('Error tracking promo code usage:', usageError)
    }

    console.log(`✅ Promo code ${promoCode} usage tracked for order ${orderId}`)
  } catch (error) {
    console.error('Error in trackPromoCodeUsage:', error)
  }
}

