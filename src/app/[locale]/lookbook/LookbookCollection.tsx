'use client'

import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/routing'
import type { CatalogProduct } from '@/lib/catalog-filters'
import CatalogProductCard from '@/components/shop/CatalogProductCard'

// Every published product appears once. Category-driven sections also pick up
// future products, without hardcoded product IDs or a second catalogue query.
export function lookbookGroup(product: CatalogProduct) {
  const category = product.category?.slug
  if (category === 'broeken') return 'pants'
  if (category === 'longsleeves' || product.slug === 'boxy-fleece-hoodie')
    return 'tops'
  if (
    product.is_gift_card ||
    ['accessoires', 'horloges'].includes(category ?? '')
  )
    return 'details'
  return 'essentials'
}

export default function LookbookCollection({
  products,
}: {
  products: CatalogProduct[]
}) {
  const t = useTranslations('lookbook.collection')
  if (!products.length) return null
  return (
    <section
      aria-labelledby="lookbook-collection"
      className="border-t-2 border-black bg-[#f5f5f1]"
    >
      <div className="mx-auto max-w-[1440px] px-4 py-14 md:px-8 md:py-24">
        <header className="mb-12 max-w-3xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">
            {t('eyebrow')}
          </p>
          <h2
            id="lookbook-collection"
            className="font-display text-5xl leading-none md:text-7xl"
          >
            {t('title')}
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-gray-700 md:text-lg">
            {t('intro')}
          </p>
        </header>
        {(['tops', 'pants', 'essentials', 'details'] as const).map((group) => {
          const selection = products.filter((p) => lookbookGroup(p) === group)
          if (!selection.length) return null
          return (
            <section
              key={group}
              aria-labelledby={`collection-${group}`}
              className="mb-16 last:mb-0 md:mb-24"
            >
              <div className="mb-6 grid gap-4 border-t border-black/20 pt-6 md:grid-cols-2 md:gap-12">
                <h3
                  id={`collection-${group}`}
                  className="font-display text-3xl uppercase md:text-4xl"
                >
                  {t(group)}
                </h3>
                <p className="max-w-xl text-sm leading-relaxed text-gray-600 md:text-base">
                  {t(`${group}Body`)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
                {selection.map((product) => (
                  <CatalogProductCard
                    key={product.id}
                    tile={{
                      tileKey: product.id,
                      product,
                      color: null,
                      color_hex: null,
                    }}
                  />
                ))}
              </div>
            </section>
          )
        })}
        <Link
          href="/shop"
          className="mt-10 inline-flex min-h-12 items-center gap-4 border-b-2 border-black py-3 text-sm font-bold uppercase tracking-wide hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          {t('browse')}
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
