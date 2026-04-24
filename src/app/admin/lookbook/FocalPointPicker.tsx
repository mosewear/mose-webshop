'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Crosshair } from 'lucide-react'

interface FocalPointPickerProps {
  imageUrl: string
  focalX: number
  focalY: number
  onChange: (x: number, y: number) => void
  alt?: string
}

/**
 * Click-on-image focal-point picker used in the lookbook chapter editor.
 *
 * The picker stores focal coordinates as integer percentages 0-100, which
 * the public renderer feeds straight into `object-position: X% Y%` on the
 * hero `<Image>`. This keeps image cropping predictable on every
 * aspect ratio (wide / split / mobile 4:5).
 *
 * UX notes
 * - Single-tap/click anywhere on the image to move the crosshair to that
 *   spot. Preview is immediate; parent commits the value via onChange.
 * - Reset button snaps back to the traditional 50/50 center crop.
 * - Touch-target friendly: the marker is 32px regardless of zoom.
 * - Respects MOSE's brutalist style: 2px black border, solid black/white
 *   crosshair, no shadows or gradients.
 */
export default function FocalPointPicker({
  imageUrl,
  focalX,
  focalY,
  onChange,
  alt = 'Hero',
}: FocalPointPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)

  if (!imageUrl) {
    return (
      <div className="aspect-[16/9] border-2 border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-500 bg-gray-50">
        Selecteer eerst een afbeelding om het focuspunt te bepalen
      </div>
    )
  }

  const pickFromEvent = (clientX: number, clientY: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const rawX = ((clientX - rect.left) / rect.width) * 100
    const rawY = ((clientY - rect.top) / rect.height) * 100
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
    onChange(clamp(rawX), clamp(rawY))
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative aspect-[16/9] border-2 border-black overflow-hidden bg-black cursor-crosshair select-none touch-none"
        onMouseDown={(e) => {
          setDragging(true)
          pickFromEvent(e.clientX, e.clientY)
        }}
        onMouseMove={(e) => {
          if (!dragging) return
          pickFromEvent(e.clientX, e.clientY)
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={(e) => {
          const t = e.touches[0]
          if (t) pickFromEvent(t.clientX, t.clientY)
        }}
        onTouchMove={(e) => {
          const t = e.touches[0]
          if (t) pickFromEvent(t.clientX, t.clientY)
        }}
      >
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-cover pointer-events-none"
          style={{ objectPosition: `${focalX}% ${focalY}%` }}
          unoptimized
        />
        {/* Crosshair marker */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${focalX}%`,
            top: `${focalY}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 border-2 border-white" />
            <div className="absolute inset-[3px] border-2 border-black" />
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white -translate-x-1/2" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-600 flex items-center gap-1.5">
          <Crosshair size={14} />
          Klik of sleep om het focuspunt te kiezen (<span className="font-bold">{focalX}</span>
          % / <span className="font-bold">{focalY}</span>%)
        </p>
        <button
          type="button"
          onClick={() => onChange(50, 50)}
          className="text-xs font-bold uppercase tracking-wider border-2 border-black px-3 py-1 hover:bg-black hover:text-white transition-colors"
        >
          Reset naar midden
        </button>
      </div>
    </div>
  )
}
