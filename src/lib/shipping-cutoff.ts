/**
 * Wanneer gaat een bestelling nog vandaag de deur uit?
 *
 * Deze logica stond twee keer gekopieerd in de codebase (ShippingMicrocopy en
 * PdpTrustStrip) en keek in beide gevallen ALLEEN naar het uur. Op
 * zaterdagochtend om tien uur beloofde de productpagina dus "meestal morgen in
 * huis", terwijl er op zondag niemand bezorgt. Op vrijdagavond gold hetzelfde:
 * dan is het maandag, niet morgen.
 *
 * Eén bron, en de weekdag telt mee.
 */

const CUTOFF_UUR = 17 // lokale tijd Europe/Amsterdam

/** Uur en weekdag in Nederlandse tijd, ongeacht de tijdzone van het toestel. */
function nuInNederland(): { uur: number; dag: number } {
  try {
    const delen = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Amsterdam',
      hour: 'numeric',
      hour12: false,
      weekday: 'short',
    }).formatToParts(new Date())

    const uur = parseInt(delen.find((d) => d.type === 'hour')?.value ?? '', 10)
    const kort = delen.find((d) => d.type === 'weekday')?.value ?? ''
    const dagen = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dag = dagen.indexOf(kort)

    if (!Number.isFinite(uur) || dag < 0) throw new Error('onleesbaar')
    return { uur, dag }
  } catch {
    const d = new Date()
    return { uur: d.getHours(), dag: d.getDay() }
  }
}

/**
 * Gaat deze bestelling vandaag nog weg, zodat "morgen in huis" klopt?
 *
 * Waar: maandag tot en met donderdag vóór 17:00. Dan is de volgende dag een
 * werkdag en haalt het pakket die dag.
 *
 * Niet waar op vrijdag (levering zou maandag zijn), in het weekend, en na de
 * cutoff.
 */
export function levertMorgen(): boolean {
  const { uur, dag } = nuInNederland()
  const isWerkdag = dag >= 1 && dag <= 5
  const morgenIsWerkdag = dag >= 1 && dag <= 4
  return isWerkdag && morgenIsWerkdag && uur < CUTOFF_UUR
}

/**
 * Alleen het uur, voor teksten die niet over "morgen" gaan maar over "gaat
 * vandaag nog weg".
 */
export function voorCutoff(): boolean {
  const { uur, dag } = nuInNederland()
  return dag >= 1 && dag <= 5 && uur < CUTOFF_UUR
}
