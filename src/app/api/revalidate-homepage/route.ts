import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const { authorized } = await requireAdmin(['admin', 'manager'])
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // De homepage leeft op /[locale]/page.tsx (rendert /nl + /en).
    // revalidatePath('/', 'page') invalideerde alleen het literal '/'
    // pad - dat matcht onze localized routes niet en liet de cache
    // 1 uur lang stale hangen. We gebruiken nu het Next.js dynamic
    // path patroon zodat alle locales tegelijk wegens worden gegooid.
    revalidatePath('/[locale]', 'page')

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      message: 'Homepage cache cleared successfully',
    })
  } catch (err) {
    console.error('Error revalidating homepage:', err)
    return NextResponse.json(
      {
        revalidated: false,
        error: 'Error revalidating homepage',
      },
      { status: 500 }
    )
  }
}
