'use client'

/**
 * Rustig beeld-tekstblok onder het shopraster.
 *
 * Eén close-up van de bruine hoodie: de puff-print op de borst, de mouw en de
 * boord. Bewust geen tekst over de foto en geen uitspraken over materiaal of
 * productie, alleen een uitnodiging om het van dichtbij te bekijken.
 *
 * Op desktop staan beeld en tekst naast elkaar, op telefoon onder elkaar.
 */

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'
import { buildPdpHref } from '@/lib/product-display'

/** Vaste bron uit de goedgekeurde fotografie van oktober 2026. */
const DETAILBEELD =
  'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/webshopfotografie-2026-10-v3/01-hoodie-bruin/04-origineel-logo-en-mouw.webp'

/**
 * De kleur op de foto hierboven. De knop moet op dezelfde kleur uitkomen als
 * het kledingstuk dat ernaast staat; anders klik je op bruin en krijg je zwart.
 * Houd deze waarde gelijk aan DETAILBEELD en aan product_variants.color.
 */
const DETAILKLEUR = 'Bruin'

export default function DetailBlok() {
  const t = useTranslations('shop.detailBlok')

  return (
    <section className="mt-14 border-t border-gray-200 pt-12 md:mt-20 md:pt-16">
      {/* Begrensde breedte: op een breed scherm zou een halve kolom van 4:5
          bijna een heel beeldscherm hoog worden, en dit blok hoort rustig te
          zijn en niet de pagina over te nemen. */}
      <div className="mx-auto grid max-w-4xl items-center gap-8 md:grid-cols-2 md:gap-12">
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 md:aspect-[4/5]">
          <Image
            src={DETAILBEELD}
            alt={t('beeldAlt')}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            quality={95}
            loading="lazy"
            className="object-cover object-center"
          />
        </div>

        <div className="md:pr-6">
          <h2 className="font-display text-2xl uppercase leading-tight tracking-tight text-black md:text-3xl">
            {t('titel')}
          </h2>
          <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-gray-700">
            {t('tekst')}
          </p>
          <LocaleLink
            href={buildPdpHref('mose-essential-hoodie', DETAILKLEUR)}
            className="mt-6 inline-flex min-h-[44px] items-center border-2 border-black bg-white px-6 py-3 text-[13px] font-bold uppercase tracking-wider text-black transition-colors hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            {t('knop')}
          </LocaleLink>
        </div>
      </div>
    </section>
  )
}
