// MOSE Admin Service Worker
// Scope: /admin/ only - does NOT affect customer-facing pages

const CACHE_NAME = 'mose-admin-v1'
const ADMIN_SCOPE = '/admin/'

// Install event - cache critical admin assets
self.addEventListener('install', (event) => {
  console.log('[Admin SW] Install event')
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Admin SW] Activate event')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('mose-admin-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - network-first strategy for admin (always fresh data)
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Only handle requests within /admin/ scope
  if (!url.pathname.startsWith(ADMIN_SCOPE)) {
    return
  }
  
  // Network-first strategy for admin panel (always get fresh data)
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(request)
      })
  )
})

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Admin SW] Push received:', event)
  
  let data = {
    title: 'MOSE Order',
    body: 'New order received!',
    icon: '/favicon.ico',
    badge: '/favicon-32x32.png',
    tag: 'order-notification',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      url: '/admin/orders',
      timestamp: Date.now()
    }
  }
  
  if (event.data) {
    try {
      const pushData = event.data.json()
      data = { ...data, ...pushData }
    } catch (e) {
      console.error('[Admin SW] Error parsing push data:', e)
    }
  }
  
  const promiseChain = self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    vibrate: data.vibrate,
    data: data.data,
    actions: [
      {
        action: 'view',
        title: 'View Order',
        icon: '/favicon-32x32.png'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  }).then(() => {
    // Play KaChing sound
    return self.registration.getNotifications({ tag: data.tag }).then((notifications) => {
      if (notifications.length > 0) {
        // Sound will be played by the notification system + our custom audio
        console.log('[Admin SW] KaChing! 💰')
      }
    })
  })
  
  event.waitUntil(promiseChain)
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Admin SW] Notification click:', event.action)
  
  event.notification.close()
  
  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/admin/orders'
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if admin panel is already open
        for (const client of clientList) {
          if (client.url.includes('/admin') && 'focus' in client) {
            client.focus()
            client.navigate(urlToOpen)
            return
          }
        }
        // Open new window if not already open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
    )
  }
})

// Background sync for offline orders (future feature)
self.addEventListener('sync', (event) => {
  console.log('[Admin SW] Sync event:', event.tag)
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(
      // Sync logic here
      Promise.resolve()
    )
  }
})

console.log('[Admin SW] Service Worker loaded - scope: /admin/')



