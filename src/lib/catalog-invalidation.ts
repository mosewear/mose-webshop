'use client'

/** Uses the existing admin session, never a service credential in the browser. */
export async function invalidatePublicCatalog(): Promise<void> {
  try {
    const response = await fetch('/api/admin/catalog/revalidate', { method: 'POST', credentials: 'same-origin' })
    if (!response.ok) console.error('Public catalogue refresh failed:', response.status)
  } catch (error) {
    // The media/product save already succeeded; the normal TTL remains a fallback.
    console.error('Public catalogue refresh unavailable:', error)
  }
}
