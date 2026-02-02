'use client'

import { useEffect, useState } from 'react'

export default function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const [headerHeight, setHeaderHeight] = useState(0)

  useEffect(() => {
    const calculatePadding = () => {
      // Get the actual header element height
      const header = document.querySelector('header')
      if (header) {
        const height = header.offsetHeight
        setHeaderHeight(height)
      }
    }

    // Calculate on mount and resize
    calculatePadding()
    window.addEventListener('resize', calculatePadding)

    // Also recalculate when banner appears/disappears
    const observer = new MutationObserver(calculatePadding)
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    })

    return () => {
      window.removeEventListener('resize', calculatePadding)
      observer.disconnect()
    }
  }, [])

  return (
    <main style={{ paddingTop: `${headerHeight}px` }}>
      {children}
    </main>
  )
}

