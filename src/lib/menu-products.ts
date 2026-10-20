import { createClient } from '@/lib/supabase/client'
import { buildPdpHref, formatColorLabel } from '@/lib/product-display'

export interface MenuProduct {
  /** Uniek per tegel; bij een kleurtegel product-id plus kleur. */
  id: string
  slug: string
  /** Link naar de productpagina, met ?color= als de tegel een kleur toont. */
  href: string
  /** Kleurlabel onder de naam, alleen als hetzelfde product twee keer staat. */
  kleur: string | null
  naam: string
  prijs: number
  vanafPrijs: number | null
  beeld: string | null
}

/** Bestanden die in product_images staan maar geen afbeelding zijn. */
const VIDEO = /\.(mp4|webm|mov|m4v)(\?.*)?$/i

type RuweRij = {
  id: string
  slug: string
  name: string
  name_en: string | null
  base_price: number | string | null
  sale_price: number | string | null
  product_images: Array<{
    url: string | null
    is_primary: boolean | null
    position: number | null
    color: string | null
  }> | null
}

/**
 * Extra kleuren voor lege vakken. Het raster heeft vier vakken en er staan
 * nu drie producten in de winkel, waardoor het vierde vak als zwart blok
 * bleef staan. Rick koos de zwarte hoodie (20-10-2026). Wordt alleen
 * gebruikt zolang er vakken over zijn; komt er een vierde product bij, dan
 * schuift dit vanzelf weg. De kleur moet gelijk zijn aan product_variants.color.
 */
const AANVULLING: { slug: string; kleur: string }[] = [
  { slug: 'mose-essential-hoodie', kleur: 'Zwart' },
]

/**
 * De producten die in het mobiele menu als tegels staan.
 *
 * Bewust GEEN categorieën. MOSE heeft vier producten, verdeeld over vier
 * categorieën met elk precies één product. Een categorietegel leidt dan naar
 * een overzichtspagina met één artikel: een extra tik, een extra laadmoment en
 * een extra afhaakpunt, zonder dat de bezoeker er iets voor terugkrijgt. Met de
 * producten zelf ziet iemand die uit een advertentie op één productpagina
 * landt in één blik de hele collectie, inclusief prijs.
 *
 * Groeit het assortiment voorbij `MAX`, dan tonen we de eerste vier en vangt de
 * regel "Shop alles" de rest op.
 */
export const MAX_MENU_PRODUCTEN = 4

export async function getMenuProducts(locale: string): Promise<MenuProduct[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('products')
    .select('id, slug, name, name_en, base_price, sale_price, product_images(url, is_primary, position, color)')
    .eq('is_active', true)
    .eq('status', 'active')
    .order('base_price', { ascending: true })
    .limit(MAX_MENU_PRODUCTEN)

  if (error || !data) return []

  const rijen = data as unknown as RuweRij[]

  const tegels = rijen.map((rij) => {
    // Een product heeft per kleur een eigen "primary" beeld, en in dezelfde
    // tabel staan ook video's. We nemen het eerste echte beeld, bij voorkeur
    // een primaire, anders het laagste positienummer.
    const beelden = (rij.product_images ?? [])
      .filter((b) => b.url && !VIDEO.test(b.url))
      .sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
        return (a.position ?? 99) - (b.position ?? 99)
      })

    const basis = Number(rij.base_price ?? 0)
    const aanbieding = rij.sale_price === null || rij.sale_price === undefined ? null : Number(rij.sale_price)
    const actief = aanbieding !== null && aanbieding > 0 ? aanbieding : basis

    return {
      id: rij.id,
      slug: rij.slug,
      href: buildPdpHref(rij.slug, null),
      kleur: null as string | null,
      beeldKleur: beelden[0]?.color ?? null,
      naam: locale === 'en' && rij.name_en ? rij.name_en : rij.name,
      prijs: actief,
      vanafPrijs: aanbieding !== null && aanbieding > 0 && aanbieding < basis ? basis : null,
      beeld: beelden[0]?.url ?? null,
    }
  })

  // Lege vakken vullen met een extra kleur van een product dat er al staat.
  for (const { slug, kleur } of AANVULLING) {
    if (tegels.length >= MAX_MENU_PRODUCTEN) break
    const basis = tegels.find((t) => t.slug === slug)
    const rij = rijen.find((r) => r.slug === slug)
    if (!basis || !rij || basis.beeldKleur === kleur) continue
    const beeld = (rij.product_images ?? [])
      .filter((b) => b.url && !VIDEO.test(b.url) && b.color === kleur)
      .sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
        return (a.position ?? 99) - (b.position ?? 99)
      })[0]
    if (!beeld?.url) continue
    // Twee keer dezelfde naam zonder verschil leest als een fout, dus beide
    // tegels van dit product krijgen hun kleur erbij, net als in de shop.
    if (basis.beeldKleur) {
      basis.kleur = formatColorLabel(basis.beeldKleur, locale)
      basis.href = buildPdpHref(slug, basis.beeldKleur)
    }
    tegels.push({
      ...basis,
      id: `${basis.id}-${kleur}`,
      href: buildPdpHref(slug, kleur),
      kleur: formatColorLabel(kleur, locale),
      beeldKleur: kleur,
      beeld: beeld.url,
    })
  }

  return tegels.map(({ beeldKleur: _beeldKleur, ...tegel }) => tegel)
}

/** Prijs zoals de shop hem toont: 50 → "50", 199.95 → "199,95". */
export function formatPrijs(bedrag: number, locale: string): string {
  const centen = Math.round(bedrag * 100) % 100 !== 0
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'nl-NL', {
    minimumFractionDigits: centen ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(bedrag)
}
