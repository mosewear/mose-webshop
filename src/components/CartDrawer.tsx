'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/store/cart'
import { X, Minus, Plus, Trash2, Truck, Lock, RotateCcw, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { getSiteSettings } from '@/lib/settings'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, clearCart, getTotal, getItemCount } = useCart()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [shippingCost, setShippingCost] = useState(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(50)

  const subtotal = getTotal()
  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingCost
  
  // BTW berekening (21% is al inbegrepen in de prijzen)
  const vatRate = 0.21
  const subtotalExclBtw = subtotal / (1 + vatRate)
  const btwAmount = subtotal - subtotalExclBtw
  const totalBtw = btwAmount + (shipping / (1 + vatRate) * vatRate)
  
  const total = subtotal + shipping

  useEffect(() => {
    getSiteSettings().then((settings) => {
      setShippingCost(settings.shipping_cost)
      setFreeShippingThreshold(settings.free_shipping_threshold)
    })
  }, [])

  // Disable body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 w-full md:w-[520px] bg-white border-l-4 border-black z-50 flex flex-col animate-slideInRight"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b-2 border-black bg-white sticky top-0 z-10">
          <div>
            <h2 id="cart-drawer-title" className="font-display text-2xl md:text-3xl uppercase">
              Winkelwagen
            </h2>
            <p className="text-sm text-gray-600 uppercase tracking-wider mt-1">
              {getItemCount()} {getItemCount() === 1 ? 'Item' : 'Items'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
            aria-label="Sluit winkelwagen"
          >
            <X size={24} />
          </button>
        </div>

        {items.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 border-4 border-gray-300 flex items-center justify-center mb-6">
              <ShoppingBag size={40} className="text-gray-300" />
            </div>
            <h3 className="font-display text-2xl uppercase mb-2">Leeg</h3>
            <p className="text-gray-600 mb-6">Je winkelwagen is leeg</p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
            >
              Verder shoppen
            </button>
          </div>
        ) : (
          <>
            {/* Items Area - Scrollable */}
            <div className="flex-1 overflow-y-auto pb-[280px] md:pb-[160px]">
              <div className="p-4 md:p-6 space-y-0">
                {items.map((item, index) => (
                  <div key={item.variantId}>
                    {index > 0 && <div className="border-t-2 border-gray-200" />}
                    
                    <div className="py-4 md:py-6 group">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <Link
                          href={`/product/${item.productId}`}
                          onClick={onClose}
                          className="relative w-20 h-26 md:w-[100px] md:h-[130px] bg-gray-100 flex-shrink-0 overflow-hidden"
                        >
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="100px"
                            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>

                        {/* Product Info */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          {/* Top Section */}
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <Link
                                href={`/product/${item.productId}`}
                                onClick={onClose}
                                className="font-display text-lg md:text-xl uppercase hover:text-brand-primary transition-colors leading-tight"
                              >
                                {item.name}
                              </Link>
                              <button
                                onClick={() => removeItem(item.variantId)}
                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                                aria-label="Verwijder item"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <div className="text-gray-600 text-sm space-x-2">
                              <span>{item.color}</span>
                              <span>•</span>
                              <span>Maat {item.size}</span>
                            </div>
                          </div>

                          {/* Bottom Section - Quantity & Price */}
                          <div className="flex items-center justify-between mt-3">
                            {/* Quantity Controls */}
                            <div className="flex items-center border border-black">
                              <button
                                onClick={() => updateQuantity(item.variantId, Math.max(1, item.quantity - 1))}
                                className="w-11 h-11 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                                aria-label="Verlaag aantal"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="w-11 text-center font-bold">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                className="w-11 h-11 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                                aria-label="Verhoog aantal"
                              >
                                <Plus size={16} />
                              </button>
                            </div>

                            {/* Price */}
                            <div className="text-right">
                              <div className="font-bold text-lg">€{(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Clear Cart Button */}
              <div className="px-4 md:px-6 pb-4">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors text-sm uppercase tracking-wider font-semibold"
                >
                  <Trash2 size={16} />
                  <span>Leeg winkelwagen</span>
                </button>
              </div>
            </div>

            {/* Summary - Sticky Bottom (Desktop) / Fixed Bottom (Mobile) */}
            <div className="flex-shrink-0 border-t-2 border-black bg-gray-50 sticky bottom-0">
              {/* Desktop Summary */}
              <div className="hidden md:block p-4 space-y-2">
                {/* Price Breakdown - Better Hierarchy */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotaal</span>
                    <span className="font-semibold text-gray-900">€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">BTW 21%</span>
                    <span className="text-gray-500">€{btwAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Verzending</span>
                    <span className="font-semibold text-gray-900">
                      {shipping === 0 ? (
                        <span className="text-brand-primary">GRATIS</span>
                      ) : (
                        `€${shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>
                </div>

                {/* Progress to Free Shipping - Compact */}
                {subtotal < freeShippingThreshold && (
                  <div className="bg-white border-l-2 border-brand-primary px-2 py-1.5">
                    <p className="text-xs text-gray-600">
                      Nog <span className="font-bold text-black">€{(freeShippingThreshold - subtotal).toFixed(2)}</span> tot gratis verzending
                    </p>
                  </div>
                )}

                {/* Divider & Total - PROMINENT! */}
                <div className="border-t-2 border-black pt-3 mt-3">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-display text-lg uppercase tracking-wide">Totaal</span>
                    <span className="font-display text-3xl font-bold">€{total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-600 text-right">
                    Incl. €{totalBtw.toFixed(2)} BTW
                  </p>
                </div>

                {/* CTA Button */}
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="block w-full py-3 bg-black text-white text-center font-bold text-sm uppercase tracking-wider hover:bg-gray-800 transition-colors mt-3"
                >
                  Afrekenen
                </Link>

                {/* Trust Badges - Single Line Icons Only */}
                <div className="pt-2 flex items-center justify-center gap-4 text-gray-600">
                  <div className="cursor-help" title="Gratis verzending vanaf €50">
                    <Truck size={16} className="hover:text-black transition-colors" />
                  </div>
                  <div className="cursor-help" title="Veilig betalen via Stripe">
                    <Lock size={16} className="hover:text-black transition-colors" />
                  </div>
                  <div className="cursor-help" title="14 dagen bedenktijd">
                    <RotateCcw size={16} className="hover:text-black transition-colors" />
                  </div>
                </div>
              </div>

              {/* Mobile Fixed Bottom Bar */}
              <div className="md:hidden p-4 bg-black text-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Totaal</div>
                    <div className="font-display text-3xl font-bold">€{total.toFixed(2)}</div>
                    <div className="text-xs text-gray-400">Incl. €{totalBtw.toFixed(2)} BTW</div>
                  </div>
                  <Link
                    href="/checkout"
                    onClick={onClose}
                    className="px-6 py-3 bg-white text-black font-bold text-sm uppercase tracking-wider hover:bg-gray-200 transition-colors"
                  >
                    Afrekenen
                  </Link>
                </div>
                {subtotal < freeShippingThreshold && (
                  <p className="text-xs text-gray-400 text-center border-t border-gray-700 pt-2">
                    Nog €{(freeShippingThreshold - subtotal).toFixed(2)} tot gratis verzending
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-4 border-black p-6 md:p-8 max-w-md w-full">
            <h3 className="font-display text-2xl md:text-3xl mb-4 uppercase">Winkelwagen legen?</h3>
            <p className="text-gray-600 mb-6">
              Weet je zeker dat je alle items wilt verwijderen?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 border-2 border-black font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={() => {
                  clearCart()
                  setShowClearConfirm(false)
                }}
                className="flex-1 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
              >
                Legen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

