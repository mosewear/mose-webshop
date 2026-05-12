/**
 * PDP fullscreen lightbox: XL WebP lives on Supabase next to -desktop.webp.
 * We load XL directly from the CDN (no next/image) and reuse decode work
 * across prefetch + lightbox slides via a shared promise map.
 */

const PHOTOSHOOT_PRODUCT_PREFIX = '/product-images/photoshoot-2026/'

/** Swap -desktop.webp → -xl.webp for photoshoot product bucket URLs only. */
export function toLightboxXlUrl(url: string): string {
  if (!url) return url
  if (!url.includes(PHOTOSHOOT_PRODUCT_PREFIX)) return url
  return url.replace(/-desktop\.webp(\?|$)/, '-xl.webp$1')
}

export function hasPdpLightboxXlVariant(url: string): boolean {
  return toLightboxXlUrl(url) !== url
}

const xlInflight = new Map<string, Promise<void>>()

function loadXlOnce(xlUrl: string): Promise<void> {
  let p = xlInflight.get(xlUrl)
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => resolve()
      img.onerror = () => {
        xlInflight.delete(xlUrl)
        reject(new Error(`Failed to load ${xlUrl}`))
      }
      img.src = xlUrl
    })
    xlInflight.set(xlUrl, p)
  }
  return p
}

/**
 * Warm HTTP cache + decode pipeline for the XL asset (from PDP hover / intent).
 * Safe to call repeatedly; coalesces on the same xl URL.
 */
export function prefetchPdpLightboxXl(desktopUrl: string | null | undefined): void {
  if (!desktopUrl) return
  const xl = toLightboxXlUrl(desktopUrl)
  if (xl === desktopUrl) return
  void loadXlOnce(xl).catch(() => {
    /* ignore: lightbox falls back to desktop */
  })
}

/** Await XL if already started (e.g. after prefetch); starts load if needed. */
export function ensurePdpLightboxXlLoaded(desktopUrl: string): Promise<void> {
  const xl = toLightboxXlUrl(desktopUrl)
  if (xl === desktopUrl) return Promise.resolve()
  return loadXlOnce(xl)
}
