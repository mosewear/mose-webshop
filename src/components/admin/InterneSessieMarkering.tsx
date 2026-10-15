'use client'

import { useEffect } from 'react'
import { markeerInterneSessie } from '@/lib/meting-uitsluiten'

/**
 * Zet een vlaggetje zodra iemand de beheeromgeving opent.
 *
 * Wie hier binnenkomt is door `requireAdmin` gegaan en is dus wij, niet een
 * klant. Vanaf dat moment meten we op dit apparaat niets meer, bij Meta noch
 * bij onszelf.
 *
 * Dat is nodig omdat de `_fbc`-cookie negentig dagen meegaat. Eén keer op onze
 * eigen advertentie klikken is genoeg om alles wat je daarna in de winkel doet
 * aan die campagne te laten toeschrijven. Zo belandden onze eigen mandjes in de
 * campagnecijfers.
 *
 * Terugdraaien kan met `localStorage.removeItem('mose_interne_sessie')` in de
 * console van dat apparaat.
 */
export default function InterneSessieMarkering() {
  useEffect(() => {
    markeerInterneSessie()
  }, [])
  return null
}
