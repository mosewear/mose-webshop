'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/store/cart'

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, getTotal, getItemCount } = useCart()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const subtotal = getTotal()
  const shipping = subtotal >= 50 ? 0 : 5.95
  const total = subtotal + shipping

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 md:pt-32 px-4 pb-16">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-display mb-8 text-center">WINKELWAGEN</h1>
          
          {/* Empty State */}
          <div className="text-center py-16 md:py-24">
            <svg
              className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-6 text-gray-300"
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
            <h2 className="text-2xl md:text-3xl font-display mb-4">JE WINKELWAGEN IS LEEG</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Je hebt nog geen producten toegevoegd aan je winkelwagen. Ontdek onze collectie en vind je perfecte item.
            </p>
            <Link
              href="/shop"
              className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
            >
              Naar shop
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 md:pt-32 px-4 pb-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-6xl font-display mb-2">WINKELWAGEN</h1>
            <p className="text-gray-600">
              {getItemCount()} {getItemCount() === 1 ? 'item' : 'items'} in je winkelwagen
            </p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-red-600 hover:text-red-700 font-semibold text-sm uppercase tracking-wider underline self-start md:self-auto"
          >
            Winkelwagen legen
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items - 2/3 width */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.variantId}
                className="bg-white border-2 border-black p-4 md:p-6 flex flex-col sm:flex-row gap-4 transition-all hover:shadow-lg"
              >
                {/* Product Image */}
                <Link
                  href={`/product/${item.productId}`}
                  className="relative w-full sm:w-32 h-40 sm:h-32 bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-300"
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 128px"
                    className="object-cover object-center"
                  />
                </Link>

                {/* Product Info */}
                <div className="flex-grow space-y-3">
                  <div>
                    <Link
                      href={`/product/${item.productId}`}
                      className="font-bold text-lg md:text-xl hover:text-brand-primary transition-colors"
                    >
                      {item.name}
                    </Link>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <p>
                        <span className="font-semibold">Maat:</span> {item.size}
                      </p>
                      <p>
                        <span className="font-semibold">Kleur:</span> {item.color}
                      </p>
                      <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                    </div>
                  </div>

                  {/* Quantity & Price - Mobile */}
                  <div className="flex items-center justify-between sm:hidden">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.variantId, Math.max(1, item.quantity - 1))}
                        className="w-8 h-8 border-2 border-black font-bold hover:bg-black hover:text-white transition-colors"
                      >
                        −
                      </button>
                      <span className="font-bold w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        className="w-8 h-8 border-2 border-black font-bold hover:bg-black hover:text-white transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">€{(item.price * item.quantity).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">€{item.price.toFixed(2)} per stuk</p>
                    </div>
                  </div>

                  {/* Remove Button - Mobile */}
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="text-red-600 hover:text-red-700 font-semibold text-sm uppercase tracking-wider underline sm:hidden"
                  >
                    Verwijderen
                  </button>
                </div>

                {/* Quantity & Price - Desktop */}
                <div className="hidden sm:flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="text-red-600 hover:text-red-700 font-semibold text-sm uppercase tracking-wider"
                  >
                    ✕
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.variantId, Math.max(1, item.quantity - 1))}
                      className="w-10 h-10 border-2 border-black font-bold hover:bg-black hover:text-white transition-colors"
                    >
                      −
                    </button>
                    <span className="font-bold text-xl w-10 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      className="w-10 h-10 border-2 border-black font-bold hover:bg-black hover:text-white transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-xl">€{(item.price * item.quantity).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">€{item.price.toFixed(2)} per stuk</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary - 1/3 width */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border-2 border-black p-6 sticky top-32 space-y-6">
              <h2 className="text-2xl font-display">BESTELLING</h2>

              {/* Price Breakdown */}
              <div className="space-y-3 py-4 border-t-2 border-b-2 border-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotaal</span>
                  <span className="font-semibold">€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Verzending</span>
                  <span className="font-semibold">
                    {shipping === 0 ? (
                      <span className="text-green-600">GRATIS</span>
                    ) : (
                      `€${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                {subtotal < freeShippingThreshold && (
                  <p className="text-xs text-gray-500">
                    Nog €{(freeShippingThreshold - subtotal).toFixed(2)} tot gratis verzending!
                  </p>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-baseline">
                <span className="text-xl font-bold">Totaal</span>
                <span className="text-3xl font-display">€{total.toFixed(2)}</span>
              </div>

              {/* Checkout Button */}
              <Link
                href="/checkout"
                className="block w-full py-4 bg-brand-primary text-white text-center font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
              >
                Afrekenen
              </Link>

              {/* Continue Shopping */}
              <Link
                href="/shop"
                className="block w-full py-4 border-2 border-black text-black text-center font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
              >
                Verder shoppen
              </Link>

              {/* Trust Badges */}
              <div className="pt-6 border-t-2 border-gray-300 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Veilig betalen</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>14 dagen retour</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Gratis verzending vanaf €50</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-6 md:p-8 max-w-md w-full">
            <h3 className="text-2xl font-display mb-4">WINKELWAGEN LEGEN?</h3>
            <p className="text-gray-600 mb-6">
              Weet je zeker dat je alle items uit je winkelwagen wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
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
                className="flex-1 py-3 bg-red-600 text-white font-bold uppercase tracking-wider hover:bg-red-700 transition-colors"
              >
                Legen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
