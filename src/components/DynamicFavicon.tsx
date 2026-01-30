'use client'

import { useEffect } from 'react'

export default function DynamicFavicon({ faviconUrl }: { faviconUrl: string }) {
  useEffect(() => {
    // Remove existing favicon links
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]')
    existingFavicons.forEach(link => link.remove())

    // Add new favicon with cache-busting timestamp
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/x-icon'
    link.href = `${faviconUrl}?v=${Date.now()}`
    document.head.appendChild(link)

    console.log('🎨 Favicon updated:', faviconUrl)
  }, [faviconUrl])

  return null
}

