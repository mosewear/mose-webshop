'use client'

import { useTranslations } from 'next-intl'
import { Ruler } from 'lucide-react'

interface ModelFitInfoProps {
  height?: string | null
  build?: string | null
  sizeWorn?: string | null
}

/**
 * Pasvorm-referentie strip op de PDP.
 *
 * Wordt direct onder de maatkiezer getoond zodat klanten hun eigen
 * maat kunnen referencen aan het model in de productfoto's. Als geen
 * van de drie velden is ingevuld in de admin rendert het component
 * helemaal niets - dan blijft de PDP-flow hetzelfde.
 *
 * Brutalist styling consistent met PdpTrustStrip:
 *   - border-2 black
 *   - subtiele gray bg om visueel los van de buttons te staan
 *   - icon in brand-primary, label uppercase tracked
 *   - inhoud in chips zodat losse velden niet rommelig ogen wanneer
 *     er maar één of twee zijn ingevuld
 */
export default function ModelFitInfo({
  height,
  build,
  sizeWorn,
}: ModelFitInfoProps) {
  const t = useTranslations('product.modelFit')

  const cleanHeight = height?.trim() || null
  const cleanBuild = build?.trim() || null
  const cleanSize = sizeWorn?.trim() || null

  if (!cleanHeight && !cleanBuild && !cleanSize) {
    return null
  }

  const chips: { label: string; value: string }[] = []
  if (cleanHeight) chips.push({ label: t('height'), value: cleanHeight })
  if (cleanBuild) chips.push({ label: t('build'), value: cleanBuild })
  if (cleanSize) chips.push({ label: t('wears'), value: cleanSize })

  return (
    <div className="border-2 border-black bg-gray-50 p-3 md:p-4">
      <div className="flex items-center gap-2 mb-2">
        <Ruler
          size={14}
          aria-hidden="true"
          className="text-brand-primary flex-shrink-0"
        />
        <span className="text-[11px] md:text-xs font-bold uppercase tracking-[0.15em] text-gray-700">
          {t('label')}
        </span>
      </div>
      <dl className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {chips.map((chip) => (
          <div
            key={chip.label}
            className="flex items-baseline gap-1.5"
          >
            <dt className="text-xs uppercase tracking-wider text-gray-500 font-bold">
              {chip.label}
            </dt>
            <dd className="font-semibold text-black">{chip.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
