/** Editorial selection, not a bestseller claim. Unknown styles retain admin order. */
export const shopFeaturedSlugs = [
  'boxy-fleece-hoodie',
  'mose-denim-zip-jacket',
  'mose-tee',
  'vintage-barrel-jeans',
  'raglan-longsleeve',
  'mose-training-tee',
  'mose-training-shorts',
  'mose-quarter-zip',
  'mose-fleece-zip-hoodie',
  'mose-barrel-sweatpants',
  'mose-waffle-tee',
  'barrel-pants',
] as const

/** These four verified training designs form a collection across product categories. */
export const sportProductSlugs = new Set([
  'mose-training-tee',
  'mose-training-shorts',
  'mose-training-pants',
  'mose-quarter-zip',
])

export function shopFeaturedRank(slug: string) {
  const index = (shopFeaturedSlugs as readonly string[]).indexOf(slug)
  return index < 0 ? shopFeaturedSlugs.length : index
}

export const shopCategoryOrder = ['hoodies', 't-shirts', 'broeken', 'jassen', 'sport', 'longsleeves', 'sweaters', 'cadeaubonnen']

/** Deliberate thumbnails, independent of the currently selected sort or inventory. */
export const shopCategoryImages: Record<string, string> = {
  hoodies: 'boxy-fleece-hoodie',
  't-shirts': 'mose-tee',
  broeken: 'vintage-barrel-jeans',
  jassen: 'mose-denim-zip-jacket',
  sport: 'mose-training-tee',
  longsleeves: 'raglan-longsleeve',
  sweaters: 'mose-classic-sweater',
}
