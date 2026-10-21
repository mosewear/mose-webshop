'use client'

/**
 * "Van dichtbij": detailbeelden van de gekozen kleur onder het productblok.
 *
 * De beelden staan in een eigen tabel (product_detail_images), los van de
 * productgalerij. Daardoor veranderen de galerij, de shoptegels en de
 * Google-feed niet, en is het blok terug te draaien door de rijen op
 * actief = false te zetten. Zonder beelden voor de gekozen kleur rendert het
 * niets.
 */

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

interface Detailbeeld {
  id: string
  color: string
  position: number
  url: string
  label_nl: string
  label_en: string
  alt_nl: string
  alt_en: string
}

/** Vaste klassen, zodat Tailwind ze bij het bouwen vindt. */
const KOLOMMEN: Record<number, string> = { 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' }

interface Props {
  productId: string
  color: string
  locale: string
}

export default function ProductDetailStrip({ productId, color, locale }: Props) {
  const t = useTranslations('product.detailStrip')
  const [beelden, setBeelden] = useState<Detailbeeld[]>([])
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    let weg = false
    createClient()
      .from('product_detail_images')
      .select('id, color, position, url, label_nl, label_en, alt_nl, alt_en')
      .eq('product_id', productId)
      .order('position')
      .then(({ data }) => {
        if (!weg && data) setBeelden(data as Detailbeeld[])
      })
    return () => {
      weg = true
    }
  }, [productId])

  const vanKleur = beelden.filter((b) => b.color === color)
  const en = locale === 'en'

  const sluit = useCallback(() => setOpen(null), [])
  useEffect(() => {
    if (open === null) return
    const toets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') sluit()
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % vanKleur.length))
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + vanKleur.length) % vanKleur.length))
    }
    window.addEventListener('keydown', toets)
    return () => window.removeEventListener('keydown', toets)
  }, [open, sluit, vanKleur.length])

  if (vanKleur.length === 0) return null
  const groot = open !== null ? vanKleur[open] : null

  return (
    <section className="mt-16 border-t-2 border-gray-200 pt-12 md:mt-24 md:pt-16" aria-labelledby="van-dichtbij">
      <h2 id="van-dichtbij" className="mb-6 font-display text-3xl uppercase md:mb-8 md:text-4xl">
        {t('title')}
      </h2>
      {/* Telefoon twee per rij, tablet drie, breed scherm alles op één rij.
          Met drie per rij op desktop werd elke foto groter dan een half scherm. */}
      <ul className={`m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 md:gap-4 ${KOLOMMEN[Math.min(vanKleur.length, 6)] || ''}`}>
        {vanKleur.map((b, i) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              aria-label={`${en ? b.label_en : b.label_nl}, ${t('enlarge')}`}
            >
              <span className="relative block aspect-square overflow-hidden border-2 border-black bg-gray-100">
                <Image
                  src={b.url}
                  alt={en ? b.alt_en : b.alt_nl}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 260px"
                  quality={90}
                  loading="lazy"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                />
              </span>
              <span className="mt-2 block text-[12px] font-bold uppercase tracking-wider text-gray-800 md:text-[13px]">
                {en ? b.label_en : b.label_nl}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {groot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={en ? groot.label_en : groot.label_nl}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4"
          onClick={sluit}
        >
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-square w-full overflow-hidden bg-black">
              <Image src={groot.url} alt={en ? groot.alt_en : groot.alt_nl} fill sizes="(max-width: 768px) 100vw, 768px" quality={95} className="object-contain" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-white">
              <span className="text-sm font-bold uppercase tracking-wider">{en ? groot.label_en : groot.label_nl}</span>
              <span className="flex gap-2">
                {vanKleur.length > 1 && (
                  <>
                    <button type="button" onClick={() => setOpen((open! - 1 + vanKleur.length) % vanKleur.length)} className="min-h-[44px] border-2 border-white px-4 text-sm font-bold uppercase" aria-label={t('previous')}>←</button>
                    <button type="button" onClick={() => setOpen((open! + 1) % vanKleur.length)} className="min-h-[44px] border-2 border-white px-4 text-sm font-bold uppercase" aria-label={t('next')}>→</button>
                  </>
                )}
                <button type="button" onClick={sluit} className="min-h-[44px] border-2 border-white bg-white px-4 text-sm font-bold uppercase text-black">{t('close')}</button>
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
