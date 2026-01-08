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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Haal return op
    const { data: returnRecord, error: fetchError } = await supabase
      .from('returns')
      .select(`
        *,
        orders!inner(
          user_id,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError || !returnRecord) {
      return NextResponse.json({ error: 'Return niet gevonden' }, { status: 404 })
    }

    // Check of user eigenaar is van de return
    const isOwner = returnRecord.orders.user_id === user.id
    
    // Check of user admin is
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = profile?.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 403 })
    }

    // Check of label beschikbaar is
    if (!returnRecord.return_label_url) {
      return NextResponse.json({ 
        error: 'Retourlabel nog niet beschikbaar. Probeer het over een paar minuten opnieuw.' 
      }, { status: 404 })
    }

    console.log('📥 Downloading return label via proxy:', {
      returnId: id,
      labelUrl: returnRecord.return_label_url,
      userId: user.id,
    })

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

