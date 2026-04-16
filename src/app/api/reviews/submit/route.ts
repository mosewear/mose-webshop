import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { product_id, rating, title, comment, reviewer_name, reviewer_email } = body

    if (!product_id || !rating || !reviewer_name || !reviewer_email) {
      return NextResponse.json(
        { error: 'Vul alle verplichte velden in' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating moet tussen 1 en 5 zijn' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(reviewer_email)) {
      return NextResponse.json(
        { error: 'Ongeldig e-mailadres' },
        { status: 400 }
      )
    }

    // Try to get current user (may be null for guests)
    let userId: string | null = null
    let isVerifiedPurchase = false

    try {
      const userClient = await createClient()
      const { data: { user } } = await userClient.auth.getUser()
      if (user) {
        userId = user.id

        // Check if user has purchased this product
        const supabaseService = createServiceRoleClient()
        const { data: purchases } = await supabaseService
          .from('order_items')
          .select('id, orders!inner(user_id, payment_status)')
          .eq('product_id', product_id)
          .eq('orders.user_id', user.id)
          .eq('orders.payment_status', 'paid')
          .limit(1)

        if (purchases && purchases.length > 0) {
          isVerifiedPurchase = true
        }
      }
    } catch {
      // Guest user, continue without user_id
    }

    const supabase = createServiceRoleClient()

    const { data: review, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id,
        user_id: userId,
        rating,
        title: title || '',
        comment: comment || '',
        reviewer_name,
        reviewer_email,
        is_approved: false,
        is_verified_purchase: isVerifiedPurchase,
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting review:', error)
      return NextResponse.json(
        { error: 'Kon review niet opslaan' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, reviewId: review.id })
  } catch (error: any) {
    console.error('Review submit error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
