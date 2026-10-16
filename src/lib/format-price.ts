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

/**
 * Een bedrag dat GEEN productprijs is: een subtotaal, verzendkosten, korting,
 * btw, een ordertotaal of een terugbetaling.
 *
 * Het verschil met `formatPrice` is bewust. Een productprijs laten we kaal
 * staan: €75 leest prettiger dan €75,00 op een tegel of een knop. Maar een
 * bedrag op een bestelling of een retour hoort er wél uit te zien als een
 * bedrag, met twee decimalen, zoals op elke bon. "Totaal €145" en
 * "Terugbetaald €150" lezen als afgeronde schattingen; dat moet niet.
 *
 * Het decimaalteken volgt de taal: komma in het Nederlands, punt in het
 * Engels.
 */
export function formatBedrag(amount: number, locale: string = 'nl'): string {
  const vast = Number(amount).toFixed(2)
  return locale === 'en' ? `\u20ac${vast}` : `\u20ac${vast.replace('.', ',')}`
}

/**
 * Hetzelfde bedrag zonder euroteken, voor zinnen waarin het teken al in de
 * vertaling staat.
 */
export function formatBedragKaal(amount: number, locale: string = 'nl'): string {
  return formatBedrag(amount, locale).replace('\u20ac', '')
}
