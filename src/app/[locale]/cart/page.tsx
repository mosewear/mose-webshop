'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/store/cart'
import { getSiteSettings } from '@/lib/settings'
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
  
  // Helper for locale-aware links
  const localeLink = (path: string) => `/${locale}${path === '/' ? '' : path}`

  const subtotal = getTotal()
  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingCost
  
  // BTW berekening (21% is al inbegrepen in de prijzen)
  const vatRate = 0.21
  const subtotalExclBtw = subtotal / (1 + vatRate)
  const btwAmount = subtotal - subtotalExclBtw
  const shippingExclBtw = shipping / (1 + vatRate)
  const shippingBtw = shipping - shippingExclBtw
  const totalBtw = btwAmount + shippingBtw
  
  const total = subtotal + shipping

  useEffect(() => {
    getSiteSettings().then((settings) => {
      setShippingCost(settings.shipping_cost)
      setFreeShippingThreshold(settings.free_shipping_threshold)
      setReturnDays(settings.return_days)
    })
  }, [])

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
                    href={`/product/${item.productId}`}
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
                          href={`/product/${item.productId}`}
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
                      <div className="text-gray-600 text-sm md:text-base space-x-2">
                        <span>{item.color}</span>
                        <span>•</span>
                        <span>{t('size')} {item.size}</span>
                        <span className="hidden md:inline">•</span>
                        <span className="hidden md:inline">€{item.price.toFixed(2)}</span>
                      </div>
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
              <div className="flex justify-between text-base">
                <span className="text-gray-500 uppercase tracking-wider">BTW 21%</span>
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
            {subtotal < freeShippingThreshold && (
              <div className="bg-white border-l-4 border-brand-primary px-4 py-3">
                <p className="text-sm text-gray-600">
                  Nog <span className="font-bold text-black">€{(freeShippingThreshold - subtotal).toFixed(2)}</span> tot gratis verzending
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
              Incl. €{totalBtw.toFixed(2)} BTW
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
                <span className="uppercase tracking-wider">Gratis verzending vanaf €{freeShippingThreshold.toFixed(2)}</span>
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
              <div className="text-xs text-gray-400 uppercase tracking-wider">Incl. BTW • Tap voor details</div>
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
                <div className="flex justify-between">
                  <span className="text-gray-500">BTW 21%</span>
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

                {subtotal < freeShippingThreshold && (
                  <div className="bg-gray-50 border-l-4 border-brand-primary px-4 py-3">
                    <p className="text-sm text-gray-600">
                      Nog <span className="font-bold text-black">€{(freeShippingThreshold - subtotal).toFixed(2)}</span> tot gratis verzending
                    </p>
                  </div>
                )}

                <div className="border-t-2 border-black pt-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-display text-xl uppercase">{t('total')}</span>
                    <span className="font-display text-3xl">€{total.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-500 text-right">Incl. €{totalBtw.toFixed(2)} BTW</p>
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
                    <span>Gratis verzending vanaf €{freeShippingThreshold.toFixed(2)}</span>
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
