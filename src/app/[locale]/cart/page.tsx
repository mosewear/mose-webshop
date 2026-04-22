'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useCart } from '@/store/cart'
import { getSiteSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/client'
import {
  computeCartStaffelBreakdown,
  type StaffelHint,
} from '@/lib/cart-staffel-display'
import { Trash2, X, Minus, Plus, Truck, Lock, RotateCcw } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Link as LocaleLink } from '@/i18n/routing'

export default function CartPage() {
  const t = useTranslations('cart')
  const locale = useLocale()
  const { items, removeItem, updateQuantity, clearCart, getTotal, getItemCount } = useCart()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [shippingCost, setShippingCost] = useState(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(100)
  const [returnDays, setReturnDays] = useState(14)
  const [showMobileSummary, setShowMobileSummary] = useState(false)
  const [staffelSavings, setStaffelSavings] = useState(0)
  const [lineStaffelByVariant, setLineStaffelByVariant] = useState<Record<string, number>>({})
  const [staffelHints, setStaffelHints] = useState<StaffelHint[]>([])
  
  const subtotal = getTotal()
  const subtotalAfterStaffel = subtotal - staffelSavings
  const shipping = subtotalAfterStaffel >= freeShippingThreshold ? 0 : shippingCost
  
  const vatRate = 0.21
  const subtotalExclBtw = subtotalAfterStaffel / (1 + vatRate)
  const btwAmount = subtotalAfterStaffel - subtotalExclBtw
  const shippingExclBtw = shipping / (1 + vatRate)
  const shippingBtw = shipping - shippingExclBtw
  const totalBtw = btwAmount + shippingBtw
  
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

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 md:pt-32 px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16 md:py-24">
            <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-8 border-4 border-gray-300 flex items-center justify-center">
              <svg
                className="w-16 h-16 md:w-20 md:h-20 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <h1 className="text-4xl md:text-6xl font-display mb-4 uppercase">{t('empty.title')}</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
              {t('empty.message')}
            </p>
            <LocaleLink
              href="/shop"
              className="inline-block px-12 py-4 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
            >
              {t('empty.continue')}
            </LocaleLink>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 md:pt-32 px-4 pb-32 md:pb-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-12 md:mb-16">
          <div>
            <h1 className="text-5xl md:text-7xl font-display uppercase mb-2">{t('title')}</h1>
            <p className="text-gray-600 text-lg uppercase tracking-wider">
              {t('items', { count: getItemCount() })}
            </p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors group mt-2"
            aria-label={t('remove')}
          >
            <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline text-sm uppercase tracking-wider font-semibold">{t('remove')}</span>
          </button>
        </div>

        {/* Cart Items */}
        <div className="space-y-0">
          {items.map((item, index) => (
            <div key={item.variantId}>
              {/* Divider */}
              {index > 0 && <div className="border-t-2 border-gray-300" />}
              
              {/* Item Row */}
              <div className="py-8 md:py-10 group hover:bg-gray-50 transition-colors">
                <div className="flex gap-4 md:gap-8">
                  {/* Product Image */}
                  <LocaleLink
                    href={`/product/${item.slug || item.productId}`}
                    className="relative w-24 h-32 md:w-36 md:h-48 bg-gray-100 flex-shrink-0 overflow-hidden"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 96px, 144px"
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  </LocaleLink>

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    {/* Top Section */}
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <LocaleLink
                          href={`/product/${item.slug || item.productId}`}
                          className="font-display text-xl md:text-3xl uppercase hover:text-brand-primary transition-colors leading-tight"
                        >
                          {item.name}
                        </LocaleLink>
                        <button
                          onClick={() => removeItem(item.variantId)}
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                          aria-label={t('remove')}
                        >
                          <X size={18} />
                        </button>
                      </div>
                      {item.isGiftCard ? (
                        <div className="text-gray-600 text-sm md:text-base space-y-0.5">
                          <div>
                            <span className="uppercase tracking-[0.15em] text-[11px] text-gray-500 mr-1.5">
                              {t('giftCard.value', { defaultValue: 'Waarde' })}
                            </span>
                            <span className="font-medium">€{Number(item.giftCardAmount ?? item.price).toFixed(2)}</span>
                          </div>
                          {item.giftCardRecipient?.recipientName ? (
                            <div className="text-xs md:text-sm text-gray-600">
                              {t('giftCard.for', { defaultValue: 'Voor' })}{' '}
                              <span className="font-medium">{item.giftCardRecipient.recipientName}</span>
                              {item.giftCardRecipient.recipientEmail ? ` · ${item.giftCardRecipient.recipientEmail}` : ''}
                            </div>
                          ) : (
                            <div className="text-xs md:text-sm text-gray-500">
                              {t('giftCard.selfDelivery', { defaultValue: 'Code wordt naar jou verstuurd' })}
                            </div>
                          )}
                          {item.giftCardRecipient?.scheduledSendAt ? (
                            <div className="text-xs text-gray-500">
                              {t('giftCard.scheduled', { defaultValue: 'Verzending op' })}{' '}
                              {new Date(item.giftCardRecipient.scheduledSendAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-gray-600 text-sm md:text-base space-x-2">
                          <span>{item.color}</span>
                          <span>•</span>
                          <span>{t('size')} {item.size}</span>
                          <span className="hidden md:inline">•</span>
                          <span className="hidden md:inline">€{item.price.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Section - Quantity & Price */}
                    <div className="flex items-center justify-between mt-4 md:mt-0">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-black">
                        <button
                          onClick={() => updateQuantity(item.variantId, Math.max(1, item.quantity - 1))}
                          className="w-11 h-11 md:w-12 md:h-12 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                          aria-label={t('decrease')}
                        >
                          <Minus size={18} />
                        </button>
                        <span className="w-11 md:w-12 text-center font-bold text-lg">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className="w-11 h-11 md:w-12 md:h-12 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                          aria-label={t('increase')}
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <div className="font-bold text-xl md:text-2xl">€{(item.price * item.quantity).toFixed(2)}</div>
                        {(lineStaffelByVariant[item.variantId] ?? 0) > 0 && (
                          <p className="text-xs text-gray-600 mt-1 max-w-[220px] ml-auto leading-snug">
                            {t('staffel.lineSaving', {
                              amount: lineStaffelByVariant[item.variantId].toFixed(2),
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Divider */}
        <div className="border-t-2 border-black mt-0" />

        {/* Summary Section - Desktop */}
        <div className="hidden md:block bg-gray-50 px-8 md:px-12 py-8 md:py-10 mt-0">
          <div className="max-w-2xl ml-auto space-y-6">
            {/* Price Breakdown */}
            <div className="space-y-3 text-lg">
              <div className="flex justify-between">
                <span className="text-gray-600 uppercase tracking-wider">{t('subtotal')}</span>
                <span className="font-semibold">€{subtotal.toFixed(2)}</span>
              </div>
              {staffelSavings > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-gray-600 uppercase tracking-wider">{t('staffel.label')}</span>
                  <span className="font-semibold">−€{staffelSavings.toFixed(2)}</span>
                </div>
              )}
              {staffelHints.length > 0 && (
                <div className="text-sm text-gray-600 space-y-1 border-l-2 border-gray-300 pl-3 py-1">
                  {staffelHints.map((h, i) => (
                    <p key={`${h.productId}-d-${i}`} className="leading-snug">
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
                <span className="text-gray-500 uppercase tracking-wider">{locale === 'en' ? 'VAT 21%' : 'BTW 21%'}</span>
                <span className="text-gray-500">€{btwAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 uppercase tracking-wider">{t('shipping')}</span>
                <span className="font-semibold">
                  {shipping === 0 ? (
                    <span className="text-brand-primary">{t('shippingFree')}</span>
                  ) : (
                    `€${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
            </div>

            {/* Progress to Free Shipping */}
            {subtotalAfterStaffel < freeShippingThreshold && (
              <div className="bg-white border-l-4 border-brand-primary px-4 py-3">
                <p className="text-sm text-gray-600">
                  {t('freeShippingProgress', {
                    amount: (freeShippingThreshold - subtotalAfterStaffel).toFixed(2),
                  })}
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="border-t-2 border-black" />

            {/* Total */}
            <div className="flex justify-between items-baseline">
              <span className="font-display text-2xl uppercase">{t('total')}</span>
              <span className="font-display text-4xl">€{total.toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-500 text-right uppercase tracking-wider">
              {t('totalInclusive')}
            </p>

            {/* CTA Buttons */}
            <div className="flex gap-4 pt-4">
              <LocaleLink
                href="/checkout"
                className="flex-1 py-4 bg-black text-white text-center font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
              >
                {t('checkout')}
              </LocaleLink>
              <LocaleLink
                href="/shop"
                className="flex-1 py-4 border-2 border-black text-black text-center font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
              >
                {t('empty.continue')}
              </LocaleLink>
            </div>

            {/* Trust Badges */}
            <div className="pt-6 space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Truck size={18} className="flex-shrink-0" />
                <span className="uppercase tracking-wider">{t('trust.freeShipping', { amount: freeShippingThreshold.toFixed(2) })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock size={18} className="flex-shrink-0" />
                <span className="uppercase tracking-wider">{t('trust.secure')}</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw size={18} className="flex-shrink-0" />
                <span className="uppercase tracking-wider">{t('trust.returns', { days: returnDays })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Bar - Mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black text-white z-40 safe-bottom">
          <button
            onClick={() => setShowMobileSummary(true)}
            className="w-full px-4 py-4 flex items-center justify-between"
          >
            <div className="text-left">
              <div className="font-display text-2xl">€{total.toFixed(2)}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">{t('mobile.tapDetails')}</div>
            </div>
            <div className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wider">
              {t('checkout')} →
            </div>
          </button>
        </div>

        {/* Mobile Summary Sheet */}
        {showMobileSummary && (
          <div className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-end animate-fadeIn">
            <div className="bg-white w-full rounded-t-2xl p-6 pb-8 animate-slideUp max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-2xl uppercase">{t('title')}</h3>
                <button
                  onClick={() => setShowMobileSummary(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">{t('subtotal')}</span>
                  <span className="font-semibold">€{subtotal.toFixed(2)}</span>
                </div>
                {staffelSavings > 0 && (
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600">{t('staffel.label')}</span>
                    <span className="font-semibold">−€{staffelSavings.toFixed(2)}</span>
                  </div>
                )}
                {staffelHints.length > 0 && (
                  <div className="text-xs text-gray-600 space-y-1 border-l-2 border-gray-300 pl-3">
                    {staffelHints.map((h, i) => (
                      <p key={`${h.productId}-m-${i}`} className="leading-snug">
                        {t('staffel.nextTier', {
                          product: h.productName,
                          needed: h.needed,
                          discount: h.discountLabel,
                        })}
                      </p>
                    ))}
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">{locale === 'en' ? 'VAT 21%' : 'BTW 21%'}</span>
                  <span className="text-gray-500">€{btwAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">{t('shipping')}</span>
                  <span className="font-semibold">
                    {shipping === 0 ? (
                      <span className="text-brand-primary">{t('shippingFree')}</span>
                    ) : (
                      `€${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>

                {subtotalAfterStaffel < freeShippingThreshold && (
                  <div className="bg-gray-50 border-l-4 border-brand-primary px-4 py-3">
                    <p className="text-sm text-gray-600">
                      {t('freeShippingProgress', {
                        amount: (freeShippingThreshold - subtotalAfterStaffel).toFixed(2),
                      })}
                    </p>
                  </div>
                )}

                <div className="border-t-2 border-black pt-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-display text-xl uppercase">{t('total')}</span>
                    <span className="font-display text-3xl">€{total.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-500 text-right">
                    {locale === 'en' ? `Incl. €${totalBtw.toFixed(2)} VAT` : `Incl. €${totalBtw.toFixed(2)} BTW`}
                  </p>
                </div>

                <LocaleLink
                  href="/checkout"
                  className="block w-full py-4 bg-black text-white text-center font-bold uppercase tracking-wider mt-6"
                  onClick={() => setShowMobileSummary(false)}
                >
                  {t('checkout')}
                </LocaleLink>

                <div className="pt-4 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Truck size={18} className="flex-shrink-0" />
                    <span>{t('trust.freeShipping', { amount: freeShippingThreshold.toFixed(2) })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock size={18} className="flex-shrink-0" />
                    <span>{t('trust.secure')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw size={18} className="flex-shrink-0" />
                    <span>{t('trust.returns', { days: returnDays })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-4 border-black p-8 max-w-md w-full">
            <h3 className="font-display text-3xl mb-4 uppercase">{t('clearConfirm.title')}</h3>
            <p className="text-gray-600 mb-8 text-lg">
              {t('clearConfirm.message')}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 border-2 border-black font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                {t('clearConfirm.cancel')}
              </button>
              <button
                onClick={() => {
                  clearCart()
                  setShowClearConfirm(false)
                }}
                className="flex-1 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
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
