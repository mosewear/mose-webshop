'use client'

import { useState, useEffect, useRef } from 'react'

interface DualRangeSliderProps {
  min: number
  max: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  step?: number
}

export default function DualRangeSlider({ 
  min, 
  max, 
  value, 
  onChange,
  step = 1
}: DualRangeSliderProps) {
  const [localValue, setLocalValue] = useState(value)
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleMove = (clientX: number) => {
    if (!sliderRef.current || !isDragging) return

    const rect = sliderRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const rawValue = min + percentage * (max - min)
    const steppedValue = Math.round(rawValue / step) * step

    let newValue: [number, number] = [...localValue]

    if (isDragging === 'min') {
      newValue[0] = Math.min(steppedValue, localValue[1] - step)
    } else {
      newValue[1] = Math.max(steppedValue, localValue[0] + step)
    }

    newValue[0] = Math.max(min, Math.min(max, newValue[0]))
    newValue[1] = Math.max(min, Math.min(max, newValue[1]))

    setLocalValue(newValue)
  }

  const handleMouseDown = (handle: 'min' | 'max') => {
    setIsDragging(handle)
  }

  const handleMouseUp = () => {
    if (isDragging) {
      onChange(localValue)
      setIsDragging(null)
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX)
    }
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [isDragging, localValue])

  const minPercent = ((localValue[0] - min) / (max - min)) * 100
  const maxPercent = ((localValue[1] - min) / (max - min)) * 100

  return (
    <div className="space-y-4">
      {/* BRUTALIST Price Display - BOLD & IN YOUR FACE */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border-2 border-black bg-white p-3 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">MIN</div>
          <div className="text-xl md:text-2xl font-bold">€{localValue[0]}</div>
        </div>
        <div className="border-2 border-black bg-white p-3 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">MAX</div>
          <div className="text-xl md:text-2xl font-bold">€{localValue[1]}</div>
        </div>
      </div>

      {/* BRUTALIST Slider - THICK BORDERS */}
      <div className="py-6">
        {/* Min/Max Labels - Bold & Clear */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-gray-900">€{min}</span>
          <span className="text-xs font-bold text-gray-900">€{max}</span>
        </div>

        <div
          ref={sliderRef}
          className="relative h-3 bg-gray-200 border-2 border-black cursor-pointer"
          style={{ touchAction: 'none' }}
        >
          {/* Active Range - BRUTALIST GREEN */}
          <div
            className="absolute h-full bg-brand-primary"
            style={{
              left: `${minPercent}%`,
              width: `${maxPercent - minPercent}%`,
            }}
          />

          {/* Min Handle - SQUARE & BRUTAL */}
          <div
            className={`absolute top-1/2 w-8 h-8 md:w-10 md:h-10 bg-white border-2 border-black cursor-grab ${
              isDragging === 'min' ? 'cursor-grabbing scale-110 shadow-lg' : ''
            } transition-all hover:scale-110 hover:shadow-md active:cursor-grabbing flex items-center justify-center font-bold text-xs`}
            style={{
              left: `${minPercent}%`,
              transform: `translate(-50%, -50%) ${isDragging === 'min' ? 'scale(1.1)' : ''}`,
              touchAction: 'none',
            }}
            onMouseDown={() => handleMouseDown('min')}
            onTouchStart={() => handleMouseDown('min')}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={localValue[0]}
            aria-label="Minimum prijs"
            tabIndex={0}
          >
            {/* Left Arrow Icon */}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </div>

          {/* Max Handle - SQUARE & BRUTAL */}
          <div
            className={`absolute top-1/2 w-8 h-8 md:w-10 md:h-10 bg-white border-2 border-black cursor-grab ${
              isDragging === 'max' ? 'cursor-grabbing scale-110 shadow-lg' : ''
            } transition-all hover:scale-110 hover:shadow-md active:cursor-grabbing flex items-center justify-center font-bold text-xs`}
            style={{
              left: `${maxPercent}%`,
              transform: `translate(-50%, -50%) ${isDragging === 'max' ? 'scale(1.1)' : ''}`,
              touchAction: 'none',
            }}
            onMouseDown={() => handleMouseDown('max')}
            onTouchStart={() => handleMouseDown('max')}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={localValue[1]}
            aria-label="Maximum prijs"
            tabIndex={0}
          >
            {/* Right Arrow Icon */}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

