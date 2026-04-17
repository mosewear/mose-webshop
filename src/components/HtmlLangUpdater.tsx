'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Updates <html lang> based on the URL locale prefix (/nl or /en).
 * Needed because the root layout must stay fully static (no headers()/cookies())
 * so that ISR/SSG pages like /[locale]/product/[slug] can be pre-rendered.
 */
export default function HtmlLangUpdater() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof document === 'undefined') return
    const first = pathname?.split('/').filter(Boolean)[0]
    const lang = first === 'en' ? 'en' : 'nl'
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang
    }
  }, [pathname])

  return null
}
