import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Generate unique newsletter welcome promo code
 * - Format: WELCOME10-XXXXXX (10% discount)
 * - Expires after 90 days
 * - One-time use per subscriber
 * - Reuses existing code if subscriber already has one
 */
export async function generateNewsletterPromoCode(
  subscriberId: string,
  email: string,
  locale: string = 'nl'
): Promise<{ code: string; expiresAt: Date } | null> {
  try {
    const supabase = createServiceRoleClient() // Use service role to bypass RLS

    // 1. Check if subscriber already has an active code
    const { data: existingCode, error: checkError } = await supabase
      .from('promo_codes')
      .select('code, expires_at')
      .eq('subscriber_id', subscriberId)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString()) // Still valid
      .single()

    if (existingCode && !checkError) {
      console.log(`✅ Subscriber ${email} already has valid code: ${existingCode.code}`)
      return {
        code: existingCode.code,
        expiresAt: new Date(existingCode.expires_at)
      }
    }

    // 2. Generate unique code (with retry logic for duplicates)
    let code = ''
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
      code = `WELCOME10-${randomSuffix}`

      // Check if code already exists
      const { data: duplicate } = await supabase
        .from('promo_codes')
        .select('id')
        .eq('code', code)
        .single()

      if (!duplicate) {
        break // Unique code found!
      }

      attempts++
      console.log(`⚠️ Duplicate code ${code}, retrying... (${attempts}/${maxAttempts})`)
    }

    if (attempts === maxAttempts) {
      console.error('❌ Failed to generate unique promo code after 3 attempts')
      return null
    }

    // 3. Calculate expiry (90 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    // 4. Insert into database
    const { error: insertError } = await supabase
      .from('promo_codes')
      .insert({
        code,
        description: `Welkomstkorting voor ${email}`,
        discount_type: 'percentage',
        discount_value: 10,
        min_order_value: 0,
        usage_limit: 1, // One-time use
        expires_at: expiresAt.toISOString(),
        is_active: true,
        subscriber_id: subscriberId,
      })

    if (insertError) {
      console.error('❌ Error creating promo code:', insertError)
      return null
    }

    console.log(`✅ Created promo code ${code} for ${email} (expires: ${expiresAt.toLocaleDateString('nl-NL')})`)
    
    return { code, expiresAt }
  } catch (error) {
    console.error('❌ Error in generateNewsletterPromoCode:', error)
    return null
  }
}

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
    const supabase = createServiceRoleClient() // Use service role to bypass RLS

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


