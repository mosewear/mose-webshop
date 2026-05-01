'use client'

import { useTranslations } from 'next-intl'

interface ModelFitInfoProps {
  /** Optionele voornaam van het model. Wanneer leeg valt 'ie terug op
   *  het generieke "Model" uit de i18n. */
  name?: string | null
  /** Lengte van het model, vrije tekst. Verplicht voor weergave. */
  height?: string | null
  /** Maat die het model draagt, vrije tekst. Verplicht voor weergave. */
  sizeWorn?: string | null
}

/**
 * Pasvorm-referentie als COMPACTE OVERLAY-TAG op de hoofd-product-
 * afbeelding (linksonder). Vervangt de oude grote card onder de maat-
 * picker zodat de PDP niet onnodig schermruimte verspilt aan iets dat
 * inhoudelijk een korte one-liner is.
 *
 * Render-regels:
 *   * Verplicht: lengte EN gedragen maat. Een tag zonder die twee
 *     velden heeft geen nut, dus dan rendert het component null.
 *   * Optioneel: naam. Met naam → "TYLER IS 1,88 M EN DRAAGT MAAT XL".
 *     Zonder naam → "MODEL IS 1,88 M EN DRAAGT MAAT XL".
 *   * Bouw wordt op de overlay niet getoond (te lang voor één regel),
 *     maar blijft wel in de DB voor toekomstige uitbreidingen.
 *
 * Styling: brutalist MOSE — solid black tile met witte tekst, border
 * voor consistente kantlijn, subtiele drop-shadow zodat de tag los van
 * een wit kledingstuk altijd leesbaar is. Pointer-events disabled
 * zodat de tag niet de zoom-on-click op de afbeelding blokkeert.
 *
 * Plaatsing: deze component MOET ALTIJD direct binnen een ouder met
 * `position: relative` (de gallery container) gerenderd worden,
 * anders verschijnt 'ie ergens raar links-onder op de pagina.
 */
export default function ModelFitInfo({
  name,
  height,
  sizeWorn,
}: ModelFitInfoProps) {
  const t = useTranslations('product.modelFit')

  const cleanName = name?.trim() || null
  const cleanHeight = height?.trim() || null
  const cleanSize = sizeWorn?.trim() || null

  if (!cleanHeight || !cleanSize) {
    return null
  }

  const displayName = cleanName || t('genericName')

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)]"
    >
      <span className="inline-block bg-black text-white border-2 border-black px-2.5 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.28)]">
        <span className="block text-[10px] md:text-[11px] font-bold uppercase tracking-[0.05em] leading-tight">
          {t('overlay', {
            name: displayName,
            height: cleanHeight,
            size: cleanSize,
          })}
        </span>
      </span>
    </div>
  )
}
