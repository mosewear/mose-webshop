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

/**
 * Hetzelfde bedrag, maar zonder het euroteken.
 *
 * Nodig voor de zinnen waarin het euroteken al in de vertaling staat, zoals
 * "Nog €{amount} tot gratis verzending". Daar werd `toFixed(2)` gebruikt, en
 * dat levert in het Nederlands "Nog €100.00" op: een punt als decimaalteken en
 * twee nullen achter een rond bedrag. In dezelfde winkelmand stond er een regel
 * hoger gewoon "€50". Twee schrijfwijzen voor hetzelfde in één scherm.
 */
export function formatAmount(amount: number, locale: string = 'nl'): string {
  return formatPrice(amount, locale).replace('€', '')
}
