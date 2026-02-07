'use client'

import { Clock } from 'lucide-react'

interface PresaleBadgeProps {
  expectedDate?: string | null
  variant?: 'default' | 'large' | 'compact'
  className?: string
}

export default function PresaleBadge({ 
  expectedDate, 
  variant = 'default',
  className = '' 
}: PresaleBadgeProps) {
  const sizeClasses = {
    default: 'px-3 py-1.5 text-xs',
    large: 'px-4 py-2 text-sm',
    compact: 'px-2 py-1 text-[10px]'
  }

  return (
    <div 
      className={`
        inline-flex items-center gap-1.5 
        bg-brand-primary text-white
        font-bold uppercase tracking-wider
        border-2 border-black
        ${sizeClasses[variant]}
        ${className}
      `}
    >
      <Clock className="w-3 h-3" />
      <span>Presale</span>
      {expectedDate && variant !== 'compact' && (
        <span className="font-normal opacity-90">• {expectedDate}</span>
      )}
    </div>
  )
}

