'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Image as ImageIcon, Video as VideoIcon, Film } from 'lucide-react'
import Image from 'next/image'

interface MediaUploadProps {
  onUploadComplete: (url: string, mediaType: 'image' | 'video') => Promise<void>
  onRemove?: () => void
  currentUrl?: string | null
  currentMediaType?: 'image' | 'video'
  maxSizeMB?: number
  acceptVideo?: boolean  // Schakel video support in/uit
}

export default function MediaUpload({ 
  onUploadComplete,
  onRemove,
  currentUrl,
  currentMediaType = 'image',
  maxSizeMB = 100,  // Default 100MB voor video's
  acceptVideo = true
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const supabase = createClient()

  const uploadMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setError('')
      setUploadProgress(0)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Selecteer een bestand')
      }

      const file = event.target.files[0]
      
      // Determine media type
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')

      if (!isImage && !isVideo) {
        throw new Error('Alleen afbeeldingen en video\'s zijn toegestaan')
      }

      if (isVideo && !acceptVideo) {
        throw new Error('Video\'s zijn niet toegestaan')
      }

      // Validate file size
      const maxBytes = maxSizeMB * 1024 * 1024
      if (file.size > maxBytes) {
        throw new Error(`Bestand is te groot (max ${maxSizeMB}MB)`)
      }

      // Determine bucket and folder
      const bucket = isVideo ? 'videos' : 'images'
      const folder = isVideo ? 'products' : 'products'
      
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      // Call callback with media type
      await onUploadComplete(publicUrl, isVideo ? 'video' : 'image')
      
      setUploadProgress(100)
    } catch (error: any) {
      console.error('Error uploading media:', error)
      setError(error.message || 'Fout bij uploaden')
    } finally {
      setUploading(false)
    }
  }

  const removeMedia = async () => {
    if (!currentUrl) return

    try {
      // Determine bucket from URL
      const isVideo = currentUrl.includes('/videos/')
      const bucket = isVideo ? 'videos' : 'images'
      
      // Extract path from URL
      const urlParts = currentUrl.split(`/storage/v1/object/public/${bucket}/`)
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        
        // Delete from Supabase Storage
        const { error } = await supabase.storage
          .from(bucket)
          .remove([filePath])

        if (error) {
          console.error('Error deleting media:', error)
        }
      }

      if (onRemove) {
        onRemove()
      }
    } catch (error) {
      console.error('Error removing media:', error)
    }
  }

  // Determine accept types
  const acceptTypes = acceptVideo 
    ? 'image/*,video/mp4,video/webm,video/quicktime'
    : 'image/*'

  return (
    <div className="space-y-4">
      {/* Current Media Preview */}
      {currentUrl && (
        <div className="relative w-full aspect-[3/4] max-w-xs border-2 border-black overflow-hidden bg-black">
          {currentMediaType === 'video' ? (
            <video
              src={currentUrl}
              controls
              className="w-full h-full object-contain"
              preload="metadata"
            />
          ) : (
            <Image
              src={currentUrl}
              alt="Product media"
              fill
              className="object-cover"
            />
          )}
          <button
            type="button"
            onClick={removeMedia}
            className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors border-2 border-black z-10"
          >
            <X size={16} />
          </button>
          {currentMediaType === 'video' && (
            <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 text-xs font-bold border border-white">
              VIDEO
            </div>
          )}
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
                <p className="text-sm text-gray-600">Uploaden... {uploadProgress}%</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {currentUrl ? (
                  <>
                    {currentMediaType === 'video' ? (
                      <VideoIcon className="w-8 h-8 text-gray-400" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                    <p className="text-sm font-bold text-gray-700">Klik om media te vervangen</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm font-bold text-gray-700">
                      {acceptVideo ? 'Upload afbeelding of video' : 'Upload afbeelding'}
                    </p>
                  </>
                )}
                <p className="text-xs text-gray-500">
                  {acceptVideo 
                    ? 'JPG, PNG, WEBP, MP4, WEBM (max 100MB)' 
                    : 'JPG, PNG, WEBP (max 5MB)'}
                </p>
              </div>
            )}
          </div>
          <input
            type="file"
            accept={acceptTypes}
            onChange={uploadMedia}
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
      {acceptVideo && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <ImageIcon size={12} /> <strong>Afbeeldingen:</strong> 3:4 ratio aanbevolen (bijv. 1200x1600px)
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Film size={12} /> <strong>Video's:</strong> MP4 of WEBM, max 100MB, 9:16 of 3:4 ratio
          </p>
        </div>
      )}
    </div>
  )
}





