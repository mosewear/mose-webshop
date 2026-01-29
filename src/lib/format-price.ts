/**
 * Format price according to locale
 * - Dutch: €149,95 or €150
 * - English: €149.95 or €150
 * - Whole numbers display without decimals
 */
export function formatPrice(price: number, locale: string = 'nl'): string {
  // Check if price has decimals
  const hasDecimals = price % 1 !== 0
  
  if (!hasDecimals) {
    // Whole number: €150
    return `€${Math.round(price)}`
  }
  
  // Has decimals: format according to locale
  const formatted = price.toFixed(2)
  
  if (locale === 'en') {
    // English: €149.95
    return `€${formatted}`
  }
  
  // Dutch: €149,95 (replace dot with comma)
  return `€${formatted.replace('.', ',')}`
}
