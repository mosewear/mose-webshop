import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'

/**
 * Clears the ISR cache for the public /over-mose page so admin edits
 * (hero imagery, focal point, copy in either language) become visible
 * immediately instead of after the next 30-minute revalidation window.
 *
 * Mirrors /api/revalidate-homepage and /api/revalidate-lookbook. Called
 * from /admin/about after every save.
 */
export async function POST(_request: NextRequest) {
  try {
    const { authorized } = await requireAdmin(['admin', 'manager'])
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    revalidatePath('/[locale]/over-mose', 'page')
    revalidatePath('/nl/over-mose', 'page')
    revalidatePath('/en/over-mose', 'page')

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      message: 'About cache cleared successfully',
    })
  } catch (err) {
    console.error('Error revalidating about page:', err)
    return NextResponse.json(
      { revalidated: false, error: 'Error revalidating about page' },
      { status: 500 },
    )
  }
}
