import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const { authorized } = await requireAdmin(['admin'])
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'Niet geautoriseerd' },
        { status: 403 }
      )
    }

    // Paginering en zoeken. Deze route haalde ALLE promocodes op zonder
    // limiet. Er staan er 18.791 in de database, PostgREST kapt stil af op
    // 1000, en de adminpagina rende daar vervolgens ruim 6000 knoppen voor uit
    // in een pagina van 266.000 pixels hoog. De beheerder zag dus 1000 van de
    // 18.791 codes zonder dat iets dat meldde, in een scherm dat niet te
    // gebruiken was.
    const { searchParams } = new URL(req.url)
    const zoek = (searchParams.get('q') || '').trim()
    const perPagina = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200)
    const pagina = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)
    const van = (pagina - 1) * perPagina

    const supabase = createServiceRoleClient()

    let query = supabase
      .from('promo_codes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(van, van + perPagina - 1)

    if (zoek) {
      query = query.ilike('code', `%${zoek}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching promo codes:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      total: count ?? 0,
      page: pagina,
      pageSize: perPagina,
    })
  } catch (error: any) {
    console.error('API error fetching promo codes:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}




