import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// This endpoint checks if webhooks are working and what events we receive
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get recent orders with their payment status
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, email, payment_status, stripe_payment_intent_id, created_at, paid_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Check environment variables
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'NOT SET'
    const stripeKey = process.env.STRIPE_SECRET_KEY ? 'SET' : 'NOT SET'
    
    return NextResponse.json({
      status: 'Webhook Debug Info',
      environment: {
        STRIPE_WEBHOOK_SECRET: webhookSecret,
        STRIPE_SECRET_KEY: stripeKey,
        VERCEL_URL: process.env.VERCEL_URL || 'not set',
        NODE_ENV: process.env.NODE_ENV,
      },
      webhook_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/stripe-webhook`,
      recent_orders: orders?.map(o => ({
        id: o.id,
        email: o.email,
        payment_status: o.payment_status,
        has_payment_intent: !!o.stripe_payment_intent_id,
        payment_intent_id: o.stripe_payment_intent_id,
        created_at: o.created_at,
        paid_at: o.paid_at,
      })),
      instructions: {
        step1: 'Go to https://dashboard.stripe.com/webhooks',
        step2: 'Check if webhook is configured for this URL',
        step3: 'Verify these events are enabled: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded',
        step4: 'Check webhook logs for recent events',
        step5: 'Verify STRIPE_WEBHOOK_SECRET matches the signing secret in Stripe',
      }
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to get debug info',
      message: error.message 
    }, { status: 500 })
  }
}


