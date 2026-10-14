/**
 * Zoekindex voor de winkel.
 *
 * De zoekfunctie keek alleen naar de productnaam. De catalogus heet "MOSE Tee",
 * "MOSE Essential Hoodie", "MOSE Classic Sweater" en "MOSE Automatisch Horloge",
 * dus wie "t-shirt", "shirt", "trui", "hoody" of "zwarte hoodie" typte, kreeg
 * "geen resultaten" terwijl het product gewoon in de winkel ligt. Dat is een
 * bezoeker die weet wat hij zoekt en alsnog wegklikt.
 *
 * Daarom zoeken we hier op alles wat over een product bekend is: naam in beide
 * talen, categorie, kleuren, maten en een lijst met woorden die mensen in het
 * Nederlands en Engels gebruiken voor hetzelfde kledingstuk.
 *
 * De catalogus is klein, dus hij wordt één keer opgehaald en daarna in het
 * geheugen doorzocht. Dat scheelt een netwerkronde per toetsaanslag en maakt
 * meteen een eind aan het samenstellen van filterteksten uit wat de bezoeker
 * intypt: een komma of haakje in de zoekterm brak die filtertekst, de query
 * mislukte, en omdat de fout werd weggeslikt bleven de oude resultaten staan.
 */

export type ZoekProduct = {
  id: string
  name: string
  name_en: string | null
  slug: string
  base_price: number
  sale_price: number | null
  categorie: string | null
  categorie_en: string | null
  afbeelding: string | null
  kleuren: string[]
  maten: string[]
}

/** Woorden die naar hetzelfde kledingstuk verwijzen, per categorieslug. */
const SYNONIEMEN: Record<string, string[]> = {
  't-shirts': [
    'tee', 't-shirt', 'tshirt', 't shirt', 'shirt', 'shirtje', 'tshirts',
    'korte mouw', 'basic', 'essential',
  ],
  hoodies: [
    'hoodie', 'hoody', 'hoodies', 'capuchon', 'capuchontrui', 'trui met capuchon',
    'sweater met capuchon', 'hooded', 'hoeditrui',
  ],
  sweaters: [
    'sweater', 'sweatshirt', 'trui', 'truien', 'crewneck', 'crew neck',
    'pullover', 'ronde hals',
  ],
  horloges: [
    'horloge', 'horloges', 'watch', 'watches', 'uurwerk', 'klok', 'automaat',
    'automatisch',
  ],
  caps: ['cap', 'caps', 'pet', 'petje', 'muts'],
}

/** Kleurnamen in de andere taal, zodat "black hoodie" ook de zwarte vindt. */
const KLEURWOORDEN: Record<string, string[]> = {
  zwart: ['black', 'zwarte'],
  wit: ['white', 'witte'],
  'off white': ['offwhite', 'gebroken wit', 'ecru', 'cream'],
  groen: ['green', 'groene', 'olijf', 'olive', 'army'],
  bruin: ['brown', 'bruine', 'chocolade', 'chocolate'],
  beige: ['sand', 'zand', 'taupe', 'camel'],
  zilver: ['silver', 'zilveren'],
}

/** Kleine of hoofdletters, accenten en leestekens doen niet mee. */
export function normaliseer(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Alles waarop een product gevonden mag worden, als één doorzoekbare tekst. */
function hooiberg(p: ZoekProduct, categorieSlug: string | null): string {
  const delen = [
    p.name,
    p.name_en ?? '',
    p.categorie ?? '',
    p.categorie_en ?? '',
    ...p.kleuren,
    ...p.maten,
    ...(categorieSlug ? SYNONIEMEN[categorieSlug] ?? [] : []),
  ]
  for (const kleur of p.kleuren) {
    const extra = KLEURWOORDEN[normaliseer(kleur)]
    if (extra) delen.push(...extra)
  }
  return normaliseer(delen.join(' '))
}

export type GeindexeerdProduct = ZoekProduct & { hooiberg: string }

export function indexeer(
  producten: ZoekProduct[],
  categorieSlugs: Record<string, string | null>,
): GeindexeerdProduct[] {
  return producten.map((p) => ({ ...p, hooiberg: hooiberg(p, categorieSlugs[p.id] ?? null) }))
}

/**
 * Zoekt op alle woorden uit de zoekterm. Elk woord moet ergens voorkomen, zodat
 * "zwarte hoodie" de zwarte hoodie geeft en niet alles wat zwart óf hoodie is.
 * Een treffer in de naam telt zwaarder dan een treffer op kleur of categorie.
 */
export function zoek(index: GeindexeerdProduct[], term: string): GeindexeerdProduct[] {
  const woorden = normaliseer(term).split(' ').filter(Boolean)
  if (woorden.length === 0) return []

  return index
    .map((p) => {
      const naam = normaliseer(`${p.name} ${p.name_en ?? ''}`)
      let score = 0
      for (const woord of woorden) {
        if (!p.hooiberg.includes(woord)) return null
        if (naam.includes(woord)) score += 3
        else score += 1
      }
      // Een woord dat de naam begint, weegt extra: "tee" hoort bovenaan bij MOSE Tee.
      if (naam.startsWith(woorden[0])) score += 2
      return { product: p, score }
    })
    .filter((r): r is { product: GeindexeerdProduct; score: number } => r !== null)
    .sort((a, b) => b.score - a.score || a.product.base_price - b.product.base_price)
    .map((r) => r.product)
}
