'use client'

import { useTranslations } from 'next-intl'

interface ModelFitInfoProps {
  /** Optionele voornaam van het model. Wanneer leeg valt 'ie terug op
   *  het generieke "Model" uit de i18n. */
  name?: string | null
  /** Lengte van het model, vrije tekst. Verplicht voor weergave. */
  height?: string | null
  /** Bouw / lichaamstype, vrije tekst. Optioneel. */
  build?: string | null
  /** Maat die het model draagt, vrije tekst. Verplicht voor weergave. */
  sizeWorn?: string | null
}

/**
 * Pasvorm-referentie als COMPACTE OVERLAY-TAG op de hoofd-product-
 * afbeelding (linksonder).
 *
 * Render-regels:
 *   * Verplicht: lengte EN gedragen maat → anders null.
 *   * Optioneel: naam (anders "Model" uit i18n).
 *   * Optioneel: bouw → aparte i18n-string als ingevuld.
 */
export default function ModelFitInfo({
  name,
  height,
  build,
  sizeWorn,
}: ModelFitInfoProps) {
  const t = useTranslations('product.modelFit')

  const cleanName = name?.trim() || null
  const cleanHeight = height?.trim() || null
  const cleanSize = sizeWorn?.trim() || null
  const cleanBuild = build?.trim() || null

  if (!cleanHeight || !cleanSize) {
    return null
  }

  const displayName = cleanName || t('genericName')

  const line = cleanBuild
    ? t('overlayWithBuild', {
        name: displayName,
        height: cleanHeight,
        build: cleanBuild,
        size: cleanSize,
      })
    : t('overlay', {
        name: displayName,
        height: cleanHeight,
        size: cleanSize,
      })

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)]"
    >
      <span className="inline-block bg-black/70 text-white border-2 border-black/80 backdrop-blur-sm px-2.5 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.22)]">
        <span className="block text-[10px] md:text-[11px] font-bold uppercase tracking-[0.05em] leading-snug whitespace-normal">
          {line}
        </span>
      </span>
    </div>
  )
}
