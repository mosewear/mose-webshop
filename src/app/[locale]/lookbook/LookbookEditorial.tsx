'use client'

import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useLiveAvailability } from '@/hooks/useLiveAvailability'
import { availableVariant, colorKey, productPriceRange, type CatalogProduct } from '@/lib/catalog-filters'
import { buildPdpHref, formatColorLabel, getImageForColor } from '@/lib/product-display'
import { formatPrice } from '@/lib/format-price'
import { resolveLookbookLooks } from '@/lib/lookbook-looks'
import { BLUR_DATA_URL } from '@/lib/blur-placeholder'

type Locale = 'nl' | 'en'
function LookImage({ product, color, locale, priority }: { product: CatalogProduct; color: string; locale: Locale; priority: boolean }) {
  const src = getImageForColor(product.images, color)
  const [failed, setFailed] = useState<string | null>(null)
  const name = locale === 'en' ? product.name_en || product.name : product.name
  return <Link href={buildPdpHref(product.slug, color)} aria-label={`${name}, ${formatColorLabel(color, locale)}`} className="relative block min-w-0 aspect-[4/5] overflow-hidden bg-gray-100 focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-brand-primary">
    <Image src={failed === src ? '/placeholder-product.svg' : src} alt={`${name}, ${formatColorLabel(color, locale)}`} fill priority={priority} quality={90} sizes="(max-width: 767px) calc((100vw - 26px) / 2), (max-width: 1279px) calc((100vw - 58px) * .33), 400px" className="object-cover object-top" placeholder="blur" blurDataURL={BLUR_DATA_URL} onError={() => setFailed(src)} />
  </Link>
}

export default function LookbookEditorial({ products: initialProducts, locale }: { products: CatalogProduct[]; locale: Locale }) {
  const products = useLiveAvailability(initialProducts)
  const looks = resolveLookbookLooks(products)
  const en = locale === 'en'
  return <div className="bg-[#F5F5F2]">
    <div className="mx-auto max-w-[1280px] px-3 pb-10 pt-4 md:px-6 md:pb-16 md:pt-8">
      <header>
        <h1 className="font-display text-3xl uppercase leading-none md:text-5xl">Lookbook</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 md:text-base">{en ? 'How we wear MOSE. Explore the combinations and find your fit.' : 'Zo draag je MOSE. Bekijk de combinaties en kies wat bij je past.'}</p>
      </header>
      {looks.length > 0 && <nav aria-label={en ? 'Browse looks' : 'Bekijk de looks'} className="mt-3 mb-4 flex gap-5 overflow-x-auto scrollbar-hide border-b border-gray-300 md:mb-6">
        {looks.map((look, i) => <a key={look.id} href={`#${look.id}`} className="flex min-h-11 shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-wide hover:text-brand-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-black"><span className="text-gray-500">{String(i + 1).padStart(2, '0')}</span>{look.nav[locale]}</a>)}
      </nav>}
      <div className="space-y-6 md:space-y-10">
        {looks.map((look, index) => <section key={look.id} id={look.id} aria-labelledby={`${look.id}-title`} className="scroll-mt-40 border border-black bg-white md:grid md:grid-cols-[2fr_1fr]">
          <div className="grid min-w-0 grid-cols-2 gap-1 bg-black">
            {look.pieces.map(({product, color}) => <LookImage key={product.id} product={product} color={color} locale={locale} priority={index === 0} />)}
          </div>
          <div className="flex min-w-0 flex-col justify-center p-4 md:p-6 lg:p-8">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-gray-600">Look {String(index + 1).padStart(2, '0')}</p>
            <h2 id={`${look.id}-title`} className="font-display text-2xl uppercase leading-tight lg:text-3xl">{look.title[locale]}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{look.caption[locale]}</p>
            <ul className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
              {look.pieces.map(({product, color}) => {
                const name = locale === 'en' ? product.name_en || product.name : product.name
                const price = productPriceRange(product, color)
                const orderable = product.variants?.some(v => colorKey(v.color ?? '') === colorKey(color) && availableVariant(v))
                return <li key={product.id}><Link href={buildPdpHref(product.slug, color)} className="group flex min-h-16 items-center justify-between gap-3 py-3 focus-visible:outline-2 focus-visible:outline-black">
                  <div className="min-w-0"><p className="text-sm font-bold group-hover:underline">{name.replace(/^MOSE\s+/i, '')}</p><p className="mt-1 text-xs text-gray-600">{formatColorLabel(color, locale)} · {price.min !== price.max ? (en ? 'From ' : 'Vanaf ') : ''}{formatPrice(price.min, locale)}</p>{!orderable && <p className="mt-1 text-xs text-gray-600">{en ? 'Currently unavailable' : 'Momenteel niet beschikbaar'}</p>}</div><ArrowRight size={18} className="shrink-0" aria-hidden="true" />
                </Link></li>
              })}
            </ul>
          </div>
        </section>)}
      </div>
      <div className="pt-8 text-center md:pt-12"><Link href="/shop" className="mose-button mose-button--primary">{en ? 'Shop the collection' : 'Bekijk de collectie'}<ArrowRight size={18} aria-hidden="true" /></Link></div>
    </div>
  </div>
}
