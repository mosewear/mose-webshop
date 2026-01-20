/**
 * App Providers
 * PostHog analytics provider with automatic pageview tracking
 */

'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from '@/lib/posthog-client'

/**
 * Track pageviews automatically when route changes
 */
export function PostHogPageview(): null {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname && typeof window !== 'undefined') {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      
      // Track pageview in PostHog
      if (posthog.__loaded) {
        posthog.capture('$pageview', {
          $current_url: url,
        })
      }
    }
  }, [pathname, searchParams])

  return null
}

/**
 * PostHog provider wrapper
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PostHogPageview />
      {children}
    </>
  )
}

