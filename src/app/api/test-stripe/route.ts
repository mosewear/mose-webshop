import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function GET() {
  try {
    const key = process.env.STRIPE_SECRET_KEY
    
    console.log('🔍 Key exists:', !!key)
    console.log('🔍 Key length:', key?.length)
    console.log('🔍 Key first 20 chars:', key?.substring(0, 20))
    console.log('🔍 Key last 10 chars:', key?.substring(key.length - 10))
    console.log('🔍 Has newline:', key?.includes('\n'))
    console.log('🔍 Has carriage return:', key?.includes('\r'))
    console.log('🔍 Trimmed length:', key?.trim().length)
    
    // Test Stripe initialization
    const stripe = new Stripe(key!.trim())
    
    // Try a simple API call
    const balance = await stripe.balance.retrieve()
    
    return NextResponse.json({
      success: true,
      keyLength: key?.length,
      trimmedLength: key?.trim().length,
      hasNewline: key?.includes('\n'),
      balance: balance
    })
  } catch (error: any) {
    console.error('❌ Test error:', error)
    return NextResponse.json({
      error: error.message,
      type: error.type,
      code: error.code,
      detail: error.detail
    }, { status: 500 })
  }
}

