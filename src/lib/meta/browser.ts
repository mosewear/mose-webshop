'use client'

export const META_CONSENT_COOKIE = 'mose_meta_consent'
export const META_TEST_COOKIE = 'mose_meta_test'
export function readBrowserCookie(name: string): string | undefined {
  return document.cookie.split(';').map(v => v.trim()).find(v => v.startsWith(name + '='))?.slice(name.length + 1)
}
export function isMetaTestBrowser(): boolean { return Boolean(readBrowserCookie(META_TEST_COOKIE)) }
export function syncMetaConsent(): boolean {
  try {
    const allowed = localStorage.getItem('mose_cookie_consent') === 'all'
    document.cookie = `${META_CONSENT_COOKIE}=${allowed ? 'all' : 'necessary'}; Path=/; SameSite=Lax; Secure; Max-Age=31536000`
    return allowed
  } catch { return false }
}
/** Read the actual click ID only after consent. Never invent a click ID. */
export function metaBrowserIdentifiers(): { fbc?: string; fbp?: string } {
  const click = new URLSearchParams(window.location.search).get('fbclid')
  let fbc = readBrowserCookie('_fbc')
  if (click && /^[A-Za-z0-9_.-]{6,500}$/.test(click) && fbc?.split('.').slice(3).join('.') !== click) {
    fbc = `fb.1.${Date.now()}.${click}`
    document.cookie = `_fbc=${fbc}; Path=/; Domain=.mosewear.com; SameSite=Lax; Secure; Max-Age=7776000`
  }
  return { fbc, fbp: readBrowserCookie('_fbp') }
}

export function initMetaPixel(): void {
  if (window.fbq || isMetaTestBrowser()) return
  type Queue = NonNullable<Window['fbq']> & { callMethod?: (...args: unknown[]) => void; push?: unknown }
  const pixel = function (...args: unknown[]) {
    if (pixel.callMethod) pixel.callMethod(...args)
    else pixel.queue!.push(args)
  } as Queue
  pixel.queue = []; pixel.loaded = true; pixel.version = '2.0'; pixel.push = pixel
  window.fbq = pixel; window._fbq = pixel
  // Prevent Meta auto-detected button clicks from becoming duplicate cart events.
  ;(pixel as (...args: unknown[]) => void)('set', 'autoConfig', false, '1447430483627328')
  pixel('init', '1447430483627328')
  const script = document.createElement('script')
  script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)
}
