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
  black: { nl: 'Zwart', en: 'Black' },
  white: { nl: 'Wit', en: 'White' },
  brown: { nl: 'Bruin', en: 'Brown' },
  green: { nl: 'Groen', en: 'Green' },
  blue: { nl: 'Blauw', en: 'Blue' },
  gray: { nl: 'Grijs', en: 'Grey' },
  grey: { nl: 'Grijs', en: 'Grey' },
  silver: { nl: 'Zilver', en: 'Silver' },
  'black beauty': { nl: 'Gewassen zwart', en: 'Washed black' },
  'pirate gray': { nl: 'Gewassen antraciet', en: 'Washed charcoal' },
  'flower gray': { nl: 'Grijs gemêleerd', en: 'Grey marl' },
  coffee: { nl: 'Koffiebruin', en: 'Coffee' },
  'dark green': { nl: 'Donkergroen', en: 'Dark green' },
  'white with black': { nl: 'Wit / zwart', en: 'White / black' },
  'white with coffee': { nl: 'Wit / koffiebruin', en: 'White / coffee' },
  'jeans blue': { nl: 'Denimblauw', en: 'Denim blue' },
  'gray green': { nl: 'Grijsgroen', en: 'Grey green' },
  'brown tree camo': { nl: 'Bruine tree camo', en: 'Brown tree camo' },
  'light blue': { nl: 'Lichtblauw', en: 'Light blue' },
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
