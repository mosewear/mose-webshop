'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPixelEvent } from '@/lib/facebook-pixel'

/** Next navigation does not reload the document. Count each actual route once,
 * including the landing route when consent arrives after hydration. */
export default function MetaPageTracking() {
  const pathname = usePathname()
  const last = useRef('')
  useEffect(() => {
    const track = () => {
      if (!/^\/(nl|en)(\/|$)/.test(pathname)) return
      if (last.current === pathname) return
      if (trackPixelEvent('PageView')) last.current = pathname
    }
    track()
    window.addEventListener('mose-tracking-enabled', track)
    return () => window.removeEventListener('mose-tracking-enabled', track)
  }, [pathname])
  return null
}
