'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, Sparkles, Save, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadAndVerify } from '@/lib/storage-utils'
import Image from 'next/image'

interface VideoThumbnailEditorProps {
  imageId: string
  videoUrl: string
  currentThumbnailUrl?: string | null
  onClose: () => void
  onSaved: () => void
}

export default function VideoThumbnailEditor({
  imageId,
  videoUrl,
  currentThumbnailUrl,
  onClose,
  onSaved,
}: VideoThumbnailEditorProps) {
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    currentThumbnailUrl || null
  )
  const [mode, setMode] = useState<'auto' | 'picker' | 'upload'>('auto')
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const supabase = createClient()

  useEffect(() => {
    // Auto-generate thumbnail from first frame on mount if no thumbnail exists
    if (!currentThumbnailUrl && videoRef.current && mode === 'auto') {
      const video = videoRef.current
      video.currentTime = 0
      
      const handleLoadedData = () => {
        captureFrame()
      }
      
      video.addEventListener('loadeddata', handleLoadedData)
      return () => video.removeEventListener('loadeddata', handleLoadedData)
    }
  }, [])

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current
      const handleLoadedMetadata = () => {
        setDuration(video.duration)
      }
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  const captureFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (!video || !canvas) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to preview URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setThumbnailPreview(dataUrl)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    
    if (videoRef.current) {
      videoRef.current.currentTime = time
      
      // Capture frame after seeking
      videoRef.current.addEventListener('seeked', () => {
        captureFrame()
      }, { once: true })
    }
  }

  const handleFrameStep = (direction: 'prev' | 'next') => {
    if (!videoRef.current) return
    
    const video = videoRef.current
    const step = 1 / 30 // Approximate 1 frame at 30fps
    const newTime = direction === 'prev' 
      ? Math.max(0, video.currentTime - step)
      : Math.min(duration, video.currentTime + step)
    
    video.currentTime = newTime
    setCurrentTime(newTime)
    
    video.addEventListener('seeked', () => {
      captureFrame()
    }, { once: true })
  }

  const handleUploadCustom = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate image
    if (!file.type.startsWith('image/')) {
      alert('Alleen afbeeldingen zijn toegestaan')
      return
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Afbeelding is te groot (max 10MB)')
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setThumbnailPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!thumbnailPreview) {
      alert('Geen thumbnail om op te slaan')
      return
    }

    setLoading(true)

    try {
      // Convert data URL to blob
      const response = await fetch(thumbnailPreview)
      const blob = await response.blob()
      
      // Create file from blob
      const file = new File(
        [blob],
        `video-thumbnail-${imageId}-${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      )

      // Upload to Supabase Storage
      const fileName = `video-thumbnails/${imageId}-${Date.now()}.jpg`
      const result = await uploadAndVerify('product-images', fileName, file)

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed')
      }

      // Update database via API
      const apiResponse = await fetch('/api/admin/video-thumbnail/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId,
          thumbnailUrl: result.url,
        }),
      })

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json()
        throw new Error(errorData.error || 'Failed to update thumbnail')
      }

      alert('✅ Thumbnail succesvol opgeslagen!')
      onSaved()
      onClose()
    } catch (error: any) {
      console.error('Error saving thumbnail:', error)
      alert(`Fout bij opslaan: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = () => {
    setBrightness(100)
    setContrast(100)
    setCurrentTime(0)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
    captureFrame()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-200">
          <div>
            <h2 className="text-2xl font-bold">Video Thumbnail Bewerken</h2>
            <p className="text-sm text-gray-600 mt-1">
              Kies een frame uit de video of upload een eigen thumbnail
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b-2 border-gray-200 px-6">
          <button
            onClick={() => setMode('auto')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors border-b-2 -mb-0.5 flex items-center gap-2 ${
              mode === 'auto'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Auto-generate
          </button>
          <button
            onClick={() => setMode('picker')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors border-b-2 -mb-0.5 ${
              mode === 'picker'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Kies Frame
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors border-b-2 -mb-0.5 flex items-center gap-2 ${
              mode === 'upload'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Custom
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Video/Preview */}
            <div className="space-y-4">
              <div className="bg-gray-100 aspect-video relative">
                {mode !== 'upload' ? (
                  <>
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      crossOrigin="anonymous"
                      preload="metadata"
                      className="w-full h-full object-contain"
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Upload className="w-16 h-16" />
                  </div>
                )}
              </div>

              {/* Frame Picker Controls */}
              {mode === 'picker' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={currentTime}
                      onChange={handleTimeChange}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFrameStep('prev')}
                      className="flex-1 px-4 py-2 border-2 border-gray-300 hover:border-black transition-colors text-sm font-bold"
                    >
                      ◀ Vorig Frame
                    </button>
                    <button
                      onClick={() => handleFrameStep('next')}
                      className="flex-1 px-4 py-2 border-2 border-gray-300 hover:border-black transition-colors text-sm font-bold"
                    >
                      Volgend Frame ▶
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Controls */}
              {mode === 'upload' && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <label className="inline-block px-6 py-3 bg-black text-white font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors cursor-pointer">
                    Selecteer Afbeelding
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadCustom}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-4">
                    Max 10MB • JPEG, PNG, WebP
                  </p>
                </div>
              )}
            </div>

            {/* Right: Preview & Adjustments */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Preview
                </h3>
                <div className="bg-gray-100 aspect-video relative border-2 border-gray-300">
                  {thumbnailPreview ? (
                    <Image
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      fill
                      className="object-contain"
                      style={{
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <p className="text-sm">Geen preview</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Adjustments */}
              {mode !== 'upload' && (
                <div className="space-y-4 p-4 bg-gray-50 border-2 border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Quick Adjustments
                  </h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Brightness: {brightness}%
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={brightness}
                      onChange={(e) => {
                        setBrightness(Number(e.target.value))
                        setTimeout(captureFrame, 50)
                      }}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Contrast: {contrast}%
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={contrast}
                      onChange={(e) => {
                        setContrast(Number(e.target.value))
                        setTimeout(captureFrame, 50)
                      }}
                      className="w-full"
                    />
                  </div>

                  <button
                    onClick={handleRegenerate}
                    className="w-full px-4 py-2 border-2 border-gray-300 hover:border-black transition-colors text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              {mode === 'auto' && (
                <div className="space-y-2 text-sm text-gray-600 p-4 bg-blue-50 border-2 border-blue-200">
                  <p className="font-bold text-blue-900">💡 Quick Actions</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Auto-generate gebruikt het eerste frame</li>
                    <li>• Pas brightness/contrast aan indien nodig</li>
                    <li>• Of kies een ander frame via "Kies Frame"</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-bold uppercase tracking-wide transition-colors"
          >
            Annuleren
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading || !thumbnailPreview}
            className="px-6 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Opslaan...' : 'Thumbnail Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}

