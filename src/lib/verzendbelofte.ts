/**
 * Eén plek die bepaalt of we "altijd gratis verzending" beloven.
 *
 * De verzendbelofte stond op ruim vijftien plekken in de teksten, en de helft
 * daarvan vulde de drempel blind in. Zet je `free_shipping_threshold` op 0,
 * dan kreeg je dus "Gratis verzending vanaf €0" op de productpagina, in de
 * winkelmand, in beide FAQ's en in de algemene voorwaarden.
 *
 * Gebruik `isAltijdGratis` overal waar een verzendbelofte in beeld komt, en
 * kies op basis daarvan tussen de gewone sleutel en de `*Altijd`-variant.
 */

export interface VerzendInstellingen {
  free_shipping_threshold?: number | null
  shipping_cost?: number | null
}

/**
 * Waar of de klant nooit verzendkosten betaalt, ongeacht het bestelbedrag.
 *
 * Beide waarden moeten op nul staan. Een drempel van 0 met kosten erboven is
 * tegenstrijdig, en dan is "altijd gratis" een belofte die de checkout niet
 * waarmaakt.
 */
export function isAltijdGratis(instellingen: VerzendInstellingen | null | undefined): boolean {
  if (!instellingen) return false
  const drempel = instellingen.free_shipping_threshold ?? 0
  const kosten = instellingen.shipping_cost ?? 0
  return drempel <= 0 && kosten <= 0
}

/** Zelfde vraag, maar met losse getallen in plaats van een instellingenobject. */
export function isAltijdGratisUitWaarden(
  drempel: number | null | undefined,
  kosten: number | null | undefined
): boolean {
  return (drempel ?? 0) <= 0 && (kosten ?? 0) <= 0
}

/**
 * Hoeveel er nog bij moet voor gratis verzending.
 *
 * Geeft 0 terug zodra verzending altijd gratis is, zodat voortgangsbalken en
 * "nog €X te gaan"-teksten vanzelf verdwijnen in plaats van op 0 te blijven
 * hangen.
 */
export function tekortVoorGratisVerzending(
  subtotaal: number,
  drempel: number | null | undefined,
  kosten: number | null | undefined
): number {
  if (isAltijdGratisUitWaarden(drempel, kosten)) return 0
  return Math.max(0, (drempel ?? 0) - subtotaal)
}
