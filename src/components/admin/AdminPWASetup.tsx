'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminPWASetup() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    // Check if PWA and Push Notifications are supported
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window
      setIsSupported(supported)
      
      if (supported) {
        // Check if already installed (running as PWA)
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                           (window.navigator as any).standalone === true
        setIsInstalled(isInstalled)
        
        // Check notification permission
        const permission = Notification.permission
        setNotificationsEnabled(permission === 'granted')
        
        // Register service worker
        registerServiceWorker()
      }
    }
    
    checkSupport()
  }, [])

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          '/admin-sw.js',
          { scope: '/admin/' }
        )
        console.log('[Admin PWA] Service Worker registered:', registration.scope)
        
        // Check if push subscription exists
        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          setSubscription(existing)
          setNotificationsEnabled(true)
        }
      } catch (error) {
        console.error('[Admin PWA] Service Worker registration failed:', error)
      }
    }
  }

  const requestNotificationPermission = async () => {
    if (!isSupported) {
      alert('Push notifications worden niet ondersteund in deze browser')
      return
    }

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
    }
  }

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      
      // Get VAPID public key from server
      const response = await fetch('/api/admin/push/vapid-public-key')
      const { publicKey } = await response.json()
      
      // Subscribe to push notifications
      const applicationServerKey = urlBase64ToUint8Array(publicKey)
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource
      })
      
      setSubscription(sub)
      setNotificationsEnabled(true)
      
      // Save subscription to database
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await fetch('/api/admin/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: sub.toJSON(),
            userId: user.id
          })
        })
        
        console.log('[Admin PWA] Push subscription saved to database')
        alert('✅ KaChing notifications ingeschakeld!')
        
        // Test notification
        playKaChing()
        new Notification('MOSE Admin', {
          body: 'KaChing notifications zijn actief! 💰',
          icon: '/favicon.ico',
          badge: '/favicon-32x32.png'
        })
      }
    } catch (error) {
      console.error('[Admin PWA] Error subscribing to push:', error)
      alert('Fout bij instellen van push notifications')
    }
  }

  const unsubscribe = async () => {
    if (subscription) {
      try {
        await subscription.unsubscribe()
        
        // Remove from database
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await fetch('/api/admin/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
          })
        }
        
        setSubscription(null)
        setNotificationsEnabled(false)
        console.log('[Admin PWA] Unsubscribed from push notifications')
        alert('Notifications uitgeschakeld')
      } catch (error) {
        console.error('[Admin PWA] Error unsubscribing:', error)
      }
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
  }

  // Show install prompt after some time if not installed yet
  useEffect(() => {
    if (isSupported && !isInstalled && !notificationsEnabled) {
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [isSupported, isInstalled, notificationsEnabled])

  if (!isSupported) {
    return null // Don't show anything if not supported
  }

  if (showPrompt && !isInstalled && !notificationsEnabled) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] max-w-sm bg-black text-white border-2 border-brand-primary p-4 shadow-xl">
        <button
          onClick={() => setShowPrompt(false)}
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
        >
          ×
        </button>
        <h3 className="font-bold text-lg mb-2">📱 Install Admin App</h3>
        <p className="text-sm text-gray-300 mb-3">
          Krijg KaChing! notificaties bij elke nieuwe order
        </p>
        <button
          onClick={requestNotificationPermission}
          className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-4 uppercase text-sm"
        >
          Activeer Notifications
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex gap-2">
      {!notificationsEnabled && (
        <button
          onClick={requestNotificationPermission}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-4 rounded-full shadow-lg flex items-center gap-2 text-sm"
          title="Enable KaChing notifications"
        >
          🔔 Enable KaChing
        </button>
      )}
      
      {notificationsEnabled && (
        <div className="flex gap-2">
          <button
            onClick={testNotification}
            className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full shadow-lg text-sm"
            title="Test notification"
          >
            🔔 Test
          </button>
          <button
            onClick={unsubscribe}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-lg text-sm"
            title="Disable notifications"
          >
            🔕
          </button>
        </div>
      )}
    </div>
  )
}

// Helper function to convert VAPID key
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

