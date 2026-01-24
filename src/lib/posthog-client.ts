/**
 * PostHog Analytics Client
 * Session recordings, heatmaps, and event tracking
 * EU server for GDPR compliance
 */

'use client'

import posthog from 'posthog-js'

// Initialize PostHog (client-side only)
if (typeof window !== 'undefined' && !posthog.__loaded) {
  try {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com'
    
    if (!key) {
      console.warn('[PostHog] ⚠️ No API key found. Set NEXT_PUBLIC_POSTHOG_KEY in .env.local')
    } else {
      posthog.init(key, {
        api_host: host,
        person_profiles: 'identified_only', // Only track identified users for better privacy
        capture_pageview: true, // Auto-capture pageviews
        capture_pageleave: true, // Track when users leave
        session_recording: {
          maskAllInputs: false, // Don't mask all inputs
          maskInputOptions: {
            password: true, // Always mask passwords
            email: false, // Don't mask emails (we need them for user identification)
          },
          recordCrossOriginIframes: false, // Don't record iframes for security
        },
        autocapture: true, // Auto-capture clicks
        enable_heatmaps: true, // Enable basic heatmaps
        disable_session_recording: false, // Enable session recordings
        loaded: (posthog) => {
          console.log('[PostHog] ✅ Loaded successfully')
          if (process.env.NODE_ENV === 'development') {
            console.log('[PostHog] 🔧 Running in development mode')
          }
        },
      })
    }
  } catch (error) {
    console.warn('[PostHog] ⚠️ Failed to load (likely ad blocker):', error)
    // Continue without PostHog - Supabase tracking will still work
  }
}

export default posthog


