'use client'

/**
 * "Maak je look compleet" in de winkelmand.
 *
 * Compacte rijen onder elkaar in plaats van een zijwaartse strook: die
 * sneed de tweede kaart af ("MOSE CL…"), en dat oogde als een fout. Per rij
 * een foto, naam, prijs en de beschikbare kleuren; "Kies maat en kleur" klapt
 * de rij open.
 *
 * Kleur en maat zijn altijd zichtbaar voordat iets in de mand gaat. De
 * vorige versie zocht de variant alleen op maat en legde dus een willekeurige
 * kleur in de mand, met de standaardfoto erbij.
 *
 * Voorselectie: de maat uit de mand (als die er is en op voorraad), en de
 * kleur die het best combineert met wat er al in de mand ligt. De foto en
 * het kleurlabel wisselen mee, zodat je ziet wat je toevoegt.
 */

import { availableVariant, type VariantAvailability } from '@/lib/variant-availability'
import { useLiveAvailability } from '@/hooks/useLiveAvailability'
import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'
import { formatPrice } from '@/lib/format-price'
import { getImageForColor, type ProductDisplayImage } from '@/lib/product-display'

export interface LookVariant extends VariantAvailability {
  id: string
  sku: string
  size: string
  color: string | null
  color_hex: string | null
  stock_quantity: number
  price_adjustment?: number | null
  is_available: boolean
}

export interface LookProduct {
  id: string
  name: string
  name_en?: string | null
  slug: string
  base_price: number
  sale_price?: number | null
  product_images: ProductDisplayImage[]
  product_variants: LookVariant[]
}

export interface MandRegel {
  productId: string
  name: string
  size: string
  color?: string | null
}

interface Props {
  producten: LookProduct[]
  mand: MandRegel[]
  locale: string
  bezigMet: string | null
  onToevoegen: (product: LookProduct, variant: LookVariant, beeld: string) => void
  onNaarProduct: () => void
}

const MAATVOLGORDE = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL']

/**
 * Welke kleur het best combineert met een kleur in de mand. Eerst het
 * contrast dat altijd werkt (licht bij donker, donker bij licht), daarna de
 * aardetinten die bij elkaar passen. Kleuren die een product niet heeft,
 * vallen vanzelf weg.
 */
const COMBINEERT: Record<string, string[]> = {
  zwart: ['wit', 'off white', 'beige', 'groen', 'bruin', 'zwart'],
  bruin: ['beige', 'off white', 'wit', 'zwart', 'groen', 'bruin'],
  groen: ['beige', 'wit', 'off white', 'zwart', 'bruin', 'groen'],
  wit: ['zwart', 'groen', 'bruin', 'beige', 'off white', 'wit'],
  'off white': ['zwart', 'bruin', 'groen', 'beige', 'wit', 'off white'],
  beige: ['bruin', 'groen', 'zwart', 'off white', 'wit', 'beige'],
}

/** Bijvoeglijk naamwoord voor in de zin: "je zwarte hoodie". */
const KLEURWOORD: Record<string, { nl: string; en: string }> = {
  zwart: { nl: 'zwarte', en: 'black' },
  bruin: { nl: 'bruine', en: 'brown' },
  groen: { nl: 'groene', en: 'green' },
  wit: { nl: 'witte', en: 'white' },
  'off white': { nl: 'off-white', en: 'off-white' },
  beige: { nl: 'beige', en: 'beige' },
}

/** Kleurnaam zoals een klant hem leest, in de taal van de pagina. */
const KLEURNAAM: Record<string, { nl: string; en: string }> = {
  zwart: { nl: 'Zwart', en: 'Black' },
  bruin: { nl: 'Bruin', en: 'Brown' },
  groen: { nl: 'Groen', en: 'Green' },
  wit: { nl: 'Wit', en: 'White' },
  'off white': { nl: 'Off-white', en: 'Off-white' },
  beige: { nl: 'Beige', en: 'Beige' },
}

function soortVan(naam: string): { nl: string; en: string } | null {
  const n = naam.toLowerCase()
  if (n.includes('hoodie')) return { nl: 'hoodie', en: 'hoodie' }
  if (n.includes('sweater')) return { nl: 'sweater', en: 'sweater' }
  if (n.includes('tee') || n.includes('shirt')) return { nl: 'tee', en: 'tee' }
  return null
}

