/**
 * Script to generate PNG icons from Lucide icons and upload to Supabase Storage
 * Run with: npx tsx scripts/upload-email-icons.ts
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

// Lucide icon SVG paths (from lucide-react)
const iconConfigs = {
  'check': {
    svg: '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    size: 24
  },
  'check-circle': {
    svg: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="m9 11 3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    size: 24
  },
  'truck': {
    svg: '<path d="M16 3h5v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M8 3H3v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M12 22h-4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    size: 24
  },
  'settings': {
    svg: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>',
    size: 24
  },
  'x': {
    svg: '<path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    size: 24
  },
  'shopping-cart': {
    svg: '<circle cx="8" cy="21" r="1" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="19" cy="21" r="1" stroke="currentColor" stroke-width="2" fill="none"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    size: 24
  },
  'package': {
    svg: '<path d="m7.5 4.27 9 5.15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M21 8.77v5.23a2 2 0 0 1-1.11 1.79l-8 4.44a2 2 0 0 1-1.78 0l-8-4.44A2 2 0 0 1 3 14V8.77" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M12 22V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="m3 8.77 9 5.15 9-5.15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    size: 24
  }
}

// Icon configurations with background colors (matching email styles)
const iconStyles = {
  'check-circle-success': { color: '#2ECC71', size: 38, circleSize: 72 },
  'check-circle-delivered': { color: '#2ECC71', size: 46, circleSize: 72 },
  'truck-shipping': { color: '#FF9500', size: 42, circleSize: 72 },
  'settings-processing': { color: '#667eea', size: 42, circleSize: 72 },
  'x-cancelled': { color: '#e74c3c', size: 42, circleSize: 72 },
  'shopping-cart-abandoned': { color: '#FF9500', size: 42, circleSize: 72 },
  'check-small': { color: '#2ECC71', size: 18, circleSize: 0 }, // No circle for small checkmarks
  'check-orange': { color: '#FF9500', size: 18, circleSize: 0 },
}

async function generateAndUploadIcons() {
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
  const folder = 'email-icons'

  console.log('🚀 Starting icon generation and upload...\n')

  const iconUrls: Record<string, string> = {}

  // Map icon styles to icon configs
  const iconStyleMap: Record<string, { iconName: keyof typeof iconConfigs, config: typeof iconConfigs[keyof typeof iconConfigs] }> = {
    'check-circle-success': { iconName: 'check-circle', config: iconConfigs['check-circle'] },
    'check-circle-delivered': { iconName: 'check-circle', config: iconConfigs['check-circle'] },
    'truck-shipping': { iconName: 'truck', config: iconConfigs['truck'] },
    'settings-processing': { iconName: 'settings', config: iconConfigs['settings'] },
    'x-cancelled': { iconName: 'x', config: iconConfigs['x'] },
    'shopping-cart-abandoned': { iconName: 'shopping-cart', config: iconConfigs['shopping-cart'] },
    'check-small': { iconName: 'check', config: iconConfigs['check'] },
    'check-orange': { iconName: 'check', config: iconConfigs['check'] },
  }

  // Generate icons with styled backgrounds
  for (const [styleName, style] of Object.entries(iconStyles)) {
    const iconMap = iconStyleMap[styleName]
    if (!iconMap) continue

    console.log(`📦 Processing ${styleName}...`)

    try {
      const { iconName, config } = iconMap
      const { color, size, circleSize } = style

      // Create SVG with colored circle background
      let svgContent: string
      
      if (circleSize > 0) {
        // Icon with circle background
        svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${circleSize}" height="${circleSize}" viewBox="0 0 ${circleSize} ${circleSize}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${circleSize/2}" cy="${circleSize/2}" r="${circleSize/2}" fill="${color}"/>
  <g transform="translate(${(circleSize - 24) / 2}, ${(circleSize - 24) / 2})">
    ${config.svg.replace(/currentColor/g, '#ffffff')}
  </g>
</svg>`
      } else {
        // Icon without circle (for checkmarks)
        svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${config.svg.replace(/currentColor/g, color)}
</svg>`
      }

      // Convert SVG to PNG using sharp
      const targetSize = circleSize > 0 ? circleSize : size
      const pngBuffer = await sharp(Buffer.from(svgContent))
        .resize(targetSize, targetSize)
        .png()
        .toBuffer()

      // Upload PNG to Supabase
      const fileName = `${folder}/${styleName}.png`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, pngBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error(`  ❌ Error uploading ${styleName}:`, uploadError.message)
        continue
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadData.path)

      iconUrls[styleName] = publicUrl
      console.log(`  ✅ Uploaded ${styleName}: ${publicUrl}`)

    } catch (error: any) {
      console.error(`  ❌ Error processing ${styleName}:`, error.message)
    }
  }

  // Save URLs to a config file
  const configPath = join(process.cwd(), 'src/lib/email-icons.json')
  writeFileSync(configPath, JSON.stringify(iconUrls, null, 2))
  console.log(`\n✅ Icon URLs saved to ${configPath}`)

  console.log('\n🎉 Done! All icons uploaded successfully.')
  return iconUrls
}

// Run the script
generateAndUploadIcons().catch(console.error)

