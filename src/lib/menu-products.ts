import { createClient } from '@/lib/supabase/client'

export interface MenuProduct {
  id: string
  slug: string
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
  product_images: Array<{ url: string | null; is_primary: boolean | null; position: number | null }> | null
}

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
    .select('id, slug, name, name_en, base_price, sale_price, product_images(url, is_primary, position)')
    .eq('is_active', true)
    .eq('status', 'active')
    .order('base_price', { ascending: true })
    .limit(MAX_MENU_PRODUCTEN)

  if (error || !data) return []

  return (data as unknown as RuweRij[]).map((rij) => {
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
      naam: locale === 'en' && rij.name_en ? rij.name_en : rij.name,
      prijs: actief,
      vanafPrijs: aanbieding !== null && aanbieding > 0 && aanbieding < basis ? basis : null,
      beeld: beelden[0]?.url ?? null,
    }
  })
}

/** Prijs zoals de shop hem toont: 50 → "50", 199.95 → "199,95". */
export function formatPrijs(bedrag: number, locale: string): string {
  const centen = Math.round(bedrag * 100) % 100 !== 0
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'nl-NL', {
    minimumFractionDigits: centen ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(bedrag)
}
