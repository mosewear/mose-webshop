import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'

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
    const { authorized } = await requireAdmin()

    if (!authorized) {
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

    // Use service role for destructive admin actions to avoid RLS no-op deletes.
    const serviceSupabase = createServiceRoleClient()
    const { data: deletedRows, error } = await serviceSupabase
      .from('survey_responses')
      .delete()
      .in('id', ids)
      .select('id')

    if (error) {
      console.error('Error deleting survey responses:', error)
      return NextResponse.json(
        { error: 'Failed to delete responses', details: error.message },
        { status: 500 }
      )
    }

    const deletedCount = deletedRows?.length || 0
    if (deletedCount === 0) {
      return NextResponse.json(
        { error: 'No responses were deleted' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} response(s) deleted`,
      deletedCount,
    })
  } catch (error: any) {
    console.error('Error in delete survey responses route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

