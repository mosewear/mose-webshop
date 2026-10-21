/**
 * Eén adresregel uit wat er in een order staat.
 *
 * In de orders staan drie vormen door elkaar, afhankelijk van wanneer ze zijn
 * geplaatst:
 *   oud      address "Voltaweg 1",        houseNumber leeg
 *   tussen   address "Julianastraat",     houseNumber "3"
 *   nu       address "Nobel 10",          houseNumber "10" (allebei)
 * Wie address en houseNumber aan elkaar plakte, kreeg bij de huidige vorm
 * "Nobel 10 10"; wie alleen address toonde, miste bij de tussenvorm het
 * nummer. Deze functie haalt uit elke vorm dezelfde regel.
 *
 * Spreken de velden elkaar tegen ("De viermaster 25" met huisnummer 26), dan
 * geeft `strijdig` dat aan. Dan tonen we beide, zodat het opvalt in plaats van
 * dat we stil een van de twee kiezen.
 */

export interface AdresVelden {
  address?: string | null
  street_address?: string | null
  houseNumber?: string | null
  addition?: string | null
}

export interface GesplitstAdres {
  straat: string
  nummer: string
  toevoeging: string
  strijdig: boolean
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function splitsAdres(a: AdresVelden | null | undefined): GesplitstAdres {
  const ruw = (a?.address || a?.street_address || '').trim().replace(/\s+/g, ' ')
  const nummer = (a?.houseNumber || '').trim()
  const toevoeging = (a?.addition || '').trim()

  if (nummer) {
    // Staat het nummer (met eventuele toevoeging) al achter de straat? Dan eraf.
    const staart = new RegExp(`\\s+${esc(nummer)}(?:\\s*[-/]?\\s*${toevoeging ? esc(toevoeging) : ''})?$`, 'i')
    if (staart.test(ruw)) {
      return { straat: ruw.replace(staart, '').trim(), nummer, toevoeging, strijdig: false }
    }
    // Eindigt de straat op een ander nummer, dan spreken ze elkaar tegen.
    const anderNummer = /\s\d+\s*[A-Za-z0-9-]*$/.test(ruw)
    return { straat: ruw, nummer, toevoeging, strijdig: anderNummer }
  }

  // Oude vorm: nummer en toevoeging zitten alleen in de straat.
  const m = ruw.match(/^(.+?)\s+(\d+)\s*[-/]?\s*([A-Za-z0-9]*)$/)
  if (m) return { straat: m[1].trim(), nummer: m[2], toevoeging: m[3] || '', strijdig: false }
  return { straat: ruw, nummer: '', toevoeging: '', strijdig: false }
}

/** "Helper Brink 27A", "Kagerstraat 5 F2", "Nobel 10". */
export function nummerMetToevoeging(nummer: string, toevoeging: string): string {
  if (!nummer) return ''
  if (!toevoeging) return nummer
  return /^[A-Za-z]$/.test(toevoeging) ? `${nummer}${toevoeging.toUpperCase()}` : `${nummer} ${toevoeging}`
}

/** De straatregel zoals hij op een label, factuur of in een mail hoort. */
export function adresRegel(a: AdresVelden | null | undefined): string {
  const s = splitsAdres(a)
  if (s.strijdig) return `${s.straat} (huisnummer ${nummerMetToevoeging(s.nummer, s.toevoeging)})`
  const nr = nummerMetToevoeging(s.nummer, s.toevoeging)
  return nr ? `${s.straat} ${nr}` : s.straat
}
