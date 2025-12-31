'use client'

import { use, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import ImageUpload from '@/components/admin/ImageUpload'

interface Product {
  id: string
  name: string
}

interface ProductImage {
  id: string
  product_id: string
  variant_id: string | null
  url: string
  alt_text: string | null
  position: number
  is_primary: boolean
  created_at: string
}

export default function ProductImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchProduct()
    fetchImages()
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

  const handleImageUploaded = async (url: string) => {
    try {
      // Get next position
      const maxPosition = images.length > 0 ? Math.max(...images.map(img => img.position)) : -1

      const { error } = await supabase
        .from('product_images')
        .insert([
          {
            product_id: id,
            url,
            alt_text: product?.name || null,
            position: maxPosition + 1,
            is_primary: images.length === 0, // First image is primary
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
        .eq('product_id', params.id)

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
      // Delete from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId)

      if (error) throw error

      // TODO: Also delete from storage if needed
      // Extract file path from URL and delete from bucket

      fetchImages()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  const handleMoveImage = async (imageId: string, direction: 'up' | 'down') => {
    const currentIndex = images.findIndex(img => img.id === imageId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= images.length) return

    try {
      // Swap positions
      const currentImage = images[currentIndex]
      const otherImage = images[newIndex]

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
          href={`/admin/products/${params.id}/edit`}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-brand-primary mb-2">{images.length}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Totaal Afbeeldingen</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {images.filter(img => img.is_primary).length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Primaire Afbeelding</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-gray-800 mb-2">
            {images.filter(img => img.alt_text).length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Met Alt Text</div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white border-2 border-gray-200 p-6 mb-8">
        <h3 className="text-xl font-bold mb-4">Nieuwe Afbeelding Uploaden</h3>
        <ImageUpload
          bucket="product-images"
          path={`products/${params.id}`}
          onUploadComplete={handleImageUploaded}
          maxSizeMB={5}
        />
      </div>

      {/* Images Grid */}
      <div className="bg-white border-2 border-gray-200">
        {images.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Nog geen afbeeldingen</h3>
            <p className="text-gray-500">Upload je eerste productfoto hierboven!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {images.map((image, index) => (
              <div key={image.id} className="bg-white border-2 border-gray-200 overflow-hidden group">
                {/* Image Preview */}
                <div className="relative aspect-square bg-gray-100">
                  <Image
                    src={image.url}
                    alt={image.alt_text || 'Product image'}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Primary Badge */}
                  {image.is_primary && (
                    <div className="absolute top-2 left-2 bg-brand-primary text-white px-3 py-1 text-xs font-bold uppercase">
                      Primair
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
                        disabled={index === images.length - 1}
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

