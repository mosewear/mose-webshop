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
      // Min handle: can't go above max handle
      newValue[0] = Math.min(steppedValue, localValue[1] - step)
    } else {
      // Max handle: can't go below min handle
      newValue[1] = Math.max(steppedValue, localValue[0] + step)
    }

    // Clamp to bounds
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
      {/* Price Display */}
      <div className="flex items-center justify-between text-sm font-bold">
        <div className="px-3 py-2 border-2 border-black bg-white">
          €{localValue[0]}
        </div>
        <div className="px-2 text-gray-600">tot</div>
        <div className="px-3 py-2 border-2 border-black bg-white">
          €{localValue[1]}
        </div>
      </div>

      {/* Slider */}
      <div className="py-4">
        <div
          ref={sliderRef}
          className="relative h-2 bg-gray-200 border-2 border-black cursor-pointer"
          style={{ touchAction: 'none' }}
        >
          {/* Active Range */}
          <div
            className="absolute h-full bg-brand-primary border-l-2 border-r-2 border-black"
            style={{
              left: `${minPercent}%`,
              width: `${maxPercent - minPercent}%`,
            }}
          />

          {/* Min Handle */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 md:w-7 md:h-7 bg-white border-4 border-black cursor-grab ${
              isDragging === 'min' ? 'cursor-grabbing scale-110' : ''
            } transition-transform hover:scale-110 active:cursor-grabbing`}
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
          />

          {/* Max Handle */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 md:w-7 md:h-7 bg-white border-4 border-black cursor-grab ${
              isDragging === 'max' ? 'cursor-grabbing scale-110' : ''
            } transition-transform hover:scale-110 active:cursor-grabbing`}
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
          />
        </div>

        {/* Min/Max Labels */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-600 font-semibold">
          <span>€{min}</span>
          <span>€{max}</span>
        </div>
      </div>
    </div>
  )
}

