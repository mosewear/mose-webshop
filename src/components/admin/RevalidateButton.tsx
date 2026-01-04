'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function RevalidateButton() {
  const [isRevalidating, setIsRevalidating] = useState(false)
  const [message, setMessage] = useState('')

  const handleRevalidate = async () => {
    setIsRevalidating(true)
    setMessage('')

    try {
      const response = await fetch('/api/revalidate-homepage', { 
        method: 'POST' 
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage('✅ Homepage wordt opnieuw gebouwd! (~10 seconden)')
        setTimeout(() => setMessage(''), 5000)
      } else {
        setMessage('❌ Revalidatie mislukt')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error('Revalidate error:', error)
      setMessage('❌ Network error')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsRevalidating(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleRevalidate}
        disabled={isRevalidating}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white font-bold uppercase tracking-wider hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-2 border-black active:scale-95"
      >
        <RefreshCw className={`w-4 h-4 ${isRevalidating ? 'animate-spin' : ''}`} />
        {isRevalidating ? 'Rebuilding...' : 'Force Rebuild'}
      </button>
      
      {message && (
        <span className={`text-sm font-semibold ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </span>
      )}
    </div>
  )
}

