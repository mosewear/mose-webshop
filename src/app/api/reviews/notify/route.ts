import { NextRequest, NextResponse } from 'next/server'
import { sendNewReviewNotificationEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reviewId, productId } = body

    if (!reviewId || !productId) {
      return NextResponse.json(
        { error: 'Review ID and Product ID are required' },
        { status: 400 }
      )
    }

    // Fetch review and product details from database
    const supabase = createClient()
    
    // Fetch review
    const { data: review, error: reviewError } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      console.error('Error fetching review:', reviewError)
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name, slug')
      .eq('id', productId)
      .single()

    if (productError) {
      console.error('Error fetching product:', productError)
    }

    // Send notification email to admin
    const emailResult = await sendNewReviewNotificationEmail({
      reviewerName: review.reviewer_name,
      reviewerEmail: review.reviewer_email,
      productName: product?.name || 'Onbekend product',
      productSlug: product?.slug || '',
      rating: review.rating,
      title: review.title || undefined,
      comment: review.comment || undefined,
      reviewId: review.id,
      locale: 'nl', // Default to Dutch
    })

    if (!emailResult.success) {
      console.error('Error sending review notification email:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send notification email', details: emailResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notification email sent successfully' 
    })
  } catch (error: any) {
    console.error('Error in review notification route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

