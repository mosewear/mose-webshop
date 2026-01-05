/**
 * Script to generate white version of logo and upload to Supabase Storage
 * Run with: npx tsx scripts/upload-white-logo.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import sharp from 'sharp'
import { config } from 'dotenv'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

async function generateAndUploadWhiteLogo() {
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables!')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const bucket = 'images'
  const folder = 'email-assets'

  console.log('🚀 Starting white logo generation and upload...\n')

  try {
    // Read the original logo
    const logoPath = join(process.cwd(), 'public', 'logomose.png')
    console.log(`📖 Reading logo from: ${logoPath}`)
    
    const originalLogo = readFileSync(logoPath)
    
    // Convert to white version using sharp
    // We'll invert the colors and make it white
    console.log('🎨 Converting logo to white version...')
    
    const whiteLogoBuffer = await sharp(originalLogo)
      .resize(140, null, { // Maintain aspect ratio, width 140px
        fit: 'inside',
        withoutEnlargement: true
      })
      .greyscale() // Convert to greyscale first
      .linear(1, -(128)) // Invert: make dark areas light
      .modulate({ brightness: 2 }) // Make it brighter/whiter
      .png()
      .toBuffer()

    // Also create a larger version for footer (100px)
    const whiteLogoFooterBuffer = await sharp(originalLogo)
      .resize(100, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .greyscale()
      .linear(1, -(128))
      .modulate({ brightness: 2 })
      .png()
      .toBuffer()

    // Upload header logo (140px)
    const headerFileName = `${folder}/logo-white-header.png`
    console.log(`📤 Uploading header logo (140px)...`)
    
    const { data: headerUploadData, error: headerUploadError } = await supabase.storage
      .from(bucket)
      .upload(headerFileName, whiteLogoBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      })

    if (headerUploadError) {
      console.error(`  ❌ Error uploading header logo:`, headerUploadError.message)
      throw headerUploadError
    }

    const { data: { publicUrl: headerUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(headerUploadData.path)

    console.log(`  ✅ Header logo uploaded: ${headerUrl}`)

    // Upload footer logo (100px)
    const footerFileName = `${folder}/logo-white-footer.png`
    console.log(`📤 Uploading footer logo (100px)...`)
    
    const { data: footerUploadData, error: footerUploadError } = await supabase.storage
      .from(bucket)
      .upload(footerFileName, whiteLogoFooterBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      })

    if (footerUploadError) {
      console.error(`  ❌ Error uploading footer logo:`, footerUploadError.message)
      throw footerUploadError
    }

    const { data: { publicUrl: footerUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(footerUploadData.path)

    console.log(`  ✅ Footer logo uploaded: ${footerUrl}`)

    // Save URLs to config file
    const logoUrls = {
      header: headerUrl,
      footer: footerUrl
    }

    const configPath = join(process.cwd(), 'src/lib/email-logo-urls.json')
    writeFileSync(configPath, JSON.stringify(logoUrls, null, 2))
    console.log(`\n✅ Logo URLs saved to ${configPath}`)

    console.log('\n🎉 Done! White logo versions uploaded successfully.')
    return logoUrls

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Run the script
generateAndUploadWhiteLogo().catch(console.error)