export default function LookCompleet({ producten: initialProducts, mand, locale, bezigMet, onToevoegen, onNaarProduct }: Props) {
  const producten = useLiveAvailability(initialProducts)
  const t = useTranslations('cart.upsell')
  const en = locale === 'en'
  const [open, setOpen] = useState<string | null>(null)
  const [keuze, setKeuze] = useState<Record<string, { kleur: string; maat: string | null }>>({})

  // Het mandproduct waar de suggestie op aansluit: het eerste kledingstuk met kleur.
  const anker = mand.find((m) => m.color && soortVan(m.name))
  const ankerKleur = anker?.color?.toLowerCase() || null
  const mandMaat = mand.find((m) => MAATVOLGORDE.includes((m.size || '').toUpperCase()))?.size?.toUpperCase() || null

  const rijen = producten.map((p) => {
    const varianten = p.product_variants.filter((v) => v.is_available && v.color)
    const kleuren = [...new Set(varianten.map((v) => v.color as string))]
    const volgorde = ankerKleur ? COMBINEERT[ankerKleur] || [] : []
    kleuren.sort((a, b) => {
      const ia = volgorde.indexOf(a.toLowerCase())
      const ib = volgorde.indexOf(b.toLowerCase())
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    const opVoorraad = (kleur: string) => varianten.some((v) => v.color === kleur && availableVariant(v))
    const inMandMaat = (kleur: string) =>
      !!mandMaat && varianten.some((v) => v.color === kleur && v.size.toUpperCase() === mandMaat && availableVariant(v))
    // Liefst de best combinerende kleur die er in jouw maat is; anders de
    // best combinerende die er überhaupt is.
    const besteKleur = kleuren.find(inMandMaat) || kleuren.find(opVoorraad) || kleuren[0]
    return { p, varianten, kleuren, besteKleur }
  })

  if (rijen.length === 0) return null

  const huidige = (id: string, besteKleur: string, varianten: LookVariant[]) => {
    const k = keuze[id]
    if (k) return k
    const maatOk = mandMaat && varianten.some((v) => v.color === besteKleur && v.size.toUpperCase() === mandMaat && availableVariant(v))
    return { kleur: besteKleur, maat: maatOk ? mandMaat : null }
  }

  return (
    <section className="border-t-2 border-gray-200 px-4 pb-4 pt-4 md:px-6" aria-labelledby="look-compleet">
      <h3 id="look-compleet" className="mb-3 font-display text-base uppercase tracking-wide">
        {t('completeLook')}
      </h3>
      <ul className="m-0 list-none space-y-2 p-0">
        {rijen.map(({ p, varianten, kleuren, besteKleur }) => {
          const k = huidige(p.id, besteKleur, varianten)
          const isOpen = open === p.id
          const naam = en && p.name_en ? p.name_en : p.name
          const beeld = getImageForColor(p.product_images, k.kleur)
          const maten = [...new Set(varianten.filter((v) => v.color === k.kleur).map((v) => v.size))].sort(
            (a, b) => MAATVOLGORDE.indexOf(a.toUpperCase()) - MAATVOLGORDE.indexOf(b.toUpperCase()),
          )
          const variant = k.maat ? varianten.find((v) => v.color === k.kleur && v.size.toUpperCase() === k.maat) : undefined
          const prijs = (p.sale_price ?? p.base_price) + (variant?.price_adjustment ?? 0)
          const kleurLabel = KLEURNAAM[k.kleur.toLowerCase()]?.[en ? 'en' : 'nl'] || k.kleur
          const ankerSoort = anker ? soortVan(anker.name) : null
          const reden =
            ankerKleur && ankerSoort && KLEURWOORD[ankerKleur]
              ? t('pairsWith', { kleur: KLEURWOORD[ankerKleur][en ? 'en' : 'nl'], product: ankerSoort[en ? 'en' : 'nl'] })
              : null
          const bezig = bezigMet === p.id

          return (
            <li key={p.id} className={`border-2 transition-colors ${isOpen ? 'border-black' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3 p-2">
                <LocaleLink
                  href={`/product/${p.slug}?color=${encodeURIComponent(k.kleur)}`}
                  onClick={onNaarProduct}
                  className="relative h-[72px] w-[56px] flex-shrink-0 overflow-hidden bg-gray-100"
                >
                  <Image src={beeld} alt={`${naam} ${kleurLabel}`} fill sizes="56px" quality={90} className="object-cover" />
                </LocaleLink>
                <div className="min-w-0 flex-1">
                  <LocaleLink
                    href={`/product/${p.slug}?color=${encodeURIComponent(k.kleur)}`}
                    onClick={onNaarProduct}
                    className="line-clamp-2 block text-[13px] font-bold uppercase leading-tight hover:underline"
                  >
                    {naam}
                  </LocaleLink>
                  <p className="mt-0.5 text-[13px] font-bold text-black">{formatPrice(prijs, locale)}</p>
                  {reden ? (
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-gray-600">{reden}</p>
                  ) : (
                    <p className="mt-1 flex gap-1" aria-hidden="true">
                      {kleuren.map((c) => {
                        const hex = varianten.find((v) => v.color === c)?.color_hex || '#ccc'
                        return <span key={c} className="h-2.5 w-2.5 border border-black/20" style={{ backgroundColor: hex }} />
                      })}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    const rij = e.currentTarget.closest('li')
                    setOpen(isOpen ? null : p.id)
                    // De keuze klapt onder de rij open; scroll hem in beeld zodat de
                    // knop "Voeg toe" niet achter het vaste totaalblok verdwijnt.
                    if (!isOpen) setTimeout(() => rij?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60)
                  }}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? t('close') : `${t('choose')}: ${naam}`}
                  aria-controls={`look-${p.id}`}
                  className={`min-h-[44px] flex-shrink-0 border-2 px-3 text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                    isOpen ? 'border-black bg-white text-black' : 'border-black bg-black text-white hover:bg-gray-900'
                  }`}
                >
                  {isOpen ? t('close') : `+ ${t('quickAdd')}`}
                </button>
              </div>

              {isOpen && (
                <div id={`look-${p.id}`} className="space-y-3 border-t-2 border-gray-200 p-3">
                  <fieldset>
                    <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-700">
                      {t('color')}: <span className="text-black">{kleurLabel}</span>
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {kleuren.map((c) => {
                        const hex = varianten.find((v) => v.color === c)?.color_hex || '#ccc'
                        const leeg = !varianten.some((v) => v.color === c && availableVariant(v))
                        const actief = c === k.kleur
                        const label = KLEURNAAM[c.toLowerCase()]?.[en ? 'en' : 'nl'] || c
                        return (
                          <button
                            key={c}
                            type="button"
                            disabled={leeg}
                            onClick={() => {
                              const maatOk = k.maat && varianten.some((v) => v.color === c && v.size.toUpperCase() === k.maat && availableVariant(v))
                              setKeuze((prev) => ({ ...prev, [p.id]: { kleur: c, maat: maatOk ? k.maat : null } }))
                            }}
                            aria-pressed={actief}
                            aria-label={leeg ? `${label}, ${t('soldOut')}` : label}
                            title={label}
                            className={`relative h-9 w-9 border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-40 ${
                              actief ? 'border-black ring-2 ring-black ring-offset-2' : 'border-gray-300 hover:border-black'
                            }`}
                            style={{ backgroundColor: hex }}
                          >
                            {leeg && <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-[2px] w-[130%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-black/60" />}
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-700">
                      {t('sizeLabel')}
                      {k.maat ? <span className="text-black">: {k.maat}</span> : null}
                    </legend>
                    <div className="flex gap-2">
                      {maten.map((maat) => {
                        const v = varianten.find((x) => x.color === k.kleur && x.size === maat)
                        const leeg = !v || !availableVariant(v)
                        const actief = k.maat === maat.toUpperCase()
                        return (
                          <button
                            key={maat}
                            type="button"
                            disabled={leeg}
                            onClick={() => setKeuze((prev) => ({ ...prev, [p.id]: { kleur: k.kleur, maat: maat.toUpperCase() } }))}
                            aria-pressed={actief}
                            aria-label={leeg ? `${maat}, ${t('soldOut')}` : maat}
                            className={`min-h-[44px] flex-1 border-2 text-[13px] font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:text-gray-400 disabled:line-through ${
                              actief ? 'border-black bg-black text-white' : 'border-gray-300 bg-white text-black hover:border-black'
                            }`}
                          >
                            {maat}
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>

                  <button
                    type="button"
                    disabled={!variant || bezig}
                    onClick={() => variant && onToevoegen(p, variant, beeld)}
                    className="min-h-[48px] w-full bg-brand-primary text-[13px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                  >
                    {bezig ? t('added') : variant ? t('addWith', { kleur: kleurLabel, maat: variant.size }) : t('pickSize')}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
