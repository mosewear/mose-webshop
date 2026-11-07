import { describe, it, expect } from 'vitest'
import { isPantsProductForSizeAdvice } from '@/lib/pants-size-advice'

describe('MOSE trousers product sizing advice', () => {
  it.each([
    'barrel-pants',
    'tree-camo-barrel-pants',
    'vintage-barrel-jeans',
    'washed-barrel-jeans',
    'sunfade-barrel-jeans',
    'distressed-barrel-jeans',
    'mose-barrel-sweatpants',
    'mose-training-pants',
  ])('shows a size-up recommendation for %s', slug => {
    expect(isPantsProductForSizeAdvice({ slug })).toBe(true)
  })

  it('includes future products in the trousers category', () => {
    expect(isPantsProductForSizeAdvice({ slug: 'mose-new-style', categorySlug: 'broeken' })).toBe(true)
  })

  it.each(['mose-training-shorts', 'mose-fleece-shorts', 'mose-essential-hoodie', 'raglan-longsleeve'])(
    'does not display trouser sizing advice on %s',
    slug => expect(isPantsProductForSizeAdvice({ slug, categorySlug: 'sport' })).toBe(false),
  )

  it('never treats shorts in the trousers category as long trousers', () => {
    expect(isPantsProductForSizeAdvice({ slug: 'mose-fleece-shorts', categorySlug: 'broeken' })).toBe(false)
  })
})
