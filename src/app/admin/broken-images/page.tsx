'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, CheckCircle, Trash2, RefreshCw } from 'lucide-react'

interface BrokenImage {
  id: string
  url: string
  product_id: string
  product_name?: string
  table: string
  accessible: boolean
}

export default function BrokenImagesScanner() {
  const [scanning, setScanning] = useState(false)
  const [brokenImages, setBrokenImages] = useState<BrokenImage[]>([])
  const [fixing, setFixing] = useState(false)
  const [lastScan, setLastScan] = useState<Date | null>(null)

  const supabase = createClient()

  const scanForBrokenImages = async () => {
    setScanning(true)
    setBrokenImages([])
    
    try {
      console.log('🔍 Starting broken image scan...')
      
      // Get all product images
      const { data: productImages, error } = await supabase
        .from('product_images')
        .select(`
          id, 
          url, 
          product_id,
          products (name)
        `)
        .not('url', 'is', null)

      if (error) throw error

      const broken: BrokenImage[] = []

      // Check each image
      for (const image of productImages || []) {
        try {
          console.log(`🔍 Checking ${image.url}`)
          
          const response = await fetch(image.url, {
            method: 'HEAD',
            cache: 'no-cache',
          })

          const accessible = response.ok && response.status === 200

          if (!accessible) {
            console.warn(`⚠️ BROKEN: ${image.url} (Status: ${response.status})`)
            broken.push({
              id: image.id,
              url: image.url,
              product_id: image.product_id,
              product_name: (image.products as any)?.name || 'Unknown',
              table: 'product_images',
              accessible: false
            })
          } else {
            console.log(`✅ OK: ${image.url}`)
          }
        } catch (error) {
          console.error(`❌ Error checking ${image.url}:`, error)
          broken.push({
            id: image.id,
            url: image.url,
            product_id: image.product_id,
            product_name: (image.products as any)?.name || 'Unknown',
            table: 'product_images',
            accessible: false
          })
        }
      }

      setBrokenImages(broken)
      setLastScan(new Date())
      
      console.log(`✅ Scan complete. Found ${broken.length} broken images.`)
      
      if (broken.length === 0) {
        alert('✅ Geen broken images gevonden! Alles is in orde.')
      } else {
        alert(`⚠️ ${broken.length} broken image(s) gevonden. Bekijk de lijst hieronder.`)
      }
    } catch (error) {
      console.error('❌ Error scanning:', error)
      alert(`Fout bij scannen: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
    } finally {
      setScanning(false)
    }
  }

  const deleteBrokenImage = async (imageId: string) => {
    if (!confirm('Weet je zeker dat je deze broken image entry wilt verwijderen uit de database?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId)

      if (error) throw error

      // Remove from list
      setBrokenImages(prev => prev.filter(img => img.id !== imageId))
      
      alert('✅ Broken image entry verwijderd!')
    } catch (error) {
      console.error('❌ Error deleting:', error)
      alert(`Fout bij verwijderen: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
    }
  }

  const deleteAllBrokenImages = async () => {
    if (!confirm(`Weet je zeker dat je ALLE ${brokenImages.length} broken image entries wilt verwijderen?`)) {
      return
    }

    setFixing(true)
    let successCount = 0

    try {
      for (const image of brokenImages) {
        try {
          const { error } = await supabase
            .from('product_images')
            .delete()
            .eq('id', image.id)

          if (!error) {
            successCount++
          }
        } catch (error) {
          console.error(`❌ Failed to delete ${image.id}:`, error)
        }
      }

      alert(`✅ ${successCount}/${brokenImages.length} broken images verwijderd!`)
      setBrokenImages([])
      
    } catch (error) {
      console.error('❌ Error deleting all:', error)
      alert(`Fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🔍 Broken Images Scanner</h1>
        <p className="text-gray-600">
          Scan je database voor broken image URLs en ruim ze op.
        </p>
      </div>

      {/* Scan Button */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold mb-1">Start Scan</h2>
            <p className="text-sm text-gray-600">
              {lastScan 
                ? `Laatste scan: ${lastScan.toLocaleString('nl-NL')}`
                : 'Nog geen scan uitgevoerd'}
            </p>
          </div>
          <button
            onClick={scanForBrokenImages}
            disabled={scanning}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scannen...' : 'Start Scan'}
          </button>
        </div>
      </div>

      {/* Results */}
      {brokenImages.length > 0 ? (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h2 className="text-lg font-bold text-red-900">
                  {brokenImages.length} Broken Image{brokenImages.length !== 1 ? 's' : ''} Gevonden
                </h2>
                <p className="text-sm text-red-700">
                  Deze image URLs bestaan niet meer in Supabase Storage
                </p>
              </div>
            </div>
            <button
              onClick={deleteAllBrokenImages}
              disabled={fixing}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
            >
              <Trash2 className="w-4 h-4" />
              {fixing ? 'Verwijderen...' : 'Verwijder Alles'}
            </button>
          </div>

          {/* List */}
          <div className="space-y-3">
            {brokenImages.map((image) => (
              <div
                key={image.id}
                className="bg-white border border-red-300 rounded-lg p-4 flex items-start justify-between"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">
                    {image.product_name}
                  </p>
                  <p className="text-sm text-gray-600 break-all mb-2">
                    {image.url}
                  </p>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      Product ID: {image.product_id}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      Image ID: {image.id}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteBrokenImage(image.id)}
                  className="ml-4 p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title="Verwijder"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : lastScan && !scanning ? (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-lg font-bold text-green-900">
                ✅ Alles in orde!
              </h2>
              <p className="text-sm text-green-700">
                Geen broken images gevonden. Alle product images zijn toegankelijk.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold mb-2">ℹ️ Hoe werkt dit?</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Scant alle product_images in de database</li>
          <li>Controleert of elk image URL nog toegankelijk is via HTTP</li>
          <li>Toont broken images die een 404 of andere error geven</li>
          <li>Je kunt broken entries veilig verwijderen uit de database</li>
          <li>Producten blijven bestaan, alleen de broken image entries worden verwijderd</li>
        </ul>
      </div>
    </div>
  )
}




