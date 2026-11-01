'use client'

import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { getImageForColor } from '@/lib/product-display'
import type { CatalogProduct, CatalogFilters } from '@/lib/catalog-filters'

export function showCollectionStories(filters: CatalogFilters) {
  return filters.category === 'all' && !filters.collection && !filters.q.trim() &&
    filters.min === null && filters.max === null && !filters.sizes.length &&
    !filters.colors.length && !filters.stock && filters.sort === 'featured'
}

/** Insert only between complete rows; CSS keeps the server and client tree identical. */
export function collectionStorySlots(position: number) {
  const slots: { story: 'denim' | 'sport'; className: string }[] = []
  if (position === 4 || position === 8) slots.push({ story: position === 4 ? 'denim' : 'sport', className: 'lg:hidden' })
  if (position === 6 || position === 12) slots.push({ story: position === 6 ? 'denim' : 'sport', className: 'hidden lg:block xl:hidden' })
  if (position === 8 || position === 16) slots.push({ story: position === 8 ? 'denim' : 'sport', className: 'hidden xl:block' })
  return slots
}

export default function CollectionStory({ story, product, className }: {
  story: 'denim' | 'sport'; product: CatalogProduct; className: string
}) {
  const t = useTranslations(`shop.stories.${story}`)
  const locale = useLocale()
  return <section data-collection-story={story} className={`col-span-full my-3 sm:my-5 ${className}`}>
    <div className="grid grid-cols-2 overflow-hidden bg-black text-white">
      <div className="relative min-h-[280px] sm:min-h-[360px] lg:h-[440px]">
        <Image src={getImageForColor(product.images, null)} alt={locale === 'en' ? product.name_en || product.name : product.name}
          fill sizes="(max-width: 767px) 50vw, (max-width: 1439px) 48vw, 680px" className="object-cover object-top" quality={90} />
      </div>
      <div className="flex min-w-0 flex-col justify-center px-4 py-7 sm:px-8 lg:px-14 lg:py-12">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-primary sm:text-xs">{t('eyebrow')}</p>
        <h2 className="max-w-sm font-display text-[clamp(1.5rem,5vw,3.5rem)] uppercase leading-[1.08]">{t('title')}</h2>
        <p className="mb-5 mt-4 max-w-sm text-xs leading-relaxed text-white/85 sm:text-base">{t('body')}</p>
        <Link href={story === 'denim' ? '/shop?category=jassen' : '/shop?collection=sport'}
          className="inline-flex min-h-11 items-center gap-2 self-start border-b border-white py-2 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary sm:text-sm">
          {t('cta')}<ArrowRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </div>
  </section>
}
