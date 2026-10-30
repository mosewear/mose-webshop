'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('shop')
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

    const newValue: [number, number] = [...localValue]

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

  const handleKeyDown = (event: React.KeyboardEvent, handle: 'min' | 'max') => {
    const directions: Record<string, number> = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step, PageDown: -step * 10, PageUp: step * 10 }
    if (!(event.key in directions) && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const index = handle === 'min' ? 0 : 1
    const next: [number, number] = [...localValue]
    const requested = event.key === 'Home' ? min : event.key === 'End' ? max : next[index] + directions[event.key]
    next[index] = handle === 'min' ? Math.max(min, Math.min(requested, next[1] - step)) : Math.min(max, Math.max(requested, next[0] + step))
    setLocalValue(next)
    onChange(next)
  }

  const minPercent = ((localValue[0] - min) / Math.max(1, max - min)) * 100
  const maxPercent = ((localValue[1] - min) / Math.max(1, max - min)) * 100

  return (
    <div className="py-2 px-2">
      {/* Slider Container */}
      <div className="relative pt-6 pb-2">
        {/* Slider Track */}
        <div
          ref={sliderRef}
          className="relative h-1 bg-gray-200 border-2 border-black cursor-pointer"
          style={{ touchAction: 'none' }}
        >
          {/* Active Range */}
          <div
            className="absolute h-full bg-brand-primary"
            style={{
              left: `${minPercent}%`,
              width: `${maxPercent - minPercent}%`,
            }}
          />

          {/* Min Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              left: `${minPercent}%`,
              transform: `translate(-50%, -50%)`,
            }}
          >
            {/* Price Label Above Handle */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-bold text-black">
                €{localValue[0]}
              </span>
            </div>
            
            {/* Handle Square */}
            <div
              className={`w-5 h-5 bg-white border-2 border-black cursor-grab transition-transform ${
                isDragging === 'min' ? 'cursor-grabbing scale-110' : 'hover:scale-110'
              }`}
              onMouseDown={() => handleMouseDown('min')}
              onTouchStart={() => handleMouseDown('min')}
              onKeyDown={event => handleKeyDown(event, 'min')}
              role="slider"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={localValue[0]}
              aria-label={t('priceMin')}
              tabIndex={0}
              style={{ touchAction: 'none' }}
            />
          </div>

          {/* Max Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              left: `${maxPercent}%`,
              transform: `translate(-50%, -50%)`,
            }}
          >
            {/* Price Label Above Handle */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-bold text-black">
                €{localValue[1]}
              </span>
            </div>
            
            {/* Handle Square */}
            <div
              className={`w-5 h-5 bg-white border-2 border-black cursor-grab transition-transform ${
                isDragging === 'max' ? 'cursor-grabbing scale-110' : 'hover:scale-110'
              }`}
              onMouseDown={() => handleMouseDown('max')}
              onTouchStart={() => handleMouseDown('max')}
              onKeyDown={event => handleKeyDown(event, 'max')}
              role="slider"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={localValue[1]}
              aria-label={t('priceMax')}
              tabIndex={0}
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>

        {/* Min/Max Range Labels Below */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500 font-semibold">€{min}</span>
          <span className="text-xs text-gray-500 font-semibold">€{max}</span>
        </div>
      </div>
    </div>
  )
}

