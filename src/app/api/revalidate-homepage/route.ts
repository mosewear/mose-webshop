import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { authorized } = await requireAdmin(['admin', 'manager'])
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    revalidatePath('/', 'page')
    
    return NextResponse.json({ 
      revalidated: true, 
      now: Date.now(),
      message: 'Homepage cache cleared successfully'
    })
  } catch (err) {
    console.error('Error revalidating homepage:', err)
    return NextResponse.json({ 
      revalidated: false, 
      error: 'Error revalidating homepage' 
    }, { status: 500 })
  }
}
