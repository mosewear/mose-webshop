import { NextRequest, NextResponse } from 'next/server'
import { workerAuthorized } from '@/lib/shopify/http'
import { runTapstitchCloud } from '@/lib/tapstitch-cloud'
export const runtime='nodejs'
export const maxDuration=120
export async function GET(request:NextRequest) {
  if(!workerAuthorized(request)) return NextResponse.json({error:'Unauthorized'},{status:401})
  try {return NextResponse.json(await runTapstitchCloud(),{headers:{'Cache-Control':'private, no-store'}})}
  catch {return NextResponse.json({error:'Productiecontrole niet voltooid; laatste bevestigde status behouden.'},{status:503,headers:{'Cache-Control':'private, no-store'}})}
}
