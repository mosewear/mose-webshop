'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadProps {
  // For simple category uploads (legacy)
  currentImageUrl?: string | null
  onImageUploaded?: (url: string) => void
  onImageRemoved?: () => void
  folder?: string
  
  // For advanced product uploads (new)
  bucket?: string
  path?: string
  onUploadComplete?: (url: string) => Promise<void>
  maxSizeMB?: number
}

export default function ImageUpload({ 
  currentImageUrl, 
  onImageUploaded, 
  onImageRemoved,
  folder = 'categories',
  bucket,
  path,
  onUploadComplete,
  maxSizeMB = 2
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  
  // Determine which mode we're in
  const isLegacyMode = !bucket && !path && !onUploadComplete
  const targetBucket = bucket || 'images'
  const targetFolder = path || folder

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setError('')

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Je moet een afbeelding selecteren')
      }

      const file = event.target.files[0]
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Alleen afbeeldingen zijn toegestaan')
      }

      // Validate file size
      const maxBytes = maxSizeMB * 1024 * 1024
      if (file.size > maxBytes) {
        throw new Error(`Afbeelding is te groot (max ${maxSizeMB}MB)`)
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${targetFolder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(targetBucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(targetBucket)
        .getPublicUrl(data.path)

      // Call appropriate callback
      if (onUploadComplete) {
        await onUploadComplete(publicUrl)
      } else if (onImageUploaded) {
        onImageUploaded(publicUrl)
      }
    } catch (error: any) {
      console.error('Error uploading image:', error)
      setError(error.message || 'Fout bij uploaden van afbeelding')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = async () => {
    if (!currentImageUrl) return

    try {
      // Extract path from URL
      const urlParts = currentImageUrl.split(`/storage/v1/object/public/${targetBucket}/`)
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        
        // Delete from Supabase Storage
        const { error } = await supabase.storage
          .from(targetBucket)
          .remove([filePath])

        if (error) {
          console.error('Error deleting image:', error)
        }
      }

      if (onImageRemoved) {
        onImageRemoved()
      }
    } catch (error) {
      console.error('Error removing image:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Current Image Preview */}
      {currentImageUrl && (
        <div className="relative w-full aspect-[3/4] max-w-xs border-2 border-black overflow-hidden">
          <Image
            src={currentImageUrl}
            alt="Category afbeelding"
            fill
            className="object-cover"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors border-2 border-black"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Upload Button */}
      <div>
        <label className="block cursor-pointer">
          <div className={`
            border-2 border-dashed border-gray-300 p-6 text-center
            hover:border-brand-primary hover:bg-brand-primary/5
            transition-colors
            ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}>
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
                <p className="text-sm text-gray-600">Uploaden...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {currentImageUrl ? (
                  <>
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                    <p className="text-sm font-bold text-gray-700">Klik om afbeelding te vervangen</p>
                    <p className="text-xs text-gray-500">JPG, PNG, WEBP (max 5MB)</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm font-bold text-gray-700">Klik om afbeelding te uploaden</p>
                    <p className="text-xs text-gray-500">JPG, PNG, WEBP (max 5MB)</p>
                  </>
                )}
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={uploadImage}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-500 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500">
        💡 <strong>Tip:</strong> Gebruik een afbeelding met een aspect ratio van 3:4 voor het beste resultaat
      </p>
    </div>
  )
}
