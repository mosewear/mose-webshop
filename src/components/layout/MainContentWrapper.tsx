'use client'

import { useEffect } from 'react'

export default function MainContentWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('header')
      if (header) {
        const height = header.offsetHeight
        document.documentElement.style.setProperty('--header-total-height', `${height}px`)
      }
    }

    // Update on mount, resize, and when banner changes
    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)
    
    const observer = new MutationObserver(updateHeaderHeight)
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    })

    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
      observer.disconnect()
    }
  }, [])

  return <main>{children}</main>
}

