'use client'

import { use, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import MediaUpload from '@/components/admin/MediaUpload'

interface Product {
  id: string
  name: string
}

interface ProductImage {
  id: string
  product_id: string
  variant_id: string | null
  color: string | null
  url: string
  alt_text: string | null
  position: number
  is_primary: boolean
  media_type: 'image' | 'video'
  video_thumbnail_url?: string | null
  created_at: string
}

interface ProductVariant {
  id: string
  color: string
  color_hex: string | null
}

export default function ProductImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedColor, setSelectedColor] = useState<string | null>(null) // null = algemene afbeeldingen
  const supabase = createClient()

  useEffect(() => {
    fetchProduct()
    fetchImages()
    fetchVariants()
  }, [id])

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', id)
        .single()

      if (error) throw error
      setProduct(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const fetchImages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('position')
        .order('created_at')

      if (error) throw error
      setImages(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchVariants = async () => {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, color, color_hex')
        .eq('product_id', id)

      if (error) throw error
      
      // Get unique colors
      const uniqueColors = Array.from(
        new Map((data || []).map(v => [v.color, v])).values()
      )
      setVariants(uniqueColors)
    } catch (err: any) {
      console.error('Error fetching variants:', err)
    }
  }

  // Get filtered images based on selected color
  const getFilteredImages = () => {
    if (selectedColor === null) {
      // Show general images (no color assigned)
      return images.filter(img => !img.color)
    }
    return images.filter(img => img.color === selectedColor)
  }

  const filteredImages = getFilteredImages()

  const handleMediaUploaded = async (url: string, mediaType: 'image' | 'video') => {
    try {
      // Get next position for current color filter
      const relevantImages = selectedColor === null 
        ? images.filter(img => !img.color)
        : images.filter(img => img.color === selectedColor)
      const maxPosition = relevantImages.length > 0 ? Math.max(...relevantImages.map(img => img.position)) : -1

      // Check if this is the first general image (should be primary)
      const generalImages = images.filter(img => !img.color)
      const isPrimary = selectedColor === null && generalImages.length === 0

      const { error } = await supabase
        .from('product_images')
        .insert([
          {
            product_id: id,
            url,
            media_type: mediaType,
            alt_text: product?.name ? `${product.name}${selectedColor ? ` - ${selectedColor}` : ''}` : null,
            position: maxPosition + 1,
            is_primary: isPrimary,
            color: selectedColor, // null for general, color name for color-specific
          },
        ])

      if (error) throw error
      fetchImages()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const handleSetPrimary = async (imageId: string) => {
    try {
      // Unset all primary flags
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', id)

      // Set selected as primary
      const { error } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId)

      if (error) throw error
      fetchImages()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const handleUpdateAltText = async (imageId: string, altText: string) => {
    try {
      const { error } = await supabase
        .from('product_images')
        .update({ alt_text: altText || null })
        .eq('id', imageId)

      if (error) throw error
      fetchImages()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Weet je zeker dat je deze afbeelding wilt verwijderen?')) return

    try {
      // Extract file path from URL and delete from storage
      // URL format: https://project.supabase.co/storage/v1/object/public/bucket/path
      if (imageUrl.includes('/storage/v1/object/public/')) {
        const urlParts = imageUrl.split('/storage/v1/object/public/')
        if (urlParts.length > 1) {
          const pathParts = urlParts[1].split('/')
          const bucket = pathParts[0]
          const filePath = pathParts.slice(1).join('/')

          // Delete from Supabase Storage
          const { error: storageError } = await supabase.storage
            .from(bucket)
            .remove([filePath])

          if (storageError) {
            console.error('Error deleting from storage:', storageError)
            // Continue anyway - database deletion is more important
          }
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId)

      if (error) throw error

      fetchImages()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const handleMoveImage = async (imageId: string, direction: 'up' | 'down') => {
    // Use filtered images for position swapping
    const currentIndex = filteredImages.findIndex(img => img.id === imageId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= filteredImages.length) return

    try {
      // Swap positions
      const currentImage = filteredImages[currentIndex]
      const otherImage = filteredImages[newIndex]

      await supabase
        .from('product_images')
        .update({ position: otherImage.position })
        .eq('id', currentImage.id)

      await supabase
        .from('product_images')
        .update({ position: currentImage.position })
        .eq('id', otherImage.id)

      fetchImages()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/admin/products/${id}/edit`}
          className="p-2 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Product Afbeeldingen</h1>
          {product && <p className="text-gray-600">{product.name}</p>}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-brand-primary mb-2">{images.length}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Totaal Media</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {images.filter(img => img.media_type === 'image').length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Afbeeldingen</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-red-600 mb-2">
            {images.filter(img => img.media_type === 'video').length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Video's</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {variants.length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Kleuren</div>
        </div>
      </div>

      {/* Color Tabs */}
      <div className="bg-white border-2 border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedColor(null)}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all ${
              selectedColor === null
                ? 'bg-brand-primary border-brand-primary text-white'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            📷 Algemeen ({images.filter(img => !img.color).length})
          </button>
          {variants.map((variant) => (
            <button
              key={variant.color}
              onClick={() => setSelectedColor(variant.color)}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 transition-all flex items-center gap-2 ${
                selectedColor === variant.color
                  ? 'bg-brand-primary border-brand-primary text-white'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {variant.color_hex && (
                <span
                  className="w-4 h-4 rounded border border-gray-400"
                  style={{ backgroundColor: variant.color_hex }}
                />
              )}
              {variant.color} ({images.filter(img => img.color === variant.color).length})
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-gray-500">
          💡 <strong>Algemeen:</strong> Wordt getoond als fallback voor alle kleuren. 
          <strong> Kleur-specifiek:</strong> Wordt alleen getoond als die kleur is geselecteerd.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white border-2 border-gray-200 p-6 mb-8">
        <h3 className="text-xl font-bold mb-2">
          Nieuwe Media Uploaden
          {selectedColor && (
            <span className="ml-2 text-brand-primary">voor {selectedColor}</span>
          )}
          {selectedColor === null && (
            <span className="ml-2 text-gray-500">(algemeen)</span>
          )}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {selectedColor 
            ? `Deze media wordt alleen getoond als kleur "${selectedColor}" is geselecteerd.`
            : 'Algemene media wordt getoond als fallback voor alle kleuren.'}
        </p>
        <MediaUpload
          onUploadComplete={handleMediaUploaded}
          acceptVideo={true}
          maxSizeMB={100}
        />
      </div>

      {/* Images Grid */}
      <div className="bg-white border-2 border-gray-200">
        {filteredImages.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-700 mb-2">
              {selectedColor 
                ? `Nog geen afbeeldingen voor ${selectedColor}`
                : 'Nog geen algemene afbeeldingen'}
            </h3>
            <p className="text-gray-500">
              {selectedColor 
                ? `Upload afbeeldingen specifiek voor de kleur ${selectedColor}`
                : 'Upload algemene productfoto\'s die voor alle kleuren worden getoond'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredImages.map((image, index) => (
              <div key={image.id} className="bg-white border-2 border-gray-200 overflow-hidden group">
                {/* Media Preview */}
                <div className="relative aspect-square bg-gray-100">
                  {image.media_type === 'video' ? (
                    <video
                      src={image.url}
                      controls
                      className="w-full h-full object-contain bg-black"
                      preload="metadata"
                    />
                  ) : (
                    <Image
                      src={image.url}
                      alt={image.alt_text || 'Product image'}
                      fill
                      className="object-cover"
                    />
                  )}
                  
                  {/* Media Type Badge */}
                  {image.media_type === 'video' && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white px-3 py-1 text-xs font-bold uppercase flex items-center gap-1">
                      🎬 VIDEO
                    </div>
                  )}
                  
                  {/* Primary Badge */}
                  {image.is_primary && (
                    <div className={`absolute ${image.media_type === 'video' ? 'top-12' : 'top-2'} left-2 bg-brand-primary text-white px-3 py-1 text-xs font-bold uppercase`}>
                      Primair
                    </div>
                  )}

                  {/* Color Badge */}
                  {image.color && (
                    <div className="absolute bottom-2 left-2 bg-purple-600 text-white px-2 py-1 text-xs font-bold uppercase">
                      {image.color}
                    </div>
                  )}

                  {/* Position Badge */}
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 text-xs font-bold">
                    #{index + 1}
                  </div>
                </div>

                {/* Controls */}
                <div className="p-4 space-y-3">
                  {/* Alt Text */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                      Alt Text
                    </label>
                    <input
                      type="text"
                      value={image.alt_text || ''}
                      onChange={(e) => handleUpdateAltText(image.id, e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm"
                      placeholder="Beschrijving van afbeelding"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {!image.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(image.id)}
                        className="flex-1 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-3 text-xs uppercase tracking-wider transition-colors"
                      >
                        Stel in als primair
                      </button>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMoveImage(image.id, 'up')}
                        disabled={index === 0}
                        className="p-2 border-2 border-gray-300 hover:border-brand-primary hover:bg-brand-primary hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Naar boven"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => handleMoveImage(image.id, 'down')}
                        disabled={index === filteredImages.length - 1}
                        className="p-2 border-2 border-gray-300 hover:border-brand-primary hover:bg-brand-primary hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Naar beneden"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteImage(image.id, image.url)}
                        className="p-2 border-2 border-red-300 hover:bg-red-600 hover:border-red-600 text-red-600 hover:text-white transition-colors"
                        title="Verwijderen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

