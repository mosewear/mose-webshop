/** Canonical production URL when NEXT_PUBLIC_SITE_URL is unset (e.g. local dev). */
export const DEFAULT_PUBLIC_SITE_URL = 'https://www.mosewear.com'

export function getPublicSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_PUBLIC_SITE_URL
}
