/**
 * ROBUST SUPABASE STORAGE UTILITY
 * 
 * Deze utility zorgt ervoor dat uploaded bestanden ALTIJD beschikbaar blijven
 * en voorkomt "ghost entries" in de database waar files niet bestaan.
 */

import { createClient } from '@/lib/supabase/client'

interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

interface VerifyResult {
  exists: boolean
  accessible: boolean
  url: string
}

/**
 * Upload een bestand EN verifieer dat het daadwerkelijk beschikbaar is
 * 
 * @param bucket - De Supabase storage bucket naam
 * @param path - Het pad waar het bestand moet komen
 * @param file - Het te uploaden bestand
 * @param maxRetries - Maximum aantal retries bij falen (default: 3)
 * @returns UploadResult met success status en URL
 */
export async function uploadAndVerify(
  bucket: string,
  path: string,
  file: File,
  maxRetries: number = 3
): Promise<UploadResult> {
  const supabase = createClient()
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 [Upload Attempt ${attempt}/${maxRetries}] Uploading to ${bucket}/${path}`)
      
      // Step 1: Upload het bestand
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error(`❌ [Upload Attempt ${attempt}] Upload failed:`, uploadError)
        
        // Als het bestand al bestaat, probeer met een andere naam
        if (uploadError.message.includes('already exists') || uploadError.message.includes('duplicate')) {
          const timestamp = Date.now()
          const random = Math.random().toString(36).substring(7)
          const ext = path.split('.').pop()
          const newPath = path.replace(/\.[^/.]+$/, `-${timestamp}-${random}.${ext}`)
          
          console.log(`🔄 [Upload Attempt ${attempt}] File exists, retrying with new name: ${newPath}`)
          return uploadAndVerify(bucket, newPath, file, maxRetries - attempt)
        }
        
        throw uploadError
      }

      console.log(`✅ [Upload Attempt ${attempt}] Upload successful:`, uploadData?.path)

      // Step 2: Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadData?.path || path)

      const publicUrl = urlData.publicUrl

      // Step 3: KRITIEK - Verifieer dat het bestand ECHT toegankelijk is
      console.log(`🔍 [Upload Attempt ${attempt}] Verifying accessibility of ${publicUrl}`)
      
      const verification = await verifyFileExists(publicUrl, 3)
      
      if (!verification.accessible) {
        console.error(`❌ [Upload Attempt ${attempt}] File uploaded but NOT accessible!`)
        
        // Probeer het bestand te verwijderen (cleanup)
        await supabase.storage.from(bucket).remove([uploadData?.path || path])
        
        // Retry als we nog pogingen over hebben
        if (attempt < maxRetries) {
          console.log(`🔄 [Upload Attempt ${attempt}] Retrying upload...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
          continue
        }
        
        return {
          success: false,
          error: 'File uploaded but not accessible after verification'
        }
      }

      console.log(`✅ [Upload SUCCESS] File is uploaded and verified accessible: ${publicUrl}`)

      return {
        success: true,
        url: publicUrl,
        path: uploadData?.path || path
      }
      
    } catch (error: any) {
      console.error(`❌ [Upload Attempt ${attempt}] Error:`, error)
      
      if (attempt >= maxRetries) {
        return {
          success: false,
          error: error.message || 'Upload failed after all retries'
        }
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }

  return {
    success: false,
    error: 'Upload failed after all retries'
  }
}

/**
 * Verifieer dat een bestand ECHT toegankelijk is via HTTP
 * 
 * @param url - De publieke URL van het bestand
 * @param maxRetries - Maximum aantal verificatie pogingen (default: 3)
 * @returns VerifyResult met exists en accessible status
 */
export async function verifyFileExists(
  url: string,
  maxRetries: number = 3
): Promise<VerifyResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 [Verify Attempt ${attempt}/${maxRetries}] Checking ${url}`)
      
      const response = await fetch(url, {
        method: 'HEAD', // Gebruik HEAD voor efficiency
        cache: 'no-cache',
      })

      const accessible = response.ok && response.status === 200
      
      console.log(`${accessible ? '✅' : '❌'} [Verify Attempt ${attempt}] Status: ${response.status}`)

      if (accessible) {
        return {
          exists: true,
          accessible: true,
          url
        }
      }

      // Als 404, wacht even en probeer opnieuw (soms is er een kleine delay)
      if (response.status === 404 && attempt < maxRetries) {
        console.log(`⏳ [Verify Attempt ${attempt}] File not found yet, waiting before retry...`)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt))
        continue
      }

      return {
        exists: false,
        accessible: false,
        url
      }
      
    } catch (error) {
      console.error(`❌ [Verify Attempt ${attempt}] Verification error:`, error)
      
      if (attempt >= maxRetries) {
        return {
          exists: false,
          accessible: false,
          url
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500 * attempt))
    }
  }

  return {
    exists: false,
    accessible: false,
    url
  }
}

/**
 * Verwijder een bestand uit storage EN verifieer dat het weg is
 * 
 * @param bucket - De Supabase storage bucket naam
 * @param path - Het pad van het bestand
 * @returns boolean success status
 */
export async function deleteAndVerify(
  bucket: string,
  path: string
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    console.log(`🗑️ [Delete] Removing ${bucket}/${path}`)
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error(`❌ [Delete] Error:`, error)
      return false
    }

    // Verifieer dat het bestand ECHT weg is
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
    const verification = await verifyFileExists(urlData.publicUrl, 2)

    if (verification.accessible) {
      console.error(`❌ [Delete] File still accessible after delete!`)
      return false
    }

    console.log(`✅ [Delete] File successfully removed and verified`)
    return true
    
  } catch (error) {
    console.error(`❌ [Delete] Error:`, error)
    return false
  }
}

/**
 * Scan de database voor broken image URLs
 * 
 * @returns Array van broken image entries
 */
export async function findBrokenImages(): Promise<Array<{
  id: string
  url: string
  product_id: string
  table: string
}>> {
  const supabase = createClient()
  const brokenImages: Array<{
    id: string
    url: string
    product_id: string
    table: string
  }> = []

  try {
    console.log(`🔍 [Scan] Scanning for broken images...`)
    
    // Check product_images table
    const { data: productImages } = await supabase
      .from('product_images')
      .select('id, url, product_id')
      .not('url', 'is', null)

    if (productImages) {
      for (const image of productImages) {
        const verification = await verifyFileExists(image.url, 1)
        if (!verification.accessible) {
          console.warn(`⚠️ [Scan] Broken image found: ${image.url}`)
          brokenImages.push({
            ...image,
            table: 'product_images'
          })
        }
      }
    }

    console.log(`✅ [Scan] Found ${brokenImages.length} broken images`)
    return brokenImages
    
  } catch (error) {
    console.error(`❌ [Scan] Error:`, error)
    return brokenImages
  }
}





