import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Download Return Label Proxy
 * 
 * Haalt PDF op van Sendcloud met server-side credentials
 * en stuurt deze door naar de klant
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ No user authenticated')
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    console.log('🔍 Checking authorization for user:', user.id)

    // Haal return op met order_id
    const { data: returnRecord, error: fetchError } = await supabase
      .from('returns')
      .select('order_id, return_label_url')
      .eq('id', id)
      .single()

    if (fetchError || !returnRecord) {
      console.error('❌ Return not found:', id, fetchError)
      return NextResponse.json({ error: 'Return niet gevonden' }, { status: 404 })
    }

    console.log('📦 Found return, order_id:', returnRecord.order_id)

    // Haal order op om user_id te checken
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('user_id, email')
      .eq('id', returnRecord.order_id)
      .single()

    if (orderError || !order) {
      console.error('❌ Order not found:', returnRecord.order_id, orderError)
      return NextResponse.json({ error: 'Order niet gevonden' }, { status: 404 })
    }

    console.log('📋 Order found, user_id:', order.user_id)

    // Check of user eigenaar is van de return
    // Voor oude orders of guest orders: check ook op email
    const { data: userData } = await supabase.auth.getUser()
    const userEmail = userData?.user?.email
    
    const isOwner = order.user_id === user.id || (order.email === userEmail && userEmail)
    
    console.log('🔐 Authorization check:', {
      currentUserId: user.id,
      currentUserEmail: userEmail,
      orderUserId: order.user_id,
      orderEmail: order.email,
      matchById: order.user_id === user.id,
      matchByEmail: order.email === userEmail,
      isOwner,
    })

    // Check of user admin is (alleen als niet owner)
    let isAdmin = false
    if (!isOwner) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      isAdmin = profile?.role === 'admin'
      console.log('👤 Admin check:', isAdmin)
    }

    if (!isOwner && !isAdmin) {
      console.error('❌ User not authorized:', {
        userId: user.id,
        orderUserId: order.user_id,
      })
      return NextResponse.json({ error: 'Niet geautoriseerd voor deze retour' }, { status: 403 })
    }

    console.log('✅ User authorized!')

    // Check of label beschikbaar is
    if (!returnRecord.return_label_url) {
      console.log('⏳ Label not yet available')
      return NextResponse.json({ 
        error: 'Retourlabel nog niet beschikbaar. Probeer het over een paar minuten opnieuw.' 
      }, { status: 404 })
    }

    console.log('📥 Downloading label from Sendcloud:', returnRecord.return_label_url)

    // Haal PDF op van Sendcloud met credentials
    const labelUrl = returnRecord.return_label_url
    
    // Add credentials to Sendcloud request
    const credentials = Buffer.from(
      `${process.env.SENDCLOUD_PUBLIC_KEY}:${process.env.SENDCLOUD_SECRET_KEY}`
    ).toString('base64')

    const response = await fetch(labelUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch label from Sendcloud:', response.status)
      const errorText = await response.text()
      console.error('Sendcloud error:', errorText)
      
      return NextResponse.json({ 
        error: 'Kon retourlabel niet ophalen. Probeer het later opnieuw of neem contact op.' 
      }, { status: 500 })
    }

    // Get PDF buffer
    const pdfBuffer = await response.arrayBuffer()

    console.log('✅ Label downloaded successfully, sending to client')

    // Stuur PDF naar klant met correcte headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="retourlabel-${id.slice(0, 8)}.pdf"`,
        'Cache-Control': 'private, max-age=3600', // Cache 1 hour
      },
    })
  } catch (error: any) {
    console.error('Error in download-label proxy:', error)
    return NextResponse.json({ 
      error: 'Er ging iets mis bij het downloaden van het label' 
    }, { status: 500 })
  }
}

