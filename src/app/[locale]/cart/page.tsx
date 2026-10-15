'use client'

import { useState, useEffect } from 'react'
import { formatPrice, formatAmount } from '@/lib/format-price'
import Image from 'next/image'
import { useCart, useCartGehydrateerd } from '@/store/cart'
import { getSiteSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/client'
import {
  computeCartStaffelBreakdown,
  type StaffelHint,
} from '@/lib/cart-staffel-display'
import { Trash2, X, Minus, Plus, Truck, Lock, RotateCcw, ArrowLeft, ShoppingBag } from 'lucide-react'
import Betaalmethoden from '@/components/Betaalmethoden'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export default function CartPage() {
  const t = useTranslations('cart')
  const locale = useLocale()
  const { items, removeItem, updateQuantity, clearCart, getTotal, getItemCount } = useCart()
  const mandGeladen = useCartGehydrateerd()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [shippingCost, setShippingCost] = useState(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(100)
  const [returnDays, setReturnDays] = useState(30)
  const [staffelSavings, setStaffelSavings] = useState(0)
  const [lineStaffelByVariant, setLineStaffelByVariant] = useState<Record<string, number>>({})
  const [staffelHints, setStaffelHints] = useState<StaffelHint[]>([])
  
  const subtotal = getTotal()
  const subtotalAfterStaffel = subtotal - staffelSavings
  const shipping = subtotalAfterStaffel >= freeShippingThreshold ? 0 : shippingCost
  
  // De BTW zit in de prijzen, dus hier wordt hij eruit gerekend en niet
  // opgeteld. Hij stond als losse regel tussen subtotaal en verzending, waar
  // hij las alsof hij er nog bovenop kwam. Nu staat hij onder het totaal.
  const vatRate = 0.21
  const totalBtw = (subtotalAfterStaffel + shipping) * (vatRate / (1 + vatRate))
  
  const total = subtotalAfterStaffel + shipping

  useEffect(() => {
    getSiteSettings().then((settings) => {
      setShippingCost(settings.shipping_cost)
      setFreeShippingThreshold(settings.free_shipping_threshold)
      setReturnDays(settings.return_days)
    })
  }, [])

  useEffect(() => {
    if (items.length === 0) {
      setStaffelSavings(0)
      setLineStaffelByVariant({})
      setStaffelHints([])
      return
    }
    const calc = async () => {
      const supabase = createClient()
      const productIds = [...new Set(items.map((i) => i.productId))]
      const { data: tiers } = await supabase
        .from('product_quantity_discounts')
        .select('product_id, min_quantity, discount_type, discount_value, is_active')
        .in('product_id', productIds)
        .eq('is_active', true)
      const { data: products } = await supabase
        .from('products')
        .select('id, sale_price, base_price')
        .in('id', productIds)
      if (!tiers || tiers.length === 0) {
        setStaffelSavings(0)
        setLineStaffelByVariant({})
        setStaffelHints([])
        return
      }
      const saleByProductId: Record<string, boolean> = {}
      products?.forEach((p) => {
        if (p.sale_price && p.sale_price < p.base_price) saleByProductId[p.id] = true
      })
      const breakdown = computeCartStaffelBreakdown(items, tiers, saleByProductId)
      setStaffelSavings(breakdown.totalSavings)
      setLineStaffelByVariant(breakdown.lineSavingByVariantId)
      setStaffelHints(breakdown.hints)
    }
    calc()
  }, [items])

  // Niet "leeg" roepen zolang de mand nog uit localStorage wordt teruggelezen.
  // Bij een volledige paginalading met een gevulde mand flitste hier eerst het
  // lege scherm voorbij.
  if (!mandGeladen) {
    return (
      <div className="min-h-screen px-4 pb-16">
        <div className="max-w-4xl mx-auto py-24 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-brand-primary" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen px-4 pb-20">
        <div className="mx-auto max-w-xl py-16 text-center md:py-24">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center border-2 border-gray-300 md:h-24 md:w-24">
            <ShoppingBag className="h-10 w-10 text-gray-300 md:h-12 md:w-12" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h1 className="mb-3 font-display text-4xl uppercase md:text-5xl">{t('empty.title')}</h1>
          <p className="mx-auto mb-8 max-w-sm text-gray-600">{t('empty.message')}</p>

          {/* Twee uitgangen in plaats van een. Wie hier belandt is niet altijd
              op zoek naar de hele collectie; een deel van het verkeer komt
              vanuit de lookbook binnen. */}
          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <LocaleLink href="/shop" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              {t('empty.continue')}
            </LocaleLink>
            <LocaleLink href="/lookbook" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Lookbook
            </LocaleLink>
          </div>

          <ul className="mx-auto mt-12 max-w-xs space-y-2.5 border-t border-gray-200 pt-8 text-left text-sm text-gray-600">
            <li className="flex items-center gap-2.5">
              <Truck size={17} className="flex-shrink-0 text-black" aria-hidden="true" />
              <span>{t('trust.freeShipping', { amount: formatAmount(freeShippingThreshold, locale) })}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Lock size={17} className="flex-shrink-0 text-black" aria-hidden="true" />
              <span>{t('trust.secure')}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <RotateCcw size={17} className="flex-shrink-0 text-black" aria-hidden="true" />
              <span>{t('trust.returns', { days: returnDays })}</span>
            </li>
          </ul>
        </div>
      </div>
    )
  }

  /**
   * Hoeveel er nog van deze regel bij kan. `null` is onbeperkt (cadeaubonnen
   * hebben geen voorraad). Zonder deze grens kon je hier met de plusknop tien
   * stuks van een laatste exemplaar bestellen; in de la zat die grens wel.
   */
  const maxAantal = (item: { stock: number; isPresale?: boolean; presaleStock?: number; isGiftCard?: boolean }) => {
    if (item.isGiftCard) return null
    const max = item.isPresale ? (item.presaleStock ?? 0) : item.stock
    return Number.isFinite(max) && max > 0 ? max : null
  }

  const tekortVoorGratis = Math.max(0, freeShippingThreshold - subtotalAfterStaffel)
  const voortgang = freeShippingThreshold > 0
    ? Math.min(100, Math.round((subtotalAfterStaffel / freeShippingThreshold) * 100))
    : 100

  /**
   * De prijsopbouw, één keer geschreven en op beide kolombreedtes gebruikt.
   *
   * Hiervoor stond deze lijst drie keer in het bestand: een desktopversie, een
   * versie in het mobiele uitschuifpaneel, en losse regels in de vaste balk.
   * Drie plekken die uit elkaar liepen; de BTW stond in de ene als losse regel
   * tussen subtotaal en verzending, alsof hij er nog bij kwam.
   */
  const Prijsopbouw = () => (
    <div className="space-y-3">
      <div className="flex justify-between text-base">
        <span className="uppercase tracking-wider text-gray-600">{t('subtotal')}</span>
        <span className="font-semibold tabular-nums">{formatPrice(subtotal, locale)}</span>
      </div>

      {staffelSavings > 0 && (
        <div className="flex justify-between text-base">
          <span className="uppercase tracking-wider text-gray-600">{t('staffel.label')}</span>
          <span className="font-semibold tabular-nums text-brand-primary">
            −{formatPrice(staffelSavings, locale)}
          </span>
        </div>
      )}

      {staffelHints.length > 0 && (
        <div className="space-y-1 border-l-2 border-gray-300 pl-3 py-1 text-sm text-gray-600">
          {staffelHints.map((h, i) => (
            <p key={`${h.productId}-${i}`} className="leading-snug">
              {t('staffel.nextTier', {
                product: h.productName,
                needed: h.needed,
                discount: h.discountLabel,
              })}
            </p>
          ))}
        </div>
      )}

      <div className="flex justify-between text-base">
        <span className="uppercase tracking-wider text-gray-600">{t('shipping')}</span>
        <span className="font-semibold tabular-nums">
          {shipping === 0 ? (
            <span className="text-brand-primary">{t('shippingFree')}</span>
          ) : (
            formatPrice(shipping, locale)
          )}
        </span>
      </div>
    </div>
  )

  /**
   * De voortgang naar gratis verzending, als balk in plaats van als zin.
   *
   * "Nog €25 tot gratis verzending" was alleen tekst. Een balk laat in één
   * oogopslag zien hoe dichtbij je bent, en dat is precies het moment waarop
   * iemand besluit er nog iets bij te leggen.
   */
  const Verzendbalk = () => (
    <div className="border border-gray-200 bg-white px-4 py-3">
      <p className="text-sm text-gray-700">
        {tekortVoorGratis > 0
          ? t('freeShippingProgress', { amount: formatAmount(tekortVoorGratis, locale) })
          : t('freeShippingReached')}
      </p>
      <div
        className="mt-2 h-1.5 w-full bg-gray-200"
        role="progressbar"
        aria-valuenow={voortgang}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('freeShippingProgress', { amount: formatAmount(tekortVoorGratis, locale) })}
      >
        <div
          className="h-full bg-brand-primary transition-[width] duration-500"
          style={{ width: `${voortgang}%` }}
        />
      </div>
    </div>
  )

  const Vertrouwen = () => (
    <ul className="space-y-2.5 text-sm text-gray-600">
      <li className="flex items-center gap-2.5">
        <Truck size={17} className="flex-shrink-0 text-black" aria-hidden="true" />
        <span>{t('trust.freeShipping', { amount: formatAmount(freeShippingThreshold, locale) })}</span>
      </li>
      <li className="flex items-center gap-2.5">
        <Lock size={17} className="flex-shrink-0 text-black" aria-hidden="true" />
        <span>{t('trust.secure')}</span>
      </li>
      <li className="flex items-center gap-2.5">
        <RotateCcw size={17} className="flex-shrink-0 text-black" aria-hidden="true" />
        <span>{t('trust.returns', { days: returnDays })}</span>
      </li>
    </ul>
  )

  return (
    /* De onderruimte op mobiel moet de vaste balk én de cookiebalk vrijhouden.
       Met pb-32 verdween het laatste artikel eronder zodra de cookiebalk in
       beeld stond. Zes rem dekt de balk van ongeveer 72px met marge; meer
       levert een zichtbaar gat boven de voettekst op. */
    <div className="min-h-screen pb-[calc(6rem+var(--cookie-consent-height,0px))] md:pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-5 md:pt-12">

        {/* Kop */}
        <div className="mb-6 md:mb-12">
          <LocaleLink
            href="/shop"
            className="mb-2 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-black"
          >
            <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" />
            {t('empty.continue')}
          </LocaleLink>
          <h1 className="font-display text-4xl uppercase leading-none md:text-6xl">{t('title')}</h1>
          <p className="mt-2 text-sm uppercase tracking-wider text-gray-600">
            {t('items', { count: getItemCount() })}
          </p>
        </div>

        {/* Twee kolommen op desktop: artikelen links, samenvatting rechts en
            meelopend. Hiervoor stond de samenvatting ónder de volledige lijst,
            waardoor je op een breed scherm langs alles moest scrollen om bij de
            afrekenknop te komen, met een half lege grijze band ernaast. */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_368px] lg:gap-14 lg:items-start">

          {/* Artikelen */}
          <section aria-label={t('title')}>
            <ul className="border-t-2 border-black">
              {items.map((item) => {
                const max = maxAantal(item)
                const opMaximum = max !== null && item.quantity >= max
                const bijnaOp = max !== null && max <= 3
                return (
                  <li key={item.variantId} className="border-b border-gray-200 py-5 md:py-6">
                    <div className="flex gap-4 md:gap-6">
                      <LocaleLink
                        href={`/product/${item.slug || item.productId}`}
                        className="relative h-[128px] w-[96px] flex-shrink-0 overflow-hidden bg-gray-100 md:h-[160px] md:w-[120px]"
                      >
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="(max-width: 768px) 96px, 120px"
                          className="object-cover object-center"
                        />
                      </LocaleLink>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <LocaleLink
                              href={`/product/${item.slug || item.productId}`}
                              className="font-display text-lg uppercase leading-tight transition-colors hover:text-brand-primary md:text-2xl"
                            >
                              {item.name}
                            </LocaleLink>

                            {item.isGiftCard ? (
                              <div className="mt-1.5 space-y-0.5 text-sm text-gray-600">
                                <div>
                                  <span className="mr-1.5 text-[11px] uppercase tracking-[0.15em] text-gray-500">
                                    {t('giftCard.value')}
                                  </span>
                                  <span className="font-medium">
                                    {formatPrice(Number(item.giftCardAmount ?? item.price), locale)}
                                  </span>
                                </div>
                                {item.giftCardRecipient?.recipientName ? (
                                  <div className="text-xs text-gray-600 md:text-sm">
                                    {t('giftCard.for')}{' '}
                                    <span className="font-medium">{item.giftCardRecipient.recipientName}</span>
                                    {item.giftCardRecipient.recipientEmail
                                      ? ` · ${item.giftCardRecipient.recipientEmail}`
                                      : ''}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 md:text-sm">
                                    {t('giftCard.selfDelivery')}
                                  </div>
                                )}
                                {item.giftCardRecipient?.scheduledSendAt ? (
                                  <div className="text-xs text-gray-500">
                                    {t('giftCard.scheduled')}{' '}
                                    {new Date(item.giftCardRecipient.scheduledSendAt).toLocaleString(undefined, {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              /* De stukprijs stond hier met `hidden md:inline`, dus op
                                 telefoon zag je alleen het regeltotaal. Bij twee stuks
                                 was dan niet te zien wat één exemplaar kost. */
                              <p className="mt-1.5 text-sm text-gray-600">
                                {item.color} · {t('size')} {item.size} · {formatPrice(item.price, locale)}
                              </p>
                            )}

                            {bijnaOp && (
                              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-brand-primary">
                                {max === 1 ? t('lastOne') : t('onlyLeft', { count: max })}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => removeItem(item.variantId)}
                            className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-gray-500 transition-colors hover:bg-black hover:text-white"
                            aria-label={`${t('remove')}: ${item.name}`}
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                          <div>
                            <div className="flex w-max items-center border border-black">
                              <button
                                onClick={() => updateQuantity(item.variantId, Math.max(1, item.quantity - 1))}
                                disabled={item.quantity <= 1}
                                className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black"
                                aria-label={t('decrease')}
                              >
                                <Minus size={16} />
                              </button>
                              <span className="w-10 text-center font-bold tabular-nums">{item.quantity}</span>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.variantId,
                                    max === null ? item.quantity + 1 : Math.min(max, item.quantity + 1)
                                  )
                                }
                                disabled={opMaximum}
                                className="flex h-11 w-11 items-center justify-center transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black"
                                aria-label={t('increase')}
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                            {opMaximum && (
                              <p className="mt-1.5 text-xs text-gray-500">{t('maxReached')}</p>
                            )}
                          </div>

                          <div className="text-right">
                            <div className="font-display text-xl tabular-nums md:text-2xl">
                              {formatPrice(item.price * item.quantity, locale)}
                            </div>
                            {(lineStaffelByVariant[item.variantId] ?? 0) > 0 && (
                              <p className="ml-auto mt-1 max-w-[200px] text-xs leading-snug text-gray-600">
                                {t('staffel.lineSaving', {
                                  amount: formatAmount(lineStaffelByVariant[item.variantId], locale),
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Legen staat onderaan en rustig. Hij stond rechtsboven naast de
                titel, met een prullenbak ernaast: de meest opvallende knop van
                de pagina was de enige die je mand weggooit. */}
            <button
              onClick={() => setShowClearConfirm(true)}
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 text-sm text-gray-500 underline-offset-4 transition-colors hover:text-black hover:underline"
            >
              <Trash2 size={15} aria-hidden="true" />
              {t('clearCart')}
            </button>
          </section>

          {/* Samenvatting */}
          <aside
            aria-label={t('total')}
            className="lg:sticky lg:top-[calc(var(--header-total-height,90px)+1.5rem)]"
          >
            <div className="border-2 border-black bg-gray-50 p-6">
              <Prijsopbouw />

              <div className="mt-5">
                <Verzendbalk />
              </div>

              <div className="mt-5 border-t-2 border-black pt-5">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-xl uppercase">{t('total')}</span>
                  <span className="font-display text-3xl tabular-nums">{formatPrice(total, locale)}</span>
                </div>
                <p className="mt-1 text-right text-xs uppercase tracking-wider text-gray-500">
                  {t('totalInclusive')} · {locale === 'en' ? 'VAT' : 'BTW'}{' '}
                  {formatPrice(totalBtw, locale)}
                </p>
              </div>

              <LocaleLink
                href="/checkout"
                className={cn(buttonVariants({ variant: 'primary', size: 'lg', fullWidth: true }), 'mt-5')}
              >
                {t('checkout')}
              </LocaleLink>

              <Betaalmethoden className="mt-4 justify-center" />

              <div className="mt-5 border-t border-gray-200 pt-5">
                <Vertrouwen />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Vaste balk op mobiel.
          Het uitschuifpaneel met de prijsopbouw is vervallen: die opbouw staat
          nu gewoon op de pagina, een stukje naar beneden. Een paneel dat
          dezelfde regels nog een keer toont, is een extra tik voor informatie
          die er al staat. */}
      <div
        data-onderbalk
        className="fixed bottom-[var(--cookie-consent-height)] left-0 right-0 z-40 flex items-stretch bg-black pb-[env(safe-area-inset-bottom)] text-white md:hidden"
      >
        <div className="flex-1 py-3 pl-4 pr-2">
          <div className="font-display text-2xl leading-tight tabular-nums">{formatPrice(total, locale)}</div>
          <div className="text-[11px] uppercase tracking-wider text-gray-300">
            {tekortVoorGratis > 0
              ? t('freeShippingProgressMobile', { amount: formatAmount(tekortVoorGratis, locale) })
              : t('freeShippingReached')}
          </div>
        </div>
        <LocaleLink
          href="/checkout"
          className={cn(buttonVariants({ variant: 'primary' }), 'my-3 mr-4 self-center')}
        >
          {t('checkout')} →
        </LocaleLink>
      </div>

      {/* Bevestiging voor het legen */}
      {showClearConfirm && (
        <div className="animate-fadeIn fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border-4 border-black bg-white p-8">
            <h3 className="mb-4 font-display text-2xl uppercase md:text-3xl">{t('clearConfirm.title')}</h3>
            <p className="mb-8 text-gray-600">{t('clearConfirm.message')}</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
              >
                {t('clearConfirm.cancel')}
              </button>
              <button
                onClick={() => {
                  clearCart()
                  setShowClearConfirm(false)
                }}
                className={cn(buttonVariants({ variant: 'danger' }), 'flex-1')}
              >
                {t('clearConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
