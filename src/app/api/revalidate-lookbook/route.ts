import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'

/**
 * Clears the ISR cache for the public lookbook page so admin edits
 * (chapter copy, hero images, ticker text, final CTA) become visible
 * immediately instead of after the next 30-minute revalidation window.
 *
 * Mirrors /api/revalidate-homepage. Called from the lookbook admin UI
 * after every save / add / delete / reorder mutation.
 */
export async function POST(_request: NextRequest) {
  try {
    const { authorized } = await requireAdmin(['admin', 'manager'])
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // The page lives under a [locale] segment. We revalidate both the
    // route template (catches any locale param) and the two concrete
    // locale paths to be thorough — Next.js' cache uses both keys.
    revalidatePath('/[locale]/lookbook', 'page')
    revalidatePath('/nl/lookbook', 'page')
    revalidatePath('/en/lookbook', 'page')

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      message: 'Lookbook cache cleared successfully',
    })
  } catch (err) {
    console.error('Error revalidating lookbook:', err)
    return NextResponse.json(
      { revalidated: false, error: 'Error revalidating lookbook' },
      { status: 500 },
    )
  }
}
