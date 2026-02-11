import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Lees het bestand
    const imagePath = join(process.cwd(), '../MOSE/mosestory.png')
    const imageBuffer = readFileSync(imagePath)
    const fileName = `mosestory-${Date.now()}.png`

    // Upload naar images bucket
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Genereer public URL
    const { data: publicData } = supabase.storage
      .from('images')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: publicData.publicUrl
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}







