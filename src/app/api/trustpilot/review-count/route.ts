import { NextResponse } from 'next/server'

/**
 * API Route to check Trustpilot review count
 * 
 * This endpoint checks if there are 30+ reviews on Trustpilot
 * 
 * For now, we use an environment variable (TRUSTPILOT_REVIEW_COUNT)
 * You can update this in your .env file or Vercel environment variables
 * 
 * Future: Can be extended to use Trustpilot's Business Unit API with API key
 * Business Unit ID: AAbEsaY7hRnD5xEZ
 */
export async function GET() {
  try {
    // Get review count from environment variable
    // You can set this in .env.local or Vercel environment variables
    const reviewCount = parseInt(process.env.TRUSTPILOT_REVIEW_COUNT || '0')
    const minReviews = parseInt(process.env.TRUSTPILOT_MIN_REVIEWS || '30')
    
    // Future: If you have Trustpilot API credentials, you can fetch real-time data here
    // const businessUnitId = 'AAbEsaY7hRnD5xEZ'
    // const response = await fetch(`https://api.trustpilot.com/v1/business-units/${businessUnitId}`, {
    //   headers: { 'Authorization': `Bearer ${process.env.TRUSTPILOT_API_KEY}` }
    // })
    // const data = await response.json()
    // const reviewCount = data.numberOfReviews?.total || 0
    
    return NextResponse.json({
      reviewCount,
      hasMinimumReviews: reviewCount >= minReviews,
      source: 'env',
      minReviews
    })
  } catch (error) {
    console.error('Error checking Trustpilot review count:', error)
    
    // Safe fallback: don't show widget if we can't verify
    return NextResponse.json({
      reviewCount: 0,
      hasMinimumReviews: false,
      source: 'error',
      error: 'Failed to check review count'
    })
  }
}

