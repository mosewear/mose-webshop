'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ImageUploadProps {
  bucket: string
  path?: string
  onUploadComplete: (url: string) => void
  maxSizeMB?: number
  accept?: string
}

export default function ImageUpload({
  bucket,
  path = '',
  onUploadComplete,
  maxSizeMB = 5,
  accept = 'image/*',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset
    setError('')
    setProgress(0)

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
      setError(`Bestand is te groot (max ${maxSizeMB}MB)`)
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Alleen afbeeldingen zijn toegestaan')
      return
    }

    try {
      setUploading(true)

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = path ? `${path}/${fileName}` : fileName

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      setProgress(100)
      onUploadComplete(publicUrl)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full">
      <label className="block cursor-pointer">
        <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          uploading
            ? 'border-brand-primary bg-brand-primary/5'
            : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'
        }`}>
          {uploading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto" />
              <p className="text-sm font-semibold text-brand-primary">Uploaden... {progress}%</p>
            </div>
          ) : (
            <>
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Klik om een afbeelding te uploaden
              </p>
              <p className="text-xs text-gray-500">
                Of sleep een bestand hierheen (max {maxSizeMB}MB)
              </p>
            </>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </label>

      {error && (
        <div className="mt-2 text-sm text-red-600 font-semibold">
          {error}
        </div>
      )}
    </div>
  )
}

