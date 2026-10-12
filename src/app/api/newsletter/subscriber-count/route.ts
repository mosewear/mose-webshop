import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    // Client hier aanmaken en niet op moduleniveau: anders voert Next dit
    // bestand al uit tijdens de build en faalt die zonder service-role-sleutel.
    const supabase = createServiceClient()

    const { count, error } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching subscriber count:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch count' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
      total: 633 + (count || 0)
    })
  } catch (error) {
    console.error('Subscriber count API error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}




