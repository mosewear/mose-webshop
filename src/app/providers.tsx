/**
 * App Providers
 * PostHog analytics provider with automatic pageview tracking
 */

'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from '@/lib/posthog-client'

/**
 * Track pageviews automatically when route changes (inner component)
 */
function PostHogPageviewInner(): null {
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
 * PostHog pageview tracker with Suspense boundary
 */
export function PostHogPageview() {
  return (
    <Suspense fallback={null}>
      <PostHogPageviewInner />
    </Suspense>
  )
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

