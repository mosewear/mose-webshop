'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NotificationBell() {
  const [isSupported, setIsSupported] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window
      setIsSupported(supported)
      
      if (supported) {
        const permission = Notification.permission
        setNotificationsEnabled(permission === 'granted')
        registerServiceWorker()
      }
    }
    
    checkSupport()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        // Check if there's already a working service worker
        const existingRegistrations = await navigator.serviceWorker.getRegistrations()
        const adminReg = existingRegistrations.find(reg => reg.scope.includes('/admin'))
        
        let registration: ServiceWorkerRegistration
        
        if (adminReg && (adminReg.active || adminReg.waiting)) {
          // Use existing working service worker
          console.log('[Admin PWA] Using existing service worker:', adminReg.scope)
          registration = adminReg
          
          // Try to update it in the background
          registration.update().catch(err => 
            console.warn('[Admin PWA] Could not update SW:', err)
          )
        } else {
          // No working SW found, clean up and register new one
          console.log('[Admin PWA] No working service worker found, registering new one')
          
          if (adminReg) {
            console.log('[Admin PWA] Unregistering broken service worker')
            await adminReg.unregister()
          }
          
          registration = await navigator.serviceWorker.register(
            '/admin-sw.js',
            { scope: '/admin/' }
          )
          console.log('[Admin PWA] Service Worker registered:', registration.scope)
          
          // Wait for new SW to activate
          if (!registration.active) {
            console.log('[Admin PWA] Waiting for service worker to activate...')
            await new Promise<void>((resolve) => {
              const checkActive = () => {
                if (registration.active) {
                  resolve()
                } else {
                  setTimeout(checkActive, 100)
                }
              }
              checkActive()
            })
          }
        }
        
        console.log('[Admin PWA] Service worker ready')
        
        // Store registration in state for later use
        setSwRegistration(registration)
        
        // Try to get existing subscription with timeout
        try {
          const getSubscriptionPromise = registration.pushManager.getSubscription()
          const timeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Get subscription timeout')), 2000)
          )
          
          const existing = await Promise.race([getSubscriptionPromise, timeoutPromise])
          
          if (existing) {
            console.log('[Admin PWA] Found existing subscription in browser')
            
            // Verify it still exists in the database
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              try {
                const response = await fetch(`/api/admin/push/check-subscription?userId=${user.id}`)
                const data = await response.json()
                
                if (data.exists) {
                  console.log('[Admin PWA] Subscription verified in database')
                  setSubscription(existing)
                  setNotificationsEnabled(true)
                } else {
                  console.log('[Admin PWA] Subscription not in database, removing from browser')
                  await existing.unsubscribe()
                  setSubscription(null)
                  setNotificationsEnabled(false)
                }
              } catch (apiError) {
                console.error('[Admin PWA] Error checking subscription in database:', apiError)
                setSubscription(null)
                setNotificationsEnabled(false)
              }
            }
          } else {
            console.log('[Admin PWA] No existing subscription found')
            setSubscription(null)
            setNotificationsEnabled(false)
          }
        } catch (subError) {
          console.warn('[Admin PWA] Could not get subscription (timeout or error):', subError)
          setSubscription(null)
          setNotificationsEnabled(false)
        }
      } catch (error) {
        console.error('[Admin PWA] Service Worker registration failed:', error)
        setSubscription(null)
        setNotificationsEnabled(false)
      }
    }
  }

  const requestNotificationPermission = async () => {
    if (!isSupported) {
      alert('Push notifications worden niet ondersteund in deze browser')
      return
    }

    setIsLoading(true)
    try {
      const permission = await Notification.requestPermission()
      
      if (permission === 'granted') {
        console.log('[Admin PWA] Notification permission granted')
        await subscribeToPush()
      } else if (permission === 'denied') {
        alert('Notificaties zijn geblokkeerd. Schakel ze in via browser instellingen.')
      }
    } catch (error) {
      console.error('[Admin PWA] Error requesting notification permission:', error)
      alert('Fout bij activeren van notificaties')
    } finally {
      setIsLoading(false)
      setShowDropdown(false)
    }
  }

  const subscribeToPush = async () => {
    console.log('[NotificationBell] ========== SUBSCRIBE TO PUSH ==========')
    try {
      let registration: ServiceWorkerRegistration
      
      // Use stored registration if available, otherwise wait for ready
      if (swRegistration) {
        console.log('[NotificationBell] Using stored service worker registration')
        registration = swRegistration
      } else {
        console.log('[NotificationBell] No stored registration, waiting for service worker with 5s timeout...')
        
        // Fallback: Add timeout to service worker ready
        const registrationPromise = navigator.serviceWorker.ready
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Service worker timeout after 5 seconds')), 5000)
        )
        
        registration = await Promise.race([registrationPromise, timeoutPromise]) as ServiceWorkerRegistration
      }
      
      console.log('[NotificationBell] ✅ Service worker ready:', registration.scope)
      
      console.log('[NotificationBell] Fetching VAPID public key...')
      const response = await fetch('/api/admin/push/vapid-public-key')
      const { publicKey } = await response.json()
      console.log('[NotificationBell] ✅ VAPID key received:', publicKey?.substring(0, 20) + '...')
      
      if (!publicKey) {
        throw new Error('No VAPID public key received from server')
      }
      
      console.log('[NotificationBell] Converting VAPID key...')
      const applicationServerKey = urlBase64ToUint8Array(publicKey)
      console.log('[NotificationBell] ✅ VAPID key converted')
      
      console.log('[NotificationBell] Subscribing to push manager...')
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource
      })
      console.log('[NotificationBell] ✅ Push subscription created:', {
        endpoint: sub.endpoint,
        expirationTime: sub.expirationTime
      })
      
      setSubscription(sub)
      setNotificationsEnabled(true)
      
      console.log('[NotificationBell] Getting current user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('[NotificationBell] User:', { 
        userId: user?.id, 
        email: user?.email,
        error: userError 
      })
      
      if (user) {
        const subscriptionData = {
          subscription: sub.toJSON(),
          userId: user.id
        }
        console.log('[NotificationBell] Sending subscription to API:', {
          userId: user.id,
          endpoint: sub.endpoint
        })
        
        const apiResponse = await fetch('/api/admin/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscriptionData)
        })
        
        console.log('[NotificationBell] API response status:', apiResponse.status)
        const apiData = await apiResponse.json()
        console.log('[NotificationBell] API response data:', apiData)
        
        if (!apiResponse.ok) {
          console.error('[NotificationBell] ❌ API error:', apiData)
          throw new Error(apiData.error || 'Failed to save subscription')
        }
        
        console.log('[NotificationBell] ✅ Push subscription saved to database!')
        playKaChing()
        new Notification('MOSE Admin', {
          body: 'KaChing notifications zijn actief! 💰',
          icon: '/favicon.ico',
          badge: '/favicon-32x32.png'
        })
      } else {
        console.error('[NotificationBell] ❌ No user found!')
        throw new Error('User not authenticated')
      }
    } catch (error) {
      console.error('[NotificationBell] ❌ Error subscribing to push:', error)
      console.error('[NotificationBell] Error details:', error instanceof Error ? error.stack : error)
      
      // Reset state on error
      setSubscription(null)
      setNotificationsEnabled(false)
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('timeout')) {
        alert('Service Worker reageert niet. Probeer de pagina te refreshen en opnieuw.')
      } else {
        alert('Fout bij instellen van push notifications: ' + errorMessage)
      }
    }
  }

  const unsubscribe = async () => {
    console.log('[NotificationBell] ========== UNSUBSCRIBE ==========')
    console.log('[NotificationBell] Current subscription:', subscription)
    
    setIsLoading(true)
    try {
      // Try to get service worker
      let browserSubscription = null
      
      if ('serviceWorker' in navigator) {
        try {
          let registration: ServiceWorkerRegistration | undefined
          
          // Use stored registration if available
          if (swRegistration) {
            console.log('[NotificationBell] Using stored service worker registration')
            registration = swRegistration
          } else {
            console.log('[NotificationBell] No stored registration, getting with 2s timeout...')
            
            // Fallback with timeout
            const registrationPromise = navigator.serviceWorker.ready
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Service worker timeout')), 2000)
            )
            
            registration = await Promise.race([registrationPromise, timeoutPromise]) as ServiceWorkerRegistration
          }
          
          console.log('[NotificationBell] Service worker ready')
          
          browserSubscription = await registration.pushManager.getSubscription()
          console.log('[NotificationBell] Browser subscription:', browserSubscription)
          
          // Unsubscribe from browser if any subscription exists
          if (browserSubscription) {
            console.log('[NotificationBell] Unsubscribing from push manager...')
            await browserSubscription.unsubscribe()
            console.log('[NotificationBell] ✅ Unsubscribed from push manager')
          }
        } catch (swError) {
          console.warn('[NotificationBell] Service worker error (continuing anyway):', swError)
          // Continue with unsubscribe even if SW fails
        }
      }
      
      // Try state subscription if browser subscription wasn't found
      if (!browserSubscription && subscription) {
        console.log('[NotificationBell] Unsubscribing from state subscription...')
        try {
          await subscription.unsubscribe()
          console.log('[NotificationBell] ✅ Unsubscribed from state subscription')
        } catch (subError) {
          console.warn('[NotificationBell] State subscription error (continuing anyway):', subError)
        }
      }
      
      if (!browserSubscription && !subscription) {
        console.log('[NotificationBell] No subscription found - just cleaning up database')
      }
      
      // Always remove from database
      console.log('[NotificationBell] Getting user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('[NotificationBell] User:', { userId: user?.id, error: userError })
      
      if (user) {
        console.log('[NotificationBell] Removing subscription from database...')
        const response = await fetch('/api/admin/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        })
        
        console.log('[NotificationBell] Unsubscribe API response:', response.status)
        
        if (!response.ok) {
          const data = await response.json()
          console.error('[NotificationBell] API error:', data)
          // Don't throw - we still want to clear UI
          console.log('[NotificationBell] Continuing despite API error...')
        } else {
          const data = await response.json()
          console.log('[NotificationBell] Unsubscribe API data:', data)
        }
      } else {
        console.warn('[NotificationBell] No user found, skipping database cleanup')
      }
      
      // Update UI state
      setSubscription(null)
      setNotificationsEnabled(false)
      console.log('[NotificationBell] ✅ Successfully unsubscribed - state cleared')
      alert('Notifications uitgeschakeld!')
    } catch (error) {
      console.error('[NotificationBell] ❌ Error unsubscribing:', error)
      console.error('[NotificationBell] Error details:', error instanceof Error ? error.stack : error)
      
      // Force clear the UI state even on error
      setSubscription(null)
      setNotificationsEnabled(false)
      
      alert('Notifications uitgeschakeld!')
    } finally {
      setIsLoading(false)
      setShowDropdown(false)
      console.log('[NotificationBell] Unsubscribe complete - loading set to false')
    }
  }

  const playKaChing = () => {
    try {
      const audio = new Audio('/kaching.mp3')
      audio.volume = 0.5
      audio.play().catch(e => console.log('Could not play sound:', e))
    } catch (e) {
      console.log('Audio not available')
    }
  }

  const testNotification = async () => {
    if (!notificationsEnabled) {
      alert('Schakel eerst notifications in!')
      return
    }
    
    playKaChing()
    
    new Notification('🛒 Test Order!', {
      body: 'Nieuwe bestelling van €99.99\nKaChing! 💰',
      icon: '/favicon.ico',
      badge: '/favicon-32x32.png',
      tag: 'test-order',
      requireInteraction: true
    })
    
    setShowDropdown(false)
  }

  if (!isSupported) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 border-2 transition-all ${
          notificationsEnabled
            ? 'border-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        title={notificationsEnabled ? 'KaChing notifications enabled' : 'Enable KaChing notifications'}
      >
        <svg 
          className={`w-5 h-5 ${notificationsEnabled ? 'text-brand-primary' : 'text-gray-500'}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {notificationsEnabled ? (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2.5} 
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
            />
          ) : (
            <>
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M6 18L18 6" 
              />
            </>
          )}
        </svg>

        {notificationsEnabled && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-brand-primary rounded-full animate-pulse"></span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white border-2 border-gray-200 shadow-xl z-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="font-bold text-sm uppercase tracking-wide">Push Notifications</span>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Status:</span>
                <span className={`font-bold ${notificationsEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {notificationsEnabled ? '✓ Enabled' : '○ Disabled'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {!notificationsEnabled ? (
                <button
                  onClick={requestNotificationPermission}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Bezig...' : '🔔 Enable KaChing'}
                </button>
              ) : (
                <>
                  <button
                    onClick={testNotification}
                    className="w-full px-4 py-2 border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white font-bold text-sm uppercase tracking-wide transition-colors"
                  >
                    🔊 Test Notification
                  </button>
                  <button
                    onClick={unsubscribe}
                    disabled={isLoading}
                    className="w-full px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-bold text-sm uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Bezig...' : '🔕 Disable'}
                  </button>
                </>
              )}
            </div>

            {!notificationsEnabled && (
              <p className="mt-3 text-xs text-gray-500 leading-tight">
                Krijg instant notifications met KaChing! geluid bij nieuwe orders
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}


