// Simple upload script voor mosestory.png
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function uploadMosestory() {
  try {
    // Lees het bestand
    const imageBuffer = readFileSync(join(process.cwd(), '../MOSE/mosestory.png'))
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
      console.error('❌ Upload mislukt:', error.message)
      process.exit(1)
    }

    // Genereer public URL
    const { data: publicData } = supabase.storage
      .from('images')
      .getPublicUrl(fileName)

    console.log('✅ Upload succesvol!')
    console.log('📸 URL:', publicData.publicUrl)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

uploadMosestory()




