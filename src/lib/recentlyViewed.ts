// Recently Viewed Products utility
// Stores product IDs in localStorage, max 8 products

export interface RecentlyViewedProduct {
  id: string
  slug: string
  viewedAt: number
}

const STORAGE_KEY = 'mose_recently_viewed'
const MAX_PRODUCTS = 8

export function addToRecentlyViewed(productId: string, slug: string): void {
  if (typeof window === 'undefined') return

  try {
    // Get existing
    const existing = getRecentlyViewed()
    
    // Remove if already exists (will re-add at front)
    const filtered = existing.filter(p => p.id !== productId)
    
    // Add to front
    const updated: RecentlyViewedProduct[] = [
      { id: productId, slug, viewedAt: Date.now() },
      ...filtered
    ].slice(0, MAX_PRODUCTS) // Keep max 8
    
    // Save
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error saving recently viewed:', error)
  }
}

export function getRecentlyViewed(): RecentlyViewedProduct[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const parsed: RecentlyViewedProduct[] = JSON.parse(stored)
    
    // Filter out old items (older than 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    const filtered = parsed.filter(p => p.viewedAt > thirtyDaysAgo)
    
    // If filtered, save back
    if (filtered.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    }
    
    return filtered
  } catch (error) {
    console.error('Error reading recently viewed:', error)
    return []
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Error clearing recently viewed:', error)
  }
}

