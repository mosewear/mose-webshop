/**
 * Format price according to locale
 * - Dutch: €149,95 or €150
 * - English: €149.95 or €150
 * - Whole numbers display without decimals
 */
export function formatPrice(price: number, locale: string = 'nl'): string {
  // Check if price has decimals
  const hasDecimals = price % 1 !== 0
  
  // Duizendtallen krijgen een scheidingsteken: €1.299 leest beter dan €1299.
  const taal = locale === 'en' ? 'en-GB' : 'nl-NL'

  if (!hasDecimals) {
    // Rond bedrag: €150
    return `€${new Intl.NumberFormat(taal, { maximumFractionDigits: 0 }).format(Math.round(price))}`
  }

  // Met decimalen: €149,95 in het Nederlands, €149.95 in het Engels
  return `€${new Intl.NumberFormat(taal, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)}`
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
  // Met duizendtallen. Zonder scheiding stond er op de productenpagina
  // "€12690,00", en dat lees je drie keer voor je het goed hebt.
  const opmaak = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `€${opmaak.format(Number(amount) || 0)}`
}

/**
 * Hetzelfde bedrag zonder euroteken, voor zinnen waarin het teken al in de
 * vertaling staat.
 */
export function formatBedragKaal(amount: number, locale: string = 'nl'): string {
  return formatBedrag(amount, locale).replace('€', '')
}
