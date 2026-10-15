'use client'

import { isClientAutomationBrowser } from '@/lib/bot-detection'

/**
 * Eén plek die bepaalt of een gebeurtenis de deur uit mag.
 *
 * Aanleiding: Meta telde veel meer mandjes dan onze eigen administratie, en er
 * zaten mandjes van onszelf bij die aan een advertentiecampagne werden
 * toegeschreven. Dat kwam niet door één fout maar door drie, en ze werkten
 * allemaal dezelfde kant op.
 *
 *  1. Onze eigen meting filtert automatiseringsbrowsers (Playwright, Selenium,
 *     headless Chrome) en botgebruikersagenten. De Meta-pixel deed dat NIET.
 *     Elke test die iets in de mand legde, leverde Meta dus een echte
 *     AddToCart op en onze administratie niets. Dat verschil is precies wat je
 *     in de twee systemen naast elkaar ziet.
 *
 *  2. Wie zelf in de winkel rondkijkt terwijl hij ooit op de eigen advertentie
 *     heeft geklikt, draagt een `_fbc`-cookie die negentig dagen meegaat. Die
 *     sturen we bij elke gebeurtenis mee, dus Meta schrijft alles wat je daarna
 *     doet toe aan die klik. Vandaar eigen mandjes in de campagne. We sluiten
 *     daarom iedereen uit die op dit apparaat de beheeromgeving heeft gebruikt.
 *
 *  3. Voorvertoningen en lokale ontwikkelomgevingen stuurden net zo hard mee.
 *
 * Het vlaggetje voor punt 2 wordt gezet door de beheerlayout en blijft staan
 * tot iemand het wist. Dat is bewust: een beheerder die één keer is ingelogd,
 * is daarna op dat apparaat nog steeds geen klant.
 */

export const INTERNE_SESSIE_SLEUTEL = 'mose_interne_sessie'

/**
 * Het echte winkeldomein. Alles wat hier niet onder valt is localhost of een
 * voorvertoning op vercel.app, en dat is geen klant.
 *
 * Bewust op achtervoegsel en niet op een vaste lijst: een nieuwe subdomein of
 * het kale domein hoort er dan vanzelf bij, een voorvertoning nooit.
 */
const WINKELDOMEIN = 'mosewear.com'

export function isInterneSessie(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(INTERNE_SESSIE_SLEUTEL) === '1'
  } catch {
    return false
  }
}

export function markeerInterneSessie(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(INTERNE_SESSIE_SLEUTEL, '1')
  } catch {
    // Opslag geblokkeerd: dan meten we deze sessie gewoon mee.
  }
}

/** Alleen op de echte winkel meten, niet op een voorvertoning of localhost. */
export function isEchteWinkel(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase()
  return host === WINKELDOMEIN || host.endsWith(`.${WINKELDOMEIN}`)
}

/**
 * Mag er een marketing- of meetgebeurtenis verstuurd worden?
 *
 * `reden` is er voor de console tijdens het ontwikkelen; in productie blijft
 * het stil.
 */
export function magMeten(): { mag: boolean; reden?: string } {
  if (typeof window === 'undefined') return { mag: false, reden: 'server' }
  if (isClientAutomationBrowser()) return { mag: false, reden: 'automatisering' }
  if (isInterneSessie()) return { mag: false, reden: 'interne sessie' }
  if (!isEchteWinkel()) return { mag: false, reden: 'geen productie' }
  return { mag: true }
}
