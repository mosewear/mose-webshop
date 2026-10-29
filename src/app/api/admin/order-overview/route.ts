import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { readAdminOrderOverview } from '@/lib/admin-order-overview'
export const runtime='nodejs'
export async function GET() {
  const headers={'Cache-Control':'private, no-store'}
  try {
    const {authorized}=await requireAdmin(['admin','manager'])
    if(!authorized) return NextResponse.json({error:'Geen toegang.'},{status:403,headers})
    return NextResponse.json({orders:await readAdminOrderOverview()},{headers})
  } catch {return NextResponse.json({error:'Het volledige besteloverzicht kan nu niet worden geladen. Cijfers zijn niet bijgewerkt.'},{status:503,headers})}
}
