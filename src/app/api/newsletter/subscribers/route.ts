import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireNewsletterAdmin } from '@/lib/newsletter-admin-auth'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 50

function parsePositiveInt(v: string | null, fallback: number, max?: number) {
  const n = parseInt(String(v || ''), 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  if (max != null && n > max) return max
  return n
}

/** Strip characters that break PostgREST ilike patterns. */
function sanitizeSearch(raw: string): string {
  return raw.trim().slice(0, 200).replace(/%/g, '').replace(/_/g, '')
}

/**
 * GET — paginated newsletter_subscribers for admin UI.
 * Query: page, pageSize, status=all|active|unsubscribed, sort=newest|oldest|email, q=email substring
 */
export async function GET(req: NextRequest) {
  const auth = await requireNewsletterAdmin()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(req.url)
    const page = parsePositiveInt(searchParams.get('page'), 1)
    const pageSize = parsePositiveInt(
      searchParams.get('pageSize'),
      DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE
    )
    const status = searchParams.get('status') || 'all'
    const sort = searchParams.get('sort') || 'newest'
    const q = sanitizeSearch(searchParams.get('q') || '')

    if (!['all', 'active', 'unsubscribed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Ongeldige status' },
        { status: 400 }
      )
    }
    if (!['newest', 'oldest', 'email'].includes(sort)) {
      return NextResponse.json(
        { success: false, error: 'Ongeldige sortering' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact' })

    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (q) {
      query = query.ilike('email', `%${q}%`)
    }

    const column = sort === 'email' ? 'email' : 'subscribed_at'
    const ascending = sort === 'oldest' || sort === 'email'
    query = query.order(column, { ascending })

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('[newsletter/subscribers]', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Ophalen mislukt' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscribers: data || [],
      total: count ?? 0,
      page,
      pageSize,
    })
  } catch (e: any) {
    console.error('[newsletter/subscribers]', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'Ophalen mislukt' },
      { status: 500 }
    )
  }
}
