/**
 * PostHog Analytics Client
 * Session recordings, heatmaps, and event tracking
 * EU server for GDPR compliance
 * ONLY loads after cookie consent given
 */

'use client'

import posthog from 'posthog-js'

let posthogInitialized = false

// Function to initialize PostHog (called after consent)
export function initPostHog() {
  if (typeof window === 'undefined' || posthogInitialized) return
  
  try {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com'
    
    if (!key) {
      console.warn('[PostHog] ⚠️ No API key found. Set NEXT_PUBLIC_POSTHOG_KEY in .env.local')
      return
    }
    
    posthog.init(key, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: {
          password: true,
          email: false,
        },
        recordCrossOriginIframes: false,
      },
      autocapture: true,
      enable_heatmaps: true,
      disable_session_recording: false,
      loaded: (posthog) => {
        console.log('[PostHog] ✅ Loaded successfully (after consent)')
        if (process.env.NODE_ENV === 'development') {
          console.log('[PostHog] 🔧 Running in development mode')
        }
      },
    })
    
    posthogInitialized = true
  } catch (error) {
    console.warn('[PostHog] ⚠️ Failed to load:', error)
  }
}

// Check consent on load
if (typeof window !== 'undefined') {
  const consent = localStorage.getItem('mose_cookie_consent')
  if (consent === 'all') {
    initPostHog()
  } else {
    // Listen for consent event
    window.addEventListener('mose-tracking-enabled', initPostHog)
  }
}

export default posthog






