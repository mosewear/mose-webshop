import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

// API route to manually revalidate homepage
// Call this after admin changes to homepage settings
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check
    // const session = await getSession()
    // if (!session?.user?.is_admin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Revalidate the homepage
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

// Also support GET for easy testing
export async function GET() {
  try {
    revalidatePath('/', 'page')
    return NextResponse.json({ 
      revalidated: true, 
      now: Date.now(),
      message: 'Homepage cache cleared successfully (via GET)'
    })
  } catch (err) {
    console.error('Error revalidating homepage:', err)
    return NextResponse.json({ 
      revalidated: false, 
      error: 'Error revalidating homepage' 
    }, { status: 500 })
  }
}


