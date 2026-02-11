import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const likelihoodFilter = searchParams.get('likelihood')
    const pageFilter = searchParams.get('page')

    const { authorized, supabase } = await requireAdmin()

    if (!authorized || !supabase) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let query = supabase
      .from('survey_responses')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (likelihoodFilter) {
      query = query.eq('purchase_likelihood', likelihoodFilter)
    }

    if (pageFilter) {
      query = query.ilike('page_url', `%${pageFilter}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching survey responses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch responses', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      responses: data || [],
      total: count || 0,
    })
  } catch (error: any) {
    console.error('Error in survey responses route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { authorized, supabase } = await requireAdmin()

    if (!authorized || !supabase) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'IDs array is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('survey_responses')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('Error deleting survey responses:', error)
      return NextResponse.json(
        { error: 'Failed to delete responses', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} response(s) deleted`,
    })
  } catch (error: any) {
    console.error('Error in delete survey responses route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

