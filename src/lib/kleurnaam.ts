/**
 * Kleurnamen in de taal van de bezoeker.
 *
 * De kleur staat in het Nederlands in de database ("Zwart", "Off White"), en
 * dezelfde omzettabel stond twee keer in de code: een keer in de productpagina
 * met HOOFDLETTERS als uitkomst, en een keer in de winkelmandla met gewone
 * schrijfwijze. De winkelwagenpagina had hem helemaal niet, dus op de Engelse
 * site stond daar gewoon "Zwart".
 *
 * Twee lijsten die uit elkaar lopen leveren precies dat soort verschillen op.
 * Dit is de enige lijst.
 *
 * De terugval geeft de kleur terug zoals hij is opgeslagen. Hij was
 * `toUpperCase()`, waardoor een kleur die niet in de lijst stond als
 * "OFF WHITE" naast "Zwart" belandde.
 */

const KLEUREN: Record<string, { nl: string; en: string }> = {
  zwart: { nl: 'Zwart', en: 'Black' },
  wit: { nl: 'Wit', en: 'White' },
  'off white': { nl: 'Off White', en: 'Off White' },
  offwhite: { nl: 'Off White', en: 'Off White' },
  beige: { nl: 'Beige', en: 'Beige' },
  bruin: { nl: 'Bruin', en: 'Brown' },
  groen: { nl: 'Groen', en: 'Green' },
  grijs: { nl: 'Grijs', en: 'Grey' },
  zilver: { nl: 'Zilver', en: 'Silver' },
  goud: { nl: 'Goud', en: 'Gold' },
  blauw: { nl: 'Blauw', en: 'Blue' },
  navy: { nl: 'Navy', en: 'Navy' },
  rood: { nl: 'Rood', en: 'Red' },
  geel: { nl: 'Geel', en: 'Yellow' },
  roze: { nl: 'Roze', en: 'Pink' },
  paars: { nl: 'Paars', en: 'Purple' },
  oranje: { nl: 'Oranje', en: 'Orange' },
  olijf: { nl: 'Olijf', en: 'Olive' },
  antraciet: { nl: 'Antraciet', en: 'Charcoal' },
  crème: { nl: 'Crème', en: 'Cream' },
  creme: { nl: 'Crème', en: 'Cream' },
}

/** Geeft de kleur in gewone schrijfwijze: "Zwart" of "Black". */
export function vertaalKleur(kleur: string | null | undefined, locale: string): string {
  if (!kleur) return ''
  const sleutel = kleur.trim().toLowerCase()
  const treffer = KLEUREN[sleutel]
  if (!treffer) return kleur
  return locale === 'en' ? treffer.en : treffer.nl
}
