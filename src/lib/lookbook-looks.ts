import { colorKey, type CatalogProduct } from './catalog-filters'

/** Approved editorial pairings. Product facts, price and photography remain catalogue-owned. */
export const LOOKBOOK_LOOKS = [
  { id: 'hoodie-denim', nav: { nl: 'Hoodie & denim', en: 'Hoodie & denim' }, title: { nl: 'Ruim van vorm. Rustig van kleur.', en: 'Relaxed fit. Understated colour.' }, caption: { nl: 'Een boxy hoodie met een ruime jeans. Een sterke combinatie voor iedere dag.', en: 'A boxy hoodie with relaxed jeans. An easy combination for every day.' }, products: [{ slug: 'boxy-fleece-hoodie', color: 'Coffee' }, { slug: 'vintage-barrel-jeans', color: 'Jeans Blue' }] },
  { id: 'longsleeve-camo', nav: { nl: 'Longsleeve & camo', en: 'Long sleeve & camo' }, title: { nl: 'Contrast dat werkt.', en: 'Contrast that works.' }, caption: { nl: 'De lichte longsleeve houdt de combinatie rustig. De camobroek geeft hem karakter.', en: 'A light long-sleeve tee keeps things simple. Camo trousers add character.' }, products: [{ slug: 'raglan-longsleeve', color: 'White with Black' }, { slug: 'tree-camo-barrel-pants', color: 'Brown Tree Camo' }] },
  { id: 'tee-barrel', nav: { nl: 'Tee & barrel', en: 'Tee & barrel' }, title: { nl: 'Gewoon een goede tee.', en: 'Just a good tee.' }, caption: { nl: 'Een stevig shirt en een broek met ruimte. Meer hoeft het niet te zijn.', en: 'A substantial tee and trousers with room to move. That’s all you need.' }, products: [{ slug: 'mose-tee', color: 'Beige' }, { slug: 'barrel-pants', color: 'Gray Green' }] },
  { id: 'washed', nav: { nl: 'Washed', en: 'Washed' }, title: { nl: 'Een gedragen uitstraling.', en: 'A worn-in look.' }, caption: { nl: 'Gewassen tinten en een ontspannen pasvorm. Eenvoudig te combineren.', en: 'Washed colours and a relaxed fit. Easy to put together.' }, products: [{ slug: 'mose-washed-longsleeve', color: 'Black Beauty' }, { slug: 'distressed-barrel-jeans', color: 'Blue' }] },
  { id: 'waffle-denim', nav: { nl: 'Waffle & denim', en: 'Waffle & denim' }, title: { nl: 'Verschil in structuur.', en: 'A mix of textures.' }, caption: { nl: 'Een wafelshirt naast licht denim. Zachte kleuren met genoeg contrast.', en: 'A waffle tee with light denim. Muted colours with just enough contrast.' }, products: [{ slug: 'mose-waffle-tee', color: 'Coffee' }, { slug: 'sunfade-barrel-jeans', color: 'Light Blue' }] },
  { id: 'fleece', nav: { nl: 'Fleece', en: 'Fleece' }, title: { nl: 'Comfort voor de hele dag.', en: 'Comfort all day.' }, caption: { nl: 'Een hoodie met rits en een ruime sweatpants. Samen sterk, los net zo makkelijk.', en: 'A zip hoodie and relaxed sweatpants. Wear them together or make them your own.' }, products: [{ slug: 'mose-fleece-zip-hoodie', color: 'Black' }, { slug: 'mose-barrel-sweatpants', color: 'Black' }] },
] as const

export function resolveLookbookLooks(products: Array<CatalogProduct & { is_active?: boolean; status?: string | null }>) {
  const published = new Map(products.filter(p => p.is_active !== false && (!p.status || p.status === 'active') && !p.is_gift_card).map(p => [p.slug, p]))
  return LOOKBOOK_LOOKS.flatMap(look => {
    const pieces = look.products.map(selection => {
      const product = published.get(selection.slug)
      if (!product) return null
      const color = product.variants?.find(v => colorKey(v.color ?? '') === colorKey(selection.color))?.color
      // Do not silently substitute a different garment or colour in an approved outfit.
      return color ? { product, color } : null
    })
    if (pieces.some(p => !p)) return []
    return [{ ...look, pieces: pieces.filter((p): p is NonNullable<typeof p> => p !== null) }]
  })
}
