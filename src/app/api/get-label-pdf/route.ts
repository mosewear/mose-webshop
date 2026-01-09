import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get Sendcloud label PDF
 * Deze route haalt het label PDF op via de Sendcloud API en geeft het door aan de admin
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('order_id')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Verify admin access
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get order with label_url
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('label_url, tracking_code')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.label_url) {
      return NextResponse.json({ error: 'No label URL found for this order' }, { status: 404 })
    }

    // Fetch the PDF from Sendcloud with authentication
    const sendcloudApiKey = process.env.SENDCLOUD_PUBLIC_KEY
    const sendcloudApiSecret = process.env.SENDCLOUD_SECRET_KEY

    if (!sendcloudApiKey || !sendcloudApiSecret) {
      return NextResponse.json({ error: 'Sendcloud API keys not configured' }, { status: 500 })
    }

    const auth = Buffer.from(`${sendcloudApiKey}:${sendcloudApiSecret}`).toString('base64')

    const response = await fetch(order.label_url, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch label from Sendcloud:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch label from Sendcloud' },
        { status: response.status }
      )
    }

    // Get the PDF data
    const pdfData = await response.arrayBuffer()

    // Return the PDF with appropriate headers
    return new NextResponse(pdfData, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="label-${order.tracking_code || orderId}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error fetching label PDF:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


